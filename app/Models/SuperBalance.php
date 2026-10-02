<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Database\Factories\SuperBalanceFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** @property CarbonImmutable $recorded_on */
#[Fillable(['recorded_on', 'balance_cents', 'notes'])]
class SuperBalance extends Model
{
    /** @use HasFactory<SuperBalanceFactory> */
    use HasFactory;

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['recorded_on' => 'immutable_date:Y-m-d', 'balance_cents' => 'integer'];
    }

    /** @return BelongsTo<SuperFund, $this> */
    public function superFund(): BelongsTo
    {
        return $this->belongsTo(SuperFund::class);
    }
}
