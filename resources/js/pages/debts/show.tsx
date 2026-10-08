import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import { DebtEditor } from '@/components/debt-editor';
import type { Debt, DebtProps } from '@/components/debt-editor';
import {
    FinancialHistory,
    financialValues,
} from '@/components/financial-history';
import type { FinancialChange } from '@/components/financial-history';
import { Panel, money, cadences } from '@/components/budget/shared';
import { Button } from '@/components/ui/button';
import { index } from '@/routes/debts';

export default function DebtDetail({
    debt,
    accounts,
    types,
    changes,
    today,
}: Omit<DebtProps, 'debts'> & {
    debt: Debt;
    changes: FinancialChange[];
    today: string;
}) {
    const [editing, setEditing] = useState(false);
    const [financialEditing, setFinancialEditing] = useState(false);
    return (
        <>
            <Head title={debt.name} />
            <main className="mx-auto grid w-full max-w-5xl gap-6 p-4 md:p-8">
                <Link
                    href={index()}
                    className="inline-flex min-h-11 items-center text-sm text-muted-foreground"
                >
                    ← Back to debts & financing
                </Link>
                <header className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-semibold tracking-tight">
                            {debt.name}
                        </h1>
                        <p className="mt-2 text-sm text-muted-foreground">
                            {types[debt.type]} ·{' '}
                            {debt.lender || 'No lender recorded'} ·{' '}
                            {debt.is_active ? 'In budget' : 'Paused'}
                        </p>
                    </div>
                    <Button
                        className="min-h-11"
                        variant="outline"
                        disabled={editing || financialEditing}
                        onClick={() => setEditing(true)}
                    >
                        Edit details
                    </Button>
                </header>
                <div className="grid gap-4 sm:grid-cols-3">
                    {[
                        ['Current balance', money(debt.balance_cents)],
                        ['Annual interest rate', `${debt.annual_rate}%`],
                        [
                            'Planned repayment',
                            `${money(debt.repayment_cents + debt.extra_cents)} · ${cadences[debt.frequency]}`,
                        ],
                    ].map(([label, value]) => (
                        <Panel key={label}>
                            <p className="text-sm text-muted-foreground">
                                {label}
                            </p>
                            <p className="mt-2 text-xl font-semibold tabular-nums">
                                {value}
                            </p>
                        </Panel>
                    ))}
                </div>
                <Panel>
                    <h2 className="font-semibold">Payoff estimate</h2>
                    <p className="mt-2 text-sm">
                        {debt.projection.periods === null
                            ? 'Your planned repayments do not pay this loan off.'
                            : `${debt.projection.periods} repayments remaining · ${money(debt.projection.interest_cents ?? 0)} estimated interest.`}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                        Based on current terms, a constant rate and no
                        additional borrowing or fees. Future financial updates
                        appear in history; this projection uses today’s terms.
                    </p>
                </Panel>
                {editing && (
                    <DebtEditor
                        debt={debt}
                        accounts={accounts}
                        types={types}
                        onClose={() => setEditing(false)}
                    />
                )}
                <FinancialHistory
                    disabled={editing}
                    onEditingChange={setFinancialEditing}
                    type="debt"
                    id={debt.id}
                    values={financialValues(debt, 'debt')}
                    changes={changes}
                    today={today}
                />
            </main>
        </>
    );
}
DebtDetail.layout = {
    breadcrumbs: [{ title: 'Debts & financing', href: index.url() }],
};
