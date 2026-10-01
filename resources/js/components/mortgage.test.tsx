import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import MortgagePage from '../pages/mortgage/index';
import type { Mortgage } from '@/lib/mortgage';

vi.mock('@inertiajs/react', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@inertiajs/react')>()),
    Head: () => null,
}));

const mortgage: Mortgage = {
    id: 1,
    name: 'Our home loan',
    balance_cents: 65000000,
    annual_rate: 6,
    term_years: 30,
    frequency: 'monthly',
    offset_cents: 2000000,
    extra_cents: 30000,
};

it('shows an empty planner until loan details are entered', () => {
    const html = renderToStaticMarkup(<MortgagePage mortgage={null} />);
    expect(html).toContain('Start with your home loan');
    expect(html).not.toContain('Loan balance over time');
});

it('loads saved dollar amounts and shows accessible comparisons and yearly values', () => {
    const html = renderToStaticMarkup(<MortgagePage mortgage={mortgage} />);
    expect(html).toContain('value="650000.00"');
    expect(html).toContain('value="20000.00"');
    expect(html).toContain('value="300.00"');
    expect(html).toContain('$3,897.08');
    expect(html).toContain('$214,602.11');
    expect(html).toContain('6 years 4 months sooner');
    expect(html).toContain('aria-label="Loan balance over time');
    expect(html).toContain(
        'Projected repayments and remaining balance by year',
    );
});

it('supports lender rates with three decimal places and escapes loan names', () => {
    const html = renderToStaticMarkup(
        <MortgagePage
            mortgage={{
                ...mortgage,
                annual_rate: 6.125,
                name: '<script>alert(1)</script>',
            }}
        />,
    );
    expect(html).toContain('step="0.001"');
    expect(html).toContain('value="6.125"');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>alert(1)</script>');
});

it('loads the saved repayment schedule and explains its effect on the household budget', () => {
    const html = renderToStaticMarkup(
        <MortgagePage
            mortgage={{ ...mortgage, due_date: '2026-10-15', account_id: 7 }}
            accounts={[{ id: 7, name: 'Bills account' }]}
        />,
    );
    expect(html).toContain('value="2026-10-15"');
    expect(html).toContain(
        '<option value="7" selected="">Bills account</option>',
    );
    expect(html).toContain('Saving updates the locked mortgage repayment');
});
