<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mortgages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('household_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('account_id')->nullable()->constrained()->nullOnDelete();
            $table->date('due_date')->nullable();
            $table->string('name', 120);
            $table->unsignedBigInteger('balance_cents');
            $table->decimal('annual_rate', 6, 3);
            $table->unsignedSmallInteger('term_years');
            $table->string('frequency');
            $table->unsignedBigInteger('offset_cents')->default(0);
            $table->unsignedBigInteger('extra_cents')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        throw new LogicException('Rollback is disabled for greenfield migrations.');
    }
};
