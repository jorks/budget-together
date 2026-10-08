<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Database\Factories\BillRecordFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property CarbonImmutable $billed_on
 * @property CarbonImmutable|null $period_start
 * @property CarbonImmutable|null $period_end
 * @property CarbonImmutable|null $due_on
 * @property CarbonImmutable|null $paid_on
 */
#[Fillable(['entry_key', 'amount_cents', 'billed_on', 'period_start', 'period_end', 'due_on', 'paid_on', 'expected_amount_cents', 'expected_cadence', 'notes'])]
class BillRecord extends Model
{
    /** @use HasFactory<BillRecordFactory> */
    use HasFactory;

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['amount_cents' => 'integer', 'expected_amount_cents' => 'integer', 'billed_on' => 'immutable_date:Y-m-d', 'period_start' => 'immutable_date:Y-m-d', 'period_end' => 'immutable_date:Y-m-d', 'due_on' => 'immutable_date:Y-m-d', 'paid_on' => 'immutable_date:Y-m-d'];
    }

    /** @return BelongsTo<BudgetItem, $this> */
    public function budgetItem(): BelongsTo
    {
        return $this->belongsTo(BudgetItem::class);
    }
}
