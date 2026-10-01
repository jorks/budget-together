<?php

namespace Database\Seeders;

use App\Models\Mortgage;
use App\Models\User;
use Illuminate\Database\Seeder;

class MortgageDemoSeeder extends Seeder
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

        $legacy = $household->items()->where('kind', 'bill')->where('name', 'Mortgage repayment')->where('category', 'Mortgage')->first();
        $accountId = $legacy?->account_id ?? $household->accounts()->where('name', 'Bills account')->value('id');
        $household->mortgage()->firstOrCreate([], Mortgage::factory()->for($household)->accelerated()->make([
            'account_id' => $accountId,
            'due_date' => $legacy?->due_date ?? now('Australia/Melbourne')->addDays(2)->toDateString(),
        ])->only(['name', 'balance_cents', 'annual_rate', 'term_years', 'frequency', 'offset_cents', 'extra_cents', 'due_date', 'account_id']));

        $household->items()->where('kind', 'bill')->where('name', 'Mortgage repayment')->where('category', 'Mortgage')->whereDoesntHave('payments')->delete();
    }
}
