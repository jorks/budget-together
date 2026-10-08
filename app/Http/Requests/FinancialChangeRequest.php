<?php

namespace App\Http\Requests;

use App\Cadence;
use App\Models\BudgetItem;
use App\Models\Debt;
use App\Models\Mortgage;
use App\Models\SuperFund;
use App\Services\FinancialHistory;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class FinancialChangeRequest extends FormRequest
{
    public function record(): BudgetItem|Debt|Mortgage|SuperFund
    {
        $class = match ($this->route('record_type')) {
            'item' => BudgetItem::class,
            'mortgage' => Mortgage::class,
            'debt' => Debt::class,
            'super' => SuperFund::class,
            default => abort(404),
        };
        $record = $class::query()->whereKey($this->route('record_id'))->firstOrFail();
        Gate::authorize('manage', $record->household);
        abort_if($record instanceof BudgetItem && $record->kind === 'bill', 404);
        abort_if($record instanceof Mortgage && ! $record->household->mortgage_enabled, 404);
        abort_if($record instanceof Debt && ! $record->household->debts_enabled, 404);

        return $record;
    }

    public function authorize(): bool
    {
        $this->record();

        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        if ($this->isMethod('DELETE')) {
            return [];
        }
        $record = $this->record();
        $money = ['required', 'integer', 'between:0,99999999999'];
        $date = ['nullable', 'date_format:Y-m-d', 'after_or_equal:2000-01-01', 'before_or_equal:2100-12-31'];
        $fields = [
            'amount_cents' => $money,
            'cadence' => ['required', Rule::enum(Cadence::class)],
            'payments_per_year' => ['nullable', 'required_if:values.cadence,custom', 'integer', 'between:1,366'],
            'gross_annual_cents' => ['nullable', 'required_if:values.use_tax_estimate,true', 'integer', 'between:0,99999999999'],
            'bonus_annual_cents' => ['nullable', 'integer', 'between:0,99999999999'],
            'salary_sacrifice_cents' => $money,
            'workplace_giving_cents' => $money,
            'other_deductions_cents' => $money,
            'use_tax_estimate' => ['required', 'boolean', Rule::in($record instanceof BudgetItem && $record->kind === 'income' ? [true, false, 0, 1] : [false, 0])],
            'include_bonus' => ['required', 'boolean'],
            'include_medicare' => ['required', 'boolean'],
            'tax_year' => ['required', 'integer', Rule::in([2025, 2026, 2027])],
            'pay_date' => $date,
            'balance_cents' => $record instanceof Mortgage ? ['required', 'integer', 'between:1,99999999999'] : $money,
            'annual_rate' => ['required', 'numeric', 'between:0,'.($record instanceof Mortgage ? 30 : 50), 'decimal:0,3'],
            'term_years' => ['required', 'integer', 'between:1,40'],
            'frequency' => ['required', Rule::in(['weekly', 'fortnightly', 'monthly'])],
            'offset_cents' => $money,
            'extra_cents' => $money,
            'repayment_cents' => ['required', 'integer', 'between:1,99999999999'],
            'due_date' => $date,
            'employer_rate' => ['required', 'numeric', 'between:0,30', 'decimal:0,3'],
            'annual_fee_cents' => $money,
            'fee_rate' => ['required', 'numeric', 'between:0,10', 'decimal:0,3'],
            'annual_insurance_cents' => $money,
            'return_rate' => ['required', 'numeric', 'between:-20,20', 'decimal:0,3'],
        ];
        $allowed = app(FinancialHistory::class)->fields($record);
        $rules = [
            'effective_from' => ['required', 'date_format:Y-m-d', 'after_or_equal:2000-01-01', 'before_or_equal:2100-12-31', ...($this->input('event_type') === 'extra_payment' ? ['before_or_equal:'.now('Australia/Melbourne')->toDateString()] : [])],
            'event_type' => ['required', Rule::in($record instanceof Debt || $record instanceof Mortgage ? ['update', 'balance', 'rate_change', 'refinance', 'extra_payment'] : ['update'])],
            'payment_cents' => ['nullable', 'required_if:event_type,extra_payment', 'integer', 'between:1,99999999999'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'values' => ['required', 'array:'.implode(',', $allowed)],
        ];
        foreach ($allowed as $field) {
            $rules['values.'.$field] = $fields[$field];
        }

        return $rules;
    }

    /** @return list<\Closure> */
    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty() || ! $this->boolean('values.use_tax_estimate')) {
                return;
            }
            $gross = $this->integer('values.gross_annual_cents') + ($this->boolean('values.include_bonus') ? $this->integer('values.bonus_annual_cents') : 0);
            if ($this->integer('values.salary_sacrifice_cents') + $this->integer('values.workplace_giving_cents') + $this->integer('values.other_deductions_cents') > $gross) {
                $validator->errors()->add('values.salary_sacrifice_cents', 'Annual payroll deductions cannot exceed included gross income.');
            }
        }];
    }
}
