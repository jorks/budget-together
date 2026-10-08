<?php

namespace App\Services;

use App\Models\BudgetItem;
use App\Models\BudgetItemRevision;
use App\Models\Debt;
use App\Models\FinancialChange;
use App\Models\Household;
use App\Models\Mortgage;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

class HouseholdBudget
{
    public function __construct(private MortgageCalculator $mortgages, private FinancialHistory $history) {}

    /** @return Collection<int, BudgetItem> */
    public function items(Household $household): Collection
    {
        $items = $household->items()->with(['account', 'revisions', 'financialChanges', 'payments' => fn ($query) => $query->orderByDesc('paid_on')->orderByDesc('id')])->orderBy('name')->orderBy('id')->get();
        if ($household->debts_enabled) {
            foreach ($household->debts()->with(['account', 'financialChanges'])->where('is_active', true)->get() as $debt) {
                $debt = $this->history->at($debt);
                if ($debt->balance_cents > 0) {
                    $items->push($this->debtRepayment($debt));
                }
            }
        }
        $mortgage = $household->mortgage_enabled ? $household->mortgage()->with('account')->first() : null;
        if ($mortgage === null) {
            return $items->sortBy(fn (BudgetItem $item): string => $item->name)->values();
        }

        $mortgage = $this->history->at($mortgage);
        $items = $items->reject(fn (BudgetItem $item): bool => $item->kind === 'bill' && mb_strtolower(trim($item->category ?? '')) === 'mortgage');
        $repayment = (new BudgetItem)->forceFill([
            'id' => -$mortgage->id,
            'household_id' => $household->id,
            'source' => 'mortgage',
            'name' => 'Mortgage repayment',
            'kind' => 'bill',
            'category' => 'Mortgage',
            'person' => null,
            'amount_cents' => $this->mortgages->plannedRepayment($mortgage),
            'cadence' => $mortgage->frequency,
            'payments_per_year' => null,
            'is_active' => true,
            'is_variable' => false,
            'due_date' => $mortgage->due_date,
            'pay_date' => null,
            'account_id' => $mortgage->account_id,
            'gross_annual_cents' => null,
            'bonus_annual_cents' => null,
            'use_tax_estimate' => false,
            'include_bonus' => false,
            'include_medicare' => true,
            'tax_year' => 2026,
            'notes' => 'Calculated from Mortgage, including extra repayments. Manage the loan and repayment schedule in Mortgage.',
            'has_sinking_fund' => false,
            'saved_cents' => 0,
            'saving_start_date' => null,
            'contribution_cents' => null,
            'contribution_cadence' => 'weekly',
            'saving_account_id' => null,
            'salary_sacrifice_cents' => 0,
            'workplace_giving_cents' => 0,
            'other_deductions_cents' => 0,
        ])->setRelation('account', $mortgage->account)->setRelation('payments', collect())->setRelation('revisions', $this->loanRevisions($mortgage));

        return $items->push($repayment)->sortBy(fn (BudgetItem $item): string => $item->name)->values();
    }

    private function debtRepayment(Debt $debt): BudgetItem
    {
        $repayment = (new BudgetItem)->forceFill([
            'id' => -(1000000000 + $debt->id),
            'household_id' => $debt->household_id,
            'source' => 'debt',
            'name' => $debt->name.' repayment',
            'kind' => 'bill',
            'category' => 'Debts & financing',
            'person' => null,
            'amount_cents' => $debt->repayment_cents + $debt->extra_cents,
            'cadence' => $debt->frequency,
            'payments_per_year' => null,
            'is_active' => true,
            'is_variable' => false,
            'due_date' => $debt->due_date,
            'pay_date' => null,
            'account_id' => $debt->account_id,
            'gross_annual_cents' => null,
            'bonus_annual_cents' => null,
            'use_tax_estimate' => false,
            'include_bonus' => false,
            'include_medicare' => true,
            'tax_year' => 2026,
            'notes' => 'Managed in Debts & financing, including extra repayments.',
            'has_sinking_fund' => false,
            'saved_cents' => 0,
            'saving_start_date' => null,
            'contribution_cents' => null,
            'contribution_cadence' => 'weekly',
            'saving_account_id' => null,
            'salary_sacrifice_cents' => 0,
            'workplace_giving_cents' => 0,
            'other_deductions_cents' => 0,
        ])->setRelation('account', $debt->account)->setRelation('payments', collect())->setRelation('revisions', $this->loanRevisions($debt));

        return $repayment;
    }

    /** @return Collection<int, BudgetItemRevision> */
    private function loanRevisions(Debt|Mortgage $loan): Collection
    {
        $loan->loadMissing('financialChanges');

        return $loan->financialChanges->map(function (FinancialChange $change) use ($loan): BudgetItemRevision {
            $date = $change->effective_from ?? CarbonImmutable::parse('2000-01-01');
            $snapshot = $this->history->at($loan, $date);
            $amount = $snapshot instanceof Debt ? ($snapshot->balance_cents > 0 ? $snapshot->repayment_cents + $snapshot->extra_cents : 0) : $this->mortgages->repayment($snapshot, $date) + $snapshot->extra_cents;

            return (new BudgetItemRevision)->forceFill([
                'effective_from' => $change->effective_from,
                'amount_cents' => $amount,
                'cadence' => $snapshot->frequency,
                'payments_per_year' => null,
                'schedule_date' => $snapshot->due_date?->toDateString(),
            ]);
        });
    }
}
