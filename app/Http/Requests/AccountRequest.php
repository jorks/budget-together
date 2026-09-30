<?php

namespace App\Http\Requests;

use App\Models\Account;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class AccountRequest extends FormRequest
{
    public function authorize(): bool
    {
        $account = $this->route('account');
        if ($account instanceof Account) {
            Gate::authorize('manage', $account->household);
        }

        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'bank_id' => ['nullable', Rule::exists('banks', 'id')->where('household_id', $this->user()?->households()->first()?->id)],
            'type' => ['required', Rule::in(['transaction', 'savings', 'offset', 'mortgage', 'credit_card', 'cash'])],
            'owner' => ['nullable', 'string', 'max:80'],
            'last_four' => ['nullable', 'regex:/^[0-9]{4}$/'],
            'purpose' => ['nullable', 'string', 'max:2000'],
            'balance_cents' => ['required', 'integer', 'between:-99999999999,99999999999'],
            'credit_limit_cents' => ['nullable', 'integer', 'min:0', 'max:99999999999'],
        ];
    }
}
