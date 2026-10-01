<?php

namespace Database\Factories;

use App\Models\Account;
use App\Models\Household;
use App\Models\Mortgage;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Mortgage> */
class MortgageFactory extends Factory
{
    /** @return array<string, mixed> */
    public function definition(): array
    {
        return ['household_id' => Household::factory(), 'name' => 'Our home loan', 'balance_cents' => 65000000, 'annual_rate' => 6, 'term_years' => 30, 'frequency' => 'monthly', 'offset_cents' => 0, 'extra_cents' => 0, 'due_date' => null, 'account_id' => null];
    }

    public function scheduled(Account $account, string $date): static
    {
        return $this->state(fn (): array => ['household_id' => $account->household_id, 'account_id' => $account->id, 'due_date' => $date]);
    }

    public function withOffset(): static
    {
        return $this->state(fn (): array => ['offset_cents' => 2000000]);
    }

    public function accelerated(): static
    {
        return $this->withOffset()->state(fn (): array => ['extra_cents' => 30000]);
    }
}
