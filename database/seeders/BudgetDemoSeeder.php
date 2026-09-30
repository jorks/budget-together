<?php

namespace Database\Seeders;

use App\Models\Account;
use App\Models\Bank;
use App\Models\BudgetItem;
use App\Models\Household;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class BudgetDemoSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment(['local', 'testing'])) {
            return;
        }

        $james = User::query()->firstOrCreate(['email' => 'james@example.test'], ['name' => 'James (demo)', 'password' => Hash::make('password'), 'email_verified_at' => now()]);
        $sasha = User::query()->firstOrCreate(['email' => 'sasha@example.test'], ['name' => 'Sasha (demo)', 'password' => Hash::make('password'), 'email_verified_at' => now()]);
        $household = $james->households()->first() ?? Household::query()->create(['name' => 'James & Sasha · Demo']);
        $household->users()->syncWithoutDetaching([$james->id, $sasha->id]);
        $bank = $household->banks()->firstOrCreate(['name' => 'Everyday Bank'], ['notes' => 'Demo institution for everyday banking']);
        $secondBank = $household->banks()->firstOrCreate(['name' => 'Future Bank'], ['notes' => 'Demo institution for savings']);
        $everyday = $this->account($household, $bank, 'Everyday spending', 'transaction', 280000, 'Groceries, fuel and family spending');
        $bills = $this->account($household, $bank, 'Bills account', 'transaction', 540000, 'Direct debits and predictable household bills');
        $offset = $this->account($household, $bank, 'Home loan offset', 'offset', 3200000, 'Salary lands here before the fortnightly split');
        $savings = $this->account($household, $secondBank, 'Future us', 'savings', 2200000, 'Emergency fund and bigger goals');
        $card = $this->account($household, $bank, 'Rewards card', 'credit_card', -72000, 'Subscriptions, cleared each month');
        $card->update(['credit_limit_cents' => 600000]);
        $this->account($household, $bank, 'Home mortgage', 'mortgage', -85000000, 'Fictional demo home loan');

        $this->item($household, 'James salary', ['kind' => 'income', 'person' => 'James', 'gross_annual_cents' => 15500000, 'bonus_annual_cents' => 750000, 'amount_cents' => 436462, 'cadence' => 'fortnightly', 'account_id' => $offset->id, 'use_tax_estimate' => true, 'notes' => 'Fictional salary; estimated take-home pay, with bonus excluded from the base plan.']);
        $this->item($household, 'Sasha salary', ['kind' => 'income', 'person' => 'Sasha', 'gross_annual_cents' => 11000000, 'amount_cents' => 324154, 'cadence' => 'fortnightly', 'account_id' => $offset->id, 'use_tax_estimate' => true]);
        $entries = [
            ['Mortgage repayment', 'Mortgage', 520000, 'monthly', false],
            ['Childcare', 'Daycare', 120000, 'fortnightly', false],
            ['Electricity', 'Utilities', 41000, 'quarterly', true],
            ['Gas', 'Utilities', 18000, 'quarterly', true],
            ['Water', 'Utilities', 29000, 'quarterly', true],
            ['Council rates', 'Utilities', 31000, 'custom', false],
            ['Internet', 'Subscriptions', 8900, 'monthly', false],
            ['Mobile plans', 'Subscriptions', 6500, 'monthly', false],
            ['Video streaming', 'Subscriptions', 1500, 'monthly', false],
            ['Sports streaming', 'Subscriptions', 2200, 'monthly', false],
            ['Family streaming', 'Subscriptions', 1800, 'monthly', false],
            ['Movie streaming', 'Subscriptions', 1100, 'monthly', false],
            ['Cloud storage', 'Subscriptions', 900, 'monthly', false],
            ['Music streaming', 'Subscriptions', 2100, 'monthly', false],
            ['Office software', 'Subscriptions', 1600, 'monthly', false],
            ['Health insurance', 'Insurance', 14500, 'fortnightly', false],
            ['Car registration', 'Transport', 26000, 'quarterly', false],
            ['Gym memberships', 'Health & fitness', 7600, 'fortnightly', false],
        ];
        foreach ($entries as $index => [$name, $category, $amount, $cadence, $variable]) {
            $item = $this->item($household, $name, ['category' => $category, 'amount_cents' => $amount, 'cadence' => $cadence, 'payments_per_year' => $cadence === 'custom' ? 10 : null, 'is_variable' => $variable, 'due_date' => now('Australia/Melbourne')->addDays(2 + $index)->toDateString(), 'account_id' => $category === 'Subscriptions' ? $card->id : $bills->id]);
            if ($variable && ! $item->payments()->exists()) {
                foreach ([0.90, 1.08, 1.03] as $quarter => $variance) {
                    $item->payments()->create(['amount_cents' => (int) round($amount * $variance), 'paid_on' => now()->subMonths(($quarter + 1) * 3)->toDateString(), 'notes' => 'Demo quarterly bill']);
                }
            }
        }
        $this->item($household, 'Home insurance', ['category' => 'Insurance', 'amount_cents' => 165000, 'cadence' => 'annually', 'account_id' => $bills->id, 'due_date' => now()->addMonths(7)->toDateString(), 'has_sinking_fund' => true, 'saved_cents' => 42000, 'saving_start_date' => now()->toDateString(), 'contribution_cents' => 4000, 'saving_account_id' => $savings->id]);
        $this->item($household, 'Car insurance', ['category' => 'Transport', 'amount_cents' => 105000, 'cadence' => 'annually', 'account_id' => $bills->id, 'due_date' => now()->addMonths(4)->toDateString(), 'has_sinking_fund' => true, 'saved_cents' => 24000, 'saving_start_date' => now()->toDateString(), 'contribution_cents' => 2800, 'saving_account_id' => $savings->id]);
        $this->item($household, 'Car service', ['category' => 'Transport', 'amount_cents' => 78000, 'cadence' => 'annually', 'is_variable' => true, 'account_id' => $bills->id, 'due_date' => now()->addMonths(2)->toDateString(), 'has_sinking_fund' => true, 'saved_cents' => 38000, 'saving_start_date' => now()->toDateString(), 'contribution_cents' => 3600, 'saving_account_id' => $savings->id]);
        $this->item($household, 'Weekly family spending', ['kind' => 'spending', 'category' => 'Everyday', 'amount_cents' => 85000, 'cadence' => 'weekly', 'account_id' => $everyday->id]);
        $this->item($household, 'James personal', ['kind' => 'spending', 'category' => 'Personal', 'person' => 'James', 'amount_cents' => 32500, 'cadence' => 'monthly', 'account_id' => $everyday->id]);
        $this->item($household, 'Sasha personal', ['kind' => 'spending', 'category' => 'Personal', 'person' => 'Sasha', 'amount_cents' => 32500, 'cadence' => 'monthly', 'account_id' => $everyday->id]);
        $this->item($household, 'Emergency & future fund', ['kind' => 'saving', 'category' => 'Savings', 'amount_cents' => 150000, 'cadence' => 'monthly', 'account_id' => $savings->id]);
    }

    private function account(Household $household, Bank $bank, string $name, string $type, int $balance, string $purpose): Account
    {
        return $household->accounts()->firstOrCreate(['name' => $name], ['bank_id' => $bank->id, 'type' => $type, 'owner' => 'Joint', 'balance_cents' => $balance, 'purpose' => $purpose, 'last_four' => '4826']);
    }

    /** @param array<string, mixed> $attributes */
    private function item(Household $household, string $name, array $attributes): BudgetItem
    {
        return $household->items()->firstOrCreate(['name' => $name], array_replace(['kind' => 'bill', 'amount_cents' => 0, 'cadence' => 'monthly', 'is_active' => true, 'contribution_cadence' => 'weekly', 'tax_year' => 2026], $attributes));
    }
}
