<?php

namespace Database\Factories;

use App\Models\Household;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Household> */
class HouseholdFactory extends Factory
{
    /** @param list<string> $categories */
    public function withCategories(array $categories = ['Pets', 'Home maintenance']): static
    {
        return $this->state(fn (): array => ['categories' => $categories]);
    }

    public function fortnightly(): static
    {
        return $this->state(fn (): array => ['preferred_frequency' => 'fortnightly']);
    }

    /** @return array<string, mixed> */
    public function definition(): array
    {
        return ['name' => fake()->lastName().' household', 'preferred_frequency' => null];
    }
}
