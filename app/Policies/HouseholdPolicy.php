<?php

namespace App\Policies;

use App\Models\Household;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class HouseholdPolicy
{
    public function manage(User $user, Household $household): Response
    {
        return $household->users()->whereKey($user->id)->exists()
            ? Response::allow()
            : Response::denyAsNotFound();
    }
}
