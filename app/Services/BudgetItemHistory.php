<?php

namespace App\Services;

use App\Models\BudgetItem;
use App\Models\BudgetItemRevision;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class BudgetItemHistory
{
    public function __construct(private FinancialHistory $financial) {}

    /** @return array{amount_cents: int, cadence: string, payments_per_year: int|null} */
    public function termsAt(BudgetItem $item, CarbonImmutable $date): array
    {
        $item = $this->financial->at($item, $date);
        if ($item->kind !== 'bill') {
            return $item->only(['amount_cents', 'cadence', 'payments_per_year']);
        }
        if ($item->exists || $item->relationLoaded('revisions')) {
            $item->loadMissing('revisions');
            $revision = $item->revisions
                ->filter(fn (BudgetItemRevision $revision): bool => $revision->effective_from === null || $revision->effective_from->toDateString() <= $date->toDateString())
                ->sortBy(fn (BudgetItemRevision $revision): string => $revision->effective_from?->toDateString() ?? '')
                ->last();
            if ($revision !== null) {
                return $revision->only(['amount_cents', 'cadence', 'payments_per_year']);
            }
        }

        return $item->only(['amount_cents', 'cadence', 'payments_per_year']);
    }

    public function ensureBaseline(BudgetItem $item): void
    {
        $item->revisions()->firstOrCreate(['effective_from' => null], [
            ...$item->only(['amount_cents', 'cadence', 'payments_per_year']),
            'notes' => 'Starting plan. Earlier effective date is not known.',
        ]);
        $item->unsetRelation('revisions');
    }

    /** @param array{effective_from: string, amount_cents: int, cadence: string, payments_per_year?: int|null, notes?: string|null} $data */
    public function record(BudgetItem $item, array $data, ?BudgetItemRevision $correction = null): BudgetItemRevision
    {
        return DB::transaction(function () use ($item, $data, $correction): BudgetItemRevision {
            $locked = BudgetItem::query()->lockForUpdate()->findOrFail($item->id);
            $this->ensureBaseline($locked);
            $duplicate = $locked->revisions()->where('effective_from', $data['effective_from']);
            if ($correction !== null) {
                $duplicate->where('id', '!=', $correction->id);
            }
            if ($duplicate->exists()) {
                throw ValidationException::withMessages(['effective_from' => 'A change already exists on this date. Correct that entry instead.']);
            }
            $data['payments_per_year'] = $data['cadence'] === 'custom' ? ($data['payments_per_year'] ?? throw new \InvalidArgumentException('Custom cadence needs payments per year.')) : null;
            if ($correction !== null) {
                $correction->update($data);
                $revision = $correction;
            } else {
                $revision = $locked->revisions()->create($data);
            }
            $this->refreshCurrent($locked);

            return $revision;
        });
    }

    public function remove(BudgetItemRevision $revision): void
    {
        DB::transaction(function () use ($revision): void {
            $item = BudgetItem::query()->lockForUpdate()->findOrFail($revision->budget_item_id);
            $revision->delete();
            $this->refreshCurrent($item);
        });
    }

    /** @param array<string, mixed> $data */
    public function updateItem(BudgetItem $item, array $data): void
    {
        if ($item->kind !== 'bill') {
            unset($data['preserve_price']);
            $this->financial->updateDetails($item, $data);

            return;
        }
        DB::transaction(function () use ($item, $data): void {
            $locked = BudgetItem::query()->lockForUpdate()->findOrFail($item->id);
            if ($locked->kind === 'bill') {
                $this->ensureBaseline($locked);
                $today = CarbonImmutable::today('Australia/Melbourne');
                $terms = $this->termsAt($locked, $today);
                $next = ['amount_cents' => (int) $data['amount_cents'], 'cadence' => $data['cadence'], 'payments_per_year' => $data['cadence'] === 'custom' ? (int) $data['payments_per_year'] : null];
                if (! ($data['preserve_price'] ?? false) && $next !== $terms) {
                    $locked->revisions()->updateOrCreate(['effective_from' => $today->toDateString()], [...$next, 'notes' => 'Updated from item settings.']);
                }
                unset($data['amount_cents'], $data['cadence'], $data['payments_per_year']);
            }
            unset($data['preserve_price']);
            $locked->update($data);
            if ($locked->kind === 'bill') {
                $this->refreshCurrent($locked);
            }
        });
    }

    private function refreshCurrent(BudgetItem $item): void
    {
        $item->unsetRelation('revisions');
        $item->update($this->termsAt($item, CarbonImmutable::today('Australia/Melbourne')));
    }
}
