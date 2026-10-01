import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import DebtsPage from '../pages/debts/index';

vi.mock('@inertiajs/react', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@inertiajs/react')>()),
    Head: () => null,
}));

const debt = {
    id: 1,
    name: 'Car loan <script>bad()</script>',
    type: 'car_loan',
    lender: 'Example Finance',
    balance_cents: 120000,
    annual_rate: 0,
    repayment_cents: 10000,
    extra_cents: 10000,
    frequency: 'monthly',
    due_date: '2026-10-15',
    account_id: null,
    is_active: true,
    notes: null,
    projection: { periods: 6, interest_cents: 0, balances: [120000, 0] },
    baseline: { periods: 12, interest_cents: 0, balances: [120000, 0] },
};
it('shows a useful empty state before debts are entered', () => {
    const html = renderToStaticMarkup(
        <DebtsPage debts={[]} accounts={[]} types={{}} />,
    );
    expect(html).toContain('Add your first debt');
    expect(html).toContain('Add debt');
});
it('shows repayments payoff estimates accessible charts and escapes names', () => {
    const html = renderToStaticMarkup(
        <DebtsPage
            debts={[debt]}
            accounts={[]}
            types={{ car_loan: 'Car loan' }}
        />,
    );
    expect(html).toContain('$1,200.00');
    expect(html).toContain('$200.00');
    expect(html).toContain('6 months');
    expect(html).toContain('aria-label="Projected balance');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>bad()');
});
it('excludes paused and paid off debts from planned repayments and warns on insufficient repayments', () => {
    const html = renderToStaticMarkup(
        <DebtsPage
            debts={[
                {
                    ...debt,
                    is_active: false,
                    projection: {
                        periods: null,
                        interest_cents: null,
                        balances: [120000],
                    },
                },
                { ...debt, id: 2, balance_cents: 0 },
            ]}
            accounts={[]}
            types={{ car_loan: 'Car loan' }}
        />,
    );
    expect(html).toContain('Paused');
    expect(html).toContain('Paid off');
    expect(html).toContain('may not cover interest');
    expect(html).toContain(
        'Planned monthly repayments</p><p class="mt-2 text-2xl font-semibold">$0.00',
    );
});
