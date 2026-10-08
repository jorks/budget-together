<?php

namespace App\Http\Requests;

use App\Models\BudgetItem;
use App\Models\SuperFund;
use App\Services\FinancialHistory;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class SuperFundRequest extends FormRequest
{
    public function authorize(): bool
    {
        $fund = $this->route('super_fund');
        if ($fund instanceof SuperFund) {
            Gate::authorize('manage', $fund->household);
        }

        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $fund = $this->route('super_fund');
        $householdId = $this->user()?->households()->first()?->id;

        return [
            'name' => ['required', 'string', 'max:120'],
            'member_id' => ['sometimes', 'nullable', 'integer', Rule::exists('household_user', 'user_id')->where('household_id', $householdId)],
            'person' => ['required', 'string', 'max:80'],
            'member_number' => ['nullable', 'string', 'max:80'],
            'investment_option' => ['nullable', 'string', 'max:120'],
            'income_id' => ['nullable', 'integer', Rule::exists('budget_items', 'id')->where(fn ($query) => $query->where('household_id', $householdId)->where('kind', 'income')->where('is_active', true)->where('person', $this->input('person'))), Rule::unique('super_funds', 'income_id')->ignore($fund instanceof SuperFund ? $fund->id : null)],
            'employer_rate' => ['required', 'numeric', 'between:0,30', 'decimal:0,3'],
            'salary_sacrifice_cents' => ['required', 'integer', 'between:0,999999999'],
            'annual_fee_cents' => ['required', 'integer', 'between:0,999999999'],
            'fee_rate' => ['required', 'numeric', 'between:0,10', 'decimal:0,3'],
            'annual_insurance_cents' => ['required', 'integer', 'between:0,999999999'],
            'return_rate' => ['required', 'numeric', 'between:-20,20', 'decimal:0,3'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'recorded_on' => [$this->isMethod('POST') ? 'required' : 'exclude', 'date_format:Y-m-d', 'after_or_equal:2000-01-01', 'before_or_equal:'.now('Australia/Melbourne')->toDateString()],
            'balance_cents' => [$this->isMethod('POST') ? 'required' : 'exclude', 'integer', 'between:0,99999999999'],
        ];
    }

    /** @return list<\Closure> */
    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty() || ! $this->filled('income_id')) {
                return;
            }
            $income = BudgetItem::query()->whereKey($this->integer('income_id'))->firstOrFail();
            $income = app(FinancialHistory::class)->at($income);
            if ($income->gross_annual_cents === null) {
                $validator->errors()->add('income_id', 'Choose a wage with a gross annual salary in effect today.');
            }
            if (mb_strtolower(trim($income->category ?? '')) === 'bonus') {
                $validator->errors()->add('income_id', 'Link a base PAYG wage rather than a bonus.');
            }
        }];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return ['income_id.unique' => 'This wage is already linked to another super fund. Unlink it there first.', 'income_id.exists' => 'Choose an active gross wage belonging to this person in your household.'];
    }
}
