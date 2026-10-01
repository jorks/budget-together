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
        household: { id: 1, name: 'James & Sasha', preferred_frequency: null },
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
            income: { ...amounts },
            bill: { ...amounts },
            spending: { ...amounts },
            saving: { ...amounts },
            outgoings: { ...amounts },
            remaining: { ...amounts },
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

it.each([
    ['weekly', ['$100.00', '$100.00', '$50.00', '$25.00']],
    ['fortnightly', ['$200.00', '$200.00', '$100.00', '$50.00']],
    ['monthly', ['$433.33', '$433.33', '$216.67', '$108.33']],
    ['annually', ['$5,200.00', '$5,200.00', '$2,600.00', '$1,300.00']],
] as const)(
    'separates mortgage from other known bills in the overview per %s',
    (period, expected) => {
        vi.mocked(useBudgetPeriod).mockReturnValue({
            preferredPeriod: period,
            period,
        });
        const props = budgetProps('overview');
        props.totals.income = {
            annually: 2080000,
            monthly: 173333,
            fortnightly: 80000,
            weekly: 40000,
        };
        props.totals.bill = {
            annually: 1040000,
            monthly: 86667,
            fortnightly: 40000,
            weekly: 20000,
        };
        props.totals.spending = {
            annually: 260000,
            monthly: 21667,
            fortnightly: 10000,
            weekly: 5000,
        };
        props.totals.saving = {
            annually: 130000,
            monthly: 10833,
            fortnightly: 5000,
            weekly: 2500,
        };
        const mortgage = {
            id: 1,
            kind: 'bill',
            is_active: true,
            category: ' Mortgage ',
            has_sinking_fund: false,
            equivalents: {
                annually: 520000,
                monthly: 43333,
                fortnightly: 20000,
                weekly: 10000,
            },
        } as BudgetItem;
        props.items = [mortgage, { ...mortgage, id: 2, is_active: false }];

        const html = renderToStaticMarkup(<Budget {...props} />);
        const breakdown = html
            .split('Where the plan goes')[1]
            .split('</section>')[0];

        expect(breakdown.indexOf('Mortgage')).toBeLessThan(
            breakdown.indexOf('Known bills'),
        );
        expect(breakdown.match(/\$[\d,]+\.\d{2}/g)).toEqual([...expected]);
        expect(breakdown).toContain(
            `Per ${{ weekly: 'week', fortnightly: 'fortnight', monthly: 'month', annually: 'year' }[period]}`,
        );
        expect(breakdown).toContain('full bar = 100% of take-home income');
        expect(breakdown.match(/aria-valuetext="([^"]+)"/g)).toEqual([
            'aria-valuetext="25.0% of take-home income"',
            'aria-valuetext="25.0% of take-home income"',
            'aria-valuetext="12.5% of take-home income"',
            period === 'monthly'
                ? 'aria-valuetext="6.2% of take-home income"'
                : 'aria-valuetext="6.3% of take-home income"',
        ]);
    },
);

it('keeps all known bills in their row when the household has no mortgage', () => {
    vi.mocked(useBudgetPeriod).mockReturnValue({
        preferredPeriod: 'annually',
        period: 'annually',
    });
    const props = budgetProps('overview');
    props.totals.income = {
        annually: 2080000,
        monthly: 173333,
        fortnightly: 80000,
        weekly: 40000,
    };
    props.totals.bill = {
        annually: 120000,
        monthly: 10000,
        fortnightly: 4615,
        weekly: 2308,
    };

    const html = renderToStaticMarkup(<Budget {...props} />);
    const breakdown = html
        .split('Where the plan goes')[1]
        .split('</section>')[0];

    expect(breakdown.match(/\$[\d,]+\.\d{2}/g)).toEqual([
        '$0.00',
        '$1,200.00',
        '$0.00',
        '$0.00',
    ]);
});

it('shows no income comparison instead of misleading percentages when take-home income is missing', () => {
    vi.mocked(useBudgetPeriod).mockReturnValue({
        preferredPeriod: 'annually',
        period: 'annually',
    });
    const props = budgetProps('overview');
    props.totals.bill.annually = 120000;

    const html = renderToStaticMarkup(<Budget {...props} />);
    const breakdown = html
        .split('Where the plan goes')[1]
        .split('</section>')[0];

    expect(breakdown).toContain('add take-home income to compare shares');
    expect(
        breakdown.match(/aria-valuetext="No take-home income set"/g),
    ).toHaveLength(4);
    expect(breakdown.match(/style="width:0%"/g)).toHaveLength(4);
});
