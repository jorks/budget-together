<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Database\Factories\DebtFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** @property CarbonImmutable|null $due_date */
#[Fillable(['name', 'type', 'lender', 'balance_cents', 'annual_rate', 'repayment_cents', 'extra_cents', 'frequency', 'due_date', 'account_id', 'is_active', 'notes'])]
class Debt extends Model
{
    /** @use HasFactory<DebtFactory> */
    use HasFactory;

    public const TYPES = ['car_loan' => 'Car loan', 'credit_card' => 'Credit card', 'personal_loan' => 'Personal loan', 'buy_now_pay_later' => 'Buy now, pay later', 'other' => 'Other debt'];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['balance_cents' => 'integer', 'annual_rate' => 'float', 'repayment_cents' => 'integer', 'extra_cents' => 'integer', 'is_active' => 'boolean', 'due_date' => 'immutable_date:Y-m-d'];
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
}
