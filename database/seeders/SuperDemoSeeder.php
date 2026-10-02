<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class SuperDemoSeeder extends Seeder
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
        foreach ([['James', 'Example Super', 'Balanced', 12500000, 6, 300000], ['Sasha', 'Future Super', 'Growth', 9800000, 7, 0], ['James', 'Previous employer super', 'Conservative', 850000, 3, 0]] as [$person, $name, $option, $balance, $rate, $sacrifice]) {
            $income = $name === 'Previous employer super' ? null : $household->items()->where('kind', 'income')->where('name', $person.' salary')->first();
            $fund = $household->superFunds()->firstOrCreate(['name' => $name, 'person' => $person], ['member_id' => User::query()->where('email', strtolower($person).'@example.test')->first()?->id, 'investment_option' => $option, 'income_id' => $income?->id, 'employer_rate' => 12, 'salary_sacrifice_cents' => $income === null ? $sacrifice : ($income->salary_sacrifice_cents ?? $sacrifice), 'annual_fee_cents' => 7800, 'fee_rate' => 0.1, 'annual_insurance_cents' => 24000, 'return_rate' => $rate, 'notes' => 'Fictional demo fund and balances.']);
            if ($fund->wasRecentlyCreated) {
                foreach ([12 => 0.84, 6 => 0.92, 0 => 1] as $months => $factor) {
                    $fund->balances()->create(['recorded_on' => now('Australia/Melbourne')->subMonthsNoOverflow($months)->toDateString(), 'balance_cents' => (int) round($balance * $factor), 'notes' => 'Fictional statement balance']);
                }
            }
        }
    }
}
