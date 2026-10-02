import type { Projection } from '@/lib/mortgage';
import type { SuperPoint } from '@/types/superannuation';
import type { RetirementMember } from '@/types/retirement';

export function mortgageBalanceAtYear(
    projection: Projection,
    year: number,
): number {
    const points = projection.years;
    if (year <= 0) return points[0]?.balance ?? 0;
    const nextIndex = points.findIndex((point) => point.year >= year);
    if (nextIndex === -1) return 0;
    const next = points[nextIndex];
    const previous = points[Math.max(0, nextIndex - 1)];
    if (next.year === previous.year) return next.balance;
    const fraction = (year - previous.year) / (next.year - previous.year);
    return Math.round(
        previous.balance + (next.balance - previous.balance) * fraction,
    );
}

export function superBalanceAtYear(
    points: SuperPoint[],
    year: number,
    field: 'balance_cents' | 'contributions_cents' = 'balance_cents',
): number {
    if (points.length === 0) return 0;
    if (year <= points[0].year) return points[0][field];
    const index = points.findIndex((point) => point.year >= year);
    if (index === -1) return points.at(-1)![field];
    const previous = points[index - 1];
    const next = points[index];
    return Math.round(
        previous[field] +
            ((next[field] - previous[field]) * (year - previous.year)) /
                (next.year - previous.year),
    );
}

export function combinedSuperProjection(
    members: RetirementMember[],
): SuperPoint[] {
    const included = members.filter(
        (member) => member.years_remaining !== null,
    );
    const horizon = Math.max(
        0,
        ...included.map((member) => member.years_remaining ?? 0),
    );
    if (!included.some((member) => member.super_projection.length > 0))
        return [];
    const years = [
        ...new Set([
            ...Array.from({ length: Math.ceil(horizon) + 1 }, (_, year) =>
                Math.min(year, horizon),
            ),
            ...included.flatMap((member) =>
                member.super_projection.map((point) => point.year),
            ),
        ]),
    ].sort((a, b) => a - b);
    return years.map((year) => ({
        year,
        balance_cents: included.reduce(
            (total, member) =>
                total + superBalanceAtYear(member.super_projection, year),
            0,
        ),
        contributions_cents: included.reduce(
            (total, member) =>
                total +
                superBalanceAtYear(
                    member.super_projection,
                    year,
                    'contributions_cents',
                ),
            0,
        ),
    }));
}
