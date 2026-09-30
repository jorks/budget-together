<?php

namespace Database\Factories;

use App\Models\Account;
use App\Models\Household;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Account> */
class AccountFactory extends Factory
{
    /** @return array<string, mixed> */
    public function definition(): array
    {
        return ['household_id' => Household::factory(), 'name' => 'Everyday spending', 'type' => 'transaction', 'owner' => 'Joint', 'last_four' => '1234', 'purpose' => 'Groceries and everyday costs', 'balance_cents' => 250000];
    }

    public function creditCard(): static
    {
        return $this->state(fn (): array => ['name' => 'Rewards card', 'type' => 'credit_card', 'balance_cents' => -65000, 'credit_limit_cents' => 1000000]);
    }
}
