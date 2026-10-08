<?php

namespace Database\Seeders;

use App\Models\User;
use App\Services\FinancialHistory;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;

class FinancialHistoryDemoSeeder extends Seeder
{
    public function run(FinancialHistory $history): void
    {
        if (! app()->environment(['local', 'testing'])) {
            return;
        }
        $household = User::query()->where('email', 'james@example.test')->first()?->households()->first();
        if ($household === null) {
            return;
        }
        $today = CarbonImmutable::today('Australia/Melbourne');
        foreach ($household->items()->whereIn('kind', ['income', 'spending', 'saving'])->get() as $item) {
            if ($item->financialChanges()->exists()) {
                continue;
            }
            $key = $item->kind === 'income' && $item->gross_annual_cents !== null ? 'gross_annual_cents' : 'amount_cents';
            $current = $item->getAttribute($key);
            $history->record($item, [$key => (int) round($current * 0.92)], $today->subYear()->toDateString(), notes: $item->kind === 'income' ? 'Previous salary package.' : 'Previous household allocation.');
            $history->record($item, [$key => $current], $today->subMonthsNoOverflow(3)->toDateString(), notes: $item->kind === 'income' ? 'Annual salary review.' : 'Reviewed spending and savings plan.');
            if ($item->kind === 'income' && $item->person === 'James') {
                $history->record($item, [$key => (int) round($current * 1.04)], $today->addMonthsNoOverflow(2)->startOfMonth()->toDateString(), notes: 'Upcoming salary increase.');
            }
        }
        $mortgage = $household->mortgage;
        if ($mortgage !== null && ! $mortgage->financialChanges()->exists()) {
            $balance = $mortgage->balance_cents;
            $rate = $mortgage->annual_rate;
            $offset = $mortgage->offset_cents;
            $history->record($mortgage, ['balance_cents' => $balance + 1800000, 'annual_rate' => $rate + 0.5, 'offset_cents' => (int) round($offset * 0.7)], $today->subYear()->toDateString(), 'balance', 'Earlier loan statement.');
            $history->record($mortgage, ['balance_cents' => $balance + 600000, 'annual_rate' => $rate, 'offset_cents' => (int) round($offset * 0.85)], $today->subMonthsNoOverflow(6)->toDateString(), 'refinance', 'Refinanced to a lower rate.');
            $history->record($mortgage, ['balance_cents' => $balance, 'offset_cents' => $offset], $today->subMonthNoOverflow()->toDateString(), 'balance', 'Latest lender and offset statement.');
            $history->record($mortgage, ['annual_rate' => max(0, $rate - 0.25)], $today->addMonthNoOverflow()->startOfMonth()->toDateString(), 'rate_change', 'Announced rate reduction.');
        }
        foreach ($household->debts()->where('is_active', true)->where('balance_cents', '>', 0)->get() as $debt) {
            if ($debt->financialChanges()->exists()) {
                continue;
            }
            $balance = $debt->balance_cents;
            $history->record($debt, ['balance_cents' => $balance + 50000], $today->subMonthsNoOverflow(6)->toDateString(), 'balance', 'Earlier lender statement.');
            $history->record($debt, ['balance_cents' => $balance + 25000], $today->subMonthsNoOverflow(3)->toDateString(), 'extra_payment', 'One-off additional payment.', 25000);
            $history->record($debt, ['balance_cents' => $balance], $today->subMonthNoOverflow()->toDateString(), 'balance', 'Latest statement balance.');
        }
        foreach ($household->superFunds()->get() as $fund) {
            if ($fund->financialChanges()->exists()) {
                continue;
            }
            $fee = $fund->annual_fee_cents;
            $history->record($fund, ['annual_fee_cents' => max(0, $fee - 1200), 'employer_rate' => 11.5], $today->subYear()->toDateString(), notes: 'Previous fees and employer contribution assumptions.');
            $history->record($fund, ['annual_fee_cents' => $fee, 'employer_rate' => $fund->employer_rate], $today->subMonthsNoOverflow(3)->toDateString(), notes: 'Annual fund review.');
            foreach ([9 => 0.88, 3 => 0.96] as $months => $factor) {
                $latest = $fund->balances()->orderByDesc('recorded_on')->first();
                if ($latest !== null) {
                    $fund->balances()->firstOrCreate(['recorded_on' => $today->subMonthsNoOverflow($months)->toDateString()], ['balance_cents' => (int) round($latest->balance_cents * $factor), 'notes' => 'Fictional quarterly statement.']);
                }
            }
        }
    }
}
