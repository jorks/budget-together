<?php

namespace App\Models;

use Database\Factories\HouseholdInvitationFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['email', 'token', 'expires_at', 'accepted_at'])]
class HouseholdInvitation extends Model
{
    /** @use HasFactory<HouseholdInvitationFactory> */
    use HasFactory;

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'expires_at' => 'immutable_datetime',
            'accepted_at' => 'immutable_datetime',
        ];
    }

    /** @return BelongsTo<Household, $this> */
    public function household(): BelongsTo
    {
        return $this->belongsTo(Household::class);
    }
}
