<?php

namespace App\Http\Controllers;

use App\Models\BudgetItem;
use App\Services\BudgetCalculator;
use App\Services\HouseholdResolver;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class BudgetController extends Controller
{
    public function index(Request $request, HouseholdResolver $households, BudgetCalculator $calculator): Response
    {
        $household = $households->forUser($request->user());
        Gate::authorize('manage', $household);
        $request->validate(['month' => ['nullable', 'date_format:Y-m', 'after_or_equal:2000-01', 'before_or_equal:2100-12']]);
        $today = CarbonImmutable::today('Australia/Melbourne');
        $month = CarbonImmutable::parse($request->input('month', $today->format('Y-m')).'-01', 'Australia/Melbourne');
        $items = $household->items()->with(['account', 'payments' => fn ($query) => $query->orderByDesc('paid_on')->orderByDesc('id')])->orderBy('name')->orderBy('id')->get();
        $events = [];
        foreach ($items->where('kind', 'bill') as $item) {
            foreach ($calculator->occurrences($item, $month, $month->endOfMonth()) as $date) {
                $events[] = ['id' => $item->id, 'name' => $item->name, 'date' => $date, 'amount_cents' => $item->amount_cents, 'is_variable' => $item->is_variable, 'account' => $item->account?->name];
            }
        }
        usort($events, fn (array $a, array $b): int => [$a['date'], $a['name']] <=> [$b['date'], $b['name']]);

        return Inertia::render('budget/index', [
            'view' => $request->route()->getName() === 'dashboard' ? 'overview' : $request->route()->getName(),
            'household' => $household->only(['id', 'name']),
            'members' => $household->users()->orderBy('name')->get(['users.id', 'name', 'email']),
            'items' => $items->map(fn (BudgetItem $item): array => $calculator->present($item, $today)),
            'totals' => $calculator->totals($items),
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
