<?php

namespace App\Http\Controllers;

use App\Models\BillPayment;
use App\Models\BudgetItem;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class BillPaymentController extends Controller
{
    public function store(Request $request, BudgetItem $budgetItem): RedirectResponse
    {
        Gate::authorize('manage', $budgetItem->household);
        abort_unless($budgetItem->kind === 'bill', 404);
        $budgetItem->payments()->create($request->validate([
            'amount_cents' => ['required', 'integer', 'min:0', 'max:99999999999'],
            'paid_on' => ['required', 'date_format:Y-m-d', 'before_or_equal:'.now('Australia/Melbourne')->toDateString(), 'after_or_equal:2000-01-01'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]));

        return back();
    }

    public function destroy(BillPayment $billPayment): RedirectResponse
    {
        Gate::authorize('manage', $billPayment->budgetItem->household);
        $billPayment->delete();

        return back();
    }
}
