<?php

namespace Database\Seeders;

use App\Models\Debt;
use App\Models\User;
use Illuminate\Database\Seeder;

class DebtDemoSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment(['local', 'testing'])) {
            return;
        }
        $household = User::query()->where('email', 'james@example.test')->first()?->households()->first();
        if ($household === null) {
            return;
        }
        $accountId = $household->accounts()->where('name', 'Bills account')->value('id');
        foreach ([Debt::factory(), Debt::factory()->creditCard(), Debt::factory()->personalLoan(), Debt::factory()->buyNowPayLater(), Debt::factory()->paidOff()->state(['name' => 'Paid-off furniture loan', 'type' => 'other', 'lender' => 'Example Retail Finance'])] as $index => $factory) {
            $data = $factory->make(['household_id' => $household->id, 'account_id' => $accountId, 'due_date' => now('Australia/Melbourne')->addDays(3 + $index * 3)->toDateString(), 'notes' => 'Fictional demo debt. Replace with details from your lender statement.'])->getAttributes();
            unset($data['household_id']);
            $household->debts()->firstOrCreate(['name' => $data['name']], $data);
        }
    }
}
