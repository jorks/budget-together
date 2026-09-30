<?php

use App\Http\Controllers\AccountController;
use App\Http\Controllers\BankController;
use App\Http\Controllers\BillPaymentController;
use App\Http\Controllers\BudgetController;
use App\Http\Controllers\BudgetItemController;
use App\Http\Controllers\HouseholdInvitationController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', [BudgetController::class, 'index'])->name('dashboard');
    Route::get('income', [BudgetController::class, 'index'])->name('income');
    Route::get('bills', [BudgetController::class, 'index'])->name('bills');
    Route::get('plan', [BudgetController::class, 'index'])->name('plan');
    Route::get('calendar', [BudgetController::class, 'index'])->name('calendar');
    Route::get('funds', [BudgetController::class, 'index'])->name('funds');
    Route::get('accounts', [BudgetController::class, 'index'])->name('accounts');
    Route::get('household', [BudgetController::class, 'index'])->name('household');
    Route::resource('budget-items', BudgetItemController::class)->only(['store', 'update', 'destroy']);
    Route::resource('accounts', AccountController::class)->only(['store', 'update', 'destroy']);
    Route::resource('banks', BankController::class)->only(['store', 'update', 'destroy']);
    Route::post('budget-items/{budget_item}/payments', [BillPaymentController::class, 'store'])->name('payments.store');
    Route::delete('payments/{bill_payment}', [BillPaymentController::class, 'destroy'])->name('payments.destroy');
    Route::post('invitations', [HouseholdInvitationController::class, 'store'])->middleware('throttle:10,1')->name('invitations.store');
    Route::get('invitations/{token}', [HouseholdInvitationController::class, 'show'])->name('invitations.show');
    Route::put('invitations/{token}', [HouseholdInvitationController::class, 'update'])->middleware('throttle:10,1')->name('invitations.update');
    Route::delete('invitations/{invitation}', [HouseholdInvitationController::class, 'destroy'])->name('invitations.destroy');
});

require __DIR__.'/settings.php';
