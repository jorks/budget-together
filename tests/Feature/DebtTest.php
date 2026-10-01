<?php

use App\Models\Account;
use App\Models\Debt;
use App\Models\Household;
use App\Models\HouseholdInvitation;
use App\Models\Mortgage;
use App\Models\User;
use App\Services\DebtCalculator;
use App\Services\HouseholdBudget;
use Database\Seeders\DebtDemoSeeder;
use Inertia\Testing\AssertableInertia as Assert;

test('families can add edit and remove their own debts', function () {
    $household = Household::factory()->hasAttached(User::factory())->create(['debts_enabled' => true]);
    $account = Account::factory()->for($household)->create();
    $payload = Debt::factory()->creditCard()->raw(['household_id' => $household->id, 'account_id' => $account->id]);

    $this->actingAs($household->users->first())->post(route('debts.store'), $payload)->assertRedirect(route('debts.index'));

    $debt = $household->debts()->firstOrFail();
    $this->assertDatabaseHas('debts', ['id' => $debt->id, 'household_id' => $household->id, 'type' => 'credit_card', 'balance_cents' => 320000]);
    $this->put(route('debts.update', $debt), array_replace($payload, ['balance_cents' => 300000]))->assertRedirect(route('debts.index'));
    expect($debt->fresh()->balance_cents)->toBe(300000);
    $this->delete(route('debts.destroy', $debt))->assertRedirect(route('debts.index'));
    $this->assertModelMissing($debt);
});

test('all budget views include debt repayments once with account and calendar links', function (string $route) {
    $this->travelTo(now('Australia/Melbourne')->setDate(2026, 10, 1));
    $household = Household::factory()->hasAttached(User::factory())->create(['debts_enabled' => true]);
    $account = Account::factory()->for($household)->create();
    $debt = Debt::factory()->for($household)->create(['account_id' => $account->id, 'due_date' => '2026-10-15']);
    Debt::factory()->for($household)->paidOff()->create();
    Debt::factory()->for($household)->create(['is_active' => false]);
    Debt::factory()->create(['name' => 'Private debt']);

    $this->actingAs($household->users->first())->get(route($route, ['month' => '2026-10']))->assertInertia(fn (Assert $page) => $page
        ->has('items', 1)->where('items.0.source', 'debt')->where('items.0.amount_cents', 54500)
        ->where('items.0.id', -(1000000000 + $debt->id))->where('items.0.account.id', $account->id)
        ->where('totals.bill.annually', 654000)->where('categoryTotals.0.category', 'Debts & financing')
        ->has('events', 1)->where('events.0.source', 'debt')->where('events.0.date', '2026-10-15'));
    $this->assertDatabaseCount('budget_items', 0);
})->with(['dashboard', 'bills', 'plan', 'calendar', 'accounts', 'income', 'funds', 'household']);

test('debt pages show only family debts and payoff projections', function () {
    $household = Household::factory()->hasAttached(User::factory())->create(['debts_enabled' => true]);
    Debt::factory()->for($household)->buyNowPayLater()->create();
    Debt::factory()->create();

    $this->actingAs($household->users->first())->get(route('debts.index'))->assertInertia(fn (Assert $page) => $page
        ->component('debts/index')->has('debts', 1)->where('debts.0.projection.periods', 4)->where('debts.0.projection.interest_cents', 0));
});

test('other families cannot edit or delete debt records', function () {
    $household = Household::factory()->hasAttached(User::factory())->create(['debts_enabled' => true]);
    $debt = Debt::factory()->create();
    $payload = $debt->getAttributes();

    $this->actingAs($household->users->first())->put(route('debts.update', $debt), $payload)->assertNotFound();
    $this->delete(route('debts.destroy', $debt))->assertNotFound();

    $this->assertModelExists($debt);
    expect($debt->fresh()->household_id)->toBe($debt->household_id);
});

test('debt endpoints require authentication', function () {
    $debt = Debt::factory()->create();

    $this->get(route('debts.index'))->assertRedirect(route('login'));
    $this->post(route('debts.store'), [])->assertRedirect(route('login'));
    $this->put(route('debts.update', $debt), [])->assertRedirect(route('login'));
    $this->delete(route('debts.destroy', $debt))->assertRedirect(route('login'));
    $this->assertModelExists($debt);
});

test('invalid debt details are rejected without creating a debt', function (array $changes, string $field) {
    $household = Household::factory()->hasAttached(User::factory())->create(['debts_enabled' => true]);
    $payload = Debt::factory()->raw(['household_id' => $household->id]);

    $this->actingAs($household->users->first())->post(route('debts.store'), array_replace($payload, $changes))->assertSessionHasErrors($field);

    $this->assertDatabaseCount('debts', 0);
})->with([
    'unknown type' => [['type' => 'mortgage'], 'type'],
    'negative balance' => [['balance_cents' => -1], 'balance_cents'],
    'no repayment' => [['repayment_cents' => 0], 'repayment_cents'],
    'negative extras' => [['extra_cents' => -1], 'extra_cents'],
    'invalid rate' => [['annual_rate' => 51], 'annual_rate'],
    'unsupported frequency' => [['frequency' => 'daily'], 'frequency'],
    'invalid date' => [['due_date' => '2026-02-30'], 'due_date'],
]);

test('debt repayments cannot use another familys account or change ownership', function () {
    $household = Household::factory()->hasAttached(User::factory())->create(['debts_enabled' => true]);
    $foreign = Account::factory()->create();
    $payload = Debt::factory()->raw(['household_id' => $foreign->household_id, 'account_id' => $foreign->id]);

    $this->actingAs($household->users->first())->post(route('debts.store'), $payload)->assertSessionHasErrors('account_id');
    $this->assertDatabaseCount('debts', 0);

    $this->post(route('debts.store'), array_replace($payload, ['account_id' => null]))->assertRedirect(route('debts.index'));
    $this->assertDatabaseHas('debts', ['household_id' => $household->id]);
});

test('family features preserve saved data and remove disabled repayments from all views', function () {
    $household = Household::factory()->hasAttached(User::factory())->create(['debts_enabled' => true]);
    $debt = Debt::factory()->for($household)->create(['due_date' => '2026-10-15']);
    $mortgage = Mortgage::factory()->for($household)->create();

    $this->actingAs($household->users->first())->from(route('household'))->put(route('household.update'), ['mortgage_enabled' => false, 'debts_enabled' => false])->assertRedirect(route('household'));
    $this->get(route('calendar'))->assertInertia(fn (Assert $page) => $page->has('items', 0)->has('events', 0)->where('totals.bill.annually', 0)->where('features.mortgage_enabled', false)->where('features.debts_enabled', false));
    $this->get(route('mortgage.index'))->assertNotFound();
    $this->put(route('mortgage.update'), $mortgage->getAttributes())->assertNotFound();
    $this->get(route('debts.index'))->assertNotFound();
    $this->post(route('debts.store'), $debt->getAttributes())->assertNotFound();
    $this->put(route('debts.update', $debt), $debt->getAttributes())->assertNotFound();
    $this->delete(route('debts.destroy', $debt))->assertNotFound();
    $this->assertModelExists($debt);
    $this->assertModelExists($mortgage);

    $this->put(route('household.update'), ['mortgage_enabled' => true, 'debts_enabled' => true])->assertRedirect();
    $this->get(route('bills'))->assertInertia(fn (Assert $page) => $page->has('items', 2));
});

test('feature settings reject invalid toggle values', function () {
    $household = Household::factory()->hasAttached(User::factory())->create();

    $this->actingAs($household->users->first())->put(route('household.update'), ['debts_enabled' => 'yes', 'mortgage_enabled' => null])->assertSessionHasErrors(['debts_enabled', 'mortgage_enabled']);

    expect($household->fresh()->debts_enabled)->toBeFalse();
    expect($household->fresh()->mortgage_enabled)->toBeTrue();
});

test('debt projections handle zero interest extras and non amortising repayments', function () {
    $debt = Debt::factory()->make(['household_id' => 1, 'balance_cents' => 120000, 'annual_rate' => 0, 'repayment_cents' => 10000, 'extra_cents' => 10000]);
    $calculator = app(DebtCalculator::class);

    expect($calculator->project($debt))->toBe(['periods' => 6, 'interest_cents' => 0, 'balances' => [120000, 0]]);
    expect($calculator->project($debt, false)['periods'])->toBe(12);
    $debt->forceFill(['annual_rate' => 12, 'repayment_cents' => 1200, 'extra_cents' => 0]);
    expect($calculator->project($debt)['periods'])->toBeNull();
    $debt->forceFill(['balance_cents' => 10000, 'repayment_cents' => 10000]);
    expect($calculator->project($debt))->toBe(['periods' => 2, 'interest_cents' => 101, 'balances' => [10000, 0]]);
});

test('debt seeding is repeatable preserves edits and does not touch production', function () {
    $this->freezeTime();
    $user = User::factory()->create(['email' => 'james@example.test']);
    $household = Household::factory()->hasAttached($user)->create();
    $account = Account::factory()->for($household)->create(['name' => 'Bills account']);

    $this->seed(DebtDemoSeeder::class);

    $this->assertDatabaseCount('debts', 5);
    $debt = $household->debts()->where('type', 'car_loan')->firstOrFail();
    expect($debt->account_id)->toBe($account->id);
    $debt->update(['balance_cents' => 10000]);
    $this->seed(DebtDemoSeeder::class);
    expect($debt->fresh()->balance_cents)->toBe(10000);
    $this->assertDatabaseCount('debts', 5);
    expect($household->fresh()->debts_enabled)->toBeFalse();
    app()->detectEnvironment(fn (): string => 'production');
    (new DebtDemoSeeder)->run();
    $this->assertDatabaseCount('debts', 5);
});

test('debt data prevents leaving a household when accepting an invitation', function () {
    $user = User::factory()->create();
    $household = Household::factory()->hasAttached($user)->create();
    Debt::factory()->for($household)->create();
    $invitation = HouseholdInvitation::factory()->create(['email' => $user->email, 'token' => hash('sha256', 'debt-invite')]);

    $this->actingAs($user)->put(route('invitations.update', 'debt-invite'))->assertSessionHasErrors('invitation');

    expect($user->households()->first()->id)->toBe($household->id);
    expect($invitation->fresh()->accepted_at)->toBeNull();
});

test('projected debt repayments cannot be edited as bills or receive bill payments', function () {
    $household = Household::factory()->hasAttached(User::factory())->create(['debts_enabled' => true]);
    $debt = Debt::factory()->for($household)->create();
    $id = app(HouseholdBudget::class)->items($household)->first()->id;

    $this->actingAs($household->users->first())->put(route('budget-items.update', $id), [])->assertNotFound();
    $this->delete(route('budget-items.destroy', $id))->assertNotFound();
    $this->post(route('payments.store', $id), [])->assertNotFound();

    $this->assertModelExists($debt);
    $this->assertDatabaseCount('bill_payments', 0);
});

test('updating repayment frequency extras and account refreshes the budget immediately', function () {
    $household = Household::factory()->hasAttached(User::factory())->create(['debts_enabled' => true]);
    $account = Account::factory()->for($household)->create();
    $debt = Debt::factory()->for($household)->create();

    $this->actingAs($household->users->first())->put(route('debts.update', $debt), array_replace($debt->getAttributes(), ['repayment_cents' => 10000, 'extra_cents' => 5000, 'frequency' => 'weekly', 'due_date' => '2026-10-02', 'account_id' => $account->id]))->assertRedirect(route('debts.index'));
    $this->get(route('calendar', ['month' => '2026-10']))->assertInertia(fn (Assert $page) => $page->where('items.0.amount_cents', 15000)->where('items.0.cadence', 'weekly')->where('totals.bill.annually', 780000)->where('items.0.account_id', $account->id)->has('events', 5));

    $account->delete();
    expect($debt->fresh()->account_id)->toBeNull();
    expect(app(HouseholdBudget::class)->items($household)->first()->amount_cents)->toBe(15000);
});
