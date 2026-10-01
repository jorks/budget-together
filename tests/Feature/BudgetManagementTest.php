<?php

use App\Models\Account;
use App\Models\Bank;
use App\Models\BillPayment;
use App\Models\BudgetItem;
use App\Models\Household;
use App\Models\HouseholdInvitation;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

function budgetPayload(array $overrides = []): array
{
    return array_replace([
        'name' => 'Daycare', 'kind' => 'bill', 'category' => 'Family', 'amount_cents' => 120000,
        'cadence' => 'fortnightly', 'is_variable' => false, 'is_active' => true,
        'use_tax_estimate' => false, 'include_bonus' => false, 'include_medicare' => true,
        'tax_year' => 2026, 'has_sinking_fund' => false, 'saved_cents' => 0, 'contribution_cadence' => 'weekly',
    ], $overrides);
}

test('household members can create update and delete a bill', function () {
    $household = Household::factory()->hasAttached(User::factory())->create();
    $user = $household->users->first();

    $this->actingAs($user)->post(route('budget-items.store'), budgetPayload())->assertRedirect();
    $this->assertDatabaseHas('budget_items', ['household_id' => $household->id, 'name' => 'Daycare', 'amount_cents' => 120000]);
    $item = $household->items()->firstOrFail();
    $this->put(route('budget-items.update', $item), budgetPayload(['amount_cents' => 110000]))->assertRedirect();
    expect($item->fresh()->amount_cents)->toBe(110000);
    $this->delete(route('budget-items.destroy', $item))->assertRedirect();
    $this->assertModelMissing($item);
});

test('household pages show only their own records and annual budget totals', function () {
    $household = Household::factory()->hasAttached(User::factory())->create();
    BudgetItem::factory()->for($household)->income()->create(['amount_cents' => 500000, 'cadence' => 'monthly']);
    BudgetItem::factory()->create(['name' => 'Private household bill']);

    $this->actingAs($household->users->first())->get(route('dashboard'))->assertInertia(fn (Assert $page) => $page
        ->component('budget/index')->has('items', 1)->where('totals.income.annually', 6000000)->where('items.0.name', 'Salary'));
});

test('other households cannot update or delete records', function (string $resource, string $model) {
    $user = User::factory()->create();
    $record = $model::factory()->create();
    $this->actingAs($user)->put(route($resource.'.update', $record), [])->assertNotFound();
    $this->delete(route($resource.'.destroy', $record))->assertNotFound();
    $this->assertModelExists($record);
})->with([['budget-items', BudgetItem::class], ['accounts', Account::class], ['banks', Bank::class]]);

test('bills reject invalid money dates cadence and funding fields', function (array $change, string $field) {
    $household = Household::factory()->hasAttached(User::factory())->create();
    $this->actingAs($household->users->first())->post(route('budget-items.store'), budgetPayload($change))->assertSessionHasErrors($field);
    $this->assertDatabaseCount('budget_items', 0);
})->with([
    [['amount_cents' => -1], 'amount_cents'], [['amount_cents' => 1.5], 'amount_cents'],
    [['amount_cents' => 100000000000], 'amount_cents'], [['name' => ''], 'name'],
    [['cadence' => 'sometimes'], 'cadence'], [['cadence' => 'custom'], 'payments_per_year'],
    [['cadence' => 'custom', 'payments_per_year' => 0], 'payments_per_year'],
    [['due_date' => '2026-02-30'], 'due_date'], [['due_date' => '1999-01-01'], 'due_date'],
    [['has_sinking_fund' => true], 'due_date'], [['contribution_cadence' => 'custom'], 'contribution_cadence'],
    [['use_tax_estimate' => true], 'use_tax_estimate'], [['kind' => 'income', 'use_tax_estimate' => true], 'gross_annual_cents'],
    [['tax_year' => 2030], 'tax_year'], [['kind' => 'income', 'has_sinking_fund' => true, 'due_date' => '2027-01-01'], 'has_sinking_fund'],
]);

test('bills cannot reference accounts from another household or change ownership', function () {
    $household = Household::factory()->hasAttached(User::factory())->create();
    $otherAccount = Account::factory()->create();
    $this->actingAs($household->users->first())->post(route('budget-items.store'), budgetPayload(['account_id' => $otherAccount->id, 'saving_account_id' => $otherAccount->id]))->assertSessionHasErrors(['account_id', 'saving_account_id']);
    $this->post(route('budget-items.store'), budgetPayload(['household_id' => $otherAccount->household_id]))->assertRedirect();
    $this->assertDatabaseHas('budget_items', ['household_id' => $household->id]);
    $this->assertDatabaseMissing('budget_items', ['household_id' => $otherAccount->household_id]);
});

test('accounts support credit card balances and protect linked banks', function () {
    $household = Household::factory()->hasAttached(User::factory())->create();
    $this->actingAs($household->users->first())->post(route('banks.store'), ['name' => 'Everyday Bank'])->assertRedirect();
    $bank = $household->banks()->firstOrFail();
    $this->post(route('accounts.store'), ['name' => 'Rewards card', 'bank_id' => $bank->id, 'type' => 'credit_card', 'balance_cents' => -150000, 'credit_limit_cents' => 500000, 'last_four' => '1234'])->assertRedirect();
    $this->assertDatabaseHas('accounts', ['household_id' => $household->id, 'balance_cents' => -150000]);
    $this->delete(route('banks.destroy', $bank))->assertSessionHasErrors('bank');
    $this->assertModelExists($bank);
});

test('accounts reject other households banks and full card numbers', function () {
    $household = Household::factory()->hasAttached(User::factory())->create();
    $bank = Bank::factory()->create();
    $this->actingAs($household->users->first())->post(route('accounts.store'), ['name' => 'Card', 'bank_id' => $bank->id, 'type' => 'credit_card', 'balance_cents' => 0, 'last_four' => '1234567890123456'])->assertSessionHasErrors(['bank_id', 'last_four']);
    $this->assertDatabaseCount('accounts', 0);
});

test('actual bill payments preserve the forecast and can be removed', function () {
    $this->travelTo(now()->setDate(2026, 10, 1));
    $household = Household::factory()->hasAttached(User::factory())->create();
    $bill = BudgetItem::factory()->for($household)->variable()->create();
    $this->actingAs($household->users->first())->post(route('payments.store', $bill), ['amount_cents' => 41290, 'paid_on' => '2026-09-30'])->assertRedirect();
    $this->assertDatabaseHas('bill_payments', ['budget_item_id' => $bill->id, 'amount_cents' => 41290]);
    expect($bill->fresh()->amount_cents)->toBe(34000);
    $payment = $bill->payments()->firstOrFail();
    $this->delete(route('payments.destroy', $payment))->assertRedirect();
    $this->assertModelMissing($payment);
});

test('actual payments reject future dates and protect other households', function () {
    $household = Household::factory()->hasAttached(User::factory())->create();
    $bill = BudgetItem::factory()->for($household)->create();
    $otherPayment = BillPayment::factory()->create();
    $this->actingAs($household->users->first())->post(route('payments.store', $bill), ['amount_cents' => 100, 'paid_on' => now()->addDays(2)->toDateString()])->assertSessionHasErrors('paid_on');
    $this->delete(route('payments.destroy', $otherPayment))->assertNotFound();
    $this->post(route('payments.store', $otherPayment->budget_item_id), ['amount_cents' => 100, 'paid_on' => now()->toDateString()])->assertNotFound();
});

test('invitations give the specified verified user equal household access only once', function () {
    $household = Household::factory()->hasAttached(User::factory())->create();
    $invitee = User::factory()->create();
    $this->actingAs($household->users->first())->post(route('invitations.store'), ['email' => $invitee->email])->assertRedirect();
    $url = session('invitation_url');
    $token = basename($url);
    $this->assertDatabaseHas('household_invitations', ['token' => hash('sha256', $token)]);
    $this->actingAs($invitee)->get($url)->assertInertia(fn (Assert $page) => $page->component('budget/invitation')->where('householdName', $household->name));
    $this->put(route('invitations.update', $token))->assertRedirect(route('dashboard'));
    expect($invitee->households()->first()->id)->toBe($household->id);
    expect($invitee->can('manage', $household))->toBeTrue();
    $this->put(route('invitations.update', $token))->assertNotFound();
});

test('invitations reject the wrong email expired links and existing household data', function () {
    $token = 'example-invitation-token';
    $invited = User::factory()->create();
    $invitation = HouseholdInvitation::factory()->create(['token' => hash('sha256', $token), 'email' => $invited->email]);
    $this->actingAs(User::factory()->create())->put(route('invitations.update', $token))->assertForbidden();
    $existing = Household::factory()->hasAttached($invited)->create();
    BudgetItem::factory()->for($existing)->create();
    $this->actingAs($invited)->put(route('invitations.update', $token))->assertSessionHasErrors('invitation');
    expect($invited->households()->first()->id)->toBe($existing->id);
    $invitation->update(['expires_at' => now()->subMinute()]);
    $this->put(route('invitations.update', $token))->assertNotFound();
});

test('guests and unverified users cannot change household budgets', function () {
    $this->post(route('budget-items.store'), budgetPayload())->assertRedirect(route('login'));
    $this->actingAs(User::factory()->unverified()->create())->post(route('budget-items.store'), budgetPayload())->assertRedirect(route('verification.notice'));
    $this->assertDatabaseCount('budget_items', 0);
});

test('bill pages expose category totals and month-end calendar occurrences', function () {
    $household = Household::factory()->hasAttached(User::factory())->create();
    BudgetItem::factory()->for($household)->create(['name' => 'Internet', 'category' => 'Utilities', 'amount_cents' => 10000, 'due_date' => '2028-01-31']);

    $this->actingAs($household->users->first())->get(route('calendar', ['month' => '2028-02']))
        ->assertInertia(fn (Assert $page) => $page->where('categoryTotals.0.category', 'Utilities')
            ->where('categoryTotals.0.equivalents.annually', 120000)
            ->has('events', 1)->where('events.0.date', '2028-02-29')
            ->where('events.0.category', 'Utilities'));
});

test('deleting an account keeps its bills and clears both account links', function () {
    $household = Household::factory()->hasAttached(User::factory())->create();
    $account = Account::factory()->for($household)->create();
    $bill = BudgetItem::factory()->for($household)->sinkingFund()->create(['account_id' => $account->id, 'saving_account_id' => $account->id]);
    $this->actingAs($household->users->first())->put(route('accounts.update', $account), ['name' => 'Annual bills pot', 'type' => 'savings', 'balance_cents' => 10000])->assertRedirect();
    expect($account->fresh()->name)->toBe('Annual bills pot');

    $this->delete(route('accounts.destroy', $account))->assertRedirect();

    $this->assertModelMissing($account);
    expect($bill->fresh())->account_id->toBeNull()->saving_account_id->toBeNull();
    $this->assertModelExists($bill);
});

test('banks can be renamed and removed once they have no accounts', function () {
    $household = Household::factory()->hasAttached(User::factory())->create();
    $bank = Bank::factory()->for($household)->create();
    $this->actingAs($household->users->first())->put(route('banks.update', $bank), ['name' => 'Renamed institution'])->assertRedirect();
    expect($bank->fresh()->name)->toBe('Renamed institution');

    $this->delete(route('banks.destroy', $bank))->assertRedirect();

    $this->assertModelMissing($bank);
});

test('household members can revoke invitations but other households cannot', function () {
    $household = Household::factory()->hasAttached(User::factory())->create();
    $invitation = HouseholdInvitation::factory()->for($household)->create();
    $this->actingAs(User::factory()->create())->delete(route('invitations.destroy', $invitation))->assertNotFound();
    $this->assertModelExists($invitation);

    $this->actingAs($household->users->first())->delete(route('invitations.destroy', $invitation))->assertRedirect();

    $this->assertModelMissing($invitation);
});

test('accepting an invitation can replace an automatically created empty household', function () {
    $invitee = User::factory()->create();
    Household::factory()->hasAttached($invitee)->create();
    $invitation = HouseholdInvitation::factory()->create(['email' => $invitee->email, 'token' => hash('sha256', 'join-empty-household')]);

    $this->actingAs($invitee)->put(route('invitations.update', 'join-empty-household'))->assertRedirect(route('dashboard'));

    expect($invitee->households()->count())->toBe(1);
    expect($invitee->households()->first()->id)->toBe($invitation->household_id);
});

test('income cannot receive actual bill payments', function () {
    $household = Household::factory()->hasAttached(User::factory())->create();
    $income = BudgetItem::factory()->for($household)->income()->create();

    $this->actingAs($household->users->first())->post(route('payments.store', $income), ['amount_cents' => 100, 'paid_on' => now()->toDateString()])->assertNotFound();

    $this->assertDatabaseCount('bill_payments', 0);
});
