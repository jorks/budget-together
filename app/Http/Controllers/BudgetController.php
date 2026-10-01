<?php

namespace App\Http\Controllers;

use App\Cadence;
use App\Models\BudgetItem;
use App\Models\Household;
use App\Services\AustralianTaxEstimator;
use App\Services\BudgetCalculator;
use App\Services\HouseholdBudget;
use App\Services\HouseholdResolver;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class BudgetController extends Controller
{
    public function index(Request $request, HouseholdResolver $households, BudgetCalculator $calculator, AustralianTaxEstimator $tax, HouseholdBudget $budget): Response
    {
        $household = $households->forUser($request->user());
        Gate::authorize('manage', $household);
        $request->validate(['month' => ['nullable', 'date_format:Y-m', 'after_or_equal:2000-01', 'before_or_equal:2100-12']]);
        $today = CarbonImmutable::today('Australia/Melbourne');
        $month = CarbonImmutable::parse($request->input('month', $today->format('Y-m')).'-01', 'Australia/Melbourne');
        $items = $budget->items($household);
        $events = [];
        foreach ($items->whereIn('kind', ['bill', 'income']) as $item) {
            foreach ($calculator->occurrences($item, $month, $month->endOfMonth()) as $date) {
                $events[] = ['id' => $item->id, 'name' => $item->name, 'category' => $item->category, 'date' => $date, 'kind' => $item->kind, 'cadence' => $item->cadence, 'amount_cents' => $item->kind === 'income' ? (int) round($calculator->annual($item) / Cadence::from($item->cadence)->periods($item->payments_per_year)) : $item->amount_cents, 'is_variable' => $item->is_variable, 'account' => $item->account?->name, 'source' => $item->source];
            }
        }
        usort($events, fn (array $a, array $b): int => [$a['date'], $a['name']] <=> [$b['date'], $b['name']]);

        return Inertia::render('budget/index', [
            'view' => $request->route()->getName() === 'dashboard' ? 'overview' : $request->route()->getName(),
            'household' => $household->only(['id', 'name', 'preferred_frequency']),
            'members' => $household->users()->orderBy('name')->get(['users.id', 'name', 'email']),
            'items' => $items->map(fn (BudgetItem $item): array => $calculator->present($item, $today)),
            'totals' => $calculator->totals($items),
            'incomeTaxEstimates' => $calculator->incomeTaxEstimates($items, $today),
            'categories' => collect(Household::DEFAULT_CATEGORIES)->merge($household->categories ?? [])->merge($items->pluck('category')->filter())->unique()->sort()->values(),
            'financialYear' => $tax->financialYear($today),
            'taxBrackets' => collect([2025, 2026, 2027])->mapWithKeys(fn (int $year): array => [$year => $tax->brackets($year)]),
            'categoryTotals' => $calculator->categories($items),
            'accounts' => $household->accounts()->with('bank')->orderBy('name')->get(),
            'banks' => $household->banks()->withCount('accounts')->orderBy('name')->get(),
            'invitations' => $household->invitations()->whereNull('accepted_at')->where('expires_at', '>', now())->orderByDesc('id')->get(['id', 'email', 'expires_at']),
            'invitation_url' => $request->session()->get('invitation_url'),
            'today' => $today->toDateString(),
            'month' => $month->format('Y-m'),
            'events' => $events,
        ]);
    }
}
