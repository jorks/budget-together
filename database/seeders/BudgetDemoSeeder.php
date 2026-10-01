<?php

namespace Database\Seeders;

use App\Models\Account;
use App\Models\Bank;
use App\Models\BudgetItem;
use App\Models\Household;
use App\Models\User;
use App\Services\AustralianTaxEstimator;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class BudgetDemoSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment(['local', 'testing'])) {
            return;
        }

        $james = User::query()->firstOrCreate(['email' => 'james@example.test'], ['name' => 'James (demo)', 'preferred_frequency' => 'fortnightly', 'password' => Hash::make('password'), 'email_verified_at' => now()]);
        $sasha = User::query()->firstOrCreate(['email' => 'sasha@example.test'], ['name' => 'Sasha (demo)', 'password' => Hash::make('password'), 'email_verified_at' => now()]);
        $household = $james->households()->first() ?? Household::query()->create(['name' => 'James & Sasha · Demo']);
        if ($household->categories === null) {
            $household->update(['categories' => ['Pets', 'Home maintenance']]);
        }
        $household->users()->syncWithoutDetaching([$james->id, $sasha->id]);
        $bank = $household->banks()->firstOrCreate(['name' => 'Everyday Bank'], ['notes' => 'Demo institution for everyday banking']);
        $secondBank = $household->banks()->firstOrCreate(['name' => 'Future Bank'], ['notes' => 'Demo institution for savings']);
        $everyday = $this->account($household, $bank, 'Everyday spending', 'transaction', 180000, 'Groceries, fuel and family spending');
        $bills = $this->account($household, $bank, 'Bills account', 'transaction', 420000, 'Direct debits and predictable household bills');
        $offset = $this->account($household, $bank, 'Home loan offset', 'offset', 2000000, 'Salary lands here before the fortnightly split');
        $savings = $this->account($household, $secondBank, 'Future us', 'savings', 1500000, 'Emergency fund and bigger goals');
        $card = $this->account($household, $bank, 'Rewards card', 'credit_card', -45000, 'Subscriptions, cleared each month');
        $card->update(['credit_limit_cents' => 400000]);
        $this->account($household, $bank, 'Home mortgage', 'mortgage', -65000000, 'Fictional $650,000 loan; repayments assume approximately 6% interest over 30 years');

        $this->item($household, 'James salary', ['kind' => 'income', 'category' => 'Salary', 'person' => 'James', 'pay_date' => now('Australia/Melbourne')->startOfMonth()->addDays(8)->toDateString(), 'salary_sacrifice_cents' => 300000, 'workplace_giving_cents' => 26000, 'gross_annual_cents' => 12000000, 'bonus_annual_cents' => 0, 'amount_cents' => 341782, 'cadence' => 'fortnightly', 'account_id' => $offset->id, 'use_tax_estimate' => true, 'notes' => 'Fictional salary; estimated take-home pay, with bonus excluded from the base plan.']);
        $this->item($household, 'Sasha salary', ['kind' => 'income', 'category' => 'Salary', 'person' => 'Sasha', 'pay_date' => now('Australia/Melbourne')->startOfMonth()->addDays(14)->toDateString(), 'gross_annual_cents' => 9000000, 'amount_cents' => 589000, 'cadence' => 'monthly', 'account_id' => $offset->id, 'use_tax_estimate' => true]);
        $household->items()->whereIn('name', ['James salary', 'Sasha salary'])->whereNull('category')->update(['category' => 'Salary']);
        $jamesSalary = $household->items()->where('name', 'James salary')->firstOrFail();
        if (! $jamesSalary->include_bonus && $jamesSalary->bonus_annual_cents === 750000) {
            $jamesSalary->update(['bonus_annual_cents' => 0]);
        }
        $tax = app(AustralianTaxEstimator::class);
        $baseTakeHome = $tax->estimate($jamesSalary->gross_annual_cents, $jamesSalary->tax_year, $jamesSalary->include_medicare, $jamesSalary->salary_sacrifice_cents ?? 0, $jamesSalary->workplace_giving_cents ?? 0, $jamesSalary->other_deductions_cents ?? 0)['net_cents'];
        $withBonusTakeHome = $tax->estimate($jamesSalary->gross_annual_cents + 500000, $jamesSalary->tax_year, $jamesSalary->include_medicare, $jamesSalary->salary_sacrifice_cents ?? 0, $jamesSalary->workplace_giving_cents ?? 0, $jamesSalary->other_deductions_cents ?? 0)['net_cents'];
        $this->item($household, 'James bonus', ['kind' => 'income', 'category' => 'Bonus', 'person' => 'James', 'include_bonus' => false, 'bonus_annual_cents' => 500000, 'amount_cents' => $withBonusTakeHome - $baseTakeHome, 'cadence' => 'annually', 'pay_date' => now('Australia/Melbourne')->addMonths(2)->toDateString(), 'account_id' => $offset->id, 'use_tax_estimate' => false, 'notes' => 'Fictional annual bonus of $5,000 before tax. Take-home estimated at James’s marginal tax rate, including Medicare; entered separately from salary.']);
        $entries = [
            ['Mortgage repayment', 'Mortgage', 390000, 'monthly', false],
            ['Childcare', 'Daycare', 70000, 'fortnightly', false],
            ['Electricity', 'Utilities', 34000, 'quarterly', true],
            ['Gas', 'Utilities', 14000, 'quarterly', true],
            ['Water', 'Utilities', 22000, 'quarterly', true],
            ['Council rates', 'Utilities', 25000, 'custom', false],
            ['Internet', 'Subscriptions', 8900, 'monthly', false],
            ['Mobile plans', 'Subscriptions', 6500, 'monthly', false],
            ['Video streaming', 'Subscriptions', 1500, 'monthly', false],
            ['Sports streaming', 'Subscriptions', 2200, 'monthly', false],
            ['Family streaming', 'Subscriptions', 1800, 'monthly', false],
            ['Movie streaming', 'Subscriptions', 1100, 'monthly', false],
            ['Cloud storage', 'Subscriptions', 900, 'monthly', false],
            ['Music streaming', 'Subscriptions', 2100, 'monthly', false],
            ['Office software', 'Subscriptions', 1600, 'monthly', false],
            ['Health insurance', 'Insurance', 12500, 'fortnightly', false],
            ['Car registration', 'Transport', 26000, 'quarterly', false],
            ['Gym memberships', 'Health & fitness', 6000, 'fortnightly', false],
        ];
        foreach ($entries as $index => [$name, $category, $amount, $cadence, $variable]) {
            $item = $this->item($household, $name, ['category' => $category, 'amount_cents' => $amount, 'cadence' => $cadence, 'payments_per_year' => $cadence === 'custom' ? 10 : null, 'is_variable' => $variable, 'due_date' => now('Australia/Melbourne')->addDays(2 + $index)->toDateString(), 'account_id' => $category === 'Subscriptions' ? $card->id : $bills->id]);
            if ($variable && ! $item->payments()->exists()) {
                foreach ([0.90, 1.08, 1.03] as $quarter => $variance) {
                    $item->payments()->create(['amount_cents' => (int) round($amount * $variance), 'paid_on' => now()->subMonths(($quarter + 1) * 3)->toDateString(), 'notes' => 'Demo quarterly bill']);
                }
            }
        }
        $this->item($household, 'Home insurance', ['category' => 'Insurance', 'amount_cents' => 165000, 'cadence' => 'annually', 'account_id' => $bills->id, 'due_date' => now()->addMonths(7)->toDateString(), 'has_sinking_fund' => true, 'saved_cents' => 42000, 'saving_start_date' => now()->toDateString(), 'contribution_cents' => 4500, 'saving_account_id' => $savings->id]);
        $this->item($household, 'Car insurance', ['category' => 'Transport', 'amount_cents' => 105000, 'cadence' => 'annually', 'account_id' => $bills->id, 'due_date' => now()->addMonths(4)->toDateString(), 'has_sinking_fund' => true, 'saved_cents' => 24000, 'saving_start_date' => now()->toDateString(), 'contribution_cents' => 5500, 'saving_account_id' => $savings->id]);
        $this->item($household, 'Car service', ['category' => 'Transport', 'amount_cents' => 78000, 'cadence' => 'annually', 'is_variable' => true, 'account_id' => $bills->id, 'due_date' => now()->addMonths(2)->toDateString(), 'has_sinking_fund' => true, 'saved_cents' => 38000, 'saving_start_date' => now()->toDateString(), 'contribution_cents' => 5000, 'saving_account_id' => $savings->id]);
        $this->item($household, 'Weekly family spending', ['kind' => 'spending', 'category' => 'Everyday', 'amount_cents' => 60000, 'cadence' => 'weekly', 'account_id' => $everyday->id]);
        $this->item($household, 'James personal', ['kind' => 'spending', 'category' => 'Personal', 'person' => 'James', 'amount_cents' => 25000, 'cadence' => 'monthly', 'account_id' => $everyday->id]);
        $this->item($household, 'Sasha personal', ['kind' => 'spending', 'category' => 'Personal', 'person' => 'Sasha', 'amount_cents' => 25000, 'cadence' => 'monthly', 'account_id' => $everyday->id]);
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
