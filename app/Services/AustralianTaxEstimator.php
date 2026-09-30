<?php

namespace App\Services;

class AustralianTaxEstimator
{
    /**
     * Resident marginal rates, excluding offsets, deductions, HELP and surcharge.
     * The optional levy is the standard 2%, without reductions or exemptions.
     * Source: ATO resident rates and Treasury Laws Amendment (More Cost of Living Relief) Act 2025.
     *
     * @return array{gross_cents: int, tax_cents: int, medicare_cents: int, net_cents: int}
     */
    public function estimate(int $grossCents, int $year, bool $medicare = true): array
    {
        $firstRate = match ($year) {
            2025 => 16,
            2026 => 15,
            2027 => 14,
            default => throw new \InvalidArgumentException('Unsupported tax year.'),
        };
        $tax = 0;
        foreach ([[1820000, 4500000, $firstRate], [4500000, 13500000, 30], [13500000, 19000000, 37], [19000000, PHP_INT_MAX, 45]] as [$floor, $ceiling, $rate]) {
            $tax += (int) round(max(0, min($grossCents, $ceiling) - $floor) * $rate / 100);
        }
        $levy = $medicare ? (int) round($grossCents * 2 / 100) : 0;

        return ['gross_cents' => $grossCents, 'tax_cents' => $tax, 'medicare_cents' => $levy, 'net_cents' => max(0, $grossCents - $tax - $levy)];
    }
}
