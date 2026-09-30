<?php

namespace App\Http\Controllers;

use App\Models\HouseholdInvitation;
use App\Models\User;
use App\Services\HouseholdResolver;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class HouseholdInvitationController extends Controller
{
    public function store(Request $request, HouseholdResolver $households): RedirectResponse
    {
        $household = $households->forUser($request->user());
        Gate::authorize('manage', $household);
        $data = $request->validate(['email' => ['required', 'email', 'max:255']]);
        $token = Str::random(64);
        $household->invitations()->create([
            'email' => Str::lower($data['email']),
            'token' => hash('sha256', $token),
            'expires_at' => now()->addDays(7),
        ]);

        return back()->with('invitation_url', route('invitations.show', ['token' => $token]));
    }

    public function show(Request $request, string $token): Response
    {
        $invitation = $this->findInvitation($request, $token);

        return Inertia::render('budget/invitation', ['householdName' => $invitation->household->name, 'token' => $token]);
    }

    public function update(Request $request, string $token): RedirectResponse
    {
        DB::transaction(function () use ($request, $token): void {
            $user = User::query()->lockForUpdate()->findOrFail($request->user()->id);
            $invitation = $this->findInvitation($request, $token, true);
            $current = $user->households()->first();
            if ($current !== null && $current->id !== $invitation->household_id) {
                if ($current->users()->count() > 1 || $current->items()->exists() || $current->accounts()->exists() || $current->banks()->exists()) {
                    throw ValidationException::withMessages(['invitation' => 'Your account already belongs to a household with data. Ask the household owner before moving it.']);
                }
                $user->households()->detach($current);
            }
            $user->households()->syncWithoutDetaching([$invitation->household_id]);
            $invitation->update(['accepted_at' => now()]);
        });

        return to_route('dashboard');
    }

    public function destroy(HouseholdInvitation $invitation): RedirectResponse
    {
        Gate::authorize('manage', $invitation->household);
        $invitation->delete();

        return back();
    }

    private function findInvitation(Request $request, string $token, bool $lock = false): HouseholdInvitation
    {
        $query = HouseholdInvitation::query()->where('token', hash('sha256', $token))->whereNull('accepted_at')->where('expires_at', '>', now());
        if ($lock) {
            $query->lockForUpdate();
        }
        $invitation = $query->firstOrFail();
        abort_unless(Str::lower($request->user()->email) === Str::lower($invitation->email), 403, 'Sign in with the email address this invitation was sent to.');

        return $invitation;
    }
}
