<?php

namespace App\Services;

use App\Cadence;
use App\Models\BudgetItem;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

class BudgetCalculator
{
    public function __construct(private AustralianTaxEstimator $tax) {}

    public function annual(BudgetItem $item): int
    {
        if ($item->kind === 'income' && $item->use_tax_estimate) {
            return $this->tax->estimate($item->gross_annual_cents + ($item->include_bonus ? $item->bonus_annual_cents : 0), $item->tax_year, $item->include_medicare)['net_cents'];
        }

        return $item->amount_cents * Cadence::from($item->cadence)->periods($item->payments_per_year);
    }

    /** @return array{annually: int, monthly: int, fortnightly: int, weekly: int} */
    public function equivalents(int $annualCents): array
    {
        return ['annually' => $annualCents, 'monthly' => (int) round($annualCents / 12), 'fortnightly' => (int) round($annualCents / 26), 'weekly' => (int) round($annualCents / 52)];
    }

    /** @return list<string> */
    public function occurrences(BudgetItem $item, CarbonImmutable $from, CarbonImmutable $until): array
    {
        if (! $item->is_active || $item->due_date === null) {
            return [];
        }
        $anchor = $item->due_date;
        $cadence = Cadence::from($item->cadence);
        $dates = [];
        for ($index = 0; ; $index++) {
            $date = $cadence->occurrence($anchor, $index);
            if ($date->greaterThan($until)) {
                break;
            }
            if ($date->greaterThanOrEqualTo($from)) {
                $dates[] = $date->toDateString();
            }
            if ($cadence === Cadence::Custom) {
                break;
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
        $remaining = max(0, $item->amount_cents - $item->saved_cents);
        $start = max($today->startOfDay(), $item->saving_start_date ?? $today->startOfDay());
        $cadence = Cadence::from($item->contribution_cadence);
        $count = 0;
        while ($cadence->occurrence($start, $count)->lessThan($item->due_date)) {
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
            'overdue' => $item->due_date->lessThan($today->startOfDay()),
            'cadence' => $item->contribution_cadence,
        ];
    }

    /** @return array<string, mixed> */
    public function present(BudgetItem $item, CarbonImmutable $today): array
    {
        $annual = $this->annual($item);
        $tax = $item->kind === 'income' && $item->gross_annual_cents !== null
            ? $this->tax->estimate($item->gross_annual_cents + ($item->include_bonus ? $item->bonus_annual_cents : 0), $item->tax_year, $item->include_medicare)
            : null;

        return [...$item->toArray(), 'equivalents' => $this->equivalents($annual), 'tax_estimate' => $tax, 'sinking_fund' => $this->sinkingFund($item, $today)];
    }

    /**
     * @param  Collection<int, BudgetItem>  $items
     * @return array<string, array{annually: int, monthly: int, fortnightly: int, weekly: int}>
     */
    public function totals(Collection $items): array
    {
        $annual = ['income' => 0, 'bill' => 0, 'spending' => 0, 'saving' => 0];
        foreach ($items as $item) {
            if ($item->is_active) {
                $annual[$item->kind] += $this->annual($item);
            }
        }
        $annual['outgoings'] = $annual['bill'] + $annual['spending'];
        $annual['remaining'] = $annual['income'] - $annual['outgoings'] - $annual['saving'];

        return array_map($this->equivalents(...), $annual);
    }
}
