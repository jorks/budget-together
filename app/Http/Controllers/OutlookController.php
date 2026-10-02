<?php

namespace App\Http\Controllers;

use App\Cadence;
use App\Models\Debt;
use App\Services\DebtCalculator;
use App\Services\HouseholdResolver;
use App\Services\RetirementPlanner;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class OutlookController extends Controller
{
    public function index(Request $request, HouseholdResolver $households, RetirementPlanner $retirement, DebtCalculator $calculator): Response
    {
        $household = $households->forUser($request->user());
        Gate::authorize('manage', $household);

        return Inertia::render('outlook/index', [
            'retirementMembers' => $retirement->members($household, CarbonImmutable::today('Australia/Melbourne')),
            'mortgage' => $household->mortgage_enabled ? $household->mortgage : null,
            'debts' => $household->debts_enabled ? $household->debts()->where('is_active', true)->orderBy('name')->get()->map(function (Debt $debt) use ($calculator): array {
                $projection = $calculator->project($debt);

                return ['id' => $debt->id, 'name' => $debt->name, 'balance_cents' => $debt->balance_cents, 'payoff_years' => $projection['periods'] === null ? null : $projection['periods'] / Cadence::from($debt->frequency)->periods()];
            }) : [],
            'features' => $household->only(['mortgage_enabled', 'debts_enabled']),
        ]);
    }
}
