<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('super_balances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('super_fund_id')->constrained()->cascadeOnDelete();
            $table->date('recorded_on');
            $table->unsignedBigInteger('balance_cents');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->unique(['super_fund_id', 'recorded_on']);
        });
    }

    public function down(): void
    {
        throw new LogicException('Rollback is disabled for greenfield migrations.');
    }
};
