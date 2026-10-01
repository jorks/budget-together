<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class MortgageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'due_date' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:2000-01-01', 'before_or_equal:2100-12-31'],
            'account_id' => ['nullable', Rule::exists('accounts', 'id')->where('household_id', $this->user()?->households()->first()?->id)],
            'name' => ['required', 'string', 'max:120'],
            'balance_cents' => ['required', 'integer', 'between:1,99999999999'],
            'annual_rate' => ['required', 'numeric', 'between:0,30', 'decimal:0,3'],
            'term_years' => ['required', 'integer', 'between:1,40'],
            'frequency' => ['required', Rule::in(['weekly', 'fortnightly', 'monthly'])],
            'offset_cents' => ['required', 'integer', 'between:0,99999999999'],
            'extra_cents' => ['required', 'integer', 'between:0,99999999999'],
        ];
    }
}
