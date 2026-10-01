<?php

namespace App\Http\Requests;

use App\Models\Debt;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class DebtRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'type' => ['required', Rule::in(array_keys(Debt::TYPES))],
            'lender' => ['nullable', 'string', 'max:120'],
            'balance_cents' => ['required', 'integer', 'between:0,99999999999'],
            'annual_rate' => ['required', 'numeric', 'between:0,50', 'decimal:0,3'],
            'repayment_cents' => ['required', 'integer', 'between:1,99999999999'],
            'extra_cents' => ['required', 'integer', 'between:0,99999999999'],
            'frequency' => ['required', Rule::in(['weekly', 'fortnightly', 'monthly'])],
            'due_date' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:2000-01-01', 'before_or_equal:2100-12-31'],
            'account_id' => ['nullable', Rule::exists('accounts', 'id')->where('household_id', $this->user()?->households()->first()?->id)],
            'is_active' => ['required', 'boolean'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
