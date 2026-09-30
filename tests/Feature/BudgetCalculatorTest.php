<?php

use App\Models\BudgetItem;
use App\Services\AustralianTaxEstimator;
use App\Services\BudgetCalculator;
use Carbon\CarbonImmutable;

test('converts entered cadences to comparable annual costs', function (string $cadence, int $amount, ?int $custom, int $annual) {
    $item = BudgetItem::factory()->make(['cadence' => $cadence, 'amount_cents' => $amount, 'payments_per_year' => $custom]);
    expect(app(BudgetCalculator::class)->annual($item))->toBe($annual);
})->with([
    'weekly' => ['weekly', 10001, null, 520052],
    'fortnightly' => ['fortnightly', 120000, null, 3120000],
    'monthly' => ['monthly', 520000, null, 6240000],
    'quarterly' => ['quarterly', 29000, null, 116000],
    'half yearly' => ['half_yearly', 12500, null, 25000],
    'annually' => ['annually', 165000, null, 165000],
    'ten instalments' => ['custom', 31000, 10, 310000],
]);

test('calendar preserves the original month end and leap year anchor', function () {
    $item = BudgetItem::factory()->make(['due_date' => '2028-01-31', 'cadence' => 'monthly']);
    expect(app(BudgetCalculator::class)->occurrences($item, CarbonImmutable::parse('2028-01-01'), CarbonImmutable::parse('2028-04-30')))
        ->toBe(['2028-01-31', '2028-02-29', '2028-03-31', '2028-04-30']);
});

test('custom instalments show only the entered date instead of inventing a schedule', function () {
    $item = BudgetItem::factory()->make(['due_date' => '2026-10-15', 'cadence' => 'custom', 'payments_per_year' => 10]);
    expect(app(BudgetCalculator::class)->occurrences($item, CarbonImmutable::parse('2026-10-01'), CarbonImmutable::parse('2027-10-01')))->toBe(['2026-10-15']);
});

test('funding counts deposits before the bill and rounds up to fully fund it', function () {
    $item = BudgetItem::factory()->sinkingFund()->make(['amount_cents' => 100001, 'saved_cents' => 10000, 'saving_start_date' => '2026-10-01', 'due_date' => '2026-10-22']);
    $plan = app(BudgetCalculator::class)->sinkingFund($item, CarbonImmutable::parse('2026-10-01'));
    expect($plan)->toMatchArray(['contributions_left' => 3, 'required_cents' => 30001, 'projected_cents' => 100003, 'on_track' => true]);
});

test('funding reports a shortfall for insufficient contributions and overdue bills', function () {
    $item = BudgetItem::factory()->sinkingFund()->make(['amount_cents' => 100000, 'saved_cents' => 10000, 'saving_start_date' => '2026-10-01', 'due_date' => '2026-10-22', 'contribution_cents' => 15000]);
    $calculator = app(BudgetCalculator::class);
    expect($calculator->sinkingFund($item, CarbonImmutable::parse('2026-10-01')))->toMatchArray(['shortfall_cents' => 45000, 'on_track' => false]);
    expect($calculator->sinkingFund($item, CarbonImmutable::parse('2026-10-23')))->toMatchArray(['contributions_left' => 0, 'required_cents' => 90000, 'shortfall_cents' => 90000, 'overdue' => true]);
});

test('budget counts bills once and separates savings from spending', function () {
    $items = collect([
        BudgetItem::factory()->income()->make(['amount_cents' => 1000000, 'cadence' => 'monthly']),
        BudgetItem::factory()->sinkingFund()->make(['amount_cents' => 520000]),
        BudgetItem::factory()->allowance()->make(['amount_cents' => 10000]),
        BudgetItem::factory()->savings()->make(['amount_cents' => 100000]),
        BudgetItem::factory()->make(['amount_cents' => 9900000, 'is_active' => false]),
    ]);
    expect(app(BudgetCalculator::class)->totals($items)['remaining']['annually'])->toBe(9760000);
});

test('resident tax estimate applies each marginal bracket for the selected financial year', function (int $gross, int $year, int $tax) {
    expect(app(AustralianTaxEstimator::class)->estimate($gross, $year, false)['tax_cents'])->toBe($tax);
})->with([
    [1820000, 2026, 0], [4500000, 2026, 402000], [13500000, 2026, 3102000],
    [19000000, 2026, 5137000], [20000000, 2026, 5587000],
    [4500000, 2025, 428800], [4500000, 2027, 375200],
]);

test('income can use the tax estimate while excluding an uncertain bonus', function () {
    $item = BudgetItem::factory()->income()->make(['gross_annual_cents' => 20000000, 'bonus_annual_cents' => 1000000, 'use_tax_estimate' => true]);
    expect(app(BudgetCalculator::class)->annual($item))->toBe(14013000);
    $item->include_bonus = true;
    expect(app(BudgetCalculator::class)->annual($item))->toBe(14543000);
});
