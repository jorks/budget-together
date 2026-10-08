<?php

namespace App\Http\Controllers;

use App\Http\Requests\BudgetItemRequest;
use App\Models\BudgetItem;
use App\Models\Household;
use App\Services\AustralianTaxEstimator;
use App\Services\BillHistory;
use App\Services\BudgetCalculator;
use App\Services\BudgetItemHistory;
use App\Services\HouseholdResolver;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class BudgetItemController extends Controller
{
    public function show(Request $request, BudgetItem $budgetItem, BudgetCalculator $calculator, BillHistory $bills, AustralianTaxEstimator $tax): Response
    {
        Gate::authorize('manage', $budgetItem->household);
        $household = $budgetItem->household;
        $today = CarbonImmutable::today('Australia/Melbourne');
        $budgetItem->load(['account', 'revisions', 'billRecords', 'payments' => fn ($query) => $query->orderByDesc('paid_on')->orderByDesc('id')]);

        return Inertia::render('budget/show', [
            'item' => $calculator->present($budgetItem, $today),
            'revisions' => $budgetItem->revisions->sortByDesc(fn ($revision): string => $revision->effective_from?->toDateString() ?? '')->values(),
            'billRecords' => $budgetItem->billRecords->sortByDesc(fn ($record): string => $record->billed_on->toDateString().sprintf('%020d', $record->id))->values(),
            'suggestion' => $bills->suggestion($budgetItem),
            'accounts' => $household->accounts()->with('bank')->orderBy('name')->get(),
            'categories' => collect(Household::DEFAULT_CATEGORIES)->merge($household->categories ?? [])->merge([$budgetItem->category])->filter()->unique()->sort()->values(),
            'financialYear' => $tax->financialYear($today),
            'taxBrackets' => collect([2025, 2026, 2027])->mapWithKeys(fn (int $year): array => [$year => $tax->brackets($year)]),
            'today' => $today->toDateString(),
            'financialChanges' => $budgetItem->financialChanges()->orderByDesc('effective_from')->get(),
            'editingSettings' => $request->boolean('settings'),
        ]);
    }

    public function store(BudgetItemRequest $request, HouseholdResolver $households): RedirectResponse
    {
        $household = $households->forUser($request->user());
        Gate::authorize('manage', $household);
        $data = $request->validated();
        unset($data['preserve_price']);
        $item = $household->items()->create($data);
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Saved successfully.']);

        return to_route('budget-items.show', $item);
    }

    public function update(BudgetItemRequest $request, BudgetItem $budgetItem, BudgetItemHistory $history): RedirectResponse
    {
        $history->updateItem($budgetItem, $request->validated());
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
