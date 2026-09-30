<?php

namespace App\Services;

use App\Models\Household;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class HouseholdResolver
{
    public function forUser(User $user): Household
    {
        return DB::transaction(function () use ($user): Household {
            $lockedUser = User::query()->lockForUpdate()->findOrFail($user->id);
            $household = $lockedUser->households()->first();
            if ($household !== null) {
                return $household;
            }
            $household = Household::query()->create(['name' => 'Our household']);
            $household->users()->attach($user);

            return $household;
        });
    }
}
