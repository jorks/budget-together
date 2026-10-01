<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\HouseholdResolver;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class HouseholdController extends Controller
{
    public function update(Request $request, HouseholdResolver $households): RedirectResponse
    {
        $household = $households->forUser($request->user());
        Gate::authorize('manage', $household);
        $household->update($request->validate(['name' => ['required', 'string', 'max:120']]));
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Household renamed.']);

        return back();
    }

    public function member(Request $request, User $member, HouseholdResolver $households): RedirectResponse
    {
        $household = $households->forUser($request->user());
        Gate::authorize('manage', $household);
        abort_unless($household->users()->whereKey($member->id)->exists(), 404);
        $data = $request->validate(['name' => ['required', 'string', 'max:80']]);
        DB::transaction(function () use ($household, $member, $data): void {
            $household->items()->where('person', $member->name)->update(['person' => $data['name']]);
            $household->accounts()->where('owner', $member->name)->update(['owner' => $data['name']]);
            $member->update($data);
        });
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Person updated.']);

        return back();
    }
}
