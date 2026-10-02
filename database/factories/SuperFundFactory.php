<?php

namespace Database\Factories;

use App\Models\Household;
use App\Models\SuperFund;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<SuperFund> */
class SuperFundFactory extends Factory
{
    /** @return array<string, mixed> */
    public function definition(): array
    {
        return ['household_id' => Household::factory(), 'name' => 'Example Super', 'person' => 'James', 'member_number' => null, 'investment_option' => 'Balanced', 'income_id' => null, 'employer_rate' => 12, 'salary_sacrifice_cents' => 0, 'annual_fee_cents' => 7800, 'fee_rate' => 0.1, 'annual_insurance_cents' => 24000, 'return_rate' => 6, 'notes' => null];
    }

    public function lowCost(): static
    {
        return $this->state(fn (): array => ['annual_fee_cents' => 0, 'fee_rate' => 0.05, 'annual_insurance_cents' => 0]);
    }

    public function conservative(): static
    {
        return $this->state(fn (): array => ['investment_option' => 'Conservative', 'return_rate' => 3]);
    }
}
