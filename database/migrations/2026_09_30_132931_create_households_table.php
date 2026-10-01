<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('households', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->json('categories')->nullable();
            $table->timestamps();
        });
        Schema::create('household_user', function (Blueprint $table) {
            $table->foreignId('household_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->primary(['household_id', 'user_id']);
        });
        Schema::create('banks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('household_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->text('notes')->nullable();
            $table->timestamps();
        });
        Schema::create('accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('household_id')->constrained()->cascadeOnDelete();
            $table->foreignId('bank_id')->nullable()->constrained()->restrictOnDelete();
            $table->string('name');
            $table->string('type');
            $table->string('owner')->nullable();
            $table->string('last_four', 4)->nullable();
            $table->text('purpose')->nullable();
            $table->bigInteger('balance_cents')->default(0);
            $table->unsignedBigInteger('credit_limit_cents')->nullable();
            $table->timestamps();
        });
        Schema::create('budget_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('household_id')->constrained()->cascadeOnDelete();
            $table->foreignId('account_id')->nullable()->constrained()->nullOnDelete();
            $table->string('kind');
            $table->string('name');
            $table->string('category')->nullable();
            $table->string('person')->nullable();
            $table->unsignedBigInteger('amount_cents');
            $table->string('cadence');
            $table->unsignedSmallInteger('payments_per_year')->nullable();
            $table->boolean('is_variable')->default(false);
            $table->boolean('is_active')->default(true);
            $table->date('due_date')->nullable();
            $table->date('pay_date')->nullable();
            $table->unsignedBigInteger('salary_sacrifice_cents')->default(0);
            $table->unsignedBigInteger('workplace_giving_cents')->default(0);
            $table->unsignedBigInteger('other_deductions_cents')->default(0);
            $table->unsignedBigInteger('gross_annual_cents')->nullable();
            $table->unsignedBigInteger('bonus_annual_cents')->nullable();
            $table->text('notes')->nullable();
            $table->boolean('use_tax_estimate')->default(false);
            $table->boolean('include_bonus')->default(false);
            $table->boolean('include_medicare')->default(true);
            $table->unsignedSmallInteger('tax_year')->default(2026);
            $table->boolean('has_sinking_fund')->default(false);
            $table->unsignedBigInteger('saved_cents')->default(0);
            $table->date('saving_start_date')->nullable();
            $table->unsignedBigInteger('contribution_cents')->nullable();
            $table->string('contribution_cadence')->default('weekly');
            $table->foreignId('saving_account_id')->nullable()->constrained('accounts')->nullOnDelete();
            $table->timestamps();
            $table->index(['household_id', 'kind', 'is_active']);
        });
        Schema::create('bill_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('budget_item_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('amount_cents');
            $table->date('paid_on');
            $table->text('notes')->nullable();
            $table->timestamps();
        });
        Schema::create('household_invitations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('household_id')->constrained()->cascadeOnDelete();
            $table->string('email');
            $table->string('token', 64)->unique();
            $table->timestamp('expires_at');
            $table->timestamp('accepted_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        throw new LogicException('Rollback is disabled for greenfield migrations.');
    }
};
