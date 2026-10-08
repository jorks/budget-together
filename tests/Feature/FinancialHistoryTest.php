<?php

use App\Models\BudgetItem;
use App\Models\Debt;
use App\Models\FinancialChange;
use App\Models\Household;
use App\Models\Mortgage;
use App\Models\SuperFund;
use App\Models\User;
use App\Services\BudgetCalculator;
use App\Services\FinancialHistory;
use App\Services\SuperCalculator;
use Carbon\CarbonImmutable;
use Database\Seeders\BudgetDemoSeeder;
use Database\Seeders\FinancialHistoryDemoSeeder;
use Illuminate\Support\Arr;
use Inertia\Testing\AssertableInertia as Assert;

function financialPayload(BudgetItem|Debt|Mortgage|SuperFund $record, array $values = [], array $overrides = []): array
{
    return array_replace(['effective_from' => '2026-11-01', 'event_type' => 'update', 'values' => array_replace(Arr::only($record->attributesToArray(), app(FinancialHistory::class)->fields($record)), $values), 'notes' => 'Statement update'], $overrides);
}

test('salary changes apply on their effective date to take home pay and linked super', function () {
    $this->travelTo(CarbonImmutable::parse('2026-10-01', 'Australia/Melbourne'));
    $household = Household::factory()->hasAttached(User::factory())->create();
    $income = BudgetItem::factory()->income()->for($household)->create(['gross_annual_cents' => 10000000, 'use_tax_estimate' => true, 'salary_sacrifice_cents' => 0, 'workplace_giving_cents' => 0, 'other_deductions_cents' => 0, 'bonus_annual_cents' => 0, 'include_bonus' => false, 'tax_year' => 2026]);
    $fund = SuperFund::factory()->for($household)->create(['income_id' => $income->id, 'employer_rate' => 12]);
    $this->actingAs($household->users->first())->post(route('financial-changes.store', ['item', $income]), financialPayload($income, ['gross_annual_cents' => 12000000]))->assertRedirect()->assertSessionHasNoErrors();

    expect(app(BudgetCalculator::class)->annual($income->fresh()))->toBe(7748000);
    expect(app(SuperCalculator::class)->contributions($fund->fresh())['employer_cents'])->toBe(1200000);
    $this->get(route('budget-items.show', $income))->assertInertia(fn (Assert $page) => $page->has('financialChanges', 2)->where('item.gross_annual_cents', 10000000));
    $this->travelTo(CarbonImmutable::parse('2026-11-01', 'Australia/Melbourne'));
    expect(app(BudgetCalculator::class)->annual($income->fresh()))->toBe(9108000);
    expect(app(SuperCalculator::class)->contributions($fund->fresh())['employer_cents'])->toBe(1440000);
    $this->get(route('income'))->assertInertia(fn (Assert $page) => $page->where('items.0.gross_annual_cents', 12000000)->where('totals.income.annually', 9108000));
});

test('spending and savings allocations preserve earlier plans and schedule changes', function (string $kind) {
    $this->travelTo(CarbonImmutable::parse('2026-10-01', 'Australia/Melbourne'));
    $household = Household::factory()->hasAttached(User::factory())->create();
    $item = BudgetItem::factory()->for($household)->create(['kind' => $kind, 'amount_cents' => 10000, 'cadence' => 'weekly']);
    $this->actingAs($household->users->first())->post(route('financial-changes.store', ['item', $item]), financialPayload($item, ['amount_cents' => 12000]))->assertSessionHasNoErrors();
    $this->post(route('financial-changes.store', ['item', $item]), financialPayload($item, ['amount_cents' => 9000], ['effective_from' => '2026-09-01']))->assertSessionHasNoErrors();

    expect(app(BudgetCalculator::class)->annual($item->fresh(), CarbonImmutable::parse('2026-08-01')))->toBe(520000);
    expect(app(BudgetCalculator::class)->annual($item->fresh()))->toBe(468000);
    expect(app(BudgetCalculator::class)->annual($item->fresh(), CarbonImmutable::parse('2026-11-01')))->toBe(624000);
})->with(['spending', 'saving']);

test('mortgage offset rate and refinance changes are dated and resolve automatically', function () {
    $this->travelTo(CarbonImmutable::parse('2026-10-01', 'Australia/Melbourne'));
    $household = Household::factory()->hasAttached(User::factory())->create(['mortgage_enabled' => true]);
    $mortgage = Mortgage::factory()->for($household)->create(['annual_rate' => 6.0, 'offset_cents' => 1000000]);
    $this->actingAs($household->users->first())->post(route('financial-changes.store', ['mortgage', $mortgage]), financialPayload($mortgage, ['annual_rate' => 5.5, 'offset_cents' => 2500000, 'term_years' => 25], ['event_type' => 'refinance']))->assertSessionHasNoErrors();

    $this->get(route('mortgage.index'))->assertInertia(fn (Assert $page) => $page->where('mortgage.annual_rate', 6)->where('mortgage.offset_cents', 1000000)->has('changes', 2));
    $this->travelTo(CarbonImmutable::parse('2026-11-01', 'Australia/Melbourne'));
    $this->get(route('mortgage.index'))->assertInertia(fn (Assert $page) => $page->where('mortgage.annual_rate', 5.5)->where('mortgage.offset_cents', 2500000)->where('mortgage.term_years', 25));
    $this->get(route('outlook'))->assertInertia(fn (Assert $page) => $page->where('mortgage.annual_rate', 5.5));
});

test('debt extra payments record their amount and resulting balance without double subtraction', function () {
    $this->travelTo(CarbonImmutable::parse('2026-10-01', 'Australia/Melbourne'));
    $household = Household::factory()->hasAttached(User::factory())->create(['debts_enabled' => true]);
    $debt = Debt::factory()->for($household)->create(['balance_cents' => 200000]);
    $payload = financialPayload($debt, ['balance_cents' => 150000], ['effective_from' => '2026-09-15', 'event_type' => 'extra_payment', 'payment_cents' => 50000]);
    $this->actingAs($household->users->first())->post(route('financial-changes.store', ['debt', $debt]), $payload)->assertSessionHasNoErrors();
    $this->post(route('financial-changes.store', ['debt', $debt]), $payload)->assertSessionHasErrors('effective_from');

    $this->assertDatabaseHas('financial_changes', ['debt_id' => $debt->id, 'payment_cents' => 50000, 'event_type' => 'extra_payment']);
    expect($debt->fresh()->balance_cents)->toBe(150000);
    $this->get(route('debts.show', $debt))->assertInertia(fn (Assert $page) => $page->component('debts/show')->where('debt.balance_cents', 150000)->has('changes', 2));
    $this->get(route('debts.index'))->assertInertia(fn (Assert $page) => $page->where('debts.0.balance_cents', 150000));
});

test('correcting and deleting financial updates restores the preceding terms', function () {
    $this->travelTo(CarbonImmutable::parse('2026-10-01', 'Australia/Melbourne'));
    $household = Household::factory()->hasAttached(User::factory())->create(['debts_enabled' => true]);
    $debt = Debt::factory()->for($household)->create(['balance_cents' => 200000]);
    $change = app(FinancialHistory::class)->record($debt, ['balance_cents' => 180000], '2026-09-01');
    $this->actingAs($household->users->first())->put(route('financial-changes.update', ['debt', $debt, $change]), financialPayload($debt, ['balance_cents' => 170000], ['effective_from' => '2026-09-01']))->assertSessionHasNoErrors();
    expect($debt->fresh()->balance_cents)->toBe(170000);
    $this->delete(route('financial-changes.destroy', ['debt', $debt, $change]))->assertSessionHasNoErrors();

    expect($debt->fresh()->balance_cents)->toBe(200000);
    $this->assertModelMissing($change);
});

test('later loan snapshots retain their observed balance after backdated payments', function () {
    $this->travelTo(CarbonImmutable::parse('2026-10-01', 'Australia/Melbourne'));
    $debt = Debt::factory()->create(['balance_cents' => 200000]);
    $history = app(FinancialHistory::class);
    $history->record($debt, ['balance_cents' => 120000], '2026-09-01', 'balance');
    $history->record($debt, ['balance_cents' => 150000], '2026-08-01', 'extra_payment', paymentCents: 30000);

    expect($history->at($debt->fresh(), CarbonImmutable::parse('2026-08-15'))->balance_cents)->toBe(150000);
    expect($history->at($debt->fresh())->balance_cents)->toBe(120000);
});

test('fund assumptions follow effective dates and keep balances independent', function () {
    $this->travelTo(CarbonImmutable::parse('2026-10-01', 'Australia/Melbourne'));
    $household = Household::factory()->hasAttached(User::factory())->create();
    $fund = SuperFund::factory()->for($household)->create(['annual_fee_cents' => 7800]);
    $fund->balances()->create(['recorded_on' => '2026-09-01', 'balance_cents' => 12000000]);
    $this->actingAs($household->users->first())->post(route('financial-changes.store', ['super', $fund]), financialPayload($fund, ['annual_fee_cents' => 9000]))->assertSessionHasNoErrors();
    $this->travelTo(CarbonImmutable::parse('2026-11-01', 'Australia/Melbourne'));

    $this->get(route('superannuation.show', $fund))->assertInertia(fn (Assert $page) => $page->component('superannuation/show')->where('fund.annual_fee_cents', 9000)->where('fund.current_balance_cents', 12000000)->has('changes', 2));
});

test('metadata edits do not add financial timeline entries', function () {
    $household = Household::factory()->hasAttached(User::factory())->create(['debts_enabled' => true]);
    $debt = Debt::factory()->for($household)->create();
    $this->actingAs($household->users->first())->put(route('debts.update', $debt), array_replace($debt->getAttributes(), ['name' => 'Our family car']))->assertSessionHasNoErrors();

    expect($debt->fresh()->name)->toBe('Our family car');
    $this->assertDatabaseCount('financial_changes', 0);
});

test('financial changes reject invalid dates payments rates and unapproved fields', function (array $overrides, array $values, string $field) {
    $this->travelTo(CarbonImmutable::parse('2026-10-01', 'Australia/Melbourne'));
    $household = Household::factory()->hasAttached(User::factory())->create(['debts_enabled' => true]);
    $debt = Debt::factory()->for($household)->create();
    $this->actingAs($household->users->first())->post(route('financial-changes.store', ['debt', $debt]), financialPayload($debt, $values, $overrides))->assertSessionHasErrors($field);

    $this->assertDatabaseCount('financial_changes', 0);
    expect($debt->fresh()->balance_cents)->toBe(2450000);
})->with([
    'invalid date' => [['effective_from' => '2026-02-30'], [], 'effective_from'],
    'missing payment' => [['effective_from' => '2026-09-01', 'event_type' => 'extra_payment'], [], 'payment_cents'],
    'future payment' => [['event_type' => 'extra_payment', 'payment_cents' => 1000], [], 'effective_from'],
    'negative balance' => [[], ['balance_cents' => -1], 'values.balance_cents'],
    'invalid rate' => [[], ['annual_rate' => 51], 'values.annual_rate'],
    'unsupported event' => [['event_type' => 'withdrawal'], [], 'event_type'],
    'unapproved field' => [[], ['household_id' => 99], 'values'],
]);

test('financial history endpoints require authentication and hide other households records', function () {
    $household = Household::factory()->hasAttached(User::factory())->create(['debts_enabled' => true]);
    $foreign = Debt::factory()->create();
    $change = FinancialChange::factory()->create(['debt_id' => $foreign->id]);
    $this->post(route('financial-changes.store', ['debt', $foreign]), financialPayload($foreign))->assertRedirect(route('login'));
    $this->actingAs($household->users->first())->post(route('financial-changes.store', ['debt', $foreign]), financialPayload($foreign))->assertNotFound();
    $this->put(route('financial-changes.update', ['debt', $foreign, $change]), financialPayload($foreign))->assertNotFound();
    $this->delete(route('financial-changes.destroy', ['debt', $foreign, $change]))->assertNotFound();
    $this->get(route('debts.show', $foreign))->assertNotFound();

    $this->assertModelExists($change);
});

test('baseline and mismatched parent entries cannot be corrected or removed', function () {
    $household = Household::factory()->hasAttached(User::factory())->create(['debts_enabled' => true]);
    $debt = Debt::factory()->for($household)->create();
    $other = Debt::factory()->for($household)->create();
    $change = app(FinancialHistory::class)->record($debt, ['balance_cents' => 1800000], '2026-09-01');
    $baseline = $debt->financialChanges()->whereNull('effective_from')->firstOrFail();
    $this->actingAs($household->users->first())->put(route('financial-changes.update', ['debt', $other, $change]), financialPayload($other))->assertNotFound();
    $this->delete(route('financial-changes.destroy', ['debt', $debt, $baseline]))->assertNotFound();

    $this->assertModelExists($change);
    $this->assertModelExists($baseline);
});

test('history demo seeds varied financial events and preserves them on repeat runs', function () {
    $this->travelTo(CarbonImmutable::parse('2026-10-01', 'Australia/Melbourne'));
    $this->seed(BudgetDemoSeeder::class);
    $household = User::query()->where('email', 'james@example.test')->firstOrFail()->households()->firstOrFail();
    $count = FinancialChange::query()->count();
    $this->seed(FinancialHistoryDemoSeeder::class);

    expect(FinancialChange::query()->count())->toBe($count);
    expect($household->mortgage->financialChanges()->where('event_type', 'refinance')->exists())->toBeTrue();
    expect($household->debts()->firstOrFail()->financialChanges()->where('event_type', 'extra_payment')->exists())->toBeTrue();
    expect($household->items()->where('name', 'James salary')->firstOrFail()->financialChanges()->where('effective_from', '>', '2026-10-01')->exists())->toBeTrue();
    expect($household->superFunds()->firstOrFail()->balances()->count())->toBe(5);
});

test('scheduled debt repayments change future calendar amounts before taking effect in totals', function () {
    $this->travelTo(CarbonImmutable::parse('2026-10-01', 'Australia/Melbourne'));
    $household = Household::factory()->hasAttached(User::factory())->create(['debts_enabled' => true]);
    $debt = Debt::factory()->for($household)->create(['repayment_cents' => 10000, 'extra_cents' => 0, 'frequency' => 'monthly', 'due_date' => '2026-10-15']);
    app(FinancialHistory::class)->record($debt, ['repayment_cents' => 20000], '2026-11-01');

    $this->actingAs($household->users->first())->get(route('calendar', ['month' => '2026-11']))->assertInertia(fn (Assert $page) => $page->where('totals.bill.monthly', 10000)->has('events', 1)->where('events.0.date', '2026-11-15')->where('events.0.amount_cents', 20000));
    $this->travelTo(CarbonImmutable::parse('2026-11-01', 'Australia/Melbourne'));
    $this->get(route('plan'))->assertInertia(fn (Assert $page) => $page->where('totals.bill.monthly', 20000));
});

test('salary pay dates and frequency can start a dated calendar schedule', function () {
    $this->travelTo(CarbonImmutable::parse('2026-10-01', 'Australia/Melbourne'));
    $household = Household::factory()->hasAttached(User::factory())->create();
    $income = BudgetItem::factory()->income()->for($household)->create(['pay_date' => null, 'use_tax_estimate' => false, 'amount_cents' => 300000, 'cadence' => 'monthly']);
    app(FinancialHistory::class)->record($income, ['pay_date' => '2026-11-15', 'amount_cents' => 350000], '2026-11-01');

    $this->actingAs($household->users->first())->get(route('calendar', ['month' => '2026-10']))->assertInertia(fn (Assert $page) => $page->has('events', 0));
    $this->get(route('calendar', ['month' => '2026-11']))->assertInertia(fn (Assert $page) => $page->has('events', 1)->where('events.0.date', '2026-11-15')->where('events.0.amount_cents', 350000));
});

test('salary revisions reject deductions greater than gross income', function () {
    $household = Household::factory()->hasAttached(User::factory())->create();
    $income = BudgetItem::factory()->income()->for($household)->create(['use_tax_estimate' => true, 'workplace_giving_cents' => 0, 'other_deductions_cents' => 0]);

    $this->actingAs($household->users->first())->post(route('financial-changes.store', ['item', $income]), financialPayload($income, ['gross_annual_cents' => 10000, 'salary_sacrifice_cents' => 20000]))->assertSessionHasErrors('values.salary_sacrifice_cents');
    $this->assertDatabaseCount('financial_changes', 0);
});

test('disabled lending features hide financial update endpoints', function (string $type) {
    $household = Household::factory()->hasAttached(User::factory())->create(['debts_enabled' => false, 'mortgage_enabled' => false]);
    $record = $type === 'debt' ? Debt::factory()->for($household)->create() : Mortgage::factory()->for($household)->create();

    $this->actingAs($household->users->first())->post(route('financial-changes.store', [$type, $record]), financialPayload($record))->assertNotFound();
    $this->assertDatabaseCount('financial_changes', 0);
})->with(['debt', 'mortgage']);

test('editing loan details retains an extra payment already recorded today', function () {
    $this->travelTo(CarbonImmutable::parse('2026-10-01', 'Australia/Melbourne'));
    $household = Household::factory()->hasAttached(User::factory())->create(['debts_enabled' => true]);
    $debt = Debt::factory()->for($household)->create();
    $change = app(FinancialHistory::class)->record($debt, ['balance_cents' => 2300000], '2026-10-01', 'extra_payment', 'Bonus payment', 100000);
    $this->actingAs($household->users->first())->put(route('debts.update', $debt), array_replace($debt->fresh()->getAttributes(), ['repayment_cents' => 51000]))->assertSessionHasNoErrors();

    expect($change->fresh())->payment_cents->toBe(100000)->event_type->toBe('extra_payment')->notes->toBe('Bonus payment');
    expect($debt->fresh()->balance_cents)->toBe(2300000);
});
