<?php

namespace Database\Factories;

use App\Models\Debt;
use App\Models\FinancialChange;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<FinancialChange> */
class FinancialChangeFactory extends Factory
{
    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'debt_id' => Debt::factory(),
            'effective_from' => now('Australia/Melbourne')->subMonth()->toDateString(),
            'event_type' => 'balance',
            'values' => ['balance_cents' => 2250000, 'annual_rate' => 7.49, 'repayment_cents' => 49500, 'extra_cents' => 5000, 'frequency' => 'monthly', 'due_date' => null],
            'payment_cents' => null,
            'notes' => 'Balance from monthly lender statement.',
        ];
    }

    public function extraPayment(): static
    {
        return $this->state(fn (): array => ['event_type' => 'extra_payment', 'payment_cents' => 100000, 'notes' => 'Additional payment from annual bonus.']);
    }

    public function scheduled(): static
    {
        return $this->state(fn (): array => ['effective_from' => now('Australia/Melbourne')->addMonth()->startOfMonth()->toDateString(), 'event_type' => 'rate_change', 'values' => ['balance_cents' => 2250000, 'annual_rate' => 6.99, 'repayment_cents' => 49500, 'extra_cents' => 5000, 'frequency' => 'monthly', 'due_date' => null], 'notes' => 'New rate announced by the lender.']);
    }
}
