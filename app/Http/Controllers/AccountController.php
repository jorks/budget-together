<?php

namespace App\Http\Controllers;

use App\Http\Requests\AccountRequest;
use App\Models\Account;
use App\Services\HouseholdResolver;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class AccountController extends Controller
{
    public function store(AccountRequest $request, HouseholdResolver $households): RedirectResponse
    {
        $household = $households->forUser($request->user());
        Gate::authorize('manage', $household);
        $household->accounts()->create($request->validated());
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Saved successfully.']);

        return back();
    }

    public function update(AccountRequest $request, Account $account): RedirectResponse
    {
        $account->update($request->validated());
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Changes saved.']);

        return back();
    }

    public function destroy(Account $account): RedirectResponse
    {
        Gate::authorize('manage', $account->household);
        $account->delete();
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Deleted successfully.']);

        return back();
    }
}
