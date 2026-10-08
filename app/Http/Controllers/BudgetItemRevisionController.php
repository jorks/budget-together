<?php

namespace App\Http\Controllers;

use App\Http\Requests\BudgetItemRevisionRequest;
use App\Models\BudgetItem;
use App\Models\BudgetItemRevision;
use App\Services\BudgetItemHistory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class BudgetItemRevisionController extends Controller
{
    public function store(BudgetItemRevisionRequest $request, BudgetItem $budgetItem, BudgetItemHistory $history): RedirectResponse
    {
        $history->record($budgetItem, $request->revisionData());
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Dated change recorded.']);

        return back();
    }

    public function update(BudgetItemRevisionRequest $request, BudgetItem $budgetItem, BudgetItemRevision $revision, BudgetItemHistory $history): RedirectResponse
    {
        abort_unless($revision->budget_item_id === $budgetItem->id && $revision->effective_from !== null, 404);
        $history->record($budgetItem, $request->revisionData(), $revision);
        Inertia::flash('toast', ['type' => 'success', 'message' => 'History entry corrected.']);

        return back();
    }

    public function destroy(BudgetItem $budgetItem, BudgetItemRevision $revision, BudgetItemHistory $history): RedirectResponse
    {
        Gate::authorize('manage', $budgetItem->household);
        abort_unless($revision->budget_item_id === $budgetItem->id && $revision->effective_from !== null, 404);
        $history->remove($revision);
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Change removed. The previous plan applies again.']);

        return back();
    }
}
