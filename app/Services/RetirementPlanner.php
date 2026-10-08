<?php

namespace App\Services;

use App\Models\Household;
use App\Models\SuperFund;
use App\Models\User;
use Carbon\CarbonImmutable;

class RetirementPlanner
{
    public function __construct(private SuperCalculator $super) {}

    /** @return list<array{id: int, name: string, date_of_birth: string|null, age: int|null, retirement_age: int, retirement_date: string|null, years_remaining: float|null, super_funds_count: int, super_projection: list<array{year: int|float, balance_cents: int, contributions_cents: int}>}> */
    public function members(Household $household, CarbonImmutable $today): array
    {
        $funds = $household->superFunds()->with(['income.financialChanges', 'financialChanges', 'balances' => fn ($query) => $query->orderBy('recorded_on')->orderBy('id')])->get();

        return array_values($household->users()->orderBy('name')->get()->map(function (User $member) use ($funds, $today): array {
            $birth = $member->date_of_birth === null ? null : CarbonImmutable::parse($member->date_of_birth->toDateString(), $today->getTimezone());
            $age = $birth === null ? null : $today->year - $birth->year;
            if ($birth !== null && $age !== null && $today->lt($birth->addYearsNoOverflow($age))) {
                $age--;
            }
            $retirementDate = $birth?->addYearsNoOverflow($member->retirement_age);
            $years = $retirementDate === null ? null : max(0.0, $today->diffInYears($retirementDate, false));
            $ownedFunds = $funds->filter(fn (SuperFund $fund): bool => $fund->member_id !== null ? $fund->member_id === $member->id : mb_strtolower(trim($fund->person)) === mb_strtolower(trim($member->name)));
            $projections = $years === null ? collect() : $ownedFunds->map(function (SuperFund $fund) use ($years): array {
                $balance = $fund->balances->last();

                return $this->super->project($fund, $balance === null ? 0 : $balance->balance_cents, $years);
            });
            $combined = [];
            foreach ($projections->first() ?? [] as $index => $point) {
                $combined[] = ['year' => $point['year'], 'balance_cents' => (int) $projections->sum(fn (array $projection): int => $projection[$index]['balance_cents']), 'contributions_cents' => (int) $projections->sum(fn (array $projection): int => $projection[$index]['contributions_cents'])];
            }

            return ['id' => $member->id, 'name' => $member->name, 'date_of_birth' => $birth?->toDateString(), 'age' => $age, 'retirement_age' => $member->retirement_age, 'retirement_date' => $retirementDate?->toDateString(), 'years_remaining' => $years, 'super_funds_count' => $ownedFunds->count(), 'super_projection' => $combined];
        })->all());
    }
}
