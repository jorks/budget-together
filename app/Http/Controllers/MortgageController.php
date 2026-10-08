<?php

namespace App\Http\Controllers;

use App\Http\Requests\MortgageRequest;
use App\Services\FinancialHistory;
use App\Services\HouseholdResolver;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class MortgageController extends Controller
{
    public function __construct(private FinancialHistory $history) {}

    public function index(Request $request, HouseholdResolver $households): Response
    {
        $household = $households->forUser($request->user());
        Gate::authorize('manage', $household);
        abort_unless($household->mortgage_enabled, 404);

        return Inertia::render('mortgage/index', ['mortgage' => $household->mortgage === null ? null : $this->history->at($household->mortgage),
            'changes' => $household->mortgage?->financialChanges()->orderByDesc('effective_from')->get() ?? [],
            'today' => now('Australia/Melbourne')->toDateString(), 'accounts' => $household->accounts()->orderBy('name')->get(['id', 'name'])]);
    }

    public function update(MortgageRequest $request, HouseholdResolver $households): RedirectResponse
    {
        $household = $households->forUser($request->user());
        Gate::authorize('manage', $household);
        abort_unless($household->mortgage_enabled, 404);
        if ($household->mortgage === null) {
            $household->mortgage()->create($request->validated());
        } else {
            $this->history->updateDetails($household->mortgage, $request->validated());
        }
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Mortgage details saved.']);

        return to_route('mortgage.index');
    }
}
