<?php

namespace App\Http\Requests;

use App\Models\BudgetItem;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class BillRecordRequest extends FormRequest
{
    public function authorize(): bool
    {
        $item = $this->route('budget_item');
        abort_unless($item instanceof BudgetItem, 404);
        Gate::authorize('manage', $item->household);
        abort_unless($item->kind === 'bill', 404);

        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $pastDate = ['date_format:Y-m-d', 'after_or_equal:2000-01-01', 'before_or_equal:'.now('Australia/Melbourne')->toDateString()];

        return [
            'records' => ['required', 'array', 'min:1', $this->isMethod('put') ? 'max:1' : 'max:20'],
            'records.*' => ['required', 'array:entry_key,amount_cents,billed_on,period_start,period_end,due_on,paid_on,notes'],
            'records.*.entry_key' => ['required', 'uuid', 'distinct'],
            'records.*.amount_cents' => ['required', 'integer', 'min:0', 'max:99999999999'],
            'records.*.billed_on' => ['required', ...$pastDate],
            'records.*.period_start' => ['nullable', 'required_with:records.*.period_end', ...$pastDate],
            'records.*.period_end' => ['nullable', 'required_with:records.*.period_start', ...$pastDate, 'after_or_equal:records.*.period_start'],
            'records.*.due_on' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:2000-01-01', 'before_or_equal:2100-12-31'],
            'records.*.paid_on' => ['nullable', ...$pastDate],
            'records.*.notes' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
