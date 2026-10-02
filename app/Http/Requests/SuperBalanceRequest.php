<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SuperBalanceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'recorded_on' => ['required', 'date_format:Y-m-d', 'after_or_equal:2000-01-01', 'before_or_equal:'.now('Australia/Melbourne')->toDateString()],
            'balance_cents' => ['required', 'integer', 'between:0,99999999999'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
