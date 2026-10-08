<?php

use App\Models\BillRecord;
use App\Models\BudgetItem;
use App\Models\BudgetItemRevision;
use App\Models\Household;
use App\Models\User;
use App\Services\BillHistory;
use App\Services\BudgetCalculator;
use App\Services\BudgetItemHistory;
use Carbon\CarbonImmutable;
use Database\Seeders\BudgetDemoSeeder;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

function revisionPayload(array $overrides = []): array
{
    return array_replace(['effective_from' => '2026-11-01', 'amount_cents' => 2200, 'cadence' => 'monthly', 'notes' => 'Provider price rise'], $overrides);
}

function actualBillPayload(array $overrides = []): array
{
    return array_replace(['entry_key' => (string) Str::uuid(), 'amount_cents' => 28600, 'billed_on' => '2026-09-30', 'period_start' => '2026-07-01', 'period_end' => '2026-09-30', 'paid_on' => null, 'due_on' => '2026-10-14', 'notes' => 'Electricity statement'], $overrides);
}

test('item detail shows its own dated history and settings', function () {
    $household = Household::factory()->hasAttached(User::factory())->create();
    $item = BudgetItem::factory()->for($household)->variable()->create();
    $bill = BillRecord::factory()->for($item)->create();
    BudgetItemRevision::factory()->for($item)->scheduled()->create();
    BillRecord::factory()->create(['notes' => 'Private bill']);

    $this->actingAs($household->users->first())->get(route('budget-items.show', $item))
        ->assertInertia(fn (Assert $page) => $page->component('budget/show')->where('item.id', $item->id)->has('billRecords', 1)->where('billRecords.0.id', $bill->id)->has('revisions', 1)->where('editingSettings', false));
    $this->get(route('budget-items.show', [$item, 'settings' => 1]))->assertInertia(fn (Assert $page) => $page->where('editingSettings', true));
});

test('future price changes preserve todays totals and take effect without another edit', function () {
    $this->travelTo(CarbonImmutable::parse('2026-10-01 12:00', 'Australia/Melbourne'));
    $household = Household::factory()->hasAttached(User::factory())->create();
    $item = BudgetItem::factory()->for($household)->create(['name' => 'Netflix', 'amount_cents' => 2000, 'due_date' => '2026-10-15']);
    $this->actingAs($household->users->first())->post(route('item-revisions.store', $item), revisionPayload())->assertRedirect();

    expect($item->fresh()->amount_cents)->toBe(2000);
    $this->assertDatabaseHas('budget_item_revisions', ['budget_item_id' => $item->id, 'effective_from' => null, 'amount_cents' => 2000]);
    $this->get(route('bills'))->assertInertia(fn (Assert $page) => $page->where('items.0.amount_cents', 2000)->where('totals.bill.monthly', 2000));
    $this->get(route('calendar', ['month' => '2026-11']))->assertInertia(fn (Assert $page) => $page->where('events.0.date', '2026-11-15')->where('events.0.amount_cents', 2200));
    $this->travelTo(CarbonImmutable::parse('2026-11-01 00:00', 'Australia/Melbourne'));
    $this->get(route('bills'))->assertInertia(fn (Assert $page) => $page->where('items.0.amount_cents', 2200)->where('totals.bill.monthly', 2200)->where('categoryTotals.0.equivalents.monthly', 2200));
});

test('backdated changes retain the starting price and future changes', function () {
    $this->travelTo(CarbonImmutable::parse('2026-10-01', 'Australia/Melbourne'));
    $household = Household::factory()->hasAttached(User::factory())->create();
    $item = BudgetItem::factory()->for($household)->create(['amount_cents' => 2000]);
    $this->actingAs($household->users->first())->post(route('item-revisions.store', $item), revisionPayload())->assertRedirect();
    $this->post(route('item-revisions.store', $item), revisionPayload(['effective_from' => '2026-08-01', 'amount_cents' => 2100]))->assertRedirect();

    $history = app(BudgetItemHistory::class);
    expect($history->termsAt($item->fresh(), CarbonImmutable::parse('2026-07-01'))['amount_cents'])->toBe(2000);
    expect($history->termsAt($item->fresh(), CarbonImmutable::parse('2026-10-01'))['amount_cents'])->toBe(2100);
    expect($history->termsAt($item->fresh(), CarbonImmutable::parse('2026-11-01'))['amount_cents'])->toBe(2200);
});

test('frequency changes use the effective schedule and preserve earlier calendar dates', function () {
    $this->travelTo(CarbonImmutable::parse('2026-10-01', 'Australia/Melbourne'));
    $household = Household::factory()->hasAttached(User::factory())->create();
    $item = BudgetItem::factory()->for($household)->create(['amount_cents' => 2000, 'due_date' => '2026-09-15']);
    $this->actingAs($household->users->first())->post(route('item-revisions.store', $item), revisionPayload(['effective_from' => '2026-11-01', 'amount_cents' => 500, 'cadence' => 'weekly']))->assertRedirect();

    $this->get(route('calendar', ['month' => '2026-10']))->assertInertia(fn (Assert $page) => $page->has('events', 1)->where('events.0.date', '2026-10-15')->where('events.0.amount_cents', 2000));
    $this->get(route('calendar', ['month' => '2026-11']))->assertInertia(fn (Assert $page) => $page->has('events', 5)->where('events.0.date', '2026-11-01')->where('events.4.date', '2026-11-29')->where('events.0.amount_cents', 500)->where('events.0.cadence', 'weekly'));
});

test('correcting and removing a price mistake restores the previous plan', function () {
    $this->travelTo(CarbonImmutable::parse('2026-10-01', 'Australia/Melbourne'));
    $household = Household::factory()->hasAttached(User::factory())->create();
    $item = BudgetItem::factory()->for($household)->create(['amount_cents' => 2000]);
    $this->actingAs($household->users->first())->post(route('item-revisions.store', $item), revisionPayload(['effective_from' => '2026-09-01']))->assertRedirect();
    $revision = $item->revisions()->whereNotNull('effective_from')->firstOrFail();

    $this->put(route('item-revisions.update', [$item, $revision]), revisionPayload(['effective_from' => '2026-09-01', 'amount_cents' => 2300]))->assertRedirect();
    expect($item->fresh()->amount_cents)->toBe(2300);
    $this->assertDatabaseCount('budget_item_revisions', 2);
    $this->delete(route('item-revisions.destroy', [$item, $revision]))->assertRedirect();
    expect($item->fresh()->amount_cents)->toBe(2000);
    $this->assertModelMissing($revision);
    $baseline = $item->revisions()->firstOrFail();
    $this->delete(route('item-revisions.destroy', [$item, $baseline]))->assertNotFound();
    $this->put(route('item-revisions.update', [$item, $baseline]), revisionPayload())->assertNotFound();
});

test('changes cannot overwrite another effective date', function () {
    $this->travelTo(CarbonImmutable::parse('2026-10-01', 'Australia/Melbourne'));
    $household = Household::factory()->hasAttached(User::factory())->create();
    $item = BudgetItem::factory()->for($household)->create();
    $this->actingAs($household->users->first())->post(route('item-revisions.store', $item), revisionPayload())->assertRedirect();
    $this->post(route('item-revisions.store', $item), revisionPayload(['amount_cents' => 900]))->assertSessionHasErrors('effective_from');
    $this->assertDatabaseCount('budget_item_revisions', 2);
    $this->assertDatabaseMissing('budget_item_revisions', ['amount_cents' => 900]);
});

test('bill settings preserve prices while legacy amount edits create dated history', function () {
    $this->travelTo(CarbonImmutable::parse('2026-10-01', 'Australia/Melbourne'));
    $household = Household::factory()->hasAttached(User::factory())->create();
    $item = BudgetItem::factory()->for($household)->create(['amount_cents' => 2000]);
    $payload = ['name' => 'Netflix', 'kind' => 'bill', 'amount_cents' => 2200, 'cadence' => 'monthly', 'is_variable' => false, 'is_active' => true, 'use_tax_estimate' => false, 'include_bonus' => false, 'include_medicare' => true, 'tax_year' => 2026, 'has_sinking_fund' => false, 'saved_cents' => 0, 'contribution_cadence' => 'weekly'];
    $this->actingAs($household->users->first())->put(route('budget-items.update', $item), [...$payload, 'preserve_price' => true])->assertRedirect();
    expect($item->fresh()->amount_cents)->toBe(2000);
    $this->put(route('budget-items.update', $item), $payload)->assertRedirect();
    $this->assertDatabaseHas('budget_item_revisions', ['budget_item_id' => $item->id, 'effective_from' => '2026-10-01', 'amount_cents' => 2200]);
    expect(app(BudgetItemHistory::class)->termsAt($item->fresh(), CarbonImmutable::parse('2026-09-01'))['amount_cents'])->toBe(2000);
});

test('bills capture the historical estimate and do not change the plan or accounts', function () {
    $this->travelTo(CarbonImmutable::parse('2026-10-01', 'Australia/Melbourne'));
    $household = Household::factory()->hasAttached(User::factory())->create();
    $item = BudgetItem::factory()->for($household)->variable()->create();
    app(BudgetItemHistory::class)->record($item, revisionPayload(['effective_from' => '2026-10-01', 'amount_cents' => 40000, 'cadence' => 'quarterly']));

    $this->actingAs($household->users->first())->post(route('bill-records.store', $item), ['records' => [actualBillPayload()]])->assertRedirect();

    $this->assertDatabaseHas('bill_records', ['budget_item_id' => $item->id, 'expected_amount_cents' => 34000, 'paid_on' => null]);
    expect($item->fresh()->amount_cents)->toBe(40000);
    expect($item->fresh()->due_date->toDateString())->toBe($item->due_date->toDateString());
    $this->assertDatabaseCount('bill_payments', 0);
    $record = $item->billRecords()->firstOrFail();
    app(BudgetItemHistory::class)->record($item->fresh(), revisionPayload(['effective_from' => '2026-09-01', 'amount_cents' => 30000, 'cadence' => 'quarterly']));
    $this->put(route('bill-records.update', [$item, $record]), ['records' => [actualBillPayload(['entry_key' => $record->entry_key, 'paid_on' => '2026-10-01'])]])->assertRedirect();
    expect($record->fresh()->expected_amount_cents)->toBe(34000);
    expect($record->fresh()->paid_on->toDateString())->toBe('2026-10-01');
    $this->delete(route('bill-records.destroy', [$item, $record]))->assertRedirect();
    $this->assertModelMissing($record);
});

test('historical bill batches are atomic and safe to retry', function () {
    $this->travelTo(CarbonImmutable::parse('2026-10-01', 'Australia/Melbourne'));
    $household = Household::factory()->hasAttached(User::factory())->create();
    $item = BudgetItem::factory()->for($household)->variable()->create();
    $records = [actualBillPayload(), actualBillPayload(['billed_on' => '2026-06-30', 'period_start' => '2026-04-01', 'period_end' => '2026-06-30'])];
    $this->actingAs($household->users->first())->post(route('bill-records.store', $item), ['records' => [$records[0], [...$records[1], 'amount_cents' => -1]]])->assertSessionHasErrors('records.1.amount_cents');
    $this->assertDatabaseCount('bill_records', 0);

    $this->post(route('bill-records.store', $item), ['records' => $records])->assertRedirect();
    $this->post(route('bill-records.store', $item), ['records' => $records])->assertRedirect();
    $this->assertDatabaseCount('bill_records', 2);
});

test('estimate suggestions use covered days and exclude bills without periods', function () {
    $this->travelTo(CarbonImmutable::parse('2026-10-01', 'Australia/Melbourne'));
    $item = BudgetItem::factory()->variable()->create();
    BillRecord::factory()->for($item)->create(['amount_cents' => 18100, 'period_start' => '2025-01-01', 'period_end' => '2025-06-30']);
    BillRecord::factory()->for($item)->create(['amount_cents' => 18400, 'period_start' => '2025-07-01', 'period_end' => '2025-12-31']);
    BillRecord::factory()->for($item)->withoutPeriod()->create(['amount_cents' => 99999]);

    expect(app(BillHistory::class)->suggestion($item))->toBe(['amount_cents' => 9131, 'annual_cents' => 36525, 'bill_count' => 2, 'covered_days' => 365, 'from' => '2025-01-01', 'until' => '2025-12-31']);
    expect($item->fresh()->amount_cents)->toBe(34000);
});

test('overlapping periods do not produce misleading estimates', function () {
    $item = BudgetItem::factory()->variable()->create();
    BillRecord::factory()->for($item)->count(2)->create();

    expect(app(BillHistory::class)->suggestion($item))->toBeNull();
});

test('fixed bills do not receive estimate suggestions', function () {
    $item = BudgetItem::factory()->create();
    BillRecord::factory()->for($item)->create();

    expect(app(BillHistory::class)->suggestion($item))->toBeNull();
});

test('other households cannot read or write item history', function () {
    $item = BudgetItem::factory()->create();
    $revision = BudgetItemRevision::factory()->for($item)->create();
    $record = BillRecord::factory()->for($item)->create();
    $this->actingAs(User::factory()->create())->get(route('budget-items.show', $item))->assertNotFound();
    $this->post(route('item-revisions.store', $item), revisionPayload())->assertNotFound();
    $this->put(route('item-revisions.update', [$item, $revision]), revisionPayload())->assertNotFound();
    $this->delete(route('item-revisions.destroy', [$item, $revision]))->assertNotFound();
    $this->post(route('bill-records.store', $item), ['records' => [actualBillPayload()]])->assertNotFound();
    $this->put(route('bill-records.update', [$item, $record]), ['records' => [actualBillPayload()]])->assertNotFound();
    $this->delete(route('bill-records.destroy', [$item, $record]))->assertNotFound();
    $this->assertModelExists($revision);
    $this->assertModelExists($record);
});

test('history entries cannot be attached to another item in the same household', function () {
    $household = Household::factory()->hasAttached(User::factory())->create();
    $item = BudgetItem::factory()->for($household)->create();
    $otherItem = BudgetItem::factory()->for($household)->create();
    $revision = BudgetItemRevision::factory()->for($otherItem)->create();
    $record = BillRecord::factory()->for($otherItem)->create();

    $this->actingAs($household->users->first())->put(route('item-revisions.update', [$item, $revision]), revisionPayload())->assertNotFound();
    $this->delete(route('item-revisions.destroy', [$item, $revision]))->assertNotFound();
    $this->put(route('bill-records.update', [$item, $record]), ['records' => [actualBillPayload()]])->assertNotFound();
    $this->delete(route('bill-records.destroy', [$item, $record]))->assertNotFound();
    $this->assertModelExists($revision);
    $this->assertModelExists($record);
});

test('guests and unverified users cannot access item history', function () {
    $item = BudgetItem::factory()->create();
    $this->get(route('budget-items.show', $item))->assertRedirect(route('login'));
    $this->post(route('item-revisions.store', $item), revisionPayload())->assertRedirect(route('login'));
    $this->post(route('bill-records.store', $item), ['records' => [actualBillPayload()]])->assertRedirect(route('login'));
    $this->actingAs(User::factory()->unverified()->create())->get(route('budget-items.show', $item))->assertRedirect(route('verification.notice'));
});

test('income cannot receive bill history or price changes', function () {
    $household = Household::factory()->hasAttached(User::factory())->create();
    $item = BudgetItem::factory()->for($household)->income()->create();

    $this->actingAs($household->users->first())->post(route('item-revisions.store', $item), revisionPayload())->assertNotFound();
    $this->post(route('bill-records.store', $item), ['records' => [actualBillPayload()]])->assertNotFound();
    $this->assertDatabaseCount('bill_records', 0);
    $this->assertDatabaseCount('budget_item_revisions', 0);
});

test('price changes reject invalid dates amounts and frequencies', function (array $change, string $field) {
    $household = Household::factory()->hasAttached(User::factory())->create();
    $item = BudgetItem::factory()->for($household)->create();

    $this->actingAs($household->users->first())->post(route('item-revisions.store', $item), revisionPayload($change))->assertSessionHasErrors($field);
    $this->assertDatabaseCount('budget_item_revisions', 0);
})->with([
    [['effective_from' => '2026-02-30'], 'effective_from'], [['effective_from' => '1999-12-31'], 'effective_from'], [['effective_from' => '2101-01-01'], 'effective_from'],
    [['amount_cents' => -1], 'amount_cents'], [['amount_cents' => 1.5], 'amount_cents'], [['amount_cents' => 100000000000], 'amount_cents'],
    [['cadence' => 'sometimes'], 'cadence'], [['cadence' => 'custom'], 'payments_per_year'], [['cadence' => 'custom', 'payments_per_year' => 367], 'payments_per_year'],
]);

test('actual bills reject invalid money dates and partial billing periods', function (array $change, string $field) {
    $this->travelTo(CarbonImmutable::parse('2026-10-01', 'Australia/Melbourne'));
    $household = Household::factory()->hasAttached(User::factory())->create();
    $item = BudgetItem::factory()->for($household)->variable()->create();

    $this->actingAs($household->users->first())->post(route('bill-records.store', $item), ['records' => [actualBillPayload($change)]])->assertSessionHasErrors('records.0.'.$field);
    $this->assertDatabaseCount('bill_records', 0);
})->with([
    [['amount_cents' => -1], 'amount_cents'], [['amount_cents' => 1.5], 'amount_cents'], [['amount_cents' => 100000000000], 'amount_cents'],
    [['billed_on' => '2026-10-02'], 'billed_on'], [['billed_on' => '2026-02-30'], 'billed_on'], [['paid_on' => '2026-10-02'], 'paid_on'],
    [['period_start' => null], 'period_start'], [['period_end' => null], 'period_end'], [['period_end' => '2026-06-01'], 'period_end'],
    [['entry_key' => 'not-a-uuid'], 'entry_key'],
]);

test('saving ahead uses the price applicable on the due date', function () {
    $this->travelTo(CarbonImmutable::parse('2026-10-01', 'Australia/Melbourne'));
    $item = BudgetItem::factory()->sinkingFund()->create(['amount_cents' => 120000, 'saved_cents' => 0, 'contribution_cents' => null, 'saving_start_date' => '2026-10-01', 'due_date' => '2026-11-01']);
    app(BudgetItemHistory::class)->record($item, revisionPayload(['effective_from' => '2026-11-01', 'amount_cents' => 150000, 'cadence' => 'annually']));

    expect(app(BudgetCalculator::class)->sinkingFund($item->fresh(), CarbonImmutable::parse('2026-10-01', 'Australia/Melbourne')))->toMatchArray(['remaining_cents' => 150000, 'required_cents' => 30000]);
});

test('demo history is repeatable and includes scheduled prices and seasonal bills', function () {
    $this->freezeTime();
    $this->seed(BudgetDemoSeeder::class);
    $this->seed(BudgetDemoSeeder::class);
    $this->assertDatabaseCount('bill_records', 8);
    $this->assertDatabaseCount('budget_item_revisions', 12);
    expect(BudgetItem::query()->where('name', 'Home insurance')->firstOrFail()->revisions()->count())->toBe(3);
    $electricity = BudgetItem::query()->where('name', 'Electricity')->firstOrFail();
    expect(app(BillHistory::class)->suggestion($electricity)['bill_count'])->toBe(4);
});
