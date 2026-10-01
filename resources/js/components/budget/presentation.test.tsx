import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ItemTable, ItemTables } from '../../pages/budget/index';
import { planBalance } from '../../lib/plan-balance';
import type { BudgetItem, BudgetProps, Period } from '../../types/budget';
import { BillCalendar } from './bill-calendar';
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

const balanceTotals = {
    income: {
        annually: 10400000,
        monthly: 866667,
        fortnightly: 400000,
        weekly: 200000,
    },
    bill: {
        annually: 3120000,
        monthly: 260000,
        fortnightly: 120000,
        weekly: 60000,
    },
    spending: {
        annually: 1300000,
        monthly: 108333,
        fortnightly: 50000,
        weekly: 25000,
    },
    saving: {
        annually: 520000,
        monthly: 43333,
        fortnightly: 20000,
        weekly: 10000,
    },
    outgoings: {
        annually: 4420000,
        monthly: 368333,
        fortnightly: 170000,
        weekly: 85000,
    },
    remaining: {
        annually: 5460000,
        monthly: 455000,
        fortnightly: 210000,
        weekly: 105000,
    },
} satisfies BudgetProps['totals'];

it('splits active mortgage bills from other expenses using annual totals before rounding', () => {
    const items = [
        {
            ...salary,
            kind: 'bill' as const,
            category: ' Mortgage ',
            equivalents: {
                annually: 1000000,
                monthly: 83333,
                fortnightly: 38462,
                weekly: 19231,
            },
        },
        {
            ...salary,
            id: 2,
            kind: 'bill' as const,
            category: 'mortgage',
            equivalents: {
                annually: 1080000,
                monthly: 90000,
                fortnightly: 41538,
                weekly: 20769,
            },
        },
        {
            ...salary,
            id: 3,
            kind: 'bill' as const,
            category: 'Mortgage',
            is_active: false,
        },
        { ...salary, id: 4, category: 'Mortgage' },
        { ...salary, id: 5, kind: 'bill' as const, category: 'Utilities' },
    ];

    const balance = planBalance(items, balanceTotals);

    expect(balance.rows.map((row) => row.equivalents)).toEqual([
        {
            annually: 10400000,
            monthly: 866667,
            fortnightly: 400000,
            weekly: 200000,
        },
        {
            annually: 2080000,
            monthly: 173333,
            fortnightly: 80000,
            weekly: 40000,
        },
        {
            annually: 1040000,
            monthly: 86667,
            fortnightly: 40000,
            weekly: 20000,
        },
    ]);
    expect(balance.remaining).toEqual({
        annually: 5460000,
        monthly: 455000,
        fortnightly: 210000,
        weekly: 105000,
    });
});

it.each(['none', 'category', 'frequency'])(
    'shows read-only balance rows once above editable spending and remaining at the bottom (%s)',
    (groupBy) => {
        const items = [
            {
                ...salary,
                kind: 'spending' as const,
                name: 'Groceries',
                category: 'Everyday',
            },
            {
                ...salary,
                id: 2,
                kind: 'saving' as const,
                name: 'Emergency fund',
                category: 'Savings',
                cadence: 'weekly',
            },
        ];

        const html = renderToStaticMarkup(
            <ItemTables
                items={items}
                groupBy={groupBy}
                balance={planBalance([], balanceTotals)}
                period="fortnightly"
                onEdit={() => {}}
                onHistory={() => {}}
            />,
        );
        const rows = html.match(/<tr\b[\s\S]*?<\/tr>/g) ?? [];
        const calculated = rows.filter((row) =>
            row.includes('Calculated from'),
        );
        const remaining = rows.at(-1)!;

        expect(calculated).toHaveLength(3);
        expect(calculated[0]).toContain('Total income');
        expect(calculated[1]).toContain('Mortgage');
        expect(calculated[2]).toContain('Bills &amp; expenses');
        expect(calculated[0]).toContain('Money in');
        expect(calculated[0]).toContain('+$104,000.00');
        expect(calculated[1]).toContain('Money out');
        expect(calculated[2]).toContain('-$31,200.00');
        for (const row of calculated) {
            expect(row).toContain('Calculated');
            expect(row).not.toContain('<button');
            expect(row).not.toContain('<input');
        }
        expect(html.indexOf('Bills &amp; expenses')).toBeLessThan(
            html.indexOf('Groceries'),
        );
        expect(html).toContain('Edit Groceries');
        expect(html).toContain('Delete Emergency fund');
        const groceries = rows.find((row) => row.includes('Edit Groceries'))!;
        expect(groceries).toContain('-$13,000.00');
        expect(groceries).not.toContain('Calculated');
        expect(remaining).toContain('Remaining');
        expect(remaining).toContain('+$54,600.00');
        expect(remaining.match(/\$[\d,]+\.\d{2}/g)).toEqual([
            '$54,600.00',
            '$4,550.00',
            '$2,100.00',
            '$1,050.00',
        ]);
        expect(remaining).not.toContain('<button');
    },
);

it('keeps household balances visible with no matching spending and highlights a deficit', () => {
    const totals = {
        ...balanceTotals,
        remaining: {
            annually: -52000,
            monthly: -4333,
            fortnightly: -2000,
            weekly: -1000,
        },
    };

    const html = renderToStaticMarkup(
        <ItemTables
            items={[]}
            groupBy="none"
            balance={planBalance([], totals)}
            period="weekly"
            onEdit={() => {}}
            onHistory={() => {}}
        />,
    );
    const remaining = html.match(/<tr\b[\s\S]*?<\/tr>/g)?.at(-1) ?? '';

    expect(html).toContain('Total income');
    expect(html).toContain('$104,000.00');
    expect(html).toContain('Mortgage');
    expect(html).toContain('$0.00');
    expect(html).not.toContain('-$0.00');
    expect(remaining).toContain('Remaining');
    expect(remaining).toContain('-$520.00');
    expect(remaining).toContain('text-destructive');
});

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

it.each([
    ['bill', 'annually', 'Insurance', 2],
    ['bill', 'monthly', 'Insurance', 0],
    ['income', 'annually', 'Salary', 0],
    ['bill', 'annually', 'Mortgage', 0],
] as const)(
    'identifies annual bills in the calendar and list (%s, %s, %s)',
    (kind, cadence, category, labelCount) => {
        const html = renderToStaticMarkup(
            <BillCalendar
                month="2026-10"
                today="2026-10-01"
                onEdit={() => {}}
                events={[
                    {
                        id: 1,
                        name: 'Scheduled payment',
                        category,
                        kind,
                        cadence,
                        date: '2026-10-03',
                        amount_cents: 150000,
                        is_variable: false,
                        account: null,
                    },
                ]}
            />,
        );

        expect(html.match(/Annual bill/g) ?? []).toHaveLength(labelCount);
    },
);
