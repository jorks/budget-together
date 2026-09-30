<?php

namespace Database\Factories;

use App\Models\Bank;
use App\Models\Household;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Bank> */
class BankFactory extends Factory
{
    /** @return array<string, mixed> */
    public function definition(): array
    {
        return ['household_id' => Household::factory(), 'name' => fake()->randomElement(['Everyday Bank', 'Coastal Credit Union', 'Community Bank']), 'notes' => null];
    }
}
