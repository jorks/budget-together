<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('budget_item_revisions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('budget_item_id')->constrained()->cascadeOnDelete();
            $table->date('effective_from')->nullable();
            $table->unsignedBigInteger('amount_cents');
            $table->string('cadence');
            $table->unsignedSmallInteger('payments_per_year')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->unique(['budget_item_id', 'effective_from']);
        });
        Schema::create('bill_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('budget_item_id')->constrained()->cascadeOnDelete();
            $table->uuid('entry_key');
            $table->unsignedBigInteger('amount_cents');
            $table->date('billed_on');
            $table->date('period_start')->nullable();
            $table->date('period_end')->nullable();
            $table->date('due_on')->nullable();
            $table->date('paid_on')->nullable();
            $table->unsignedBigInteger('expected_amount_cents');
            $table->string('expected_cadence');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->unique(['budget_item_id', 'entry_key']);
            $table->index(['budget_item_id', 'billed_on']);
        });
    }

    public function down(): void
    {
        throw new LogicException('Rollback is disabled for greenfield migrations.');
    }
};
