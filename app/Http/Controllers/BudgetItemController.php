<?php

namespace App\Http\Controllers;

use App\Http\Requests\BudgetItemRequest;
use App\Models\BudgetItem;
use App\Services\HouseholdResolver;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class BudgetItemController extends Controller
{
    public function store(BudgetItemRequest $request, HouseholdResolver $households): RedirectResponse
    {
        $household = $households->forUser($request->user());
        Gate::authorize('manage', $household);
        $household->items()->create($request->validated());
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Saved successfully.']);

        return back();
    }

    public function update(BudgetItemRequest $request, BudgetItem $budgetItem): RedirectResponse
    {
        $budgetItem->update($request->validated());
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Changes saved.']);

        return back();
    }

    public function destroy(BudgetItem $budgetItem): RedirectResponse
    {
        Gate::authorize('manage', $budgetItem->household);
        $budgetItem->delete();
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Deleted successfully.']);

        return back();
    }
}
