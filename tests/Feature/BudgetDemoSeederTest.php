<?php

use App\Models\User;
use App\Services\BudgetCalculator;
use Database\Seeders\BudgetDemoSeeder;

test('demo seeding creates a connected household and preserves edits on repeat runs', function () {
    $this->freezeTime();
    $this->seed(BudgetDemoSeeder::class);
    $alex = User::query()->where('email', 'alex@example.test')->firstOrFail();
    $household = $alex->households()->firstOrFail();
    $income = $household->items()->where('name', 'Alex salary')->firstOrFail();
    $income->update(['gross_annual_cents' => 16000000]);

    $this->seed(BudgetDemoSeeder::class);

    expect($household->users()->count())->toBe(2);
    expect($household->items()->count())->toBe(27);
    expect($household->accounts()->count())->toBe(6);
    expect($household->banks()->count())->toBe(2);
    expect($income->fresh()->gross_annual_cents)->toBe(16000000);
    expect($household->items()->where('name', 'Electricity')->firstOrFail()->payments()->count())->toBe(3);
    expect($household->items()->where('has_sinking_fund', true)->count())->toBe(3);
});

test('demo seeding never creates financial fixtures in production', function () {
    app()->detectEnvironment(fn (): string => 'production');

    (new BudgetDemoSeeder)->run();

    $this->assertDatabaseCount('users', 0);
    $this->assertDatabaseCount('households', 0);
    $this->assertDatabaseCount('budget_items', 0);
});

test('demo seeding uses a fictional household with coherent estimated finances', function () {
    $this->freezeTime();

    $this->seed();

    $this->assertDatabaseHas('users', ['name' => 'Alex (demo)', 'email' => 'alex@example.test']);
    $this->assertDatabaseHas('users', ['name' => 'Morgan (demo)', 'email' => 'morgan@example.test']);
    $household = User::query()->where('email', 'alex@example.test')->firstOrFail()->households()->firstOrFail();
    expect($household->name)->toBe('Alex & Morgan · Demo');
    $this->assertDatabaseHas('budget_items', ['household_id' => $household->id, 'name' => 'Alex salary', 'gross_annual_cents' => 15500000, 'bonus_annual_cents' => 750000, 'amount_cents' => 436462]);
    $this->assertDatabaseHas('budget_items', ['household_id' => $household->id, 'name' => 'Morgan salary', 'gross_annual_cents' => 11000000, 'amount_cents' => 324154]);
    $this->assertDatabaseHas('accounts', ['household_id' => $household->id, 'type' => 'mortgage', 'balance_cents' => -85000000]);
    $this->assertDatabaseHas('budget_items', ['household_id' => $household->id, 'name' => 'Mortgage repayment', 'amount_cents' => 520000]);
    $this->assertDatabaseHas('budget_items', ['household_id' => $household->id, 'name' => 'Childcare', 'amount_cents' => 120000]);
    expect($household->items()->where('name', 'Electricity')->firstOrFail()->payments()->orderBy('paid_on', 'desc')->pluck('amount_cents')->all())->toBe([36900, 44280, 42230]);
    $totals = app(BudgetCalculator::class)->totals($household->items);
    expect($totals['income']['annually'])->toBe(19776000);
    expect($totals['remaining']['annually'])->toBeGreaterThan(0);
});
