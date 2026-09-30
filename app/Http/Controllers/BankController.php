<?php

namespace App\Http\Controllers;

use App\Models\Bank;
use App\Services\HouseholdResolver;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

class BankController extends Controller
{
    public function store(Request $request, HouseholdResolver $households): RedirectResponse
    {
        $household = $households->forUser($request->user());
        Gate::authorize('manage', $household);
        $household->banks()->create($request->validate(['name' => ['required', 'string', 'max:120'], 'notes' => ['nullable', 'string', 'max:2000']]));

        return back();
    }

    public function update(Request $request, Bank $bank): RedirectResponse
    {
        Gate::authorize('manage', $bank->household);
        $bank->update($request->validate(['name' => ['required', 'string', 'max:120'], 'notes' => ['nullable', 'string', 'max:2000']]));

        return back();
    }

    public function destroy(Bank $bank): RedirectResponse
    {
        Gate::authorize('manage', $bank->household);
        if ($bank->accounts()->exists()) {
            throw ValidationException::withMessages(['bank' => 'Move or remove this bank’s accounts before deleting it.']);
        }
        $bank->delete();

        return back();
    }
}
