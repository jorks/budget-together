<?php

namespace App\Http\Controllers;

use App\Http\Requests\DebtRequest;
use App\Models\Debt;
use App\Models\Household;
use App\Services\DebtCalculator;
use App\Services\HouseholdResolver;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class DebtController extends Controller
{
    private function household(Request $request, HouseholdResolver $households): Household
    {
        $household = $households->forUser($request->user());
        Gate::authorize('manage', $household);
        abort_unless($household->debts_enabled, 404);

        return $household;
    }

    public function index(Request $request, HouseholdResolver $households, DebtCalculator $calculator): Response
    {
        $household = $this->household($request, $households);

        return Inertia::render('debts/index', ['debts' => $household->debts()->with('account')->orderBy('name')->get()->map(fn (Debt $debt): array => [...$debt->toArray(), 'projection' => $calculator->project($debt), 'baseline' => $calculator->project($debt, false)]), 'accounts' => $household->accounts()->orderBy('name')->get(['id', 'name']), 'types' => Debt::TYPES]);
    }

    public function store(DebtRequest $request, HouseholdResolver $households): RedirectResponse
    {
        $this->household($request, $households)->debts()->create($request->validated());
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Debt added.']);

        return to_route('debts.index');
    }

    public function update(DebtRequest $request, Debt $debt, HouseholdResolver $households): RedirectResponse
    {
        $household = $this->household($request, $households);
        abort_unless($debt->household_id === $household->id, 404);
        $debt->update($request->validated());
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Debt updated.']);

        return to_route('debts.index');
    }

    public function destroy(Request $request, Debt $debt, HouseholdResolver $households): RedirectResponse
    {
        $household = $this->household($request, $households);
        abort_unless($debt->household_id === $household->id, 404);
        $debt->delete();
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Debt removed.']);

        return to_route('debts.index');
    }
}
