<?php

namespace App\Http\Requests;

use App\Cadence;
use App\Models\BudgetItem;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class BudgetItemRevisionRequest extends FormRequest
{
    public function authorize(): bool
    {
        $item = $this->route('budget_item');
        abort_unless($item instanceof BudgetItem, 404);
        Gate::authorize('manage', $item->household);
        abort_unless($item->kind === 'bill', 404);

        return true;
    }

    /** @return array{effective_from: string, amount_cents: int, cadence: string, payments_per_year: int|null, notes: string|null} */
    public function revisionData(): array
    {
        $data = $this->validated();

        return [
            'effective_from' => $data['effective_from'],
            'amount_cents' => (int) $data['amount_cents'],
            'cadence' => $data['cadence'],
            'payments_per_year' => isset($data['payments_per_year']) ? (int) $data['payments_per_year'] : null,
            'notes' => $data['notes'] ?? null,
        ];
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'effective_from' => ['required', 'date_format:Y-m-d', 'after_or_equal:2000-01-01', 'before_or_equal:2100-12-31'],
            'amount_cents' => ['required', 'integer', 'min:0', 'max:99999999999'],
            'cadence' => ['required', Rule::enum(Cadence::class)],
            'payments_per_year' => ['exclude_unless:cadence,custom', 'required', 'integer', 'between:1,366'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
