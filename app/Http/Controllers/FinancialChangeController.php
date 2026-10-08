<?php

namespace App\Http\Controllers;

use App\Http\Requests\FinancialChangeRequest;
use App\Models\FinancialChange;
use App\Services\FinancialHistory;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;

class FinancialChangeController extends Controller
{
    public function store(FinancialChangeRequest $request, FinancialHistory $history): RedirectResponse
    {
        $history->record($request->record(), $request->validated('values'), $request->string('effective_from')->toString(), $request->string('event_type')->toString(), $request->validated('notes'), $request->filled('payment_cents') ? $request->integer('payment_cents') : null);
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Financial update recorded.']);

        return back();
    }

    public function update(FinancialChangeRequest $request, string $recordType, string $recordId, FinancialChange $change, FinancialHistory $history): RedirectResponse
    {
        abort_unless($request->record()->financialChanges()->whereKey($change->id)->whereNotNull('effective_from')->exists(), 404);
        $history->record($request->record(), $request->validated('values'), $request->string('effective_from')->toString(), $request->string('event_type')->toString(), $request->validated('notes'), $request->filled('payment_cents') ? $request->integer('payment_cents') : null, $change);
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Financial update corrected.']);

        return back();
    }

    public function destroy(FinancialChangeRequest $request, string $recordType, string $recordId, FinancialChange $change, FinancialHistory $history): RedirectResponse
    {
        abort_unless($request->record()->financialChanges()->whereKey($change->id)->whereNotNull('effective_from')->exists(), 404);
        $history->remove($request->record(), $change);
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Financial update removed.']);

        return back();
    }
}
