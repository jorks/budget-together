import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import OutlookPage from './index';
import type { OutlookProps } from './index';

vi.mock('@inertiajs/react', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@inertiajs/react')>()),
    Head: () => null,
    Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));
const props: OutlookProps = {
    retirementMembers: [
        {
            id: 1,
            name: 'James',
            date_of_birth: '1986-10-02',
            age: 40,
            retirement_age: 65,
            retirement_date: '2051-10-02',
            years_remaining: 25,
            super_funds_count: 1,
            super_projection: [
                {
                    year: 0,
                    balance_cents: 10000000,
                    contributions_cents: 10000000,
                },
                {
                    year: 25,
                    balance_cents: 50000000,
                    contributions_cents: 30000000,
                },
            ],
        },
    ],
    mortgage: {
        id: 1,
        name: 'Home loan',
        balance_cents: 12000000,
        annual_rate: 0,
        term_years: 10,
        frequency: 'monthly',
        offset_cents: 0,
        extra_cents: 0,
    },
    debts: [
        { id: 1, name: 'Car loan', balance_cents: 120000, payoff_years: 1 },
        {
            id: 2,
            name: 'Credit card',
            balance_cents: 300000,
            payoff_years: null,
        },
    ],
    features: { mortgage_enabled: true, debts_enabled: true },
};
it('brings retirement and debt milestones together and links back to the budget', () => {
    const html = renderToStaticMarkup(<OutlookPage {...props} />);
    expect(html).toContain('Super and mortgage at retirement');
    expect(html).toContain('$500,000.00');
    expect(html).toContain('Budget overview');
    expect(html).toContain('About 10 years to repay');
    expect(html).toContain('About 1 year to repay');
    expect(html).toContain(
        'Repayments do not clear the balance within 100 years',
    );
});
it('shows useful setup prompts and omits links to disabled topics', () => {
    const html = renderToStaticMarkup(
        <OutlookPage
            {...props}
            retirementMembers={[]}
            mortgage={null}
            debts={[]}
            features={{ mortgage_enabled: false, debts_enabled: false }}
        />,
    );
    expect(html).toContain('No mortgage or active debts to project.');
    expect(html).toContain('Household');
    expect(html).not.toContain('Debts &amp; financing');
});
