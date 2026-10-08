import { renderToStaticMarkup, renderToString } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { dateLabel } from '@/components/budget/shared';
import type { ItemDetailProps } from '@/types/budget';
import ItemDetail from '@/pages/budget/show';

vi.mock('@inertiajs/react', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@inertiajs/react')>()),
    Head: () => null,
}));

function detailProps(): ItemDetailProps {
    return {
        item: {
            id: 1,
            name: 'Electricity',
            kind: 'bill',
            category: 'Utilities',
            person: null,
            amount_cents: 34000,
            cadence: 'quarterly',
            payments_per_year: null,
            is_active: true,
            is_variable: true,
            due_date: '2026-10-14',
            pay_date: null,
            salary_sacrifice_cents: 0,
            workplace_giving_cents: 0,
            other_deductions_cents: 0,
            account_id: null,
            account: null,
            gross_annual_cents: null,
            bonus_annual_cents: null,
            use_tax_estimate: false,
            tax_year: 2026,
            include_bonus: false,
            include_medicare: true,
            notes: null,
            has_sinking_fund: false,
            saved_cents: 0,
            saving_start_date: null,
            contribution_cents: null,
            contribution_cadence: 'weekly',
            saving_account_id: null,
            equivalents: {
                weekly: 2615,
                fortnightly: 5231,
                monthly: 11333,
                annually: 136000,
            },
            payments: [],
            tax_estimate: null,
            sinking_fund: null,
        },
        today: '2026-10-03',
        revisions: [],
        billRecords: [],
        suggestion: null,
        accounts: [],
        categories: ['Utilities'],
        financialYear: 2026,
        taxBrackets: {},
    };
}

it('shows bill actions and a useful empty history', () => {
    const html = renderToStaticMarkup(<ItemDetail {...detailProps()} />);
    expect(html).toContain('Record actual bill');
    expect(html).toContain('Change estimate');
    expect(html).toContain('Your history starts here');
    expect(html).toContain('href="/bills"');
});

it('keeps scheduled prices separate from the current plan', () => {
    const props = detailProps();
    props.revisions = [
        {
            id: 1,
            effective_from: '2026-11-01',
            amount_cents: 40000,
            cadence: 'quarterly',
            payments_per_year: null,
            notes: 'Provider change',
            created_at: '2026-10-02T23:00:00Z',
            updated_at: '2026-10-02T23:00:00Z',
        },
    ];
    const html = renderToStaticMarkup(<ItemDetail {...props} />);
    expect(html).toContain('Current estimate');
    expect(html).toContain('$340.00');
    expect(html).toContain('Scheduled changes');
    expect(html).toContain('$400.00');
    expect(html).toContain('Effective 1 Nov 2026');
    expect(html).toContain('Entered 3 Oct 2026');
    expect(html).toContain('Correct entry');
});

it('shows historical comparisons and distinguishes an unpaid bill from a payment', () => {
    const props = detailProps();
    props.billRecords = [
        {
            id: 2,
            entry_key: 'bill-2',
            amount_cents: 28600,
            billed_on: '2026-09-30',
            period_start: '2026-07-01',
            period_end: '2026-09-30',
            due_on: '2026-10-14',
            paid_on: null,
            expected_amount_cents: 30000,
            expected_cadence: 'quarterly',
            notes: '<script>private</script>',
            created_at: '2026-10-02T23:00:00Z',
            updated_at: '2026-10-02T23:00:00Z',
        },
    ];
    const html = renderToStaticMarkup(<ItemDetail {...props} />);
    expect(html).toContain('Payment not recorded');
    expect(html).toContain('Plan for this bill date: $300.00');
    expect(html).toContain('Covers 1 July 2026');
    expect(html).toContain('Correct bill');
    expect(html).toContain('&lt;script&gt;private&lt;/script&gt;');
    expect(html).not.toContain('<script>private</script>');
});

it('explains limited estimate coverage and requires review before applying', () => {
    const props = detailProps();
    props.suggestion = {
        amount_cents: 36500,
        annual_cents: 146000,
        bill_count: 2,
        covered_days: 180,
        from: '2026-01-01',
        until: '2026-06-29',
    };
    const html = renderToStaticMarkup(<ItemDetail {...props} />);
    expect(html).toContain('Review and apply estimate');
    expect(html).toContain('Less than a full year of coverage');
    expect(html).toContain('Your current estimate is');
    expect(html).toContain('$365.00');
});

it('does not offer bill recording for income items', () => {
    const props = detailProps();
    props.item.kind = 'income';
    props.item.is_variable = false;
    const html = renderToStaticMarkup(<ItemDetail {...props} />);
    expect(html).not.toContain('Record actual bill');
    expect(html).not.toContain('Change price');
    expect(html).toContain('href="/income"');
    expect(html).toContain('Edit settings');
});

it('formats dates and entry timestamps using Melbourne calendar dates', () => {
    expect(dateLabel('2026-09-30')).toBe('30 Sept 2026');
    expect(dateLabel('2026-10-02T23:00:00Z')).toBe('3 Oct 2026');
});

it('charts planned monthly equivalents and marks future changes', () => {
    const props = detailProps();
    const recorded = {
        created_at: '2026-10-02T23:00:00Z',
        updated_at: '2026-10-02T23:00:00Z',
        notes: null,
    };
    props.revisions = [
        {
            ...recorded,
            id: 1,
            effective_from: '2026-09-01',
            amount_cents: 12000,
            cadence: 'quarterly',
            payments_per_year: null,
        },
        {
            ...recorded,
            id: 2,
            effective_from: '2026-11-01',
            amount_cents: 5000,
            cadence: 'monthly',
            payments_per_year: null,
        },
    ];
    const html = renderToString(<ItemDetail {...props} />);
    expect(html).toContain('aria-label="Planned cost over time"');
    expect(html.match(/<title>.*?<\/title>/g)?.length).toBeGreaterThan(2);
    for (const title of html.match(/<title>.*?<\/title>/g) ?? []) {
        expect(title).not.toContain('<!-- -->');
    }
    expect(html).toContain('$40.00 monthly equivalent');
    expect(html).toContain('$50.00 monthly equivalent (scheduled)');
});
