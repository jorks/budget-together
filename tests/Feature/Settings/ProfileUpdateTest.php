<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia;

test('profile page is displayed', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->get(route('profile.edit'));

    $response->assertOk();
});

test('profile information can be updated', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->patch(route('profile.update'), [
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit'));

    $user->refresh();

    expect($user->name)->toBe('Test User');
    expect($user->email)->toBe('test@example.com');
    expect($user->email_verified_at)->toBeNull();
});

test('email verification status is unchanged when the email address is unchanged', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->patch(route('profile.update'), [
            'name' => 'Test User',
            'email' => $user->email,
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit'));

    expect($user->refresh()->email_verified_at)->not->toBeNull();
});

test('user can delete their account', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->delete(route('profile.destroy'), [
            'password' => 'password',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('home'));

    $this->assertGuest();
    expect($user->fresh())->toBeNull();
});

test('correct password must be provided to delete account', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->from(route('profile.edit'))
        ->delete(route('profile.destroy'), [
            'password' => 'wrong-password',
        ]);

    $response
        ->assertSessionHasErrors('password')
        ->assertRedirect(route('profile.edit'));

    expect($user->fresh())->not->toBeNull();
});

test('budget frequency is personal and shared with the signed in user', function (?string $frequency) {
    $user = User::factory()->fortnightly()->create();
    $other = User::factory()->create();

    $this->actingAs($user)->patch(route('profile.update'), [
        'name' => $user->name,
        'email' => $user->email,
        'preferred_frequency' => $frequency,
        'user_id' => $other->id,
    ])->assertSessionHasNoErrors()->assertRedirect(route('profile.edit'));

    expect($user->fresh()->preferred_frequency)->toBe($frequency);
    expect($other->fresh()->preferred_frequency)->toBeNull();
    $this->get(route('profile.edit'))->assertInertia(fn (AssertableInertia $page) => $page
        ->where('auth.user.preferred_frequency', $frequency));
})->with(['weekly', 'fortnightly', 'monthly', 'annually', null]);

test('invalid budget frequencies cannot overwrite a saved preference', function (mixed $frequency) {
    $user = User::factory()->fortnightly()->create();
    $this->actingAs($user)->patch(route('profile.update'), [
        'name' => $user->name,
        'email' => $user->email,
        'preferred_frequency' => $frequency,
    ])->assertSessionHasErrors('preferred_frequency');
    expect($user->fresh()->preferred_frequency)->toBe('fortnightly');
})->with(['all', 'quarterly', [['monthly']]]);

test('ordinary profile updates preserve the saved budget frequency', function () {
    $user = User::factory()->fortnightly()->create();
    $this->actingAs($user)->patch(route('profile.update'), [
        'name' => 'New name', 'email' => $user->email,
    ])->assertSessionHasNoErrors();
    expect($user->fresh()->preferred_frequency)->toBe('fortnightly');
});

test('guests cannot change budget preferences', function () {
    $this->patch(route('profile.update'), ['preferred_frequency' => 'weekly'])->assertRedirect(route('login'));
});
