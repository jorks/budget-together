<?php

use App\Models\BudgetItem;
use App\Models\Household;
use App\Models\HouseholdInvitation;
use App\Models\SuperBalance;
use App\Models\SuperFund;
use App\Models\User;
use App\Services\BudgetCalculator;
use App\Services\FinancialHistory;
use App\Services\SuperCalculator;
use Carbon\CarbonImmutable;
use Database\Seeders\BudgetDemoSeeder;
use Database\Seeders\SuperDemoSeeder;
use Inertia\Testing\AssertableInertia as Assert;

/**
 * @param  array<string, mixed>  $overrides
 * @return array<string, mixed>
 */
function superPayload(array $overrides = []): array
{
    return array_replace(SuperFund::factory()->make(['household_id' => 1])->getAttributes(), ['recorded_on' => '2026-01-01', 'balance_cents' => 12500000], $overrides);
}

test('super endpoints require authentication', function () {
    $fund = SuperFund::factory()->create();
    $balance = SuperBalance::factory()->for($fund)->create();

    $this->get(route('superannuation.index'))->assertRedirect(route('login'));
    $this->post(route('superannuation.store'), [])->assertRedirect(route('login'));
    $this->put(route('superannuation.update', $fund), [])->assertRedirect(route('login'));
    $this->delete(route('superannuation.destroy', $fund))->assertRedirect(route('login'));
    $this->post(route('super-balances.store', $fund), [])->assertRedirect(route('login'));
    $this->delete(route('super-balances.destroy', [$fund, $balance]))->assertRedirect(route('login'));
    $this->assertModelExists($fund);
    $this->assertModelExists($balance);
});

test('a household member can add edit and remove a fund without changing another households data', function () {
    $household = Household::factory()->hasAttached(User::factory())->create();
    $foreign = SuperFund::factory()->create();
    $payload = superPayload(['household_id' => $foreign->household_id]);

    $this->actingAs($household->users->first())->post(route('superannuation.store'), $payload)->assertRedirect(route('superannuation.index'));
    $fund = $household->superFunds()->firstOrFail();
    $this->assertDatabaseHas('super_balances', ['super_fund_id' => $fund->id, 'balance_cents' => 12500000]);
    $this->put(route('superannuation.update', $fund), array_replace($payload, ['name' => 'Updated fund', 'balance_cents' => 1]))->assertRedirect(route('superannuation.show', $fund));
    expect($fund->fresh()->name)->toBe('Updated fund');
    expect($fund->balances()->first()->balance_cents)->toBe(12500000);
    $this->get(route('superannuation.index'))->assertInertia(fn (Assert $page) => $page->component('superannuation/index')->has('funds', 1)->where('funds.0.id', $fund->id));
    $this->delete(route('superannuation.destroy', $fund))->assertRedirect(route('superannuation.index'));
    $this->assertModelMissing($fund);
    $this->assertDatabaseCount('super_balances', 0);
    $this->assertModelExists($foreign);
});

test('other households cannot edit remove or add balances to a fund', function () {
    $household = Household::factory()->hasAttached(User::factory())->create();
    $fund = SuperFund::factory()->create();
    $balance = SuperBalance::factory()->for($fund)->create();

    $this->actingAs($household->users->first())->put(route('superannuation.update', $fund), superPayload())->assertNotFound();
    $this->delete(route('superannuation.destroy', $fund))->assertNotFound();
    $this->post(route('super-balances.store', $fund), ['recorded_on' => '2026-01-01', 'balance_cents' => 1])->assertNotFound();
    $this->delete(route('super-balances.destroy', [$fund, $balance]))->assertNotFound();
    expect($fund->fresh()->name)->toBe('Example Super');
    expect($balance->fresh()->balance_cents)->toBe(12500000);
});

test('funds reject invalid financial settings and missing initial balances', function () {
    $this->travelTo(CarbonImmutable::parse('2026-10-02', 'Australia/Melbourne'));
    $household = Household::factory()->hasAttached(User::factory())->create();

    $this->actingAs($household->users->first())->post(route('superannuation.store'), superPayload(['person' => '', 'employer_rate' => -1, 'fee_rate' => 11, 'return_rate' => 21, 'salary_sacrifice_cents' => -1, 'annual_fee_cents' => -1, 'annual_insurance_cents' => -1, 'balance_cents' => null, 'recorded_on' => '2026-10-03']))->assertSessionHasErrors(['person', 'employer_rate', 'fee_rate', 'return_rate', 'salary_sacrifice_cents', 'annual_fee_cents', 'annual_insurance_cents', 'balance_cents', 'recorded_on']);
    $this->assertDatabaseCount('super_funds', 0);
    $this->assertDatabaseCount('super_balances', 0);
});

test('wage links are restricted to eligible wages for the person and household', function (string $case) {
    $household = Household::factory()->hasAttached(User::factory())->create();
    $income = BudgetItem::factory()->income()->for($household)->create();
    match ($case) {
        'foreign household' => $income->forceFill(['household_id' => Household::factory()->create()->id])->save(),
        'other person' => $income->update(['person' => 'Sasha']),
        'expense' => $income->update(['kind' => 'bill']),
        'no gross wage' => $income->update(['gross_annual_cents' => null]),
        'inactive wage' => $income->update(['is_active' => false]),
        'bonus' => $income->update(['category' => 'Bonus']),
        'lowercase bonus' => $income->update(['category' => ' bonus ']),
        'already linked' => SuperFund::factory()->for($household)->create(['income_id' => $income->id]),
    };

    $this->actingAs($household->users->first())->post(route('superannuation.store'), superPayload(['income_id' => $income->id]))->assertSessionHasErrors('income_id');
    expect($household->superFunds()->count())->toBe($case === 'already linked' ? 1 : 0);
    expect($income->fresh()->salary_sacrifice_cents)->toBe(0);
})->with(['foreign household', 'other person', 'expense', 'no gross wage', 'inactive wage', 'bonus', 'lowercase bonus', 'already linked']);

test('linked salary sacrifice updates income take home and remains canonical when edited from income', function () {
    $household = Household::factory()->hasAttached(User::factory())->create();
    $income = BudgetItem::factory()->income()->for($household)->create(['gross_annual_cents' => 10000000, 'use_tax_estimate' => true, 'salary_sacrifice_cents' => 0]);
    $calculator = app(BudgetCalculator::class);
    $before = $calculator->annual($income);

    $this->actingAs($household->users->first())->post(route('superannuation.store'), superPayload(['income_id' => $income->id, 'salary_sacrifice_cents' => 500000]))->assertRedirect();
    $fund = $household->superFunds()->firstOrFail();
    expect($calculator->annual($income->fresh()))->toBe($before - 340000);
    $this->get(route('superannuation.index'))->assertInertia(fn (Assert $page) => $page->where('funds.0.contributions.employer_cents', 1200000)->where('funds.0.contributions.sacrifice_cents', 500000)->where('funds.0.contributions.net_cents', 1445000));
    app(FinancialHistory::class)->updateDetails($income, ['salary_sacrifice_cents' => 600000]);
    $this->get(route('superannuation.index'))->assertInertia(fn (Assert $page) => $page->where('funds.0.contributions.sacrifice_cents', 600000));
    $this->put(route('superannuation.update', $fund), superPayload(['income_id' => $income->id, 'salary_sacrifice_cents' => 700000]))->assertRedirect();
    expect($income->fresh()->salary_sacrifice_cents)->toBe(700000);
    $this->delete(route('superannuation.destroy', $fund))->assertRedirect();
    expect($income->fresh()->salary_sacrifice_cents)->toBe(700000);
});

test('excessive payroll deductions reject changes atomically', function () {
    $household = Household::factory()->hasAttached(User::factory())->create();
    $income = BudgetItem::factory()->income()->for($household)->create(['gross_annual_cents' => 1000000, 'workplace_giving_cents' => 100000, 'salary_sacrifice_cents' => 0]);

    $this->actingAs($household->users->first())->post(route('superannuation.store'), superPayload(['income_id' => $income->id, 'salary_sacrifice_cents' => 950000]))->assertSessionHasErrors('salary_sacrifice_cents');
    expect($income->fresh()->salary_sacrifice_cents)->toBe(0);
    $this->assertDatabaseCount('super_funds', 0);
    $this->assertDatabaseCount('super_balances', 0);
});

test('recording historical balances and correcting dates preserves latest balance and projection', function () {
    $this->travelTo(CarbonImmutable::parse('2026-10-02', 'Australia/Melbourne'));
    $household = Household::factory()->hasAttached(User::factory())->create();
    $fund = SuperFund::factory()->for($household)->create();
    SuperBalance::factory()->for($fund)->create(['recorded_on' => '2026-09-01', 'balance_cents' => 13000000]);

    $this->actingAs($household->users->first())->post(route('super-balances.store', $fund), ['recorded_on' => '2025-09-01', 'balance_cents' => 11000000])->assertRedirect();
    $this->post(route('super-balances.store', $fund), ['recorded_on' => '2025-09-01', 'balance_cents' => 11500000, 'notes' => 'Corrected statement'])->assertRedirect();
    $this->get(route('superannuation.index'))->assertInertia(fn (Assert $page) => $page->has('funds.0.balances', 2)->where('funds.0.current_balance_cents', 13000000)->where('funds.0.projection.0.balance_cents', 13000000)->where('funds.0.needs_update', false)->where('funds.0.balances.0.balance_cents', 11500000));
    $latest = $fund->balances()->where('recorded_on', '2026-09-01')->firstOrFail();
    $this->delete(route('super-balances.destroy', [$fund, $latest]))->assertRedirect();
    $this->get(route('superannuation.index'))->assertInertia(fn (Assert $page) => $page->where('funds.0.current_balance_cents', 11500000)->where('funds.0.needs_update', true));
    $remaining = $fund->balances()->firstOrFail();
    $this->delete(route('super-balances.destroy', [$fund, $remaining]))->assertSessionHasErrors('balance');
    $this->assertModelExists($remaining);
});

test('balances reject future dates invalid amounts and entries from a different fund', function () {
    $this->travelTo(CarbonImmutable::parse('2026-10-02', 'Australia/Melbourne'));
    $household = Household::factory()->hasAttached(User::factory())->create();
    $fund = SuperFund::factory()->for($household)->create();
    $other = SuperFund::factory()->for($household)->create();
    $balance = SuperBalance::factory()->for($other)->create();

    $this->actingAs($household->users->first())->post(route('super-balances.store', $fund), ['recorded_on' => '2026-10-03', 'balance_cents' => -1])->assertSessionHasErrors(['recorded_on', 'balance_cents']);
    $this->delete(route('super-balances.destroy', [$fund, $balance]))->assertNotFound();
    $this->assertModelExists($balance);
    expect($fund->balances()->count())->toBe(0);
});

test('super projections include contribution tax costs compounding and negative returns', function () {
    $calculator = app(SuperCalculator::class);
    $fund = SuperFund::factory()->make(['salary_sacrifice_cents' => 120000, 'return_rate' => 0, 'annual_fee_cents' => 12000, 'annual_insurance_cents' => 12000, 'fee_rate' => 0]);
    $fund->setRelation('income', null);

    expect($calculator->contributions($fund))->toBe(['employer_cents' => 0, 'sacrifice_cents' => 120000, 'tax_cents' => 18000, 'net_cents' => 102000]);
    expect($calculator->project($fund, 100000, 1)[1]['balance_cents'])->toBe(178000);
    $fund->forceFill(['salary_sacrifice_cents' => 0, 'annual_fee_cents' => 0, 'annual_insurance_cents' => 0, 'return_rate' => 10]);
    expect($calculator->project($fund, 100000, 1)[1]['balance_cents'])->toBe(110000);
    $fund->forceFill(['return_rate' => -10]);
    expect($calculator->project($fund, 100000, 1)[1]['balance_cents'])->toBe(90000);
    $fund->forceFill(['return_rate' => 0, 'fee_rate' => 1.2]);
    expect($calculator->project($fund, 100000, 1)[1]['balance_cents'])->toBe(98807);
    $fund->forceFill(['annual_fee_cents' => 1200000]);
    expect($calculator->project($fund, 100, 1)[1]['balance_cents'])->toBe(0);
});

test('paused or bonus incomes do not contribute and wage gross excludes bonuses and deductions', function () {
    $fund = SuperFund::factory()->make();
    $income = BudgetItem::factory()->salarySacrifice()->make(['gross_annual_cents' => 10000000, 'bonus_annual_cents' => 1000000, 'include_bonus' => true]);
    $fund->setRelation('income', $income);
    $calculator = app(SuperCalculator::class);

    expect($calculator->contributions($fund)['employer_cents'])->toBe(1200000);
    $income->is_active = false;
    expect($calculator->contributions($fund)['net_cents'])->toBe(0);
    $income->forceFill(['is_active' => true, 'category' => 'Bonus']);
    expect($calculator->contributions($fund)['net_cents'])->toBe(0);
});

test('super seeding creates linked funds history and a consolidation example and preserves edits', function () {
    $this->freezeTime();
    $this->seed(BudgetDemoSeeder::class);
    $household = User::query()->where('email', 'james@example.test')->firstOrFail()->households()->firstOrFail();
    $fund = $household->superFunds()->where('name', 'Example Super')->firstOrFail();
    expect($fund->income->name)->toBe('James salary');
    expect($fund->balances()->count())->toBe(5);
    expect($household->superFunds()->where('person', 'James')->count())->toBe(2);
    $fund->update(['return_rate' => 4]);
    $fund->balances()->latest('recorded_on')->first()->update(['balance_cents' => 14000000]);

    $this->seed(SuperDemoSeeder::class);
    $this->assertDatabaseCount('super_funds', 3);
    $this->assertDatabaseCount('super_balances', 15);
    expect($fund->fresh()->return_rate)->toBe(4.0);
    expect($fund->balances()->latest('recorded_on')->first()->balance_cents)->toBe(14000000);
    app()->detectEnvironment(fn (): string => 'production');
    (new SuperDemoSeeder)->run();
    $this->assertDatabaseCount('super_funds', 3);
});

test('super data prevents switching households through an invitation', function () {
    $user = User::factory()->create();
    $household = Household::factory()->hasAttached($user)->create();
    SuperFund::factory()->for($household)->create();
    $invitation = HouseholdInvitation::factory()->create(['email' => $user->email, 'token' => hash('sha256', 'super-invite')]);

    $this->actingAs($user)->put(route('invitations.update', 'super-invite'))->assertSessionHasErrors('invitation');
    expect($user->households()->first()->id)->toBe($household->id);
    expect($invitation->fresh()->accepted_at)->toBeNull();
});

test('renaming a household person keeps their fund ownership consistent', function () {
    $user = User::factory()->create(['name' => 'James']);
    $household = Household::factory()->hasAttached($user)->create();
    $fund = SuperFund::factory()->for($household)->create(['person' => 'James']);

    $this->actingAs($user)->put(route('household.member', $user), ['name' => 'Jim'])->assertRedirect();
    expect($fund->fresh()->person)->toBe('Jim');
});

test('a wage with a newly effective gross salary becomes eligible for linking', function () {
    $this->travelTo(CarbonImmutable::parse('2026-10-01', 'Australia/Melbourne'));
    $household = Household::factory()->hasAttached(User::factory())->create();
    $income = BudgetItem::factory()->income()->for($household)->create(['gross_annual_cents' => null, 'salary_sacrifice_cents' => 0]);
    app(FinancialHistory::class)->record($income, ['gross_annual_cents' => 10000000], '2026-11-01');
    $payload = superPayload(['income_id' => $income->id, 'salary_sacrifice_cents' => 0]);
    $this->actingAs($household->users->first())->post(route('superannuation.store'), $payload)->assertSessionHasErrors('income_id');
    $this->travelTo(CarbonImmutable::parse('2026-11-01', 'Australia/Melbourne'));

    $this->post(route('superannuation.store'), $payload)->assertSessionHasNoErrors();
    $this->assertDatabaseHas('super_funds', ['household_id' => $household->id, 'income_id' => $income->id]);
    $this->get(route('superannuation.index'))->assertInertia(fn (Assert $page) => $page->where('incomes.0.gross_annual_cents', 10000000));
});

test('fund detail opens the requested balance editor and hides other households funds', function () {
    $household = Household::factory()->hasAttached(User::factory())->create();
    $fund = SuperFund::factory()->for($household)->create();
    $balance = SuperBalance::factory()->for($fund)->create();
    $foreign = SuperFund::factory()->create();
    $this->actingAs($household->users->first())->get(route('superannuation.show', [$fund, 'balance' => 1]))->assertInertia(fn (Assert $page) => $page->component('superannuation/show')->where('recordingBalance', true)->where('fund.id', $fund->id));
    $this->get(route('superannuation.show', [$fund, 'balance_record' => $balance->id]))->assertInertia(fn (Assert $page) => $page->where('correctingBalance', $balance->id));
    $this->get(route('superannuation.show', $foreign))->assertNotFound();
});
