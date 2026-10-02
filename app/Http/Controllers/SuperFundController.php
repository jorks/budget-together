<?php

namespace App\Http\Controllers;

use App\Http\Requests\SuperFundRequest;
use App\Models\BudgetItem;
use App\Models\Household;
use App\Models\SuperFund;
use App\Services\HouseholdResolver;
use App\Services\SuperCalculator;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class SuperFundController extends Controller
{
    public function index(Request $request, HouseholdResolver $households, SuperCalculator $calculator): Response
    {
        $household = $households->forUser($request->user());
        Gate::authorize('manage', $household);
        $funds = $household->superFunds()->with(['income', 'balances' => fn ($query) => $query->orderBy('recorded_on')->orderBy('id')])->orderBy('person')->orderBy('name')->orderBy('id')->get();
        $incomes = $household->items()->where('kind', 'income')->where('is_active', true)->whereNotNull('gross_annual_cents')->get()->reject(fn (BudgetItem $income): bool => mb_strtolower(trim($income->category ?? '')) === 'bonus')->values();

        return Inertia::render('superannuation/index', [
            'members' => $household->users()->get(['users.id', 'users.name']),
            'funds' => $funds->map(function (SuperFund $fund) use ($calculator): array {
                $latest = $fund->balances->last();

                return [...$fund->toArray(), 'current_balance_cents' => $latest === null ? 0 : $latest->balance_cents, 'balance_date' => $latest === null ? null : $latest->recorded_on->toDateString(), 'needs_update' => $latest === null || $latest->recorded_on->lte(now('Australia/Melbourne')->startOfDay()->subYear()), 'contributions' => $calculator->contributions($fund), 'projection' => $calculator->project($fund, $latest === null ? 0 : $latest->balance_cents)];
            }),
            'incomes' => $incomes->map(fn (BudgetItem $income): array => $income->only(['id', 'name', 'person', 'gross_annual_cents', 'salary_sacrifice_cents', 'use_tax_estimate'])),
            'people' => $household->users()->pluck('name')->merge($incomes->pluck('person'))->merge($funds->pluck('person'))->filter()->unique()->values(),
            'today' => now('Australia/Melbourne')->toDateString(),
        ]);
    }

    public function store(SuperFundRequest $request, HouseholdResolver $households): RedirectResponse
    {
        $household = $households->forUser($request->user());
        Gate::authorize('manage', $household);
        DB::transaction(function () use ($household, $request): void {
            $data = $request->validated();
            $this->syncSacrifice($household, $data);
            $fund = $household->superFunds()->create(collect($data)->except(['recorded_on', 'balance_cents'])->all());
            $fund->balances()->create(['recorded_on' => $data['recorded_on'], 'balance_cents' => $data['balance_cents']]);
        });
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Super fund added.']);

        return to_route('superannuation.index');
    }

    public function update(SuperFundRequest $request, SuperFund $superFund, HouseholdResolver $households): RedirectResponse
    {
        $household = $households->forUser($request->user());
        Gate::authorize('manage', $household);
        abort_unless($superFund->household_id === $household->id, 404);
        DB::transaction(function () use ($household, $request, $superFund): void {
            $data = $request->validated();
            $this->syncSacrifice($household, $data);
            $superFund->update($data);
        });
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Super fund updated.']);

        return to_route('superannuation.index');
    }

    public function destroy(Request $request, SuperFund $superFund, HouseholdResolver $households): RedirectResponse
    {
        $household = $households->forUser($request->user());
        Gate::authorize('manage', $household);
        abort_unless($superFund->household_id === $household->id, 404);
        $superFund->delete();
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Super fund and balance history removed.']);

        return to_route('superannuation.index');
    }

    /** @param array<string, mixed> $data */
    private function syncSacrifice(Household $household, array $data): void
    {
        if (empty($data['income_id'])) {
            return;
        }
        $income = $household->items()->lockForUpdate()->whereKey($data['income_id'])->firstOrFail();
        if ($income->gross_annual_cents < $data['salary_sacrifice_cents'] + ($income->workplace_giving_cents ?? 0) + ($income->other_deductions_cents ?? 0)) {
            throw ValidationException::withMessages(['salary_sacrifice_cents' => 'Annual payroll deductions cannot exceed the gross base wage.']);
        }
        $income->update(['salary_sacrifice_cents' => $data['salary_sacrifice_cents']]);
    }
}
