<?php

use App\Models\Debt;
use App\Models\Household;
use App\Models\Mortgage;
use App\Models\User;
use Illuminate\Support\Facades\Gate;
use Inertia\Testing\AssertableInertia as Assert;

test('the long term outlook requires authentication and household authorization', function () {
    $this->get(route('outlook'))->assertRedirect(route('login'));
    $user = User::factory()->create();
    Household::factory()->hasAttached($user)->create();
    Gate::before(fn (User $user, string $ability): ?bool => $ability === 'manage' ? false : null);
    $this->actingAs($user)->get(route('outlook'))->assertForbidden();
});

test('outlook shows only household active debts and estimates payoff including extras', function () {
    $user = User::factory()->create();
    $household = Household::factory()->hasAttached($user)->create(['debts_enabled' => true]);
    $debt = Debt::factory()->for($household)->create(['name' => 'Car loan', 'balance_cents' => 120000, 'annual_rate' => 0, 'repayment_cents' => 5000, 'extra_cents' => 5000, 'frequency' => 'monthly']);
    Debt::factory()->for($household)->create(['is_active' => false]);
    $foreign = Debt::factory()->create();
    Mortgage::factory()->for($household)->create();
    $this->actingAs($user)->get(route('outlook', ['household_id' => $foreign->household_id]))->assertInertia(fn (Assert $page) => $page->component('outlook/index')->has('debts', 1)->where('debts.0.id', $debt->id)->where('debts.0.payoff_years', 1)->has('mortgage')->has('retirementMembers', 1));
});

test('disabled mortgage and debt features do not contribute to the long term outlook', function () {
    $user = User::factory()->create();
    $household = Household::factory()->hasAttached($user)->create(['mortgage_enabled' => false, 'debts_enabled' => false]);
    Mortgage::factory()->for($household)->create();
    Debt::factory()->for($household)->create();
    $this->actingAs($user)->get(route('outlook'))->assertInertia(fn (Assert $page) => $page->where('mortgage', null)->where('debts', [])->where('features.mortgage_enabled', false)->where('features.debts_enabled', false));
});

test('outlook distinguishes debts that cannot be repaid at their current payment', function () {
    $user = User::factory()->create();
    $household = Household::factory()->hasAttached($user)->create(['debts_enabled' => true]);
    Debt::factory()->for($household)->create(['balance_cents' => 12000000, 'annual_rate' => 12, 'repayment_cents' => 1000, 'extra_cents' => 0, 'frequency' => 'monthly']);
    $this->actingAs($user)->get(route('outlook'))->assertInertia(fn (Assert $page) => $page->where('debts.0.payoff_years', null));
});

test('topic pages keep their own data and the budget overview has no retirement comparison', function () {
    $user = User::factory()->create();
    Household::factory()->hasAttached($user)->create();
    $this->actingAs($user)->get(route('superannuation.index'))->assertInertia(fn (Assert $page) => $page->has('members', 1)->where('members.0.id', $user->id)->missing('retirementMembers')->missing('mortgage'));
    $this->get(route('mortgage.index'))->assertInertia(fn (Assert $page) => $page->missing('retirementMembers'));
    $this->get(route('dashboard'))->assertInertia(fn (Assert $page) => $page->where('view', 'overview')->missing('retirementMembers'));
});
