<?php

namespace Database\Factories;

use App\Models\BillPayment;
use App\Models\BudgetItem;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<BillPayment> */
class BillPaymentFactory extends Factory
{
    /** @return array<string, mixed> */
    public function definition(): array
    {
        return ['budget_item_id' => BudgetItem::factory()->variable(), 'amount_cents' => 36500, 'paid_on' => now()->toDateString(), 'notes' => 'Quarterly electricity bill'];
    }
}
