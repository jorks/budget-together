import { describe, expect, it } from 'vitest';
import { projectMortgage } from './mortgage';
import type { MortgageInputs } from './mortgage';

const loan: MortgageInputs = {
    balance_cents: 65000000,
    annual_rate: 6,
    term_years: 30,
    frequency: 'monthly',
    offset_cents: 0,
    extra_cents: 0,
};

describe('mortgage projections', () => {
    it('matches the standard amortisation example and pays off the whole balance', () => {
        const result = projectMortgage(loan)!;
        expect(result.repayment).toBe(389708);
        expect(result.baseline.periods).toBe(360);
        expect(result.baseline.interest / 100).toBeCloseTo(752947.21, 2);
        expect(result.planned.years.at(-1)?.balance).toBe(0);
        expect(
            result.planned.years.reduce((sum, year) => sum + year.principal, 0),
        ).toBeCloseTo(65000000, 2);
        expect(result.interestSaved).toBe(0);
        expect(result.yearsSaved).toBe(0);
    });
    it('handles zero interest without dividing by zero', () => {
        const result = projectMortgage({
            ...loan,
            balance_cents: 1200000,
            term_years: 1,
            annual_rate: 0,
        })!;
        expect(result.repayment).toBe(100000);
        expect(result.planned.periods).toBe(12);
        expect(result.planned.interest).toBe(0);
        expect(result.planned.total).toBe(1200000);
    });
    it('keeps the base payment unchanged and applies offset only to interest', () => {
        const result = projectMortgage({ ...loan, offset_cents: 2000000 })!;
        expect(result.repayment).toBe(389708);
        expect(result.planned.years[0].balance).toBe(65000000);
        expect(result.interestSaved).toBeGreaterThan(0);
        expect(result.yearsSaved).toBeGreaterThan(0);
    });
    it('caps offset interest at zero and caps the final repayment', () => {
        const result = projectMortgage({
            ...loan,
            offset_cents: 70000000,
            extra_cents: 99999999999,
        })!;
        expect(result.planned.periods).toBe(1);
        expect(result.planned.interest).toBe(0);
        expect(result.planned.total).toBe(65000000);
        expect(result.planned.years.at(-1)?.principal).toBe(65000000);
        expect(result.planned.years.at(-1)?.balance).toBe(0);
    });
    it('extra repayments save interest and shorten the term', () => {
        const result = projectMortgage({ ...loan, extra_cents: 30000 })!;
        expect(result.planned.periods).toBeLessThan(result.baseline.periods);
        expect(result.planned.interest).toBeLessThan(result.baseline.interest);
        expect(result.planned.total).toBeCloseTo(
            65000000 + result.planned.interest,
            2,
        );
    });
    it.each(['weekly', 'fortnightly', 'monthly'] as const)(
        'amortises the loan for %s repayments',
        (frequency) => {
            const result = projectMortgage({ ...loan, frequency })!;
            expect(result.planned.periods).toBe(30 * result.frequencyCount);
            expect(result.planned.years.at(-1)?.balance).toBe(0);
            expect(result.planned.years).toHaveLength(31);
        },
    );
    it.each([
        { balance_cents: 0 },
        { annual_rate: NaN },
        { annual_rate: -1 },
        { annual_rate: 31 },
        { term_years: 0 },
        { term_years: 41 },
        { term_years: 2.5 },
        { offset_cents: -1 },
        { extra_cents: -1 },
        { extra_cents: Infinity },
    ])('rejects invalid inputs %j', (changes) => {
        expect(projectMortgage({ ...loan, ...changes })).toBeNull();
    });
});

it.each([
    ['monthly', 389708],
    ['fortnightly', 179779],
    ['weekly', 89871],
] as const)('matches the budget repayment for %s', (frequency, amount) => {
    expect(projectMortgage({ ...loan, frequency })?.repayment).toBe(amount);
});
