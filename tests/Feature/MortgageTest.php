<?php

use App\Models\Household;
use App\Models\Mortgage;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

function mortgagePayload(array $overrides = []): array
{
    return array_replace(Mortgage::factory()->raw(['household_id' => null]), $overrides);
}

test('mortgage pages and writes require authentication', function () {
    $this->get(route('mortgage.index'))->assertRedirect(route('login'));
    $this->put(route('mortgage.update'), [])->assertRedirect(route('login'));
    $this->assertDatabaseCount('mortgages', 0);
});

test('new households see an empty mortgage planner', function () {
    $this->actingAs(User::factory()->create())->get(route('mortgage.index'))
        ->assertInertia(fn (Assert $page) => $page->component('mortgage/index')->where('mortgage', null));
});

test('household members share saved loan details and updates do not create duplicates', function () {
    $household = Household::factory()->hasAttached(User::factory()->count(2))->create();
    $payload = mortgagePayload(['household_id' => $household->id]);

    $this->actingAs($household->users->first())->put(route('mortgage.update'), $payload)->assertRedirect(route('mortgage.index'));
    $this->assertDatabaseHas('mortgages', ['household_id' => $household->id, 'balance_cents' => 65000000, 'annual_rate' => 6, 'term_years' => 30]);

    $this->actingAs($household->users->last())->get(route('mortgage.index'))
        ->assertInertia(fn (Assert $page) => $page->where('mortgage.name', 'Our home loan')->where('mortgage.balance_cents', 65000000));
    $this->put(route('mortgage.update'), array_replace($payload, ['extra_cents' => 30000, 'offset_cents' => 2000000]))->assertRedirect(route('mortgage.index'));
    $this->assertDatabaseCount('mortgages', 1);
    $this->assertDatabaseHas('mortgages', ['household_id' => $household->id, 'extra_cents' => 30000, 'offset_cents' => 2000000]);
    $this->assertDatabaseCount('budget_items', 0);
    $this->assertDatabaseCount('accounts', 0);
});

test('mortgage reads and writes remain isolated even with spoofed ownership', function () {
    $private = Mortgage::factory()->accelerated()->create();
    $household = Household::factory()->hasAttached(User::factory())->create();

    $this->actingAs($household->users->first())->get(route('mortgage.index', ['household_id' => $private->household_id]))
        ->assertInertia(fn (Assert $page) => $page->where('mortgage', null));
    $this->put(route('mortgage.update'), mortgagePayload(['household_id' => $private->household_id, 'id' => $private->id, 'extra_cents' => 10000]))->assertRedirect();

    expect($private->fresh()->extra_cents)->toBe(30000);
    $this->assertDatabaseHas('mortgages', ['household_id' => $household->id, 'extra_cents' => 10000]);
});

test('invalid mortgage details are rejected without changing the saved loan', function (array $change, string $field) {
    $household = Household::factory()->hasAttached(User::factory())->create();
    $mortgage = Mortgage::factory()->for($household)->create();

    $this->actingAs($household->users->first())->put(route('mortgage.update'), mortgagePayload($change))->assertSessionHasErrors($field);

    expect($mortgage->fresh()->getAttributes())->toEqual($mortgage->getAttributes());
})->with([
    'missing name' => [['name' => ''], 'name'],
    'long name' => [['name' => str_repeat('a', 121)], 'name'],
    'zero balance' => [['balance_cents' => 0], 'balance_cents'],
    'negative balance' => [['balance_cents' => -100], 'balance_cents'],
    'fractional cents' => [['balance_cents' => 1.5], 'balance_cents'],
    'excessive balance' => [['balance_cents' => 100000000000], 'balance_cents'],
    'negative rate' => [['annual_rate' => -1], 'annual_rate'],
    'excessive rate' => [['annual_rate' => 31], 'annual_rate'],
    'rate precision' => [['annual_rate' => 6.1234], 'annual_rate'],
    'missing rate' => [['annual_rate' => ''], 'annual_rate'],
    'zero term' => [['term_years' => 0], 'term_years'],
    'excessive term' => [['term_years' => 41], 'term_years'],
    'fractional term' => [['term_years' => 2.5], 'term_years'],
    'unsupported frequency' => [['frequency' => 'annually'], 'frequency'],
    'negative offset' => [['offset_cents' => -1], 'offset_cents'],
    'excessive offset' => [['offset_cents' => 100000000000], 'offset_cents'],
    'negative extras' => [['extra_cents' => -1], 'extra_cents'],
    'excessive extras' => [['extra_cents' => 100000000000], 'extra_cents'],
]);

test('zero interest and an offset larger than the loan can be saved', function () {
    $household = Household::factory()->hasAttached(User::factory())->create();

    $this->actingAs($household->users->first())->put(route('mortgage.update'), mortgagePayload(['annual_rate' => 0, 'offset_cents' => 70000000]))->assertSessionHasNoErrors();

    $this->assertDatabaseHas('mortgages', ['household_id' => $household->id, 'annual_rate' => 0, 'offset_cents' => 70000000]);
});
