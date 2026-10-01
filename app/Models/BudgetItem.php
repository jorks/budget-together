<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Database\Factories\BudgetItemFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property CarbonImmutable|null $pay_date
 * @property CarbonImmutable|null $due_date
 * @property CarbonImmutable|null $saving_start_date
 */
#[Fillable(['pay_date', 'salary_sacrifice_cents', 'workplace_giving_cents', 'other_deductions_cents', 'account_id', 'kind', 'name', 'category', 'person', 'amount_cents', 'cadence', 'payments_per_year', 'is_variable', 'is_active', 'due_date', 'gross_annual_cents', 'bonus_annual_cents', 'notes', 'has_sinking_fund', 'saved_cents', 'saving_start_date', 'contribution_cents', 'contribution_cadence', 'saving_account_id', 'use_tax_estimate', 'include_bonus', 'include_medicare', 'tax_year'])]
class BudgetItem extends Model
{
    /** @use HasFactory<BudgetItemFactory> */
    use HasFactory;

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'use_tax_estimate' => 'boolean',
            'include_bonus' => 'boolean',
            'include_medicare' => 'boolean',
            'tax_year' => 'integer',
            'pay_date' => 'immutable_date:Y-m-d',
            'salary_sacrifice_cents' => 'integer',
            'workplace_giving_cents' => 'integer',
            'other_deductions_cents' => 'integer',
            'amount_cents' => 'integer',
            'gross_annual_cents' => 'integer',
            'bonus_annual_cents' => 'integer',
            'saved_cents' => 'integer',
            'contribution_cents' => 'integer',
            'payments_per_year' => 'integer',
            'is_variable' => 'boolean',
            'is_active' => 'boolean',
            'has_sinking_fund' => 'boolean',
            'due_date' => 'immutable_date:Y-m-d',
            'saving_start_date' => 'immutable_date:Y-m-d',
        ];
    }

    /** @return BelongsTo<Household, $this> */
    public function household(): BelongsTo
    {
        return $this->belongsTo(Household::class);
    }

    /** @return BelongsTo<Account, $this> */
    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    /** @return HasMany<BillPayment, $this> */
    public function payments(): HasMany
    {
        return $this->hasMany(BillPayment::class);
    }
}
