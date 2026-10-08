<?php

namespace Database\Factories;

use App\Models\BudgetItem;
use App\Models\BudgetItemRevision;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<BudgetItemRevision> */
class BudgetItemRevisionFactory extends Factory
{
    /** @return array<string, mixed> */
    public function definition(): array
    {
        return ['budget_item_id' => BudgetItem::factory(), 'effective_from' => now('Australia/Melbourne')->toDateString(), 'amount_cents' => 9900, 'cadence' => 'monthly', 'payments_per_year' => null, 'notes' => 'Provider price increase'];
    }

    public function baseline(): static
    {
        return $this->state(fn (): array => ['effective_from' => null, 'amount_cents' => 8900, 'notes' => 'Starting plan']);
    }

    public function scheduled(): static
    {
        return $this->state(fn (): array => ['effective_from' => now('Australia/Melbourne')->addMonth()->toDateString()]);
    }
}
