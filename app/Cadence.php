<?php

namespace App;

use Carbon\CarbonImmutable;

enum Cadence: string
{
    case Weekly = 'weekly';
    case Fortnightly = 'fortnightly';
    case Monthly = 'monthly';
    case Quarterly = 'quarterly';
    case HalfYearly = 'half_yearly';
    case Annually = 'annually';
    case Custom = 'custom';

    public function periods(?int $custom = null): int
    {
        return match ($this) {
            self::Weekly => 52,
            self::Fortnightly => 26,
            self::Monthly => 12,
            self::Quarterly => 4,
            self::HalfYearly => 2,
            self::Annually => 1,
            self::Custom => $custom ?? throw new \InvalidArgumentException('Custom cadence needs payments per year.'),
        };
    }

    public function occurrence(CarbonImmutable $anchor, int $index): CarbonImmutable
    {
        return match ($this) {
            self::Weekly => $anchor->addWeeks($index),
            self::Fortnightly => $anchor->addWeeks($index * 2),
            self::Monthly => $anchor->addMonthsNoOverflow($index),
            self::Quarterly => $anchor->addMonthsNoOverflow($index * 3),
            self::HalfYearly => $anchor->addMonthsNoOverflow($index * 6),
            self::Annually => $anchor->addYearsNoOverflow($index),
            self::Custom => $anchor,
        };
    }
}
