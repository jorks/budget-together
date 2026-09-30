<?php

namespace App\Models;

use Database\Factories\AccountFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['bank_id', 'name', 'type', 'owner', 'last_four', 'purpose', 'balance_cents', 'credit_limit_cents'])]
class Account extends Model
{
    /** @use HasFactory<AccountFactory> */
    use HasFactory;

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'balance_cents' => 'integer',
            'credit_limit_cents' => 'integer',
        ];
    }

    /** @return BelongsTo<Household, $this> */
    public function household(): BelongsTo
    {
        return $this->belongsTo(Household::class);
    }

    /** @return BelongsTo<Bank, $this> */
    public function bank(): BelongsTo
    {
        return $this->belongsTo(Bank::class);
    }
}
