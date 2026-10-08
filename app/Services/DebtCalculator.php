<?php

namespace App\Services;

use App\Cadence;
use App\Models\Debt;

class DebtCalculator
{
    public function __construct(private FinancialHistory $history) {}

    /** @return array{periods: int|null, interest_cents: int|null, balances: list<int>} */
    public function project(Debt $debt, bool $includeExtras = true): array
    {
        $debt = $this->history->at($debt);
        $balance = $debt->balance_cents;
        $balances = [$balance];
        $payment = $debt->repayment_cents + ($includeExtras ? $debt->extra_cents : 0);
        $frequency = Cadence::from($debt->frequency)->periods();
        $rate = $debt->annual_rate / 100 / $frequency;
        $interestTotal = 0;
        $periods = 0;
        while ($balance > 0 && $periods < $frequency * 100) {
            $interest = (int) round($balance * $rate);
            if ($payment <= $interest) {
                return ['periods' => null, 'interest_cents' => null, 'balances' => $balances];
            }
            $balance = max(0, $balance + $interest - $payment);
            $interestTotal += $interest;
            $periods++;
            if ($periods % $frequency === 0 || $balance === 0) {
                $balances[] = $balance;
            }
        }

        return ['periods' => $balance === 0 ? $periods : null, 'interest_cents' => $balance === 0 ? $interestTotal : null, 'balances' => $balances];
    }
}
