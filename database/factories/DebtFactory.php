<?php

namespace Database\Factories;

use App\Models\Debt;
use App\Models\Household;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Debt> */
class DebtFactory extends Factory
{
    /** @return array<string, mixed> */
    public function definition(): array
    {
        return ['household_id' => Household::factory(), 'name' => 'Family car loan', 'type' => 'car_loan', 'lender' => 'Example Auto Finance', 'balance_cents' => 2450000, 'annual_rate' => 7.49, 'repayment_cents' => 49500, 'extra_cents' => 5000, 'frequency' => 'monthly', 'due_date' => null, 'account_id' => null, 'is_active' => true, 'notes' => null];
    }

    public function creditCard(): static
    {
        return $this->state(fn (): array => ['name' => 'Credit card balance', 'type' => 'credit_card', 'lender' => 'Example Card Bank', 'balance_cents' => 320000, 'annual_rate' => 19.99, 'repayment_cents' => 15000, 'extra_cents' => 10000]);
    }

    public function personalLoan(): static
    {
        return $this->state(fn (): array => ['name' => 'Personal loan', 'type' => 'personal_loan', 'lender' => 'Example Personal Finance', 'balance_cents' => 850000, 'annual_rate' => 10.99, 'repayment_cents' => 14000, 'extra_cents' => 0, 'frequency' => 'fortnightly']);
    }

    public function buyNowPayLater(): static
    {
        return $this->state(fn (): array => ['name' => 'Appliance instalments', 'type' => 'buy_now_pay_later', 'lender' => 'Example Instalments', 'balance_cents' => 60000, 'annual_rate' => 0, 'repayment_cents' => 15000, 'extra_cents' => 0, 'frequency' => 'fortnightly']);
    }

    public function paidOff(): static
    {
        return $this->state(fn (): array => ['balance_cents' => 0, 'is_active' => false]);
    }
}
