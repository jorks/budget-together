import { Head, useForm } from '@inertiajs/react';
import { House, TrendingDown } from 'lucide-react';
import {
    Field,
    Panel,
    money,
    dollars,
    cents,
} from '@/components/budget/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import InputError from '@/components/input-error';
import { projectMortgage } from '@/lib/mortgage';
import type { Mortgage, Projection } from '@/lib/mortgage';
import { index, update } from '@/routes/mortgage';

const frequencies = {
    weekly: 'Weekly',
    fortnightly: 'Fortnightly',
    monthly: 'Monthly',
};
const duration = (years: number) => {
    const months = Math.round(years * 12);
    return `${Math.floor(months / 12)} years${months % 12 ? ` ${months % 12} months` : ''}`;
};

function BalanceChart({
    baseline,
    planned,
    balance,
    term,
}: {
    baseline: Projection;
    planned: Projection;
    balance: number;
    term: number;
}) {
    const path = (projection: Projection) =>
        projection.years
            .map(
                (point, i) =>
                    `${i ? 'L' : 'M'}${60 + (point.year / term) * 620},${230 - (point.balance / balance) * 200}`,
            )
            .join(' ');
    return (
        <svg
            viewBox="0 0 720 280"
            role="img"
            aria-label="Loan balance over time: standard repayments compared with your offset and extra repayments"
            className="w-full"
        >
            {[0, 0.5, 1].map((fraction) => (
                <g key={fraction}>
                    <line
                        x1="60"
                        x2="680"
                        y1={230 - fraction * 200}
                        y2={230 - fraction * 200}
                        className="stroke-border"
                    />
                    <text
                        x="52"
                        y={235 - fraction * 200}
                        textAnchor="end"
                        className="fill-muted-foreground text-[11px]"
                    >
                        ${Math.round((balance * fraction) / 100000)}k
                    </text>
                </g>
            ))}
            <path
                d={path(baseline)}
                fill="none"
                className="stroke-muted-foreground"
                strokeWidth="2"
                strokeDasharray="6 5"
            />
            <path
                d={path(planned)}
                fill="none"
                className="stroke-primary"
                strokeWidth="3"
            />
            {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
                <text
                    key={fraction}
                    x={60 + fraction * 620}
                    y="260"
                    textAnchor="middle"
                    className="fill-muted-foreground text-[11px]"
                >
                    Year {Math.round(term * fraction * 10) / 10}
                </text>
            ))}
        </svg>
    );
}

export default function MortgagePage({
    mortgage,
    accounts = [],
}: {
    mortgage: Mortgage | null;
    accounts?: { id: number; name: string }[];
}) {
    const form = useForm({
        name: mortgage?.name ?? 'Our home loan',
        due_date: mortgage?.due_date?.slice(0, 10) ?? '',
        account_id: mortgage?.account_id ? String(mortgage.account_id) : '',
        balance: dollars(mortgage?.balance_cents),
        annual_rate: mortgage ? String(mortgage.annual_rate) : '',
        term_years: mortgage ? String(mortgage.term_years) : '30',
        frequency: mortgage?.frequency ?? 'monthly',
        offset: dollars(mortgage?.offset_cents ?? 0),
        extra: dollars(mortgage?.extra_cents ?? 0),
    });
    const projection = projectMortgage({
        balance_cents: cents(form.data.balance) ?? 0,
        annual_rate: form.data.annual_rate.trim()
            ? Number(form.data.annual_rate)
            : NaN,
        term_years: Number(form.data.term_years),
        frequency: form.data.frequency,
        offset_cents: cents(form.data.offset) ?? NaN,
        extra_cents: cents(form.data.extra) ?? NaN,
    });
    const maxYearPayment = projection
        ? Math.max(
              ...projection.planned.years.map(
                  (year) => year.principal + year.interest,
              ),
          )
        : 1;
    const save = () => {
        form.transform((data) => ({
            name: data.name,
            due_date: data.due_date || null,
            account_id: data.account_id ? Number(data.account_id) : null,
            balance_cents: cents(data.balance),
            annual_rate: data.annual_rate,
            term_years: data.term_years,
            frequency: data.frequency,
            offset_cents: cents(data.offset),
            extra_cents: cents(data.extra),
        }));
        form.put(update.url(), { preserveScroll: true });
    };
    const errors = form.errors as Record<string, string | undefined>;
    return (
        <>
            <Head title="Mortgage" />
            <div className="flex flex-col gap-6 p-4 lg:p-8">
                <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-primary/10 p-3 text-primary">
                        <House className="size-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">
                            A clearer path to mortgage-free
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Your home loan, the long view, and the difference a
                            little extra can make.
                        </p>
                    </div>
                </div>
                <div className="grid items-start gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
                    <Panel>
                        <form
                            className="flex flex-col gap-4"
                            onSubmit={(event) => {
                                event.preventDefault();
                                save();
                            }}
                        >
                            <div>
                                <h2 className="font-semibold">
                                    Your loan details
                                </h2>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Saved for everyone in your household. Graphs
                                    update as you type.
                                </p>
                            </div>
                            <Field
                                label="Loan name"
                                value={form.data.name}
                                onChange={(value) =>
                                    form.setData('name', value)
                                }
                                error={errors.name}
                                required
                            />
                            <Field
                                label="Remaining loan balance ($)"
                                type="money"
                                value={form.data.balance}
                                onChange={(value) =>
                                    form.setData('balance', value)
                                }
                                error={errors.balance_cents}
                                required
                            />
                            <div className="grid gap-2">
                                <Label htmlFor="mortgage-rate">
                                    Interest rate (% per year)
                                </Label>
                                <Input
                                    id="mortgage-rate"
                                    type="number"
                                    min="0"
                                    max="30"
                                    step="0.001"
                                    value={form.data.annual_rate}
                                    onChange={(event) =>
                                        form.setData(
                                            'annual_rate',
                                            event.target.value,
                                        )
                                    }
                                    required
                                    aria-invalid={Boolean(errors.annual_rate)}
                                    aria-describedby={
                                        errors.annual_rate
                                            ? 'mortgage-rate-error'
                                            : undefined
                                    }
                                />
                                <InputError
                                    id="mortgage-rate-error"
                                    message={errors.annual_rate}
                                />
                            </div>
                            <Field
                                label="Remaining term (years)"
                                type="number"
                                value={form.data.term_years}
                                onChange={(value) =>
                                    form.setData('term_years', value)
                                }
                                error={errors.term_years}
                                required
                            />
                            <Field
                                label="Repayment frequency"
                                value={form.data.frequency}
                                options={frequencies}
                                onChange={(value) =>
                                    form.setData(
                                        'frequency',
                                        value as Mortgage['frequency'],
                                    )
                                }
                                error={errors.frequency}
                            />
                            <Field
                                label="Next repayment date"
                                type="date"
                                value={form.data.due_date}
                                onChange={(value) =>
                                    form.setData('due_date', value)
                                }
                                error={errors.due_date}
                                hint="Adds recurring repayments to the money calendar."
                            />
                            <Field
                                label="Repayment account"
                                value={form.data.account_id}
                                options={{
                                    '': 'No account assigned',
                                    ...Object.fromEntries(
                                        accounts.map((account) => [
                                            String(account.id),
                                            account.name,
                                        ]),
                                    ),
                                }}
                                onChange={(value) =>
                                    form.setData('account_id', value)
                                }
                                error={errors.account_id}
                            />
                            <div className="border-t pt-4">
                                <h3 className="mb-3 text-sm font-semibold">
                                    Explore paying it off sooner
                                </h3>
                                <div className="flex flex-col gap-4">
                                    <Field
                                        label="Steady offset balance ($)"
                                        type="money"
                                        value={form.data.offset}
                                        onChange={(value) =>
                                            form.setData('offset', value)
                                        }
                                        error={errors.offset_cents}
                                        hint="Assumes this amount stays in a 100% offset account."
                                        required
                                    />
                                    <Field
                                        label={`Extra per ${form.data.frequency === 'monthly' ? 'month' : form.data.frequency === 'weekly' ? 'week' : 'fortnight'} ($)`}
                                        type="money"
                                        value={form.data.extra}
                                        onChange={(value) =>
                                            form.setData('extra', value)
                                        }
                                        error={errors.extra_cents}
                                        required
                                    />
                                </div>
                            </div>
                            <Button type="submit" disabled={form.processing}>
                                {form.processing
                                    ? 'Saving…'
                                    : 'Save mortgage details'}
                            </Button>
                            {form.recentlySuccessful && (
                                <p
                                    role="status"
                                    className="text-sm text-primary"
                                >
                                    Mortgage details saved.
                                </p>
                            )}
                            <p className="text-xs leading-relaxed text-muted-foreground">
                                Saving updates the locked mortgage repayment in
                                expenses, the spending plan, and your budget
                                totals. Repayments include extras; account
                                balances remain separate.
                            </p>
                        </form>
                    </Panel>
                    <div className="flex min-w-0 flex-col gap-6">
                        {projection ? (
                            <>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    {[
                                        [
                                            'Estimated repayment',
                                            money(projection.repayment),
                                            `${frequencies[form.data.frequency]} · before extras`,
                                        ],
                                        [
                                            'Mortgage-free in',
                                            duration(
                                                projection.planned.periods /
                                                    projection.frequencyCount,
                                            ),
                                            `${duration(projection.yearsSaved)} sooner`,
                                        ],
                                        [
                                            'Interest saved',
                                            money(projection.interestSaved),
                                            'With your offset and extras',
                                        ],
                                        [
                                            'Total interest',
                                            money(projection.planned.interest),
                                            'Over the remaining loan',
                                        ],
                                    ].map(([label, value, hint]) => (
                                        <Panel key={label}>
                                            <p className="text-xs text-muted-foreground">
                                                {label}
                                            </p>
                                            <p className="mt-2 text-xl font-semibold tracking-tight">
                                                {value}
                                            </p>
                                            <p className="mt-2 text-xs text-muted-foreground">
                                                {hint}
                                            </p>
                                        </Panel>
                                    ))}
                                </div>
                                <Panel>
                                    <div className="flex items-center gap-2">
                                        <TrendingDown className="size-5 text-primary" />
                                        <h2 className="font-semibold">
                                            Watch your balance come down
                                        </h2>
                                    </div>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Same loan, two paths. See what your
                                        offset and extra repayments change.
                                    </p>
                                    <div className="mt-4 flex flex-wrap gap-4 text-xs">
                                        <span className="flex items-center gap-2">
                                            <span className="h-0.5 w-5 bg-primary" />{' '}
                                            Your plan
                                        </span>
                                        <span className="flex items-center gap-2">
                                            <span className="w-5 border-t-2 border-dashed border-muted-foreground" />{' '}
                                            Standard · no offset or extras
                                        </span>
                                    </div>
                                    <BalanceChart
                                        baseline={projection.baseline}
                                        planned={projection.planned}
                                        balance={
                                            Number(form.data.balance) * 100
                                        }
                                        term={Number(form.data.term_years)}
                                    />
                                </Panel>
                                <Panel>
                                    <h2 className="font-semibold">
                                        Where your repayments go
                                    </h2>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Each year of your plan, split between
                                        paying down the loan and interest.
                                    </p>
                                    <div className="mt-4 flex gap-4 text-xs">
                                        <span className="flex items-center gap-2">
                                            <span className="size-2 rounded-sm bg-primary" />
                                            Principal
                                        </span>
                                        <span className="flex items-center gap-2">
                                            <span className="size-2 rounded-sm bg-muted-foreground/40" />
                                            Interest
                                        </span>
                                    </div>
                                    <div
                                        className="mt-5 flex h-44 items-end gap-1"
                                        role="img"
                                        aria-label="Annual repayments split into principal and interest. Exact values are in the yearly breakdown below."
                                    >
                                        {projection.planned.years
                                            .slice(1)
                                            .map((year, i) => (
                                                <div
                                                    key={i}
                                                    className="flex min-w-0 flex-1 flex-col justify-end"
                                                    style={{
                                                        height: `${((year.principal + year.interest) / maxYearPayment) * 100}%`,
                                                    }}
                                                    title={`Year ${i + 1}: ${money(year.principal)} principal, ${money(year.interest)} interest`}
                                                >
                                                    <div
                                                        className="bg-muted-foreground/40"
                                                        style={{
                                                            height: `${(year.interest / (year.principal + year.interest)) * 100}%`,
                                                        }}
                                                    />
                                                    <div
                                                        className="bg-primary"
                                                        style={{
                                                            height: `${(year.principal / (year.principal + year.interest)) * 100}%`,
                                                        }}
                                                    />
                                                </div>
                                            ))}
                                    </div>
                                    <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                                        <span>Year 1</span>
                                        <span>
                                            Year{' '}
                                            {projection.planned.years.length -
                                                1}
                                        </span>
                                    </div>
                                    <details className="mt-5 border-t pt-4">
                                        <summary className="cursor-pointer text-sm font-medium">
                                            Yearly breakdown
                                        </summary>
                                        <div className="mt-4 overflow-x-auto">
                                            <table className="w-full text-right text-xs">
                                                <caption className="sr-only">
                                                    Projected repayments and
                                                    remaining balance by year
                                                </caption>
                                                <thead>
                                                    <tr className="border-b">
                                                        <th
                                                            className="py-2 text-left"
                                                            scope="col"
                                                        >
                                                            Year
                                                        </th>
                                                        <th scope="col">
                                                            Principal
                                                        </th>
                                                        <th scope="col">
                                                            Interest
                                                        </th>
                                                        <th scope="col">
                                                            Balance
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {projection.planned.years
                                                        .slice(1)
                                                        .map((year, i) => (
                                                            <tr
                                                                key={i}
                                                                className="border-b"
                                                            >
                                                                <th
                                                                    className="py-2 text-left font-normal"
                                                                    scope="row"
                                                                >
                                                                    {i + 1}
                                                                </th>
                                                                <td>
                                                                    {money(
                                                                        year.principal,
                                                                    )}
                                                                </td>
                                                                <td>
                                                                    {money(
                                                                        year.interest,
                                                                    )}
                                                                </td>
                                                                <td>
                                                                    {money(
                                                                        year.balance,
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </details>
                                </Panel>
                                <p className="text-xs leading-relaxed text-muted-foreground">
                                    Estimates for principal-and-interest loans
                                    with a constant rate, payments at the end of
                                    each period, and no fees. Weekly and
                                    fortnightly repayments are calculated over
                                    52 and 26 periods per year. Offset funds
                                    remain separate from the loan; the base
                                    repayment stays the same. Lenders may
                                    calculate daily interest differently.{' '}
                                    <a
                                        className="underline"
                                        href="https://moneysmart.gov.au/home-loans/mortgage-offset-accounts"
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        How offsets work
                                    </a>
                                    .
                                </p>
                            </>
                        ) : (
                            <Panel>
                                <div className="py-16 text-center">
                                    <House className="mx-auto size-10 text-primary" />
                                    <h2 className="mt-4 text-lg font-semibold">
                                        Start with your home loan
                                    </h2>
                                    <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                                        Enter a balance, interest rate from
                                        0–30%, and a remaining term of 1–40
                                        whole years to see your repayment
                                        graphs.
                                    </p>
                                </div>
                            </Panel>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

MortgagePage.layout = {
    breadcrumbs: [{ title: 'Mortgage', href: index.url() }],
};
