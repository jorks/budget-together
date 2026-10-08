<?php

namespace App\Http\Controllers;

use App\Http\Requests\BillRecordRequest;
use App\Models\BillRecord;
use App\Models\BudgetItem;
use App\Services\BillHistory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class BillRecordController extends Controller
{
    public function store(BillRecordRequest $request, BudgetItem $budgetItem, BillHistory $history): RedirectResponse
    {
        $history->record($budgetItem, $request->validated('records'));
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Bill history saved. Your plan is unchanged.']);

        return back();
    }

    public function update(BillRecordRequest $request, BudgetItem $budgetItem, BillRecord $billRecord, BillHistory $history): RedirectResponse
    {
        abort_unless($billRecord->budget_item_id === $budgetItem->id, 404);
        $data = $request->validated('records')[0];
        unset($data['entry_key']);
        $history->correct($billRecord, $data);
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Bill corrected.']);

        return back();
    }

    public function destroy(BudgetItem $budgetItem, BillRecord $billRecord): RedirectResponse
    {
        Gate::authorize('manage', $budgetItem->household);
        abort_unless($billRecord->budget_item_id === $budgetItem->id, 404);
        $billRecord->delete();
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Bill removed from history.']);

        return back();
    }
}
