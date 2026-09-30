<?php

namespace App\Models;

use Database\Factories\BillPaymentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['amount_cents', 'paid_on', 'notes'])]
class BillPayment extends Model
{
    /** @use HasFactory<BillPaymentFactory> */
    use HasFactory;

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'amount_cents' => 'integer',
            'paid_on' => 'immutable_date:Y-m-d',
        ];
    }

    /** @return BelongsTo<BudgetItem, $this> */
    public function budgetItem(): BelongsTo
    {
        return $this->belongsTo(BudgetItem::class);
    }
}
