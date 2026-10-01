<?php

namespace App\Services;

use App\Cadence;
use App\Models\Mortgage;

class MortgageCalculator
{
    public function repayment(Mortgage $mortgage): int
    {
        $frequency = Cadence::from($mortgage->frequency)->periods();
        $periods = $mortgage->term_years * $frequency;
        $rate = $mortgage->annual_rate / 100 / $frequency;

        return (int) ceil($rate === 0.0
            ? $mortgage->balance_cents / $periods
            : $mortgage->balance_cents * $rate / (1 - (1 + $rate) ** -$periods));
    }

    public function plannedRepayment(Mortgage $mortgage): int
    {
        return $this->repayment($mortgage) + $mortgage->extra_cents;
    }
}
