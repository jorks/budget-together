<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Database\Factories\MortgageFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** @property CarbonImmutable|null $due_date */
#[Fillable(['name', 'balance_cents', 'annual_rate', 'term_years', 'frequency', 'offset_cents', 'extra_cents', 'due_date', 'account_id'])]
class Mortgage extends Model
{
    /** @use HasFactory<MortgageFactory> */
    use HasFactory;

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['balance_cents' => 'integer', 'annual_rate' => 'float', 'term_years' => 'integer', 'offset_cents' => 'integer', 'extra_cents' => 'integer', 'due_date' => 'immutable_date:Y-m-d'];
    }

    /** @return BelongsTo<Account, $this> */
    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    /** @return BelongsTo<Household, $this> */
    public function household(): BelongsTo
    {
        return $this->belongsTo(Household::class);
    }
}
