<?php

use App\Http\Controllers\AccountController;
use App\Http\Controllers\BankController;
use App\Http\Controllers\BillPaymentController;
use App\Http\Controllers\BillRecordController;
use App\Http\Controllers\BudgetController;
use App\Http\Controllers\BudgetItemController;
use App\Http\Controllers\BudgetItemRevisionController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\DebtController;
use App\Http\Controllers\FinancialChangeController;
use App\Http\Controllers\HouseholdController;
use App\Http\Controllers\HouseholdInvitationController;
use App\Http\Controllers\MortgageController;
use App\Http\Controllers\OutlookController;
use App\Http\Controllers\SuperBalanceController;
use App\Http\Controllers\SuperFundController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::post('financial-records/{record_type}/{record_id}/changes', [FinancialChangeController::class, 'store'])->name('financial-changes.store');
    Route::put('financial-records/{record_type}/{record_id}/changes/{change}', [FinancialChangeController::class, 'update'])->name('financial-changes.update');
    Route::delete('financial-records/{record_type}/{record_id}/changes/{change}', [FinancialChangeController::class, 'destroy'])->name('financial-changes.destroy');
    Route::get('dashboard', [BudgetController::class, 'index'])->name('dashboard');
    Route::get('outlook', [OutlookController::class, 'index'])->name('outlook');
    Route::get('income', [BudgetController::class, 'index'])->name('income');
    Route::get('bills', [BudgetController::class, 'index'])->name('bills');
    Route::get('plan', [BudgetController::class, 'index'])->name('plan');
    Route::get('calendar', [BudgetController::class, 'index'])->name('calendar');
    Route::get('funds', [BudgetController::class, 'index'])->name('funds');
    Route::resource('superannuation', SuperFundController::class)->parameters(['superannuation' => 'super_fund'])->only(['index', 'show', 'store', 'update', 'destroy']);
    Route::post('superannuation/{super_fund}/balances', [SuperBalanceController::class, 'store'])->name('super-balances.store');
    Route::delete('superannuation/{super_fund}/balances/{super_balance}', [SuperBalanceController::class, 'destroy'])->name('super-balances.destroy');
    Route::resource('debts', DebtController::class)->only(['index', 'show', 'store', 'update', 'destroy']);
    Route::get('mortgage', [MortgageController::class, 'index'])->name('mortgage.index');
    Route::put('mortgage', [MortgageController::class, 'update'])->name('mortgage.update');
    Route::get('accounts', [BudgetController::class, 'index'])->name('accounts');
    Route::put('household', [HouseholdController::class, 'update'])->name('household.update');
    Route::put('household/members/{member}', [HouseholdController::class, 'member'])->name('household.member');
    Route::post('categories', [CategoryController::class, 'store'])->name('categories.store');
    Route::get('household', [BudgetController::class, 'index'])->name('household');
    Route::resource('budget-items', BudgetItemController::class)->only(['show', 'store', 'update', 'destroy']);
    Route::post('budget-items/{budget_item}/revisions', [BudgetItemRevisionController::class, 'store'])->name('item-revisions.store');
    Route::put('budget-items/{budget_item}/revisions/{revision}', [BudgetItemRevisionController::class, 'update'])->name('item-revisions.update');
    Route::delete('budget-items/{budget_item}/revisions/{revision}', [BudgetItemRevisionController::class, 'destroy'])->name('item-revisions.destroy');
    Route::post('budget-items/{budget_item}/bills', [BillRecordController::class, 'store'])->name('bill-records.store');
    Route::put('budget-items/{budget_item}/bills/{bill_record}', [BillRecordController::class, 'update'])->name('bill-records.update');
    Route::delete('budget-items/{budget_item}/bills/{bill_record}', [BillRecordController::class, 'destroy'])->name('bill-records.destroy');
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
