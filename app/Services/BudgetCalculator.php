<?php

namespace App\Services;

use App\Cadence;
use App\Models\BudgetItem;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

class BudgetCalculator
{
    public function __construct(private AustralianTaxEstimator $tax, private BudgetItemHistory $history, private FinancialHistory $financial) {}

    public function annual(BudgetItem $item, ?CarbonImmutable $date = null): int
    {
        $date ??= CarbonImmutable::today('Australia/Melbourne');
        $item = $this->financial->at($item, $date);
        if ($item->kind === 'income' && $item->use_tax_estimate) {
            return $this->tax->estimate($item->gross_annual_cents + ($item->include_bonus ? $item->bonus_annual_cents : 0), $item->tax_year, $item->include_medicare, $item->salary_sacrifice_cents ?? 0, $item->workplace_giving_cents ?? 0, $item->other_deductions_cents ?? 0)['net_cents'];
        }

        $terms = $this->history->termsAt($item, $date);

        return $terms['amount_cents'] * Cadence::from($terms['cadence'])->periods($terms['payments_per_year']);
    }

    /** @return array{annually: int, monthly: int, fortnightly: int, weekly: int} */
    public function equivalents(int $annualCents): array
    {
        return ['annually' => $annualCents, 'monthly' => (int) round($annualCents / 12), 'fortnightly' => (int) round($annualCents / 26), 'weekly' => (int) round($annualCents / 52)];
    }

    /** @return list<string> */
    public function occurrences(BudgetItem $item, CarbonImmutable $from, CarbonImmutable $until): array
    {
        $item = $this->financial->at($item, CarbonImmutable::parse('2000-01-01'));
        $scheduledDate = $item->kind === 'income' ? $item->pay_date : $item->due_date;
        if ($item->getAttribute('source') !== null && $item->relationLoaded('revisions')) {
            $baseline = $item->revisions->whereNull('effective_from')->first();
            if ($baseline !== null) {
                $scheduledDate = $baseline->getAttribute('schedule_date');
            }
        }
        if (! $item->is_active) {
            return [];
        }
        $anchor = $scheduledDate === null ? null : CarbonImmutable::parse($scheduledDate, $from->timezone);
        $terms = $this->history->termsAt($item, CarbonImmutable::parse('2000-01-01'));
        $segments = [['start' => null, 'anchor' => $anchor, 'cadence' => $terms['cadence']]];
        if ($item->exists || $item->relationLoaded('revisions')) {
            $changes = $item->kind === 'bill'
                ? $item->revisions->whereNotNull('effective_from')->map(fn ($revision): array => ['date' => $revision->effective_from->toDateString(), 'cadence' => $revision->cadence, 'has_schedule' => $item->getAttribute('source') !== null, 'pay_date' => $revision->getAttribute('schedule_date')])
                : $item->financialChanges->whereNotNull('effective_from')->map(fn ($revision): array => ['date' => $revision->effective_from->toDateString(), 'cadence' => $revision->values['cadence'], 'has_schedule' => $item->kind === 'income', 'pay_date' => $revision->values['pay_date'] ?? null]);
            foreach ($changes->sortBy('date') as $change) {
                if ($change['has_schedule']) {
                    $anchor = $change['pay_date'] === null ? null : CarbonImmutable::parse($change['pay_date'], $from->timezone);
                } elseif ($anchor !== null && $change['cadence'] !== $terms['cadence']) {
                    $anchor = max($anchor, CarbonImmutable::parse($change['date'], $from->timezone));
                }
                $segments[] = ['start' => $change['date'], 'anchor' => $anchor, 'cadence' => $change['cadence']];
                $terms['cadence'] = $change['cadence'];
            }
        }
        $dates = [];
        foreach ($segments as $position => $segment) {
            if ($segment['anchor'] === null) {
                continue;
            }
            $end = $segments[$position + 1]['start'] ?? null;
            $cadence = Cadence::from($segment['cadence']);
            for ($index = 0; ; $index++) {
                $date = $cadence->occurrence($segment['anchor'], $index);
                if ($date->greaterThan($until) || ($end !== null && $date->toDateString() >= $end)) {
                    break;
                }
                if ($date->greaterThanOrEqualTo($from) && ($segment['start'] === null || $date->toDateString() >= $segment['start'])) {
                    $dates[] = $date->toDateString();
                }
                if ($cadence === Cadence::Custom) {
                    break;
                }
            }
        }

        return $dates;
    }

    /** @return array<string, int|string|bool>|null */
    public function sinkingFund(BudgetItem $item, CarbonImmutable $today): ?array
    {
        if (! $item->has_sinking_fund || $item->due_date === null) {
            return null;
        }
        $item = clone $item;
        $item->fill($this->history->termsAt($item, $item->due_date));
        $remaining = max(0, $item->amount_cents - $item->saved_cents);
        $due = CarbonImmutable::parse($item->due_date->toDateString(), $today->timezone);
        $savingStart = $item->saving_start_date === null ? $today->startOfDay() : CarbonImmutable::parse($item->saving_start_date->toDateString(), $today->timezone);
        $start = max($today->startOfDay(), $savingStart);
        $cadence = Cadence::from($item->contribution_cadence);
        $count = 0;
        while ($cadence->occurrence($start, $count)->lessThan($due)) {
            $count++;
        }
        $required = $count > 0 ? (int) ceil($remaining / $count) : $remaining;
        $contribution = $item->contribution_cents ?? $required;
        $projected = $item->saved_cents + $contribution * $count;

        return [
            'remaining_cents' => $remaining,
            'contributions_left' => $count,
            'required_cents' => $required,
            'contribution_cents' => $contribution,
            'projected_cents' => $projected,
            'shortfall_cents' => max(0, $item->amount_cents - $projected),
            'on_track' => $projected >= $item->amount_cents,
            'overdue' => $due->lessThan($today->startOfDay()),
            'cadence' => $item->contribution_cadence,
        ];
    }

    /** @return array<string, mixed> */
    public function present(BudgetItem $item, CarbonImmutable $today): array
    {
        $item = $this->financial->at($item, $today);
        $annual = $this->annual($item, $today);
        $tax = $item->kind === 'income' && $item->gross_annual_cents !== null
            ? $this->tax->estimate($item->gross_annual_cents + ($item->include_bonus ? $item->bonus_annual_cents : 0), $item->tax_year, $item->include_medicare, $item->salary_sacrifice_cents ?? 0, $item->workplace_giving_cents ?? 0, $item->other_deductions_cents ?? 0)
            : null;

        $data = $item->toArray();
        unset($data['revisions'], $data['bill_records'], $data['financial_changes']);

        return [...$data, ...$this->history->termsAt($item, $today), 'equivalents' => $this->equivalents($annual), 'tax_estimate' => $tax, 'sinking_fund' => $this->sinkingFund($item, $today)];
    }

    /**
     * @param  Collection<int, BudgetItem>  $items
     * @return list<array<string, mixed>>
     */
    public function incomeTaxEstimates(Collection $items, CarbonImmutable $today): array
    {
        $items = $items->map(fn (BudgetItem $item): BudgetItem => $this->financial->at($item, $today));
        $estimates = [];
        foreach ($items as $item) {
            if ($item->kind !== 'income' || ! $item->is_active || $item->gross_annual_cents === null || strtolower(trim($item->category ?? '')) === 'bonus') {
                continue;
            }
            $bonuses = $items->filter(fn (BudgetItem $bonus): bool => $item->person !== null && $bonus->kind === 'income' && $bonus->is_active && strtolower(trim($bonus->category ?? '')) === 'bonus' && $bonus->person === $item->person && $bonus->tax_year === $item->tax_year);
            $bonusCents = (int) $bonuses->sum('bonus_annual_cents');
            $estimate = $this->present($item, $today);
            $estimate['bonus_excluded_from_budget'] = $bonuses->contains(fn (BudgetItem $bonus): bool => ! $bonus->include_bonus && $bonus->bonus_annual_cents > 0);
            if ($bonusCents > 0) {
                $estimate['include_bonus'] = true;
                $estimate['tax_estimate'] = $this->tax->estimate($item->gross_annual_cents + ($item->include_bonus ? $item->bonus_annual_cents : 0) + $bonusCents, $item->tax_year, $item->include_medicare, $item->salary_sacrifice_cents ?? 0, $item->workplace_giving_cents ?? 0, $item->other_deductions_cents ?? 0);
            }
            $estimates[] = $estimate;
        }

        return $estimates;
    }

    /**
     * @param  Collection<int, BudgetItem>  $items
     * @return list<array{category: string, count: int, equivalents: array{annually: int, monthly: int, fortnightly: int, weekly: int}}>
     */
    public function categories(Collection $items): array
    {
        $groups = [];
        foreach ($items as $item) {
            if ($item->kind !== 'bill' || ! $item->is_active) {
                continue;
            }
            $category = $item->category ?: 'Uncategorised';
            $groups[$category] ??= ['annual' => 0, 'count' => 0];
            $groups[$category]['annual'] += $this->annual($item);
            $groups[$category]['count']++;
        }
        $result = [];
        foreach ($groups as $category => $group) {
            $result[] = ['category' => $category, 'count' => $group['count'], 'equivalents' => $this->equivalents($group['annual'])];
        }
        usort($result, fn (array $a, array $b): int => $b['equivalents']['annually'] <=> $a['equivalents']['annually']);

        return $result;
    }

    /**
     * @param  Collection<int, BudgetItem>  $items
     * @return array<string, array{annually: int, monthly: int, fortnightly: int, weekly: int}>
     */
    public function totals(Collection $items): array
    {
        $annual = ['income' => 0, 'bill' => 0, 'spending' => 0, 'saving' => 0];
        foreach ($items as $item) {
            if ($item->is_active && ! ($item->kind === 'income' && strtolower(trim($item->category ?? '')) === 'bonus' && ! $item->include_bonus)) {
                $annual[$item->kind] += $this->annual($item);
            }
        }
        $annual['outgoings'] = $annual['bill'] + $annual['spending'];
        $annual['remaining'] = $annual['income'] - $annual['outgoings'] - $annual['saving'];

        return array_map($this->equivalents(...), $annual);
    }
}
