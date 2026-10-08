<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('financial_changes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('budget_item_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('mortgage_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('debt_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('super_fund_id')->nullable()->constrained()->cascadeOnDelete();
            $table->date('effective_from')->nullable();
            $table->string('event_type');
            $table->json('values');
            $table->unsignedBigInteger('payment_cents')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            foreach (['budget_item_id', 'mortgage_id', 'debt_id', 'super_fund_id'] as $parent) {
                $table->unique([$parent, 'effective_from']);
            }
        });
    }

    public function down(): void
    {
        throw new LogicException('Use migrate:fresh to rebuild the greenfield schema.');
    }
};
