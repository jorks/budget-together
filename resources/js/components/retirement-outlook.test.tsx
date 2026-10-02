import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { RetirementOutlook } from '@/components/retirement-outlook';
import { projectMortgage } from '@/lib/mortgage';
import type { RetirementMember } from '@/types/retirement';

vi.mock('@inertiajs/react', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@inertiajs/react')>()),
    Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));
const member: RetirementMember = {
    id: 1,
    name: 'James <script>bad()</script>',
    date_of_birth: '1986-10-02',
    age: 40,
    retirement_age: 65,
    retirement_date: '2051-10-02',
    years_remaining: 25,
    super_funds_count: 2,
    super_projection: [
        { year: 0, balance_cents: 10000000, contributions_cents: 10000000 },
        { year: 25, balance_cents: 50000000, contributions_cents: 30000000 },
    ],
};
const mortgage = projectMortgage({
    balance_cents: 1200000,
    annual_rate: 0,
    term_years: 1,
    frequency: 'monthly',
    offset_cents: 0,
    extra_cents: 0,
})!.planned;

it('defaults to combined household super and mortgage ending at the last retirement', () => {
    const html = renderToStaticMarkup(
        <RetirementOutlook members={[member]} mortgageProjection={mortgage} />,
    );
    expect(html).toContain('Combined super at last retirement');
    expect(html).toContain('$500,000.00');
    expect(html).toContain('Mortgage at last retirement');
    expect(html).toContain('$0.00');
    expect(html).toContain('Year 25');
    expect(html).toContain('2 funds');
    expect(html).toContain(
        'aria-label="Combined household super and mortgage through retirement',
    );
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>bad()</script>');
});
it('prompts for missing birthdays rather than inventing a retirement timeline', () => {
    const html = renderToStaticMarkup(
        <RetirementOutlook
            members={[
                {
                    ...member,
                    date_of_birth: null,
                    age: null,
                    years_remaining: null,
                },
            ]}
            mortgageProjection={mortgage}
        />,
    );
    expect(html).toContain('Add a date of birth');
    expect(html).not.toContain('Year 25');
});
it('shows starting balances instead of future contributions when retirement age has been reached', () => {
    const html = renderToStaticMarkup(
        <RetirementOutlook
            members={[
                {
                    ...member,
                    age: 70,
                    years_remaining: 0,
                    super_projection: [member.super_projection[0]],
                },
            ]}
            mortgageProjection={mortgage}
        />,
    );
    expect(html).toContain('already been reached');
    expect(html).toContain('$100,000.00');
    expect(html).toContain('$12,000.00');
    expect(html).not.toContain('NaN');
});
it('explains missing funds and mortgages and supports longer retirement horizons', () => {
    const html = renderToStaticMarkup(
        <RetirementOutlook
            members={[
                {
                    ...member,
                    years_remaining: 45,
                    retirement_age: 85,
                    super_projection: [],
                    super_funds_count: 0,
                },
            ]}
            mortgageProjection={null}
        />,
    );
    expect(html).toContain('No linked funds');
    expect(html).toContain('No mortgage projection');
    expect(html).toContain('Link funds');
    expect(html).not.toContain('Infinity');
});

it('sums both members by default and marks their separate retirement dates', () => {
    const partner = {
        ...member,
        id: 2,
        name: 'Sasha',
        years_remaining: 30,
        retirement_date: '2056-10-02',
        super_funds_count: 1,
        super_projection: [
            { year: 0, balance_cents: 20000000, contributions_cents: 20000000 },
            {
                year: 30,
                balance_cents: 60000000,
                contributions_cents: 40000000,
            },
        ],
    };
    const html = renderToStaticMarkup(
        <RetirementOutlook
            members={[member, partner]}
            mortgageProjection={mortgage}
        />,
    );
    expect(html).toContain(
        '<option value="household" selected="">Combined household</option>',
    );
    expect(html).toContain('$1,100,000.00');
    expect(html).toContain('3 funds');
    expect(html).toContain('Sasha retires');
    expect(html).toContain('Year 30');
    expect(html).toContain('held steady after their own retirement');
});
it('clearly labels partial household projections when a member has no birthday', () => {
    const html = renderToStaticMarkup(
        <RetirementOutlook
            members={[
                member,
                {
                    ...member,
                    id: 2,
                    name: 'Sasha',
                    date_of_birth: null,
                    years_remaining: null,
                    super_projection: [],
                },
            ]}
            mortgageProjection={mortgage}
        />,
    );
    expect(html).toContain('Partial household projection');
    expect(html).toContain('to include their super');
    expect(html).toContain('$500,000.00');
});
