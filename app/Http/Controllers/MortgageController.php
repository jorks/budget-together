<?php

namespace App\Http\Controllers;

use App\Http\Requests\MortgageRequest;
use App\Services\HouseholdResolver;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class MortgageController extends Controller
{
    public function index(Request $request, HouseholdResolver $households): Response
    {
        $household = $households->forUser($request->user());
        Gate::authorize('manage', $household);

        return Inertia::render('mortgage/index', ['mortgage' => $household->mortgage, 'accounts' => $household->accounts()->orderBy('name')->get(['id', 'name'])]);
    }

    public function update(MortgageRequest $request, HouseholdResolver $households): RedirectResponse
    {
        $household = $households->forUser($request->user());
        Gate::authorize('manage', $household);
        $household->mortgage()->updateOrCreate([], $request->validated());
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Mortgage details saved.']);

        return to_route('mortgage.index');
    }
}
