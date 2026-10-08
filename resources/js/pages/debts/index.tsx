import { DebtEditor } from '@/components/debt-editor';
import type { Debt, DebtProps } from '@/components/debt-editor';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { CreditCard, Plus } from 'lucide-react';
import { Panel, money, cadences, dateLabel } from '@/components/budget/shared';
import { Button } from '@/components/ui/button';
import { index, show, destroy } from '@/routes/debts';

export default function DebtsPage({ debts, accounts, types }: DebtProps) {
    const [editing, setEditing] = useState<Debt | 'new' | null>(null);
    const active = debts.filter((d) => d.is_active && d.balance_cents > 0);
    const monthly = active.reduce(
        (sum, d) =>
            sum +
            ((d.repayment_cents + d.extra_cents) *
                ({ weekly: 52, fortnightly: 26, monthly: 12 }[d.frequency] ??
                    12)) /
                12,
        0,
    );
    return (
        <>
            <Head title="Debts & financing" />
            <div className="flex flex-col gap-6 p-4 md:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">
                            Debts & financing
                        </h1>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Car loans, credit cards, personal loans and
                            instalments, together in your family budget.
                        </p>
                    </div>
                    <Button onClick={() => setEditing('new')}>
                        <Plus className="size-4" />
                        Add debt
                    </Button>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                    {[
                        [
                            'Total outstanding',
                            money(
                                debts.reduce(
                                    (sum, d) => sum + d.balance_cents,
                                    0,
                                ),
                            ),
                        ],
                        ['Planned monthly repayments', money(monthly)],
                        ['Active debts', String(active.length)],
                    ].map(([label, value]) => (
                        <Panel key={label}>
                            <p className="text-sm text-muted-foreground">
                                {label}
                            </p>
                            <p className="mt-2 text-2xl font-semibold">
                                {value}
                            </p>
                        </Panel>
                    ))}
                </div>
                <p className="text-sm text-muted-foreground">
                    Active repayments appear in bills, the spending plan,
                    totals, calendar and account views. Keep the same repayment
                    out of ordinary bills to avoid counting it twice. Account
                    balances stay separate. Payoff estimates assume a constant
                    rate, no new spending or additional fees, and regular
                    payments. Paid-off debts stop contributing to the budget.
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                    {debts.map((debt) => (
                        <Panel key={debt.id}>
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h2 className="font-semibold">
                                        <Link
                                            href={show(debt.id)}
                                            className="hover:underline"
                                        >
                                            {debt.name}
                                        </Link>
                                    </h2>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {types[debt.type]} ·{' '}
                                        {debt.lender || 'No lender recorded'}
                                    </p>
                                </div>
                                <CreditCard className="size-5 text-primary" />
                            </div>
                            <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <dt className="text-muted-foreground">
                                        Balance
                                    </dt>
                                    <dd className="mt-1 font-semibold">
                                        {money(debt.balance_cents)}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">
                                        Interest rate
                                    </dt>
                                    <dd className="mt-1">
                                        {debt.annual_rate}% p.a.
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">
                                        Planned repayment
                                    </dt>
                                    <dd className="mt-1">
                                        {money(
                                            debt.repayment_cents +
                                                debt.extra_cents,
                                        )}{' '}
                                        · {cadences[debt.frequency]}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">
                                        Status
                                    </dt>
                                    <dd className="mt-1">
                                        {debt.balance_cents === 0
                                            ? 'Paid off'
                                            : debt.is_active
                                              ? 'In budget'
                                              : 'Paused'}
                                    </dd>
                                </div>
                            </dl>
                            <div className="mt-5 border-t pt-4">
                                {debt.projection.periods === null ? (
                                    <p className="text-sm text-destructive">
                                        This repayment does not clear the debt
                                        within 100 years. Increase your
                                        repayment; it may not cover interest.
                                    </p>
                                ) : (
                                    <>
                                        <p className="text-sm">
                                            Estimated payoff:{' '}
                                            {debt.projection.periods}{' '}
                                            {debt.frequency === 'monthly'
                                                ? 'months'
                                                : debt.frequency === 'weekly'
                                                  ? 'weeks'
                                                  : 'fortnights'}{' '}
                                            ·{' '}
                                            {money(
                                                debt.projection
                                                    .interest_cents ?? 0,
                                            )}{' '}
                                            interest
                                        </p>
                                        {debt.extra_cents > 0 &&
                                            debt.baseline.interest_cents !==
                                                null && (
                                                <p className="mt-1 text-sm text-primary">
                                                    Extras save an estimated{' '}
                                                    {money(
                                                        Math.max(
                                                            0,
                                                            debt.baseline
                                                                .interest_cents -
                                                                (debt.projection
                                                                    .interest_cents ??
                                                                    0),
                                                        ),
                                                    )}{' '}
                                                    in interest.
                                                </p>
                                            )}
                                        {debt.balance_cents > 0 && (
                                            <svg
                                                viewBox="0 0 300 80"
                                                className="mt-3 h-24 w-full"
                                                role="img"
                                                aria-label={`Projected balance for ${debt.name} falls from ${money(debt.balance_cents)} to zero`}
                                            >
                                                <path
                                                    d={debt.projection.balances
                                                        .map(
                                                            (balance, i, all) =>
                                                                `${i === 0 ? 'M' : 'L'} ${(i * 300) / Math.max(1, all.length - 1)} ${75 - (balance / debt.balance_cents) * 70}`,
                                                        )
                                                        .join(' ')}
                                                    fill="none"
                                                    className="stroke-primary"
                                                    strokeWidth="2"
                                                />
                                            </svg>
                                        )}
                                    </>
                                )}
                            </div>
                            <p className="mt-3 text-xs text-muted-foreground">
                                {debt.due_date
                                    ? `Next repayment ${dateLabel(debt.due_date)}`
                                    : 'No repayment date set'}{' '}
                                · {debt.account?.name ?? 'No account assigned'}
                            </p>
                            {debt.notes && (
                                <p className="mt-4 text-sm text-muted-foreground">
                                    {debt.notes}
                                </p>
                            )}
                            <div className="mt-5 flex gap-2">
                                <Button variant="outline" asChild>
                                    <Link href={show(debt.id)}>
                                        View debt & history
                                    </Link>
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={() => {
                                        if (
                                            window.confirm(
                                                `Remove ${debt.name}? Its repayments will leave the budget.`,
                                            )
                                        )
                                            router.delete(destroy(debt.id));
                                    }}
                                >
                                    Remove
                                </Button>
                            </div>
                        </Panel>
                    ))}
                </div>
                {debts.length === 0 && (
                    <Panel className="py-12 text-center">
                        <CreditCard className="mx-auto size-10 text-primary" />
                        <h2 className="mt-4 font-semibold">
                            A clear picture of what you owe
                        </h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Add your first debt and its repayment schedule to
                            get started.
                        </p>
                    </Panel>
                )}
                {editing && (
                    <DebtEditor
                        key={editing === 'new' ? 'new' : editing.id}
                        debt={editing === 'new' ? undefined : editing}
                        accounts={accounts}
                        types={types}
                        onClose={() => setEditing(null)}
                    />
                )}
            </div>
        </>
    );
}
DebtsPage.layout = {
    breadcrumbs: [{ title: 'Debts & financing', href: index.url() }],
};
