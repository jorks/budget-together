import { renderToStaticMarkup, renderToString } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import {
    FinancialHistory,
    financialValues,
} from '@/components/financial-history';
import DebtDetail from '@/pages/debts/show';
import { DebtEditor } from '@/components/debt-editor';
import type { Debt } from '@/components/debt-editor';

vi.mock('@inertiajs/react', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@inertiajs/react')>()),
    Head: () => null,
}));
const debt: Debt = {
    id: 3,
    name: 'Family car loan',
    type: 'car_loan',
    lender: 'Example lender',
    balance_cents: 1500000,
    annual_rate: 6.125,
    repayment_cents: 49500,
    extra_cents: 5000,
    frequency: 'monthly',
    due_date: '2026-10-15',
    account_id: null,
    is_active: true,
    notes: null,
    projection: { periods: 35, interest_cents: 180000, balances: [1500000, 0] },
    baseline: { periods: 40, interest_cents: 200000, balances: [1500000, 0] },
};
it('renders dated financial chart tooltips as single text nodes for hydration', () => {
    const html = renderToString(
        <FinancialHistory
            type="debt"
            id={debt.id}
            values={financialValues(debt, 'debt')}
            today="2026-10-01"
            changes={['2026-09-01', '2026-10-01'].map((date, index) => ({
                id: index + 1,
                effective_from: date,
                event_type: 'balance',
                values: { balance_cents: 1500000 - index * 50000 },
                payment_cents: null,
                notes: null,
            }))}
        />,
    );
    const titles = html.match(/<title>.*?<\/title>/g) ?? [];
    expect(titles).toHaveLength(2);
    for (const title of titles) {
        expect(title).not.toContain('<!-- -->');
    }
});
it('shows a scheduled update separately from current loan values and escapes notes', () => {
    const html = renderToStaticMarkup(
        <FinancialHistory
            type="debt"
            id={debt.id}
            values={financialValues(debt, 'debt')}
            today="2026-10-01"
            changes={[
                {
                    id: 1,
                    effective_from: '2026-11-01',
                    event_type: 'rate_change',
                    values: { annual_rate: 5.9, balance_cents: 1400000 },
                    payment_cents: null,
                    notes: '<script>alert(1)</script>',
                },
            ]}
        />,
    );
    expect(html).toContain('Scheduled');
    expect(html).toContain('Effective 1 Nov 2026');
    expect(html).toContain('5.9%');
    expect(html).toContain('Correct financial update from 2026-11-01');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>alert(1)</script>');
});
it('shows extra payments with the resulting balance and keeps the unknown baseline protected', () => {
    const html = renderToStaticMarkup(
        <FinancialHistory
            type="debt"
            id={debt.id}
            values={financialValues(debt, 'debt')}
            today="2026-10-01"
            changes={[
                {
                    id: 1,
                    effective_from: null,
                    event_type: 'baseline',
                    values: { balance_cents: 1500000 },
                    payment_cents: null,
                    notes: null,
                },
                {
                    id: 2,
                    effective_from: '2026-09-01',
                    event_type: 'extra_payment',
                    values: { balance_cents: 1400000 },
                    payment_cents: 100000,
                    notes: 'Bonus payment',
                },
            ]}
        />,
    );
    expect(html).toContain('Extra payment: $1,000.00');
    expect(html).toContain('$14,000.00');
    expect(html).toContain('Earlier date unknown');
    expect(html).not.toContain('Correct financial update from null');
});
it('debt details have a dedicated history page and a repayment estimate', () => {
    const html = renderToStaticMarkup(
        <DebtDetail
            debt={debt}
            accounts={[]}
            types={{ car_loan: 'Car loan' }}
            changes={[]}
            today="2026-10-01"
        />,
    );
    expect(html).toContain('href="/debts"');
    expect(html).toContain('Record financial update');
    expect(html).toContain('35 repayments remaining');
    expect(html).toContain('6.125%');
});
it('debt detail editing is an inline form focused on metadata', () => {
    const html = renderToStaticMarkup(
        <DebtEditor
            debt={debt}
            accounts={[]}
            types={{ car_loan: 'Car loan' }}
            onClose={() => {}}
        />,
    );
    expect(html).toContain('Edit debt details');
    expect(html).toContain('value="Family car loan"');
    expect(html).not.toContain('Current balance ($)');
    expect(html).not.toContain('role="dialog"');
});
it('spending financial inputs stay focused on amount and frequency', () => {
    expect(
        financialValues(
            {
                kind: 'spending',
                amount_cents: 50000,
                cadence: 'weekly',
                payments_per_year: null,
                gross_annual_cents: 10000000,
                name: 'Groceries',
            },
            'item',
        ),
    ).toEqual({
        amount_cents: 50000,
        cadence: 'weekly',
        payments_per_year: null,
    });
});
it('linked funds direct salary sacrifice changes to wage history', () => {
    const values = financialValues(
        {
            income_id: 5,
            salary_sacrifice_cents: 300000,
            employer_rate: 12,
            annual_fee_cents: 7800,
            fee_rate: 0.1,
            annual_insurance_cents: 24000,
            return_rate: 6,
        },
        'super',
    );
    expect(values).not.toHaveProperty('salary_sacrifice_cents');
    expect(values).toHaveProperty('annual_fee_cents', 7800);
});

it('financial updates use an effective date and permit lender rates with three decimals', async () => {
    const { FinancialEditor } = await import('@/components/financial-history');
    const html = renderToStaticMarkup(
        <FinancialEditor
            type="debt"
            id={debt.id}
            values={financialValues(debt, 'debt')}
            today="2026-10-01"
            onClose={() => {}}
        />,
    );
    expect(html).toContain('Effective from');
    expect(html).toContain('value="2026-10-01"');
    expect(html).toContain('step="0.001"');
    expect(html).toContain('value="6.125"');
    expect(html).toContain('Refinance');
    expect(html).toContain('Extra payment');
    expect(html).not.toContain('role="dialog"');
});

it('super details open balance recording inline and provide wage history navigation', async () => {
    const { default: SuperDetail } =
        await import('@/pages/superannuation/show');
    const fund = {
        id: 1,
        name: 'Example Super',
        person: 'James',
        member_number: null,
        investment_option: 'Balanced',
        income_id: 5,
        income: null,
        employer_rate: 12,
        salary_sacrifice_cents: 300000,
        annual_fee_cents: 7800,
        fee_rate: 0.1,
        annual_insurance_cents: 24000,
        return_rate: 6,
        notes: null,
        balances: [
            {
                id: 1,
                recorded_on: '2026-09-01',
                balance_cents: 12000000,
                notes: null,
            },
        ],
        current_balance_cents: 12000000,
        balance_date: '2026-09-01',
        needs_update: false,
        contributions: {
            employer_cents: 1200000,
            sacrifice_cents: 300000,
            tax_cents: 225000,
            net_cents: 1275000,
        },
        projection: [],
    };
    const html = renderToStaticMarkup(
        <SuperDetail
            fund={fund}
            funds={[fund]}
            incomes={[]}
            people={['James']}
            today="2026-10-01"
            changes={[]}
            recordingBalance
        />,
    );
    expect(html).toContain('Balance as at');
    expect(html).toContain('Save balance');
    expect(html).toContain('href="/budget-items/5"');
    expect(html).toContain('View wage &amp; salary history');
    expect(html).not.toContain('role="dialog"');
});
