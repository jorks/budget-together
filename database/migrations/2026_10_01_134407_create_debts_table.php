<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('debts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('household_id')->constrained()->cascadeOnDelete();
            $table->foreignId('account_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name', 120);
            $table->string('type');
            $table->string('lender', 120)->nullable();
            $table->unsignedBigInteger('balance_cents');
            $table->decimal('annual_rate', 6, 3);
            $table->unsignedBigInteger('repayment_cents');
            $table->unsignedBigInteger('extra_cents')->default(0);
            $table->string('frequency');
            $table->date('due_date')->nullable();
            $table->boolean('is_active')->default(true);
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        throw new LogicException('Rollback is disabled for greenfield migrations.');
    }
};
