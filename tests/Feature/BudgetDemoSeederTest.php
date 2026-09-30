<?php

use App\Models\User;
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
