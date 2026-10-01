<?php

use App\Models\Account;
use App\Models\BudgetItem;
use App\Models\Household;
use App\Models\User;
use App\Services\BudgetCalculator;
use Carbon\CarbonImmutable;
use Inertia\Testing\AssertableInertia as Assert;

function feedbackIncome(array $changes = []): array
{
    return array_replace([
        'kind' => 'income', 'name' => 'Salary', 'amount_cents' => 300000, 'cadence' => 'fortnightly',
        'is_active' => true, 'is_variable' => false, 'use_tax_estimate' => true,
        'gross_annual_cents' => 10000000, 'bonus_annual_cents' => 1000000, 'include_bonus' => false,
        'include_medicare' => true, 'tax_year' => 2026, 'has_sinking_fund' => false,
        'saved_cents' => 0, 'contribution_cadence' => 'weekly', 'pay_date' => '2026-10-09',
        'salary_sacrifice_cents' => 600000, 'workplace_giving_cents' => 100000, 'other_deductions_cents' => 120000,
    ], $changes);
}

test('members can rename their household and a person without changing login details', function () {
    $member = User::factory()->create(['name' => 'Alex']);
    $household = Household::factory()->hasAttached($member)->hasAttached(User::factory())->create();
    $income = BudgetItem::factory()->for($household)->income()->create(['person' => 'Alex']);
    $account = Account::factory()->for($household)->create(['owner' => 'Alex']);
    $email = $member->email;

    $this->actingAs($household->users()->whereKeyNot($member->id)->first())->put(route('household.update'), ['name' => 'Our family'])->assertRedirect();
    expect($household->fresh()->name)->toBe('Our family');
    $this->put(route('household.member', $member), ['name' => 'Alexander', 'email' => 'changed@example.test'])->assertRedirect();
    expect($member->fresh())->name->toBe('Alexander')->email->toBe($email);
    expect($income->fresh()->person)->toBe('Alexander');
    expect($account->fresh()->owner)->toBe('Alexander');
});

test('member edits reject outsiders and invalid names', function () {
    $household = Household::factory()->hasAttached(User::factory())->create();
    $other = User::factory()->create(['name' => 'Private person']);

    $this->actingAs($household->users->first())->put(route('household.member', $other), ['name' => 'Changed'])->assertNotFound();
    expect($other->fresh()->name)->toBe('Private person');
    $this->put(route('household.member', $household->users->first()), ['name' => ''])->assertSessionHasErrors('name');
    $this->put(route('household.update'), ['name' => ''])->assertSessionHasErrors('name');
});

test('categories are available before bills exist and saved independently within a household', function () {
    $household = Household::factory()->hasAttached(User::factory())->create();
    $other = Household::factory()->withCategories(['Private category'])->create();
    $this->actingAs($household->users->first())->get(route('bills'))->assertInertia(fn (Assert $page) => $page->where('categories', fn ($categories) => in_array('Utilities', $categories->all()) && ! in_array('Private category', $categories->all())));

    $this->post(route('categories.store'), ['name' => '  Pets  '])->assertRedirect();
    $this->post(route('categories.store'), ['name' => 'pets'])->assertRedirect();
    $this->post(route('categories.store'), ['name' => 'utilities'])->assertRedirect();
    expect($household->fresh()->categories)->toBe(['Pets']);
    expect($other->fresh()->categories)->toBe(['Private category']);
    $this->get(route('bills'))->assertInertia(fn (Assert $page) => $page->where('categories', fn ($categories) => in_array('Pets', $categories->all())));
    $this->post(route('categories.store'), ['name' => ' '])->assertSessionHasErrors('name');
    $this->assertDatabaseCount('budget_items', 0);
});

test('income saves deductions and schedules estimated take home on fortnightly pay dates', function () {
    $household = Household::factory()->hasAttached(User::factory())->create();
    $this->actingAs($household->users->first())->post(route('budget-items.store'), feedbackIncome())->assertRedirect();
    $item = $household->items()->firstOrFail();
    expect($item)->salary_sacrifice_cents->toBe(600000)->workplace_giving_cents->toBe(100000)->other_deductions_cents->toBe(120000);

    $this->get(route('calendar', ['month' => '2026-10']))->assertInertia(fn (Assert $page) => $page
        ->has('events', 2)->where('events.0.kind', 'income')->where('events.0.date', '2026-10-09')
        ->where('events.1.date', '2026-10-23')->where('events.0.amount_cents', 275077)
        ->where('items.0.tax_estimate.taxable_cents', 9300000)->where('totals.income.annually', 7152000));
    $this->put(route('budget-items.update', $item), feedbackIncome(['use_tax_estimate' => false, 'cadence' => 'monthly', 'pay_date' => '2026-10-15']))->assertRedirect();
    $this->get(route('calendar', ['month' => '2026-11']))->assertInertia(fn (Assert $page) => $page->has('events', 1)->where('events.0.date', '2026-11-15')->where('events.0.amount_cents', 300000));
});

test('income rejects invalid deductions and pay dates without creating a record', function (array $changes, string $error) {
    $household = Household::factory()->hasAttached(User::factory())->create();

    $this->actingAs($household->users->first())->post(route('budget-items.store'), feedbackIncome($changes))->assertSessionHasErrors($error);
    $this->assertDatabaseCount('budget_items', 0);
})->with([
    'negative sacrifice' => [['salary_sacrifice_cents' => -1], 'salary_sacrifice_cents'],
    'fractional giving' => [['workplace_giving_cents' => 1.5], 'workplace_giving_cents'],
    'negative payroll deduction' => [['other_deductions_cents' => -1], 'other_deductions_cents'],
    'deductions exceed gross' => [['salary_sacrifice_cents' => 10000000], 'salary_sacrifice_cents'],
    'invalid pay date' => [['pay_date' => '2026-02-30'], 'pay_date'],
]);

test('income tax treats after tax deductions separately and includes a bonus only when selected', function () {
    $item = BudgetItem::factory()->salarySacrifice()->make(feedbackIncome());
    $calculator = app(BudgetCalculator::class);
    expect($calculator->present($item, CarbonImmutable::parse('2026-10-01'))['tax_estimate'])->toMatchArray([
        'gross_cents' => 10000000, 'taxable_cents' => 9300000, 'deductions_cents' => 820000,
        'tax_cents' => 1842000, 'medicare_cents' => 186000, 'net_cents' => 7152000,
    ]);
    $item->include_bonus = true;
    expect($calculator->annual($item))->toBe(7832000);
    $item->use_tax_estimate = false;
    expect($calculator->annual($item))->toBe(7800000);
});

test('financial year follows Melbourne July boundary and exposes its marginal rates', function (string $date, int $year, int $rate) {
    $this->travelTo(CarbonImmutable::parse($date, 'Australia/Melbourne'));
    $household = Household::factory()->hasAttached(User::factory())->create();

    $this->actingAs($household->users->first())->get(route('income'))->assertInertia(fn (Assert $page) => $page->where('financialYear', $year)->where("taxBrackets.$year.1.rate", $rate));
})->with([['2026-06-30 23:59:00', 2025, 16], ['2026-07-01 00:00:00', 2026, 15], ['2027-07-01 00:00:00', 2027, 14]]);

test('paused income and income without a known pay date do not create calendar events', function () {
    $household = Household::factory()->hasAttached(User::factory())->create();
    BudgetItem::factory()->for($household)->income()->create(['pay_date' => null]);
    BudgetItem::factory()->for($household)->income()->create(['is_active' => false]);

    $this->actingAs($household->users->first())->get(route('calendar', ['month' => '2026-10']))->assertInertia(fn (Assert $page) => $page->has('events', 0));
});

test('guests cannot rename people households or add categories', function () {
    $member = User::factory()->create();

    $this->put(route('household.update'), ['name' => 'Changed'])->assertRedirect(route('login'));
    $this->put(route('household.member', $member), ['name' => 'Changed'])->assertRedirect(route('login'));
    $this->post(route('categories.store'), ['name' => 'Pets'])->assertRedirect(route('login'));
});
