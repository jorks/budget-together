<?php

namespace App\Http\Controllers;

use App\Http\Requests\SuperBalanceRequest;
use App\Models\SuperBalance;
use App\Models\SuperFund;
use App\Services\HouseholdResolver;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class SuperBalanceController extends Controller
{
    public function store(SuperBalanceRequest $request, SuperFund $superFund, HouseholdResolver $households): RedirectResponse
    {
        $household = $households->forUser($request->user());
        Gate::authorize('manage', $household);
        abort_unless($superFund->household_id === $household->id, 404);
        DB::transaction(function () use ($superFund, $request): void {
            SuperFund::query()->lockForUpdate()->findOrFail($superFund->id);
            $superFund->balances()->updateOrCreate(['recorded_on' => $request->validated('recorded_on')], $request->validated());
        });
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Super balance recorded.']);

        return to_route('superannuation.index');
    }

    public function destroy(Request $request, SuperFund $superFund, SuperBalance $superBalance, HouseholdResolver $households): RedirectResponse
    {
        $household = $households->forUser($request->user());
        Gate::authorize('manage', $household);
        abort_unless($superFund->household_id === $household->id && $superBalance->super_fund_id === $superFund->id, 404);
        DB::transaction(function () use ($superFund, $superBalance): void {
            SuperFund::query()->lockForUpdate()->findOrFail($superFund->id);
            if ($superFund->balances()->count() <= 1) {
                throw ValidationException::withMessages(['balance' => 'Keep at least one balance. Record a corrected balance for the same date instead.']);
            }
            $superBalance->delete();
        });
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Balance entry removed.']);

        return to_route('superannuation.index');
    }
}
