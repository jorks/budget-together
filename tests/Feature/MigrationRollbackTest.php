<?php

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schema;

test('rollback fails without dropping tables or forgetting the migration', function () {
    expect(fn () => Artisan::call('migrate:rollback'))
        ->toThrow(LogicException::class, 'Rollback is disabled for greenfield migrations.');

    expect(Schema::hasTable('passkeys'))->toBeTrue();
    $this->assertDatabaseHas('migrations', [
        'migration' => '2024_01_01_000000_create_passkeys_table',
    ]);
});
