<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('super_funds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('household_id')->constrained()->cascadeOnDelete();
            $table->foreignId('income_id')->nullable()->unique()->constrained('budget_items')->nullOnDelete();
            $table->foreignId('member_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('name', 120);
            $table->string('person', 80);
            $table->string('member_number', 80)->nullable();
            $table->string('investment_option', 120)->nullable();
            $table->decimal('employer_rate', 6, 3)->default(12);
            $table->unsignedBigInteger('salary_sacrifice_cents')->default(0);
            $table->unsignedBigInteger('annual_fee_cents')->default(0);
            $table->decimal('fee_rate', 6, 3)->default(0);
            $table->unsignedBigInteger('annual_insurance_cents')->default(0);
            $table->decimal('return_rate', 6, 3)->default(6);
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['household_id', 'person']);
        });
    }

    public function down(): void
    {
        throw new LogicException('Rollback is disabled for greenfield migrations.');
    }
};
