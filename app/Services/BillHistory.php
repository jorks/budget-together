<?php

namespace App\Services;

use App\Cadence;
use App\Models\BillRecord;
use App\Models\BudgetItem;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

class BillHistory
{
    public function __construct(private BudgetItemHistory $history) {}

    /** @param list<array<string, mixed>> $records */
    public function record(BudgetItem $item, array $records): void
    {
        DB::transaction(function () use ($item, $records): void {
            $locked = BudgetItem::query()->lockForUpdate()->findOrFail($item->id);
            foreach ($records as $data) {
                $locked->billRecords()->firstOrCreate(['entry_key' => $data['entry_key']], [...$data, ...$this->expectation($locked, $data)]);
            }
        });
    }

    /** @param array<string, mixed> $data */
    public function correct(BillRecord $record, array $data): void
    {
        $expectation = $data['billed_on'] === $record->billed_on->toDateString() ? [] : $this->expectation($record->budgetItem, $data);
        $record->update([...$data, ...$expectation]);
    }

    /** @param array<string, mixed> $data
     * @return array{expected_amount_cents: int, expected_cadence: string}
     */
    private function expectation(BudgetItem $item, array $data): array
    {
        $terms = $this->history->termsAt($item, CarbonImmutable::parse($data['billed_on']));

        return ['expected_amount_cents' => $terms['amount_cents'], 'expected_cadence' => $terms['cadence']];
    }

    /** @return array{amount_cents: int, annual_cents: int, bill_count: int, covered_days: int, from: string, until: string}|null */
    public function suggestion(BudgetItem $item): ?array
    {
        if (! $item->is_variable || $item->kind !== 'bill') {
            return null;
        }
        $item->loadMissing('billRecords');
        $records = $item->billRecords->filter(fn (BillRecord $record): bool => $record->period_start !== null && $record->period_end !== null)->sortBy('period_start')->values();
        if ($records->isEmpty()) {
            return null;
        }
        $days = 0;
        $total = 0;
        $previousEnd = null;
        foreach ($records as $record) {
            if ($previousEnd !== null && $record->period_start->lessThanOrEqualTo($previousEnd)) {
                return null;
            }
            $days += (int) $record->period_start->diffInDays($record->period_end) + 1;
            $total += $record->amount_cents;
            $previousEnd = $record->period_end;
        }
        $annual = (int) round($total / $days * 365.25);
        $terms = $this->history->termsAt($item, CarbonImmutable::today('Australia/Melbourne'));

        return ['amount_cents' => (int) round($annual / Cadence::from($terms['cadence'])->periods($terms['payments_per_year'])), 'annual_cents' => $annual, 'bill_count' => $records->count(), 'covered_days' => $days, 'from' => $records->first()->period_start->toDateString(), 'until' => $records->last()->period_end->toDateString()];
    }
}
