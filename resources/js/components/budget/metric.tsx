import type { ReactNode } from 'react';
import type { Period } from '@/types/budget';
import { money } from './shared';

export const periodLabels: Record<Period, string> = {
    weekly: 'week',
    fortnightly: 'fortnight',
    monthly: 'month',
    annually: 'year',
};

export function Metric({
    icon,
    label,
    value,
    period,
    caption,
}: {
    icon: ReactNode;
    label: string;
    value: number;
    period: Period;
    caption: ReactNode;
}) {
    return (
        <>
            <div className="flex min-h-9 items-center gap-2.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary">
                    {icon}
                </span>
                <span className="text-sm font-medium">{label}</span>
            </div>
            <p className="mt-4 text-2xl font-semibold tracking-tight tabular-nums">
                {money(value)}
            </p>
            <p className="mt-0.5 text-xs font-medium text-primary">
                per {periodLabels[period]}
            </p>
            <div className="mt-3 text-xs leading-relaxed text-muted-foreground">
                {caption}
            </div>
        </>
    );
}
