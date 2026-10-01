<?php

namespace App\Services;

use App\Models\BudgetItem;
use App\Models\Household;
use Illuminate\Support\Collection;

class HouseholdBudget
{
    public function __construct(private MortgageCalculator $mortgages) {}

    /** @return Collection<int, BudgetItem> */
    public function items(Household $household): Collection
    {
        $items = $household->items()->with(['account', 'payments' => fn ($query) => $query->orderByDesc('paid_on')->orderByDesc('id')])->orderBy('name')->orderBy('id')->get();
        $mortgage = $household->mortgage()->with('account')->first();
        if ($mortgage === null) {
            return $items;
        }

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
        ])->setRelation('account', $mortgage->account)->setRelation('payments', collect());

        return $items->push($repayment)->sortBy(fn (BudgetItem $item): string => $item->name)->values();
    }
}
