<?php

use App\Models\BudgetItem;
use App\Models\Household;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('members can choose whether a separate bonus contributes to their budget', function (bool $included, int $annualIncome) {
    $household = Household::factory()->hasAttached(User::factory())->create();
    BudgetItem::factory()->for($household)->income()->create();
    $bonus = BudgetItem::factory()->for($household)->bonus()->create();

    $this->actingAs($household->users->first())
        ->put(route('budget-items.update', $bonus), array_replace($bonus->toArray(), ['include_bonus' => $included]))
        ->assertRedirect()->assertSessionHasNoErrors();

    expect($bonus->fresh()->include_bonus)->toBe($included);
    $this->get(route('income'))->assertInertia(fn (Assert $page) => $page
        ->has('items', 2)
        ->where('totals.income.annually', $annualIncome)
        ->where('totals.remaining.annually', $annualIncome));
})->with([
    'excluded bonus still appears in income' => [false, 13520000],
    'included bonus contributes its take-home once' => [true, 14130000],
]);

test('outsiders cannot include another households bonus in its budget', function () {
    $bonus = BudgetItem::factory()->bonus()->create();

    $this->actingAs(User::factory()->create())
        ->put(route('budget-items.update', $bonus), array_replace($bonus->toArray(), ['include_bonus' => true]))
        ->assertNotFound();

    expect($bonus->fresh()->include_bonus)->toBeFalse();
});

test('bonus budgeting rejects an invalid inclusion choice without changing the bonus', function () {
    $household = Household::factory()->hasAttached(User::factory())->create();
    $bonus = BudgetItem::factory()->for($household)->bonus()->create();

    $this->actingAs($household->users->first())
        ->put(route('budget-items.update', $bonus), array_replace($bonus->toArray(), ['include_bonus' => 'yes']))
        ->assertSessionHasErrors('include_bonus');

    expect($bonus->fresh()->include_bonus)->toBeFalse();
});

test('take home estimates include a persons bonus while budgeting remains optional', function (bool $included, int $budgetIncome) {
    $household = Household::factory()->hasAttached(User::factory())->create();
    BudgetItem::factory()->for($household)->income()->create(['name' => 'James salary', 'gross_annual_cents' => 15500000, 'use_tax_estimate' => true]);
    BudgetItem::factory()->for($household)->income()->create(['name' => 'Sasha salary', 'person' => 'Sasha', 'gross_annual_cents' => 11000000, 'use_tax_estimate' => true]);
    BudgetItem::factory()->for($household)->bonus()->create(['include_bonus' => $included]);
    BudgetItem::factory()->bonus()->create(['bonus_annual_cents' => 5000000]);

    $this->actingAs($household->users->first())->get(route('income'))->assertInertia(fn (Assert $page) => $page
        ->has('incomeTaxEstimates', 2)
        ->where('incomeTaxEstimates.0.person', 'James')
        ->where('incomeTaxEstimates.0.tax_estimate.gross_cents', 16500000)
        ->where('incomeTaxEstimates.0.tax_estimate.tax_cents', 4212000)
        ->where('incomeTaxEstimates.0.tax_estimate.medicare_cents', 330000)
        ->where('incomeTaxEstimates.0.tax_estimate.net_cents', 11958000)
        ->where('incomeTaxEstimates.0.bonus_excluded_from_budget', ! $included)
        ->where('incomeTaxEstimates.1.person', 'Sasha')
        ->where('incomeTaxEstimates.1.tax_estimate.gross_cents', 11000000)
        ->where('incomeTaxEstimates.1.tax_estimate.net_cents', 8428000)
        ->where('totals.income.annually', $budgetIncome));
})->with([
    'bonus excluded from plan' => [false, 19776000],
    'bonus included in plan' => [true, 20386000],
]);

test('take home estimates ignore bonuses outside the persons active tax year', function (array $changes) {
    $household = Household::factory()->hasAttached(User::factory())->create();
    BudgetItem::factory()->for($household)->income()->create(['gross_annual_cents' => 15500000, 'use_tax_estimate' => true]);
    BudgetItem::factory()->for($household)->bonus()->create($changes);

    $this->actingAs($household->users->first())->get(route('income'))->assertInertia(fn (Assert $page) => $page
        ->has('incomeTaxEstimates', 1)
        ->where('incomeTaxEstimates.0.tax_estimate.gross_cents', 15500000)
        ->where('incomeTaxEstimates.0.tax_estimate.net_cents', 11348000)
        ->where('incomeTaxEstimates.0.bonus_excluded_from_budget', false));
})->with([
    'paused bonus' => [['is_active' => false]],
    'another person' => [['person' => 'Sasha']],
    'unassigned bonus' => [['person' => null]],
    'another tax year' => [['tax_year' => 2025]],
]);
