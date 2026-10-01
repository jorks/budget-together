<?php

namespace Database\Factories;

use App\Models\BudgetItem;
use App\Models\Household;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<BudgetItem> */
class BudgetItemFactory extends Factory
{
    /** @return array<string, mixed> */
    public function definition(): array
    {
        return ['household_id' => Household::factory(), 'kind' => 'bill', 'name' => 'Home internet', 'category' => 'Utilities', 'amount_cents' => 8900, 'cadence' => 'monthly', 'due_date' => now()->addMonth()->toDateString(), 'is_active' => true, 'is_variable' => false, 'has_sinking_fund' => false, 'saved_cents' => 0, 'contribution_cadence' => 'weekly', 'tax_year' => 2026, 'include_medicare' => true, 'include_bonus' => false, 'use_tax_estimate' => false];
    }

    public function income(): static
    {
        return $this->state(fn (): array => ['kind' => 'income', 'pay_date' => '2026-10-09', 'due_date' => null, 'name' => 'Salary', 'person' => 'James', 'category' => 'Salary', 'amount_cents' => 520000, 'cadence' => 'fortnightly', 'gross_annual_cents' => 20000000]);
    }

    public function bonus(): static
    {
        return $this->income()->state(fn (): array => ['name' => 'James bonus', 'category' => 'Bonus', 'cadence' => 'annually', 'gross_annual_cents' => null, 'bonus_annual_cents' => 1000000, 'amount_cents' => 610000, 'notes' => 'Annual bonus of $10,000 before tax; estimated $6,100 take-home on a $155,000 salary.']);
    }

    public function salarySacrifice(): static
    {
        return $this->income()->state(fn (): array => ['use_tax_estimate' => true, 'salary_sacrifice_cents' => 600000, 'workplace_giving_cents' => 52000, 'other_deductions_cents' => 12000]);
    }

    public function variable(): static
    {
        return $this->state(fn (): array => ['name' => 'Electricity', 'is_variable' => true, 'amount_cents' => 34000, 'cadence' => 'quarterly']);
    }

    public function sinkingFund(): static
    {
        return $this->state(fn (): array => ['name' => 'Home insurance', 'category' => 'Insurance', 'amount_cents' => 180000, 'cadence' => 'annually', 'due_date' => now()->addMonths(9)->toDateString(), 'has_sinking_fund' => true, 'saved_cents' => 30000, 'saving_start_date' => now()->toDateString()]);
    }

    public function allowance(): static
    {
        return $this->state(fn (): array => ['kind' => 'spending', 'name' => 'Groceries and everyday', 'amount_cents' => 100000, 'cadence' => 'weekly', 'due_date' => null]);
    }

    public function savings(): static
    {
        return $this->state(fn (): array => ['kind' => 'saving', 'name' => 'Emergency fund', 'amount_cents' => 120000, 'cadence' => 'monthly', 'due_date' => null]);
    }
}
