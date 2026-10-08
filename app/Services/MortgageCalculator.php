<?php

namespace App\Services;

use App\Cadence;
use App\Models\Mortgage;
use Carbon\CarbonImmutable;

class MortgageCalculator
{
    public function __construct(private FinancialHistory $history) {}

    public function repayment(Mortgage $mortgage, ?CarbonImmutable $date = null): int
    {
        $mortgage = $this->history->at($mortgage, $date);
        $frequency = Cadence::from($mortgage->frequency)->periods();
        $periods = $mortgage->term_years * $frequency;
        $rate = $mortgage->annual_rate / 100 / $frequency;

        return (int) ceil($rate === 0.0
            ? $mortgage->balance_cents / $periods
            : $mortgage->balance_cents * $rate / (1 - (1 + $rate) ** -$periods));
    }

    public function plannedRepayment(Mortgage $mortgage): int
    {
        $mortgage = $this->history->at($mortgage);

        return $this->repayment($mortgage) + $mortgage->extra_cents;
    }
}
