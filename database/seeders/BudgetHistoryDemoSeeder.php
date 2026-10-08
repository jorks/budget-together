<?php

namespace Database\Seeders;

use App\Models\User;
use App\Services\BillHistory;
use App\Services\BudgetItemHistory;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class BudgetHistoryDemoSeeder extends Seeder
{
    public function run(BudgetItemHistory $history, BillHistory $bills): void
    {
        if (! app()->environment(['local', 'testing'])) {
            return;
        }
        $household = User::query()->where('email', 'james@example.test')->first()?->households()->first();
        if ($household === null) {
            return;
        }
        $today = CarbonImmutable::today('Australia/Melbourne');
        $streaming = $household->items()->where('name', 'Video streaming')->firstOrFail();
        if (! $streaming->revisions()->exists()) {
            $history->record($streaming, ['effective_from' => $today->subMonths(6)->toDateString(), 'amount_cents' => 1500, 'cadence' => 'monthly', 'notes' => 'Current streaming plan']);
            $history->record($streaming, ['effective_from' => $today->addMonth()->startOfMonth()->toDateString(), 'amount_cents' => 1700, 'cadence' => 'monthly', 'notes' => 'Announced price increase']);
        }
        foreach (['Internet', 'Mobile phones', 'Home insurance', 'Car insurance'] as $name) {
            $item = $household->items()->where('name', $name)->first();
            if ($item === null || $item->revisions()->exists()) {
                continue;
            }
            $current = $item->amount_cents;
            $history->record($item, ['effective_from' => $today->subYear()->toDateString(), 'amount_cents' => (int) round($current * 0.9), 'cadence' => $item->cadence, 'notes' => 'Previous plan or renewal price.']);
            $history->record($item, ['effective_from' => $today->subMonthsNoOverflow(2)->toDateString(), 'amount_cents' => $current, 'cadence' => $item->cadence, 'notes' => 'Latest renewal.']);
        }
        foreach (['Electricity' => [27800, 31500, 42600, 35500], 'Gas' => [9400, 11800, 19300, 15600]] as $name => $amounts) {
            $item = $household->items()->where('name', $name)->firstOrFail();
            if ($item->billRecords()->exists()) {
                continue;
            }
            $records = [];
            $anchor = $today->startOfMonth();
            foreach ($amounts as $index => $amount) {
                $periodEnd = $anchor->subMonths((3 - $index) * 3)->subDay();
                $records[] = ['entry_key' => (string) Str::uuid(), 'amount_cents' => $amount, 'billed_on' => $periodEnd->toDateString(), 'period_start' => $anchor->subMonths((4 - $index) * 3)->toDateString(), 'period_end' => $periodEnd->toDateString(), 'due_on' => $periodEnd->addDays(14)->toDateString(), 'paid_on' => $index < 3 ? $periodEnd->addDays(7)->toDateString() : null, 'notes' => 'Fictional quarterly bill for history and estimate review'];
            }
            $bills->record($item, $records);
        }
    }
}
