<?php

use App\Models\Account;
use App\Models\BudgetItem;
use App\Models\Household;
use App\Models\HouseholdInvitation;
use App\Models\Mortgage;
use App\Models\User;
use App\Services\HouseholdBudget;
use App\Services\MortgageCalculator;
use Database\Seeders\MortgageDemoSeeder;
use Inertia\Testing\AssertableInertia as Assert;

test('all household budget views include one mortgage repayment and exclude legacy duplicates', function (string $route) {
    $this->travelTo(now('Australia/Melbourne')->setDate(2026, 10, 1));
    $household = Household::factory()->hasAttached(User::factory())->create();
    $account = Account::factory()->for($household)->create();
    $mortgage = Mortgage::factory()->accelerated()->scheduled($account, '2026-10-15')->create();
    $legacy = BudgetItem::factory()->for($household)->create(['name' => 'Old mortgage bill', 'category' => ' Mortgage ', 'amount_cents' => 390000, 'due_date' => '2026-10-10']);
    BudgetItem::factory()->for($household)->income()->create(['amount_cents' => 1000000, 'cadence' => 'monthly', 'pay_date' => null]);
    BudgetItem::factory()->for($household)->create(['name' => 'Internet', 'category' => 'Utilities', 'amount_cents' => 10000, 'cadence' => 'monthly', 'due_date' => null]);
    Mortgage::factory()->create(['name' => 'Private loan']);

    $this->actingAs($household->users->first())->get(route($route, ['month' => '2026-10']))->assertInertia(fn (Assert $page) => $page
        ->has('items', 3)
        ->where('items.1.source', 'mortgage')
        ->where('items.1.id', -$mortgage->id)
        ->where('items.1.amount_cents', 419708)
        ->where('items.1.equivalents.annually', 5036496)
        ->where('items.1.account.id', $account->id)
        ->where('items.1.payments', [])
        ->where('categoryTotals.0.category', 'Mortgage')
        ->where('categoryTotals.0.count', 1)
        ->where('totals.bill.monthly', 429708)
        ->where('totals.remaining.monthly', 570292)
        ->has('events', 1)
        ->where('events.0.source', 'mortgage')
        ->where('events.0.date', '2026-10-15')
        ->where('events.0.amount_cents', 419708)
        ->where('events.0.account', $account->name));

    $this->assertModelExists($legacy);
    $this->assertDatabaseCount('budget_items', 3);
})->with(['dashboard', 'bills', 'plan', 'calendar', 'accounts', 'income', 'funds', 'household']);

test('saving mortgage changes updates repayments totals account links and calendar frequency immediately', function () {
    $household = Household::factory()->hasAttached(User::factory())->create();
    $account = Account::factory()->for($household)->create();
    Mortgage::factory()->for($household)->create();

    $this->actingAs($household->users->first())->put(route('mortgage.update'), [
        'name' => 'Updated home loan', 'balance_cents' => 1200000, 'annual_rate' => 0, 'term_years' => 1,
        'frequency' => 'weekly', 'offset_cents' => 0, 'extra_cents' => 1000, 'due_date' => '2026-10-02', 'account_id' => $account->id,
    ])->assertRedirect(route('mortgage.index'));

    $this->get(route('calendar', ['month' => '2026-10']))->assertInertia(fn (Assert $page) => $page
        ->where('items.0.amount_cents', 24077)->where('items.0.cadence', 'weekly')
        ->where('items.0.account_id', $account->id)->where('totals.bill.annually', 1252004)
        ->has('events', 5)->where('events.0.date', '2026-10-02')->where('events.4.date', '2026-10-30'));
    $this->assertDatabaseCount('budget_items', 0);
});

test('generated mortgage rows cannot be edited deleted or given bill payments', function () {
    $household = Household::factory()->hasAttached(User::factory())->create();
    $mortgage = Mortgage::factory()->for($household)->create();

    $this->actingAs($household->users->first())->put(route('budget-items.update', -$mortgage->id), [])->assertNotFound();
    $this->delete(route('budget-items.destroy', -$mortgage->id))->assertNotFound();
    $this->post(route('payments.store', -$mortgage->id), [])->assertNotFound();

    $this->assertModelExists($mortgage);
    $this->assertDatabaseCount('bill_payments', 0);
});

test('duplicate mortgage bills are rejected when mortgage details are managed separately', function () {
    $household = Household::factory()->hasAttached(User::factory())->create();
    Mortgage::factory()->for($household)->create();
    $payload = BudgetItem::factory()->for($household)->raw(['category' => ' Mortgage ']);

    $this->actingAs($household->users->first())->post(route('budget-items.store'), $payload)->assertSessionHasErrors([
        'category' => 'Manage mortgage repayments from the Mortgage section.',
    ]);

    $this->assertDatabaseCount('budget_items', 0);
});

test('households without saved mortgage details retain their existing mortgage expenses', function () {
    $household = Household::factory()->hasAttached(User::factory())->create();
    $legacy = BudgetItem::factory()->for($household)->create(['category' => 'Mortgage', 'amount_cents' => 390000, 'cadence' => 'monthly']);

    $this->actingAs($household->users->first())->get(route('bills'))->assertInertia(fn (Assert $page) => $page
        ->has('items', 1)->where('items.0.id', $legacy->id)->where('totals.bill.monthly', 390000));
});

test('mortgage repayment schedules reject invalid dates and other households accounts', function (array $changes, string $field) {
    $household = Household::factory()->hasAttached(User::factory())->create();
    $mortgage = Mortgage::factory()->for($household)->create();
    $payload = $mortgage->only(['name', 'balance_cents', 'annual_rate', 'term_years', 'frequency', 'offset_cents', 'extra_cents']);
    if ($field === 'account_id') {
        $changes = ['account_id' => Account::factory()->create()->id];
    }

    $this->actingAs($household->users->first())->put(route('mortgage.update'), array_replace($payload, $changes))->assertSessionHasErrors($field);

    expect($mortgage->fresh()->due_date)->toBeNull();
    expect($mortgage->fresh()->account_id)->toBeNull();
})->with([
    'invalid date' => [['due_date' => '2026-02-30'], 'due_date'],
    'date too early' => [['due_date' => '1999-01-01'], 'due_date'],
    'foreign account' => [[], 'account_id'],
]);

test('repayment calculations agree with the planner for every supported frequency', function (string $frequency, int $expected) {
    $mortgage = Mortgage::factory()->make(['household_id' => 1, 'frequency' => $frequency, 'offset_cents' => 2000000]);

    expect(app(MortgageCalculator::class)->repayment($mortgage))->toBe($expected);
})->with([['monthly', 389708], ['fortnightly', 179779], ['weekly', 89871]]);

test('a mortgage counts as household data when accepting another household invitation', function () {
    $user = User::factory()->create();
    $current = Household::factory()->hasAttached($user)->create();
    Mortgage::factory()->for($current)->create();
    $invitation = HouseholdInvitation::factory()->create(['email' => $user->email, 'token' => hash('sha256', 'mortgage-household-invite')]);

    $this->actingAs($user)->put(route('invitations.update', 'mortgage-household-invite'))->assertSessionHasErrors('invitation');

    expect($user->households()->first()->id)->toBe($current->id);
    expect($invitation->fresh()->accepted_at)->toBeNull();
});

test('removing a repayment account keeps the mortgage in the budget with no account assigned', function () {
    $household = Household::factory()->create();
    $account = Account::factory()->for($household)->create();
    $mortgage = Mortgage::factory()->scheduled($account, '2026-10-15')->create();

    $account->delete();

    expect($mortgage->fresh()->account_id)->toBeNull();
    expect(app(HouseholdBudget::class)->items($household)->first()->account)->toBeNull();
});

test('the standalone mortgage seeder replaces the old demo expense and preserves its schedule', function () {
    $this->freezeTime();
    $user = User::factory()->create(['email' => 'james@example.test']);
    $household = Household::factory()->hasAttached($user)->create();
    $account = Account::factory()->for($household)->create();
    $legacy = BudgetItem::factory()->for($household)->create(['name' => 'Mortgage repayment', 'category' => 'Mortgage', 'due_date' => '2026-10-15', 'account_id' => $account->id]);
    $unrelated = BudgetItem::factory()->for($household)->create(['name' => 'Electricity']);

    $this->seed(MortgageDemoSeeder::class);

    $this->assertModelMissing($legacy);
    $this->assertModelExists($unrelated);
    expect($household->mortgage->account_id)->toBe($account->id);
    expect($household->mortgage->due_date->toDateString())->toBe('2026-10-15');

    $household->mortgage->update(['balance_cents' => 60000000, 'extra_cents' => 50000]);
    $this->seed(MortgageDemoSeeder::class);

    expect($household->mortgage->fresh()->balance_cents)->toBe(60000000);
    expect($household->mortgage->fresh()->extra_cents)->toBe(50000);
    $this->assertDatabaseCount('mortgages', 1);
});

test('mortgage seeding preserves real payment history on an old expense while excluding its duplicate forecast', function () {
    $user = User::factory()->create(['email' => 'james@example.test']);
    $household = Household::factory()->hasAttached($user)->create();
    $legacy = BudgetItem::factory()->for($household)->create(['name' => 'Mortgage repayment', 'category' => 'Mortgage']);
    $payment = $legacy->payments()->create(['amount_cents' => 390000, 'paid_on' => '2026-09-30']);

    $this->seed(MortgageDemoSeeder::class);

    $this->assertModelExists($payment);
    $this->assertModelExists($legacy);
    expect(app(HouseholdBudget::class)->items($household)->first()->source)->toBe('mortgage');
    expect(app(HouseholdBudget::class)->items($household))->toHaveCount(1);
});

test('standalone mortgage seeding does not create a demo household or seed production data', function () {
    $this->seed(MortgageDemoSeeder::class);
    $this->assertDatabaseCount('households', 0);
    $this->assertDatabaseCount('mortgages', 0);

    $user = User::factory()->create(['email' => 'james@example.test']);
    Household::factory()->hasAttached($user)->create();
    app()->detectEnvironment(fn (): string => 'production');

    (new MortgageDemoSeeder)->run();

    $this->assertDatabaseCount('mortgages', 0);
});
