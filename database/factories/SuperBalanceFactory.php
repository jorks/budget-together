<?php

namespace Database\Factories;

use App\Models\SuperBalance;
use App\Models\SuperFund;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<SuperBalance> */
class SuperBalanceFactory extends Factory
{
    /** @return array<string, mixed> */
    public function definition(): array
    {
        return ['super_fund_id' => SuperFund::factory(), 'recorded_on' => now('Australia/Melbourne')->toDateString(), 'balance_cents' => 12500000, 'notes' => 'Balance from fund statement'];
    }

    public function yearAgo(): static
    {
        return $this->state(fn (): array => ['recorded_on' => now('Australia/Melbourne')->subYear()->toDateString(), 'balance_cents' => 11000000]);
    }
}
