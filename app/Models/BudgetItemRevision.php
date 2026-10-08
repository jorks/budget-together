<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Database\Factories\BudgetItemRevisionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** @property CarbonImmutable|null $effective_from */
#[Fillable(['effective_from', 'amount_cents', 'cadence', 'payments_per_year', 'notes'])]
class BudgetItemRevision extends Model
{
    /** @use HasFactory<BudgetItemRevisionFactory> */
    use HasFactory;

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['effective_from' => 'immutable_date:Y-m-d', 'amount_cents' => 'integer', 'payments_per_year' => 'integer'];
    }

    /** @return BelongsTo<BudgetItem, $this> */
    public function budgetItem(): BelongsTo
    {
        return $this->belongsTo(BudgetItem::class);
    }
}
