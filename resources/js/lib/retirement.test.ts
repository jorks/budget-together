import { expect, it } from 'vitest';
import { projectMortgage } from '@/lib/mortgage';
import { mortgageBalanceAtYear } from '@/lib/retirement';

it('estimates mortgage balances at retirement and keeps them zero after payoff', () => {
    const projection = projectMortgage({
        balance_cents: 1200000,
        annual_rate: 0,
        term_years: 1,
        frequency: 'monthly',
        offset_cents: 0,
        extra_cents: 0,
    })!.planned;
    expect(mortgageBalanceAtYear(projection, 0)).toBe(1200000);
    expect(mortgageBalanceAtYear(projection, 0.5)).toBe(600000);
    expect(mortgageBalanceAtYear(projection, 1)).toBe(0);
    expect(mortgageBalanceAtYear(projection, 35)).toBe(0);
});

it('aligns household super on elapsed years and freezes each balance after retirement', async () => {
    const { combinedSuperProjection } = await import('./retirement');
    const base = {
        id: 1,
        name: 'James',
        date_of_birth: '1986-10-02',
        age: 40,
        retirement_age: 65,
        retirement_date: '2051-10-02',
        years_remaining: 1.5,
        super_funds_count: 1,
        super_projection: [
            { year: 0, balance_cents: 100, contributions_cents: 100 },
            { year: 1.5, balance_cents: 400, contributions_cents: 250 },
        ],
    };
    const partner = {
        ...base,
        id: 2,
        years_remaining: 3,
        super_projection: [
            { year: 0, balance_cents: 200, contributions_cents: 200 },
            { year: 3, balance_cents: 800, contributions_cents: 500 },
        ],
    };
    const points = combinedSuperProjection([base, partner]);
    expect(points[0].balance_cents).toBe(300);
    expect(points.find((point) => point.year === 1.5)?.balance_cents).toBe(900);
    expect(points.find((point) => point.year === 2)?.balance_cents).toBe(1000);
    expect(points.at(-1)).toEqual({
        year: 3,
        balance_cents: 1200,
        contributions_cents: 750,
    });
    expect(combinedSuperProjection([])).toEqual([]);
    expect(
        combinedSuperProjection([{ ...base, years_remaining: null }]),
    ).toEqual([]);
});
