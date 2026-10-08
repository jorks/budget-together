import { renderToStaticMarkup, renderToString } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import SuperannuationPage from '@/pages/superannuation/index';
import type { SuperFund } from '@/types/superannuation';

vi.mock('@inertiajs/react', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@inertiajs/react')>()),
    Head: () => null,
    Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));
const fund: SuperFund = {
    id: 1,
    name: 'Example <script>bad()</script>',
    person: 'James',
    member_number: null,
    investment_option: 'Balanced',
    income_id: null,
    income: null,
    employer_rate: 12,
    salary_sacrifice_cents: 0,
    annual_fee_cents: 7800,
    fee_rate: 0.1,
    annual_insurance_cents: 24000,
    return_rate: 6,
    notes: 'Statement <script>bad()</script>',
    balances: [
        {
            id: 1,
            recorded_on: '2025-10-01',
            balance_cents: 11000000,
            notes: null,
        },
        {
            id: 2,
            recorded_on: '2026-10-01',
            balance_cents: 12500000,
            notes: null,
        },
    ],
    current_balance_cents: 12500000,
    balance_date: '2026-10-01',
    needs_update: false,
    contributions: {
        employer_cents: 1200000,
        sacrifice_cents: 300000,
        tax_cents: 225000,
        net_cents: 1275000,
    },
    projection: Array.from({ length: 31 }, (_, year) => ({
        year,
        balance_cents: 12500000 + year * 2000000,
        contributions_cents: 12500000 + year * 1275000,
    })),
};
const render = (funds: SuperFund[]) =>
    renderToStaticMarkup(
        <SuperannuationPage
            funds={funds}
            incomes={[]}
            people={['James', 'Sasha']}
            today="2026-10-02"
        />,
    );

it('renders chart tooltip titles as single text nodes for hydration', () => {
    const html = renderToString(
        <SuperannuationPage
            funds={[fund]}
            incomes={[]}
            people={['James']}
            today="2026-10-02"
        />,
    );
    const titles = html.match(/<title>.*?<\/title>/g) ?? [];
    expect(titles.length).toBeGreaterThan(2);
    for (const title of titles) {
        expect(title).not.toContain('<!-- -->');
    }
});

it('shows an actionable empty state', () => {
    const html = render([]);
    expect(html).toContain('Add your first super fund');
    expect(html).toContain('Add super fund');
    expect(html).not.toContain('Projected in 20 years');
});
it('shows actual history projections assumptions and escaped user details', () => {
    const html = render([fund]);
    expect(html).not.toContain('Super and mortgage at retirement');
    expect(html).toContain('$125,000.00');
    expect(html).toContain('$525,000.00');
    expect(html).toContain('$12,750.00');
    expect(html).toContain('aria-label="Recorded balance history');
    expect(html).toContain('aria-label="Projected super balance');
    expect(html).toContain('without inflation adjustment');
    expect(html).toContain('&lt;script&gt;bad()&lt;/script&gt;');
    expect(html).not.toContain('<script>bad()</script>');
});
it('prompts consolidation only for multiple funds belonging to the same person', () => {
    expect(render([fund, { ...fund, id: 2, person: 'Sasha' }])).not.toContain(
        'Consider whether consolidation',
    );
    const html = render([fund, { ...fund, id: 2, person: ' james ' }]);
    expect(html).toContain('James has 2 super funds');
    expect(html).toContain('Compare insurance, benefits');
});
it('prompts stale balances and explains the single balance history state', () => {
    const html = render([
        { ...fund, balances: [fund.balances[0]], needs_update: true },
    ]);
    expect(html).toContain('Time for a balance update');
    expect(html).toContain('Record another balance');
    expect(html).not.toContain('aria-label="Recorded balance history');
});
it('keeps zero balances valid in chart output', () => {
    const html = render([
        {
            ...fund,
            current_balance_cents: 0,
            projection: fund.projection.map((point) => ({
                ...point,
                balance_cents: 0,
                contributions_cents: 0,
            })),
        },
    ]);
    expect(html).toContain('$0.00');
    expect(html).not.toContain('NaN');
    expect(html).not.toContain('Infinity');
});

it('groups funds by their linked household member even when statement person names differ', () => {
    const html = render([
        { ...fund, member_id: 1 },
        { ...fund, id: 2, person: 'James old employer', member_id: 1 },
    ]);
    expect(html).toContain('James has 2 super funds');
});
