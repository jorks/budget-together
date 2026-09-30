<?php

namespace Database\Factories;

use App\Models\Household;
use App\Models\HouseholdInvitation;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/** @extends Factory<HouseholdInvitation> */
class HouseholdInvitationFactory extends Factory
{
    /** @return array<string, mixed> */
    public function definition(): array
    {
        return ['household_id' => Household::factory(), 'email' => fake()->safeEmail(), 'token' => Str::random(64), 'expires_at' => now()->addDays(7)];
    }
}
