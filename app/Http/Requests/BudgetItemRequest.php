<?php

namespace App\Http\Requests;

use App\Cadence;
use App\Models\BudgetItem;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class BudgetItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        $item = $this->route('budget_item');
        if ($item instanceof BudgetItem) {
            Gate::authorize('manage', $item->household);
        }

        return $this->user() !== null;
    }

    /** @return list<\Closure> */
    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($this->boolean('use_tax_estimate') && $validator->errors()->isEmpty()) {
                $gross = (int) $this->input('gross_annual_cents') + ($this->boolean('include_bonus') ? (int) $this->input('bonus_annual_cents') : 0);
                if ((int) $this->input('salary_sacrifice_cents') + (int) $this->input('workplace_giving_cents') + (int) $this->input('other_deductions_cents') > $gross) {
                    $validator->errors()->add('salary_sacrifice_cents', 'Annual payroll deductions cannot exceed included gross income.');
                }
            }
        }];
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $householdId = $this->user()?->households()->first()?->id;
        $money = ['nullable', 'integer', 'min:0', 'max:99999999999'];
        $date = ['nullable', 'date_format:Y-m-d', 'after_or_equal:2000-01-01', 'before_or_equal:2100-12-31'];

        return [
            'kind' => ['required', Rule::in(['income', 'bill', 'spending', 'saving'])],
            'name' => ['required', 'string', 'max:120'],
            'category' => ['nullable', 'string', 'max:80'],
            'person' => ['nullable', 'string', 'max:80'],
            'amount_cents' => ['required', 'integer', 'min:0', 'max:99999999999'],
            'cadence' => ['required', Rule::enum(Cadence::class)],
            'payments_per_year' => ['exclude_unless:cadence,custom', 'required', 'integer', 'between:1,366'],
            'is_variable' => ['required', 'boolean'],
            'is_active' => ['required', 'boolean'],
            'pay_date' => $date,
            'salary_sacrifice_cents' => ['sometimes', 'required', 'integer', 'min:0', 'max:99999999999'],
            'workplace_giving_cents' => ['sometimes', 'required', 'integer', 'min:0', 'max:99999999999'],
            'other_deductions_cents' => ['sometimes', 'required', 'integer', 'min:0', 'max:99999999999'],
            'due_date' => [...$date, 'required_if:has_sinking_fund,true'],
            'account_id' => ['nullable', Rule::exists('accounts', 'id')->where('household_id', $householdId)],
            'gross_annual_cents' => [...$money, 'required_if:use_tax_estimate,true'],
            'bonus_annual_cents' => $money,
            'use_tax_estimate' => ['required', 'boolean', Rule::in($this->input('kind') === 'income' ? [true, false, 0, 1] : [false, 0])],
            'include_bonus' => ['required', 'boolean'],
            'include_medicare' => ['required', 'boolean'],
            'tax_year' => ['required', 'integer', Rule::in([2025, 2026, 2027])],
            'notes' => ['nullable', 'string', 'max:4000'],
            'has_sinking_fund' => ['required', 'boolean', Rule::in($this->input('kind') === 'bill' ? [true, false, 0, 1] : [false, 0])],
            'saved_cents' => ['required', 'integer', 'min:0', 'max:99999999999'],
            'saving_start_date' => $date,
            'contribution_cents' => $money,
            'contribution_cadence' => ['required', Rule::in(['weekly', 'fortnightly', 'monthly'])],
            'saving_account_id' => ['nullable', Rule::exists('accounts', 'id')->where('household_id', $householdId)],
        ];
    }
}
