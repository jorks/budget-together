<?php

namespace App\Models;

use Database\Factories\HouseholdFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** @property list<string>|null $categories */
#[Fillable(['name', 'categories'])]
class Household extends Model
{
    /** @use HasFactory<HouseholdFactory> */
    use HasFactory;

    public const DEFAULT_CATEGORIES = ['Salary', 'Bonus', 'Mortgage', 'Daycare', 'Utilities', 'Subscriptions', 'Insurance', 'Transport', 'Health & fitness', 'Personal', 'Everyday', 'Savings'];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['categories' => 'array'];
    }

    /** @return BelongsToMany<User, $this> */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class);
    }

    /** @return HasMany<Bank, $this> */
    public function banks(): HasMany
    {
        return $this->hasMany(Bank::class);
    }

    /** @return HasMany<Account, $this> */
    public function accounts(): HasMany
    {
        return $this->hasMany(Account::class);
    }

    /** @return HasMany<BudgetItem, $this> */
    public function items(): HasMany
    {
        return $this->hasMany(BudgetItem::class);
    }

    /** @return HasMany<HouseholdInvitation, $this> */
    public function invitations(): HasMany
    {
        return $this->hasMany(HouseholdInvitation::class);
    }
}
