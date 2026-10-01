<?php

use App\Models\BudgetItem;
use App\Models\User;
use App\Services\BudgetCalculator;
use App\Services\HouseholdBudget;
use Carbon\CarbonImmutable;
use Database\Seeders\BudgetDemoSeeder;
use Inertia\Testing\AssertableInertia;

test('demo seeding creates a connected household and preserves edits on repeat runs', function () {
    $this->freezeTime();
    $this->seed(BudgetDemoSeeder::class);
    $james = User::query()->where('email', 'james@example.test')->firstOrFail();
    $household = $james->households()->firstOrFail();
    $income = $household->items()->where('name', 'James salary')->firstOrFail();
    $income->update(['gross_annual_cents' => 16000000, 'category' => null, 'bonus_annual_cents' => 750000]);
    $household->update(['categories' => ['Custom demo category']]);
    $household->mortgage->update(['extra_cents' => 50000]);
    BudgetItem::factory()->for($household)->create(['name' => 'Mortgage repayment', 'category' => 'Mortgage']);

    $this->seed(BudgetDemoSeeder::class);

    expect($household->users()->count())->toBe(2);
    expect($household->mortgage()->count())->toBe(1);
    expect($household->mortgage->fresh()->extra_cents)->toBe(50000);
    expect($household->items()->count())->toBe(27);
    expect($household->accounts()->count())->toBe(6);
    expect($household->banks()->count())->toBe(2);
    expect($income->fresh()->gross_annual_cents)->toBe(16000000);
    expect($income->fresh()->category)->toBe('Salary');
    expect($income->fresh()->bonus_annual_cents)->toBe(0);
    expect($household->fresh()->categories)->toBe(['Custom demo category']);
    expect($household->items()->where('name', 'Electricity')->firstOrFail()->payments()->count())->toBe(3);
    expect($household->items()->where('has_sinking_fund', true)->count())->toBe(3);
});

test('demo seeding never creates financial fixtures in production', function () {
    app()->detectEnvironment(fn (): string => 'production');

    (new BudgetDemoSeeder)->run();

    $this->assertDatabaseCount('users', 0);
    $this->assertDatabaseCount('households', 0);
    $this->assertDatabaseCount('budget_items', 0);
    $this->assertDatabaseCount('mortgages', 0);
});

test('demo seeding uses a demo household with fictional estimated finances', function () {
    $this->travelTo(CarbonImmutable::parse('2026-10-01 12:00:00', 'Australia/Melbourne'));

    $this->seed();

    $this->assertDatabaseHas('users', ['name' => 'James (demo)', 'email' => 'james@example.test']);
    $this->assertDatabaseHas('users', ['name' => 'Sasha (demo)', 'email' => 'sasha@example.test']);
    $household = User::query()->where('email', 'james@example.test')->firstOrFail()->households()->firstOrFail();
    expect($household->name)->toBe('James & Sasha · Demo');
    expect($household->mortgage->balance_cents)->toBe(65000000);
    expect($household->mortgage->offset_cents)->toBe(2000000);
    expect($household->mortgage->extra_cents)->toBe(30000);
    expect($household->items()->where('name', 'James salary')->firstOrFail()->pay_date)->not->toBeNull();
    expect($household->items()->where('name', 'Sasha salary')->firstOrFail()->cadence)->toBe('monthly');
    $this->assertDatabaseHas('budget_items', ['household_id' => $household->id, 'name' => 'James salary', 'gross_annual_cents' => 12000000, 'category' => 'Salary', 'bonus_annual_cents' => 0, 'amount_cents' => 341782]);
    $this->assertDatabaseHas('budget_items', ['household_id' => $household->id, 'name' => 'Sasha salary', 'gross_annual_cents' => 9000000, 'amount_cents' => 589000]);
    $this->assertDatabaseHas('accounts', ['household_id' => $household->id, 'type' => 'mortgage', 'balance_cents' => -65000000]);
    $this->assertDatabaseMissing('budget_items', ['household_id' => $household->id, 'category' => 'Mortgage']);
    expect($household->mortgage->account_id)->toBe($household->accounts()->where('name', 'Bills account')->firstOrFail()->id);
    expect($household->mortgage->due_date->toDateString())->toBe('2026-10-03');
    $this->assertDatabaseHas('budget_items', ['household_id' => $household->id, 'name' => 'Childcare', 'amount_cents' => 70000]);
    expect($household->items()->where('name', 'Electricity')->firstOrFail()->payments()->orderBy('paid_on', 'desc')->pluck('amount_cents')->all())->toBe([30600, 36720, 35020]);
    $this->assertDatabaseHas('budget_items', ['household_id' => $household->id, 'name' => 'Sasha salary', 'category' => 'Salary']);
    $this->assertDatabaseHas('budget_items', ['household_id' => $household->id, 'name' => 'James bonus', 'category' => 'Bonus', 'person' => 'James', 'include_bonus' => false, 'bonus_annual_cents' => 500000, 'amount_cents' => 340000, 'cadence' => 'annually', 'use_tax_estimate' => false]);
    $this->actingAs(User::query()->where('email', 'james@example.test')->firstOrFail())->get(route('income'))->assertInertia(fn (AssertableInertia $page) => $page->where('categories', fn ($categories) => collect($categories)->contains('Salary') && collect($categories)->contains('Bonus')));
    $totals = app(BudgetCalculator::class)->totals(app(HouseholdBudget::class)->items($household));
    expect($totals['income']['annually'])->toBe(15954320);
    expect($totals['bill']['annually'])->toBe(8638696);
    expect($totals['spending']['weekly'])->toBe(71538);
    expect($totals['saving']['monthly'])->toBe(150000);
    expect($totals['remaining']['monthly'])->toBe(149635);
    $this->assertDatabaseHas('budget_items', ['household_id' => $household->id, 'name' => 'Weekly family spending', 'amount_cents' => 60000, 'cadence' => 'weekly']);
    foreach ($household->items->where('has_sinking_fund', true) as $item) {
        expect(app(BudgetCalculator::class)->sinkingFund($item, CarbonImmutable::instance(now()))['on_track'])->toBeTrue();
    }

    $household->items()->where('name', 'James bonus')->firstOrFail()->update(['include_bonus' => true]);

    expect(app(BudgetCalculator::class)->totals(app(HouseholdBudget::class)->items($household))['income']['annually'])->toBe(16294320);
});
