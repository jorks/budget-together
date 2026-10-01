import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { useBudgetPeriod } from '@/hooks/use-budget-period';
import type { BudgetItem, BudgetProps } from '@/types/budget';
import Budget from '../../pages/budget/index';

vi.mock('@inertiajs/react', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@inertiajs/react')>()),
    Head: () => null,
}));
vi.mock('@/hooks/use-budget-period', () => ({
    useBudgetPeriod: vi.fn(),
}));

function budgetProps(view: string): BudgetProps {
    const amounts = { weekly: 0, fortnightly: 0, monthly: 0, annually: 0 };
    return {
        view,
        household: { id: 1, name: 'James & Sasha' },
        items: [],
        incomeTaxEstimates: [],
        categories: [],
        categoryTotals: [],
        accounts: [],
        banks: [],
        members: [],
        events: [],
        invitations: [],
        invitation_url: null,
        financialYear: 2026,
        taxBrackets: {},
        today: '2026-10-01',
        month: '2026-10',
        totals: {
            income: amounts,
            bill: amounts,
            spending: amounts,
            saving: amounts,
            outgoings: amounts,
            remaining: amounts,
        },
    };
}

it.each([
    ['plan', ['none', 'category']],
    ['bills', ['none', 'category', 'frequency']],
] as const)(
    'offers the appropriate grouping choices on %s',
    (view, choices) => {
        vi.mocked(useBudgetPeriod).mockReturnValue({
            preferredPeriod: 'fortnightly',
            period: 'fortnightly',
        });

        const html = renderToStaticMarkup(<Budget {...budgetProps(view)} />);
        const select =
            html.match(
                /<select[^>]*aria-label="Group budget items"[^>]*>[\s\S]*?<\/select>/,
            )?.[0] ?? '';
        const values = [...select.matchAll(/<option value="([^"]+)"/g)].map(
            (match) => match[1],
        );

        expect(values).toEqual(choices);
    },
);

it.each([
    ['overview', null],
    ['bills', 'Add bill'],
    ['income', 'Add income'],
    ['plan', 'Add allocation'],
    ['funds', 'Add bill'],
] as const)('shows the appropriate header action on %s', (view, label) => {
    vi.mocked(useBudgetPeriod).mockReturnValue({
        preferredPeriod: 'fortnightly',
        period: 'fortnightly',
    });
    const props = budgetProps(view);

    const html = renderToStaticMarkup(<Budget {...props} />);
    const header = html.match(/<header\b[^>]*>[\s\S]*?<\/header>/)?.[0];

    expect(header).toBeDefined();
    expect(html).not.toContain('Set preferred frequency');
    if (view === 'income') {
        expect(html).toContain('Your annual pre-tax income and take-home pay');
        expect(html).not.toContain('Search budget items');
        expect(html).not.toContain('Filter category');
        expect(html).not.toContain('Group budget items');
        expect(html).not.toContain('Show paused');
    } else if (view === 'bills' || view === 'plan') {
        expect(html).toContain('Search budget items');
        expect(html).toContain('Filter category');
        expect(html).toContain('Group budget items');
        expect(html).toContain('Show paused');
    }
    if (label) {
        expect(header).toContain(label);
        expect(header).toContain('<button');
    } else {
        expect(header).not.toContain('<button');
        expect(html).toContain('Where the plan goes');
    }
});

it.each(['overview', 'income', 'bills', 'plan'])(
    'offers frequency setup on %s until a preference is set',
    (view) => {
        vi.mocked(useBudgetPeriod).mockReturnValue({
            preferredPeriod: null,
            period: 'annually',
        });

        const html = renderToStaticMarkup(<Budget {...budgetProps(view)} />);

        expect(html).toContain('Set preferred frequency');
    },
);

it('lists bonuses below salaries and marks an excluded bonus', () => {
    vi.mocked(useBudgetPeriod).mockReturnValue({
        preferredPeriod: 'fortnightly',
        period: 'fortnightly',
    });
    const props = budgetProps('income');
    const item = {
        kind: 'income',
        is_active: true,
        is_variable: false,
        has_sinking_fund: false,
        equivalents: { weekly: 0, fortnightly: 0, monthly: 0, annually: 0 },
        tax_estimate: null,
        gross_annual_cents: null,
        bonus_annual_cents: null,
    } as BudgetItem;
    props.items = [
        {
            ...item,
            id: 1,
            name: 'James bonus',
            category: 'Bonus',
            bonus_annual_cents: 1000000,
            include_bonus: false,
        },
        {
            ...item,
            id: 2,
            name: 'James salary',
            category: 'Salary',
            gross_annual_cents: 15500000,
        },
        {
            ...item,
            id: 3,
            name: 'Sasha salary',
            category: 'Salary',
            gross_annual_cents: 11000000,
        },
    ];

    const html = renderToStaticMarkup(<Budget {...props} />);

    expect(html.indexOf('James salary')).toBeLessThan(
        html.indexOf('Sasha salary'),
    );
    expect(html.indexOf('Sasha salary')).toBeLessThan(
        html.indexOf('James bonus'),
    );
    expect(html).toContain('$110,000.00');
    expect(html).toContain('Excluded from budget');
});

it.each(['bills', 'plan'])(
    'sorts ungrouped categories by highest total cost on %s',
    (view) => {
        vi.mocked(useBudgetPeriod).mockReturnValue({
            preferredPeriod: 'fortnightly',
            period: 'fortnightly',
        });
        const props = budgetProps(view);
        const item = {
            kind: view === 'bills' ? 'bill' : 'spending',
            is_active: true,
            has_sinking_fund: false,
            equivalents: { weekly: 0, fortnightly: 0, monthly: 0, annually: 0 },
        } as BudgetItem;
        props.items = [
            { ...item, id: 1, name: 'Electricity', category: 'Utilities' },
            { ...item, id: 2, name: 'Unassigned expense', category: null },
            {
                ...item,
                id: 3,
                name: 'Rent',
                category: 'Housing',
                equivalents: {
                    annually: 2400000,
                    monthly: 200000,
                    fortnightly: 92308,
                    weekly: 46154,
                },
            },
            { ...item, id: 4, name: 'Water', category: 'Utilities' },
            {
                ...item,
                id: 5,
                name: 'Groceries',
                category: 'Food',
                equivalents: {
                    annually: 520000,
                    monthly: 43333,
                    fortnightly: 20000,
                    weekly: 10000,
                },
            },
        ];

        const html = renderToStaticMarkup(<Budget {...props} />);
        const rows = html.match(/<tbody>[\s\S]*?<\/tbody>/)?.[0] ?? '';

        expect(
            rows
                .match(/font-semibold hover:underline">([^<]+)/g)
                ?.map((match) => match.split('>')[1]),
        ).toEqual([
            'Rent',
            'Groceries',
            'Unassigned expense',
            'Electricity',
            'Water',
        ]);
        expect(props.items.map((item) => item.id)).toEqual([1, 2, 3, 4, 5]);
        expect(html).not.toContain('Subtotal');
        expect(html).toContain('Total');
    },
);
