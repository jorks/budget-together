<?php

namespace App\Services;

use Carbon\CarbonImmutable;

class AustralianTaxEstimator
{
    public function financialYear(CarbonImmutable $date): int
    {
        return $date->month >= 7 ? $date->year : $date->year - 1;
    }

    /** @return list<array{floor_cents: int, ceiling_cents: int|null, rate: int}> */
    public function brackets(int $year): array
    {
        $firstRate = match ($year) {
            2025 => 16, 2026 => 15, 2027 => 14,
            default => throw new \InvalidArgumentException('Unsupported tax year.'),
        };

        return [
            ['floor_cents' => 0, 'ceiling_cents' => 1820000, 'rate' => 0],
            ['floor_cents' => 1820000, 'ceiling_cents' => 4500000, 'rate' => $firstRate],
            ['floor_cents' => 4500000, 'ceiling_cents' => 13500000, 'rate' => 30],
            ['floor_cents' => 13500000, 'ceiling_cents' => 19000000, 'rate' => 37],
            ['floor_cents' => 19000000, 'ceiling_cents' => null, 'rate' => 45],
        ];
    }

    /**
     * Resident marginal rates, excluding offsets, other deductions, HELP and surcharge.
     * The optional levy is the standard 2%, without reductions or exemptions.
     * Source: ATO resident rates and Treasury Laws Amendment (More Cost of Living Relief) Act 2025.
     *
     * @return array{gross_cents: int, taxable_cents: int, deductions_cents: int, tax_cents: int, medicare_cents: int, net_cents: int}
     */
    public function estimate(int $grossCents, int $year, bool $medicare = true, int $sacrificeCents = 0, int $givingCents = 0, int $otherCents = 0): array
    {
        $taxable = max(0, $grossCents - $sacrificeCents - $givingCents);
        $tax = 0;
        foreach ($this->brackets($year) as $bracket) {
            $tax += (int) round(max(0, min($taxable, $bracket['ceiling_cents'] ?? PHP_INT_MAX) - $bracket['floor_cents']) * $bracket['rate'] / 100);
        }
        $levy = $medicare ? (int) round($taxable * 2 / 100) : 0;

        return ['gross_cents' => $grossCents, 'taxable_cents' => $taxable, 'deductions_cents' => $sacrificeCents + $givingCents + $otherCents, 'tax_cents' => $tax, 'medicare_cents' => $levy, 'net_cents' => max(0, $taxable - $tax - $levy - $otherCents)];
    }
}
