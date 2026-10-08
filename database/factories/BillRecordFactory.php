<?php

namespace Database\Factories;

use App\Models\BillRecord;
use App\Models\BudgetItem;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/** @extends Factory<BillRecord> */
class BillRecordFactory extends Factory
{
    /** @return array<string, mixed> */
    public function definition(): array
    {
        $end = now('Australia/Melbourne')->subDays(7)->startOfDay();

        return ['budget_item_id' => BudgetItem::factory()->variable(), 'entry_key' => (string) Str::uuid(), 'amount_cents' => 36500, 'billed_on' => $end->toDateString(), 'period_start' => $end->copy()->subMonthsNoOverflow(3)->addDay()->toDateString(), 'period_end' => $end->toDateString(), 'due_on' => $end->copy()->addDays(14)->toDateString(), 'paid_on' => null, 'expected_amount_cents' => 34000, 'expected_cadence' => 'quarterly', 'notes' => 'Quarterly electricity bill'];
    }

    public function paid(): static
    {
        return $this->state(fn (): array => ['paid_on' => now('Australia/Melbourne')->toDateString()]);
    }

    public function withoutPeriod(): static
    {
        return $this->state(fn (): array => ['period_start' => null, 'period_end' => null]);
    }
}
