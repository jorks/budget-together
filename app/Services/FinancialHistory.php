<?php

namespace App\Services;

use App\Models\BudgetItem;
use App\Models\Debt;
use App\Models\FinancialChange;
use App\Models\Mortgage;
use App\Models\SuperFund;
use Carbon\CarbonImmutable;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class FinancialHistory
{
    /** @return list<string> */
    public function fields(BudgetItem|Debt|Mortgage|SuperFund $record): array
    {
        return match (true) {
            $record instanceof BudgetItem && $record->kind !== 'income' => ['amount_cents', 'cadence', 'payments_per_year'],
            $record instanceof BudgetItem => ['amount_cents', 'cadence', 'payments_per_year', 'gross_annual_cents', 'bonus_annual_cents', 'salary_sacrifice_cents', 'workplace_giving_cents', 'other_deductions_cents', 'use_tax_estimate', 'include_bonus', 'include_medicare', 'tax_year', 'pay_date'],
            $record instanceof Mortgage => ['balance_cents', 'annual_rate', 'term_years', 'frequency', 'offset_cents', 'extra_cents', 'due_date'],
            $record instanceof Debt => ['balance_cents', 'annual_rate', 'repayment_cents', 'extra_cents', 'frequency', 'due_date'],
            $record instanceof SuperFund => [...($record->income_id === null ? ['salary_sacrifice_cents'] : []), 'employer_rate', 'annual_fee_cents', 'fee_rate', 'annual_insurance_cents', 'return_rate'],
        };
    }

    /**
     * @template T of BudgetItem|Debt|Mortgage|SuperFund
     *
     * @param  T  $record
     * @return T
     */
    public function at(BudgetItem|Debt|Mortgage|SuperFund $record, ?CarbonImmutable $date = null): BudgetItem|Debt|Mortgage|SuperFund
    {
        $resolved = clone $record;
        if (! $record->exists || ($record instanceof BudgetItem && $record->kind === 'bill')) {
            return $resolved;
        }
        $date ??= CarbonImmutable::today('Australia/Melbourne');
        $record->loadMissing('financialChanges');
        $change = $record->financialChanges
            ->filter(fn (FinancialChange $change): bool => $change->effective_from === null || $change->effective_from->toDateString() <= $date->toDateString())
            ->sortBy(fn (FinancialChange $change): string => $change->effective_from?->toDateString() ?? '')
            ->last();
        if ($change !== null) {
            $resolved->fill($change->values);
        }
        $resolved->setRelation('financialChanges', $record->financialChanges);

        return $resolved;
    }

    /** @param array<string, mixed> $values */
    public function record(BudgetItem|Debt|Mortgage|SuperFund $record, array $values, string $effectiveFrom, string $eventType = 'update', ?string $notes = null, ?int $paymentCents = null, ?FinancialChange $correction = null): FinancialChange
    {
        return DB::transaction(function () use ($record, $values, $effectiveFrom, $eventType, $notes, $paymentCents, $correction): FinancialChange {
            $locked = $record->newQuery()->lockForUpdate()->whereKey($record->getKey())->firstOrFail();
            if ($correction !== null && ! $locked->financialChanges()->whereKey($correction->id)->whereNotNull('effective_from')->exists()) {
                throw ValidationException::withMessages(['change_id' => 'Choose a dated change belonging to this record.']);
            }
            $locked->financialChanges()->firstOrCreate(['effective_from' => null], ['event_type' => 'baseline', 'values' => $this->snapshot($locked), 'notes' => 'Starting details. Earlier effective date is not known.']);
            $duplicate = $locked->financialChanges()->where('effective_from', $effectiveFrom);
            if ($correction !== null) {
                $duplicate->whereKeyNot($correction->id);
            }
            if ($duplicate->exists()) {
                throw ValidationException::withMessages(['effective_from' => 'A financial update already exists on this date. Correct that entry instead.']);
            }
            $locked->unsetRelation('financialChanges');
            $next = $this->at($locked, CarbonImmutable::parse($effectiveFrom));
            $next->fill(Arr::only($values, $this->fields($locked)));
            if ($next instanceof BudgetItem && $next->cadence !== 'custom') {
                $next->payments_per_year = null;
            }
            $data = ['effective_from' => $effectiveFrom, 'event_type' => $eventType, 'values' => $this->snapshot($next), 'notes' => $notes, 'payment_cents' => $eventType === 'extra_payment' ? $paymentCents : null];
            if ($correction !== null) {
                $correction->update($data);
                $change = $correction;
            } else {
                $change = $locked->financialChanges()->create($data);
            }
            $this->refreshCurrent($locked);

            return $change;
        });
    }

    /** @param array<string, mixed> $data */
    public function updateDetails(BudgetItem|Debt|Mortgage|SuperFund $record, array $data): void
    {
        DB::transaction(function () use ($record, $data): void {
            $locked = $record->newQuery()->lockForUpdate()->whereKey($record->getKey())->firstOrFail();
            $current = $this->at($locked);
            $next = clone $current;
            $next->fill(Arr::only($data, $this->fields($record)));
            if ($this->snapshot($current) !== $this->snapshot($next)) {
                $date = CarbonImmutable::today('Australia/Melbourne')->toDateString();
                $correction = $locked->financialChanges()->where('effective_from', $date)->first();
                $this->record($locked, $data, $date, $correction === null ? 'update' : $correction->event_type, $correction === null ? 'Updated financial details.' : $correction->notes, $correction?->payment_cents, $correction);
            }
            $locked->update(Arr::except($data, $this->fields($record)));
        });
    }

    public function remove(BudgetItem|Debt|Mortgage|SuperFund $record, FinancialChange $change): void
    {
        DB::transaction(function () use ($record, $change): void {
            $locked = $record->newQuery()->lockForUpdate()->whereKey($record->getKey())->firstOrFail();
            if ($change->effective_from === null || ! $locked->financialChanges()->whereKey($change->id)->exists()) {
                throw ValidationException::withMessages(['change_id' => 'Only dated changes belonging to this record can be removed.']);
            }
            $change->delete();
            $this->refreshCurrent($locked);
        });
    }

    /** @return array<string, mixed> */
    private function snapshot(BudgetItem|Debt|Mortgage|SuperFund $record): array
    {
        return Arr::only($record->attributesToArray(), $this->fields($record));
    }

    private function refreshCurrent(BudgetItem|Debt|Mortgage|SuperFund $record): void
    {
        $record->unsetRelation('financialChanges');
        $record->update($this->snapshot($this->at($record)));
    }
}
