<?php

use App\Models\Household;
use App\Models\Mortgage;
use App\Models\SuperBalance;
use App\Models\SuperFund;
use App\Models\User;
use App\Services\RetirementPlanner;
use App\Services\SuperCalculator;
use Carbon\CarbonImmutable;
use Database\Seeders\BudgetDemoSeeder;
use Inertia\Testing\AssertableInertia as Assert;

test('members can save birth dates and retirement ages and see them in the household', function () {
    $this->travelTo(CarbonImmutable::parse('2026-10-02', 'Australia/Melbourne'));
    $user = User::factory()->create(['name' => 'James']);
    $household = Household::factory()->hasAttached($user)->create();
    $partner = User::factory()->create();
    $household->users()->attach($partner);

    $this->actingAs($partner)->put(route('household.member', $user), ['name' => 'James', 'date_of_birth' => '1986-10-02', 'retirement_age' => 67])->assertRedirect();
    expect($user->fresh()->date_of_birth->toDateString())->toBe('1986-10-02');
    expect($user->fresh()->retirement_age)->toBe(67);
    $this->get(route('household'))->assertInertia(fn (Assert $page) => $page->where('members', fn ($members): bool => collect($members)->contains(fn ($member): bool => $member['id'] === $user->id && $member['date_of_birth'] === '1986-10-02' && $member['retirement_age'] === 67)));
});

test('birth dates can be cleared and retirement defaults to 65', function () {
    $user = User::factory()->retirementPlanning()->create();
    $household = Household::factory()->hasAttached($user)->create();

    $this->actingAs($user)->put(route('household.member', $user), ['name' => $user->name, 'date_of_birth' => null])->assertRedirect();
    expect($user->fresh()->date_of_birth)->toBeNull();
    expect($user->fresh()->retirement_age)->toBe(65);
    $this->get(route('outlook'))->assertInertia(fn (Assert $page) => $page->where('retirementMembers.0.age', null)->where('retirementMembers.0.years_remaining', null)->where('retirementMembers.0.super_projection', []));
});

test('retirement details reject future birth dates impossible dates and unreasonable retirement ages', function (array $invalid, array $errors) {
    $this->travelTo(CarbonImmutable::parse('2026-10-02', 'Australia/Melbourne'));
    $user = User::factory()->retirementPlanning()->create();
    Household::factory()->hasAttached($user)->create();

    $this->actingAs($user)->put(route('household.member', $user), ['name' => $user->name, ...$invalid])->assertSessionHasErrors($errors);
    expect($user->fresh()->date_of_birth->toDateString())->toBe('1990-04-15');
    expect($user->fresh()->retirement_age)->toBe(65);
})->with([
    'future birth' => [['date_of_birth' => '2026-10-03'], ['date_of_birth']],
    'invalid calendar date' => [['date_of_birth' => '1990-02-31'], ['date_of_birth']],
    'too old' => [['date_of_birth' => '1899-01-01'], ['date_of_birth']],
    'too low' => [['retirement_age' => 17], ['retirement_age']],
    'too high' => [['retirement_age' => 101], ['retirement_age']],
    'fractional age' => [['retirement_age' => 65.5], ['retirement_age']],
]);

test('other households cannot change demographic or retirement details', function () {
    $user = User::factory()->create();
    Household::factory()->hasAttached($user)->create();
    $other = User::factory()->retirementPlanning()->create();
    Household::factory()->hasAttached($other)->create();

    $this->actingAs($user)->put(route('household.member', $other), ['name' => 'Changed', 'date_of_birth' => '1980-01-01', 'retirement_age' => 70])->assertNotFound();
    expect($other->fresh()->date_of_birth->toDateString())->toBe('1990-04-15');
    expect($other->fresh()->retirement_age)->toBe(65);
});

test('retirement projections combine only a members funds on the long term outlook', function () {
    $this->travelTo(CarbonImmutable::parse('2026-10-02', 'Australia/Melbourne'));
    $user = User::factory()->create(['name' => 'James', 'date_of_birth' => '1996-10-02']);
    $household = Household::factory()->hasAttached($user)->create();
    $partner = User::factory()->create(['name' => 'Sasha', 'date_of_birth' => '1986-10-02']);
    $household->users()->attach($partner);
    $fund = SuperFund::factory()->for($household)->create(['person' => 'Different statement name', 'member_id' => $user->id, 'return_rate' => 0, 'annual_fee_cents' => 0, 'annual_insurance_cents' => 0, 'fee_rate' => 0, 'salary_sacrifice_cents' => 120000]);
    SuperBalance::factory()->for($fund)->create(['balance_cents' => 100000]);
    $second = SuperFund::factory()->for($household)->create(['person' => 'James', 'return_rate' => 0, 'annual_fee_cents' => 0, 'annual_insurance_cents' => 0, 'fee_rate' => 0]);
    SuperBalance::factory()->for($second)->create(['balance_cents' => 200000]);
    $other = SuperFund::factory()->for($household)->create(['person' => 'James', 'member_id' => $partner->id]);
    SuperBalance::factory()->for($other)->create(['balance_cents' => 99999999]);
    SuperFund::factory()->create(['person' => 'James']);
    $mortgage = Mortgage::factory()->for($household)->create();

    $this->actingAs($user)->get(route('outlook'))->assertInertia(fn (Assert $page) => $page->where('retirementMembers.0.age', 30)->where('retirementMembers.0.retirement_age', 65)->where('retirementMembers.0.retirement_date', '2061-10-02')->where('retirementMembers.0.years_remaining', 35)->where('retirementMembers.0.super_funds_count', 2)->where('retirementMembers.0.super_projection.35.balance_cents', 3870000)->where('mortgage.id', $mortgage->id));
    $this->put(route('household.member', $user), ['name' => 'James', 'retirement_age' => 67])->assertRedirect();
    $this->get(route('outlook'))->assertInertia(fn (Assert $page) => $page->where('retirementMembers.0.retirement_date', '2063-10-02')->where('retirementMembers.0.super_projection.37.balance_cents', 4074000));
});

test('funds cannot be assigned to a member outside the household', function () {
    $user = User::factory()->create();
    Household::factory()->hasAttached($user)->create();
    $foreign = User::factory()->create();
    $payload = SuperFund::factory()->make(['household_id' => 1])->getAttributes();

    $this->actingAs($user)->post(route('superannuation.store'), [...$payload, 'member_id' => $foreign->id, 'balance_cents' => 1, 'recorded_on' => '2026-01-01'])->assertSessionHasErrors('member_id');
    $this->assertDatabaseCount('super_funds', 0);
});

test('retirement timelines handle birthdays leap day births and already reached retirement ages', function () {
    $user = User::factory()->create(['name' => 'James', 'date_of_birth' => '1960-02-29', 'retirement_age' => 65]);
    $household = Household::factory()->hasAttached($user)->create();
    $fund = SuperFund::factory()->for($household)->create(['member_id' => $user->id, 'salary_sacrifice_cents' => 120000]);
    SuperBalance::factory()->for($fund)->create(['balance_cents' => 100000]);
    $planner = app(RetirementPlanner::class);

    $members = $planner->members($household, CarbonImmutable::parse('2026-10-02', 'Australia/Melbourne'));
    expect($members[0]['retirement_date'])->toBe('2025-02-28');
    expect($planner->members($household, CarbonImmutable::parse('2025-02-28', 'Australia/Melbourne'))[0]['age'])->toBe(65);
    expect($planner->members($household, CarbonImmutable::parse('2025-02-27', 'Australia/Melbourne'))[0]['age'])->toBe(64);
    expect($members[0]['years_remaining'])->toBe(0.0);
    expect($members[0]['super_projection'][0]['balance_cents'])->toBe(100000);
    expect($members[0]['super_projection'])->toHaveCount(1);
    $user->update(['date_of_birth' => '1986-10-03']);
    expect($planner->members($household, CarbonImmutable::parse('2026-10-02', 'Australia/Melbourne'))[0]['age'])->toBe(39);
    expect($planner->members($household, CarbonImmutable::parse('2026-10-03', 'Australia/Melbourne'))[0]['age'])->toBe(40);
});

test('super projections stop at a fractional retirement horizon rather than rounding to another year', function () {
    $fund = SuperFund::factory()->make(['household_id' => 1, 'return_rate' => 0, 'annual_fee_cents' => 0, 'annual_insurance_cents' => 0, 'fee_rate' => 0, 'salary_sacrifice_cents' => 120000]);
    $fund->setRelation('income', null);

    $points = app(SuperCalculator::class)->project($fund, 100000, 1.5);
    expect($points)->toHaveCount(3);
    expect($points[2]['year'])->toBe(1.5);
    expect($points[2]['balance_cents'])->toBe(253000);
    expect($points[2]['contributions_cents'])->toBe(253000);
});

test('retirement demo data is coherent and repeated seeding preserves birth dates and retirement edits', function () {
    $this->seed(BudgetDemoSeeder::class);
    $james = User::query()->where('email', 'james@example.test')->firstOrFail();
    $household = $james->households()->firstOrFail();
    expect($household->superFunds()->where('person', 'James')->get()->every(fn (SuperFund $fund): bool => $fund->member_id === $james->id))->toBeTrue();
    expect($james->date_of_birth)->not->toBeNull();
    $james->update(['date_of_birth' => '1985-01-01', 'retirement_age' => 70]);

    $this->seed(BudgetDemoSeeder::class);
    expect($james->fresh()->date_of_birth->toDateString())->toBe('1985-01-01');
    expect($james->fresh()->retirement_age)->toBe(70);
});

test('fund member links can be saved and reassigned within the household', function () {
    $user = User::factory()->retirementPlanning()->create(['name' => 'James']);
    $partner = User::factory()->retirementPlanning()->create(['name' => 'Sasha']);
    $household = Household::factory()->hasAttached($user)->hasAttached($partner)->create();
    $payload = SuperFund::factory()->make(['household_id' => 1])->getAttributes();

    $this->actingAs($user)->post(route('superannuation.store'), [...$payload, 'member_id' => $user->id, 'balance_cents' => 100000, 'recorded_on' => '2026-01-01'])->assertRedirect();
    $fund = $household->superFunds()->firstOrFail();
    expect($fund->member_id)->toBe($user->id);
    $this->put(route('superannuation.update', $fund), [...$payload, 'member_id' => $partner->id])->assertRedirect();
    expect($fund->fresh()->member_id)->toBe($partner->id);
    $this->get(route('outlook'))->assertInertia(fn (Assert $page) => $page->where('retirementMembers.0.super_funds_count', 0)->where('retirementMembers.1.super_funds_count', 1));
});
