<?php

namespace App\Models;

use Database\Factories\SuperFundFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'person', 'member_id', 'member_number', 'investment_option', 'income_id', 'employer_rate', 'salary_sacrifice_cents', 'annual_fee_cents', 'fee_rate', 'annual_insurance_cents', 'return_rate', 'notes'])]
class SuperFund extends Model
{
    /** @use HasFactory<SuperFundFactory> */
    use HasFactory;

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['employer_rate' => 'float', 'salary_sacrifice_cents' => 'integer', 'annual_fee_cents' => 'integer', 'fee_rate' => 'float', 'annual_insurance_cents' => 'integer', 'return_rate' => 'float'];
    }

    /** @return BelongsTo<Household, $this> */
    public function household(): BelongsTo
    {
        return $this->belongsTo(Household::class);
    }

    /** @return BelongsTo<BudgetItem, $this> */
    public function income(): BelongsTo
    {
        return $this->belongsTo(BudgetItem::class, 'income_id');
    }

    /** @return HasMany<SuperBalance, $this> */
    public function balances(): HasMany
    {
        return $this->hasMany(SuperBalance::class);
    }
}
