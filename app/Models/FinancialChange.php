<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Database\Factories\FinancialChangeFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * @property CarbonImmutable|null $effective_from
 * @property array<string, int|float|string|bool|null> $values
 */
class FinancialChange extends Model
{
    /** @use HasFactory<FinancialChangeFactory> */
    use HasFactory;

    protected $fillable = ['budget_item_id', 'mortgage_id', 'debt_id', 'super_fund_id', 'effective_from', 'event_type', 'values', 'payment_cents', 'notes'];

    protected function casts(): array
    {
        return ['effective_from' => 'immutable_date:Y-m-d', 'values' => 'array', 'payment_cents' => 'integer'];
    }
}
