<?php

namespace App\Services;

use App\Models\SuperFund;

class SuperCalculator
{
    public function __construct(private FinancialHistory $history) {}

    /** @return array{employer_cents: int, sacrifice_cents: int, tax_cents: int, net_cents: int} */
    public function contributions(SuperFund $fund): array
    {
        $fund = $this->history->at($fund);
        $income = $fund->income === null ? null : $this->history->at($fund->income);
        $active = $income !== null && $income->is_active && $income->kind === 'income' && $income->gross_annual_cents !== null && mb_strtolower(trim($income->category ?? '')) !== 'bonus';
        $employer = $active ? (int) round($income->gross_annual_cents * $fund->employer_rate / 100) : 0;
        $sacrifice = $income === null ? $fund->salary_sacrifice_cents : ($active ? ($income->salary_sacrifice_cents ?? 0) : 0);
        $tax = (int) round(($employer + $sacrifice) * 0.15);

        return ['employer_cents' => $employer, 'sacrifice_cents' => $sacrifice, 'tax_cents' => $tax, 'net_cents' => $employer + $sacrifice - $tax];
    }

    /** @return list<array{year: int|float, balance_cents: int, contributions_cents: int}> */
    public function project(SuperFund $fund, int $balanceCents, float $years = 30): array
    {
        if ($years < 0 || $years > 100) {
            throw new \InvalidArgumentException('Projection horizon must be between zero and 100 years.');
        }
        $fund = $this->history->at($fund);
        $net = $this->contributions($fund)['net_cents'];
        $balance = (float) $balanceCents;
        $paidIn = $balance;
        $monthlyReturn = (1 + $fund->return_rate / 100) ** (1 / 12) - 1;
        $points = [['year' => 0, 'balance_cents' => $balanceCents, 'contributions_cents' => $balanceCents]];
        for ($month = 1; $month <= (int) ceil($years * 12); $month++) {
            $fraction = min(1, $years * 12 - ($month - 1));
            $fees = $balance * $fund->fee_rate / 100 / 12 + ($fund->annual_fee_cents + $fund->annual_insurance_cents) / 12;
            $balance = max(0, $balance * (1 + $monthlyReturn) ** $fraction + ($net / 12 - $fees) * $fraction);
            $paidIn += $net / 12 * $fraction;
            if ($month % 12 === 0 || $month === (int) ceil($years * 12)) {
                $points[] = ['year' => $month === (int) ceil($years * 12) ? $years : intdiv($month, 12), 'balance_cents' => (int) round($balance), 'contributions_cents' => (int) round($paidIn)];
            }
        }

        return $points;
    }
}
