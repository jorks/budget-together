import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ItemTable, ItemTables } from '../../pages/budget/index';
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
        expect(html.split('<tfoot')[0].match(/\$[\d,]+\.\d{2}/g)).toEqual([
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

    expect(html).toContain('$10,000.00');
    expect(html.indexOf('$10,000.00')).toBeLessThan(html.indexOf('$6,100.00'));
    expect(html.indexOf('Annual pre-tax income')).toBeLessThan(
        html.indexOf('Per year'),
    );
    expect(html).toContain('After tax');
    expect(html).not.toContain('Before tax:');
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

    expect(html).toContain('$155,000.00');
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

it.each([null, 0])(
    'shows missing or zero annual pre-tax income accurately (%s)',
    (gross) => {
        const html = renderToStaticMarkup(
            <ItemTable
                items={[
                    {
                        ...salary,
                        gross_annual_cents: gross,
                        bonus_annual_cents: 1000000,
                    },
                ]}
                period="weekly"
                onEdit={() => {}}
                onHistory={() => {}}
            />,
        );

        expect(html).toContain(gross === null ? 'Not provided' : '$0.00');
        expect(html).not.toContain('$10,000.00');
        expect(html).toContain('$250.00');
    },
);

it('keeps expense tables without income columns or tax labels', () => {
    const html = renderToStaticMarkup(
        <ItemTable
            items={[{ ...salary, kind: 'bill' }]}
            period="weekly"
            onEdit={() => {}}
            onHistory={() => {}}
        />,
    );

    expect(html).not.toContain('Annual pre-tax income');
    expect(html).not.toContain('After tax');
    expect(html).toContain('$250.00');
});

it.each(['none', 'category', 'frequency'])(
    'totals each table and grouped grand totals (%s)',
    (groupBy) => {
        const items = [
            {
                ...salary,
                id: 1,
                kind: 'bill' as const,
                category: 'Housing',
                cadence: 'monthly' as const,
            },
            {
                ...salary,
                id: 2,
                kind: 'bill' as const,
                category: 'Utilities',
                cadence: 'weekly' as const,
            },
            {
                ...salary,
                id: 3,
                kind: 'bill' as const,
                category: 'Housing',
                is_active: false,
            },
        ];
        const html = renderToStaticMarkup(
            <ItemTables
                items={items}
                groupBy={groupBy}
                period="fortnightly"
                onEdit={() => {}}
                onHistory={() => {}}
            />,
        );
        const footers = html.match(/<tfoot[\s\S]*?<\/tfoot>/g) ?? [];

        expect(footers).toHaveLength(groupBy === 'none' ? 1 : 3);
        expect(footers.at(-1)?.match(/\$[\d,]+\.\d{2}/g)).toEqual([
            '$26,000.00',
            '$2,166.66',
            '$1,000.00',
            '$500.00',
        ]);
        if (groupBy !== 'none') {
            expect(footers[0]).toContain('Subtotal');
            expect(footers[1]).toContain('Subtotal');
            expect(footers[0]).toContain('$13,000.00');
            expect(footers[1]).toContain('$13,000.00');
            expect(footers[2]).toContain('Grand total');
        }
    },
);

it('totals annual pre-tax and take-home income while excluding paused items and excluded bonuses', () => {
    const html = renderToStaticMarkup(
        <ItemTable
            items={[
                { ...salary, gross_annual_cents: 15500000 },
                {
                    ...salary,
                    id: 2,
                    category: 'Bonus',
                    gross_annual_cents: null,
                    bonus_annual_cents: 1000000,
                    include_bonus: false,
                },
                {
                    ...salary,
                    id: 3,
                    category: 'Bonus',
                    gross_annual_cents: null,
                    bonus_annual_cents: 200000,
                    include_bonus: true,
                },
                {
                    ...salary,
                    id: 4,
                    gross_annual_cents: 9000000,
                    is_active: false,
                },
            ]}
            period="weekly"
            onEdit={() => {}}
            onHistory={() => {}}
        />,
    );
    const footer = html.match(/<tfoot[\s\S]*?<\/tfoot>/)?.[0] ?? '';

    expect(footer.match(/\$[\d,]+\.\d{2}/g)).toEqual([
        '$157,000.00',
        '$26,000.00',
        '$2,166.66',
        '$1,000.00',
        '$500.00',
    ]);
});
