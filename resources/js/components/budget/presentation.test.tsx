import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ItemTable } from '../../pages/budget/index';
import type { BudgetItem, Period } from '../../types/budget';
import { TaxEstimateCard } from './tax-estimate-card';

const salary = {
    id: 1,
    name: 'James salary',
    person: 'James',
    kind: 'income',
    is_active: true,
    category: 'Salary',
    amount_cents: 99900,
    cadence: 'monthly',
    tax_year: 2026,
    use_tax_estimate: false,
    equivalents: {
        weekly: 25000,
        fortnightly: 50000,
        monthly: 108333,
        annually: 1300000,
    },
    tax_estimate: {
        gross_cents: 15500000,
        deductions_cents: 0,
        taxable_cents: 15500000,
        tax_cents: 3842000,
        medicare_cents: 310000,
        net_cents: 11348000,
    },
} as BudgetItem;

describe('budget presentation', () => {
    it.each<Period | null>([
        'weekly',
        'fortnightly',
        'monthly',
        'annually',
        null,
    ])('keeps every amount visible with preference %s', (period) => {
        const html = renderToStaticMarkup(
            <ItemTable
                items={[salary]}
                period={period}
                onEdit={() => {}}
                onHistory={() => {}}
            />,
        );
        expect(html.match(/\$[\d,]+\.\d{2}/g)).toEqual([
            '$13,000.00',
            '$1,083.33',
            '$500.00',
            '$250.00',
        ]);
        expect(html).toContain('Edit James salary');
        expect(html).not.toContain('Entered amount');
        const headers = html.match(/<th\b[^>]*>[\s\S]*?<\/th>/g) ?? [];
        expect(
            headers.filter((header) => header.includes('(preferred)')),
        ).toHaveLength(period ? 1 : 0);
        const amounts = html.match(/<td\b[^>]*>\$[\s\S]*?<\/td>/g) ?? [];
        expect(
            amounts.filter((cell) => cell.includes('font-semibold')),
        ).toHaveLength(period ? 1 : 0);
        if (period) {
            const order = ['annually', 'monthly', 'fortnightly', 'weekly'];
            expect(amounts[order.indexOf(period)]).toContain('font-semibold');
        }
    });
    it('converts the tax estimate independently of manually entered budget income', () => {
        const html = renderToStaticMarkup(
            <TaxEstimateCard item={salary} period="fortnightly" />,
        );
        const headline = html.split('<details')[0];
        expect(headline).toContain('$4,364.62');
        expect(headline).not.toContain('$500.00');
        expect(headline).toContain('budget uses manual take-home');
        expect(html).toContain('Annual tax breakdown');
        expect(html).toContain('$113,480.00');
        expect(html).toContain('<details open');
    });
    it('shows the annual estimate without division and labels when it is used in the budget', () => {
        const html = renderToStaticMarkup(
            <TaxEstimateCard
                item={{ ...salary, use_tax_estimate: true }}
                period="annually"
            />,
        );
        expect(html.split('<details')[0]).toContain('$113,480.00');
        expect(html).toContain('Used in budget');
        expect(
            renderToStaticMarkup(
                <TaxEstimateCard
                    item={{ ...salary, tax_estimate: null }}
                    period="weekly"
                />,
            ),
        ).toBe('');
    });
});

it('shows a bonus’s before-tax amount alongside its after-tax budget figures', () => {
    const html = renderToStaticMarkup(
        <ItemTable
            items={[
                {
                    ...salary,
                    name: 'James bonus',
                    category: 'Bonus',
                    gross_annual_cents: null,
                    bonus_annual_cents: 1000000,
                    equivalents: {
                        annually: 610000,
                        monthly: 50833,
                        fortnightly: 23462,
                        weekly: 11731,
                    },
                },
            ]}
            period="annually"
            onEdit={() => {}}
            onHistory={() => {}}
        />,
    );

    expect(html).toContain('Before tax: $10,000.00 per year');
    expect(html).toContain('$6,100.00');
    expect(html).toContain('Bonus');
    expect(html).toContain('Excluded from budget');
});

it('shows the salary before-tax amount without adding an excluded salary bonus', () => {
    const html = renderToStaticMarkup(
        <ItemTable
            items={[
                {
                    ...salary,
                    gross_annual_cents: 15500000,
                    bonus_annual_cents: 1000000,
                    include_bonus: false,
                },
            ]}
            period="fortnightly"
            onEdit={() => {}}
            onHistory={() => {}}
        />,
    );

    expect(html).toContain('Before tax: $155,000.00 per year');
    expect(html).not.toContain('Excluded from budget');
});

it('labels a combined take-home estimate when its bonus is excluded from the budget', () => {
    const html = renderToStaticMarkup(
        <TaxEstimateCard
            item={{
                ...salary,
                include_bonus: true,
                use_tax_estimate: true,
                tax_estimate: {
                    ...salary.tax_estimate!,
                    gross_cents: 16500000,
                    taxable_cents: 16500000,
                    tax_cents: 4212000,
                    medicare_cents: 330000,
                    net_cents: 11958000,
                },
            }}
            period="fortnightly"
            bonusExcludedFromBudget
        />,
    );

    expect(html).toContain('$4,599.23');
    expect(html).toContain('$165,000.00');
    expect(html).toContain('Including bonus');
    expect(html).toContain('Bonus excluded from budget');
    expect(html).not.toContain('Used in budget');
});
