import { HistoryChart } from '@/components/super-charts';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { FundEditor } from '@/components/super-fund-editor';
import { BalanceEditor } from '@/components/super-balance-editor';
import {
    FinancialHistory,
    financialValues,
} from '@/components/financial-history';
import type { FinancialChange } from '@/components/financial-history';
import { Panel, money, dateLabel } from '@/components/budget/shared';
import { Button } from '@/components/ui/button';
import { index } from '@/routes/superannuation';
import { show as incomeShow } from '@/routes/budget-items';
import { destroy as removeBalance } from '@/routes/super-balances';
import type {
    SuperProps,
    SuperFund,
    SuperBalance,
} from '@/types/superannuation';

export default function SuperDetail(
    props: SuperProps & {
        fund: SuperFund;
        changes: FinancialChange[];
        recordingBalance?: boolean;
        correctingBalance?: number | null;
    },
) {
    const { fund, today, changes } = props;
    const [financialEditing, setFinancialEditing] = useState(false);
    const [editing, setEditing] = useState<
        'details' | 'balance' | SuperBalance | null
    >(
        props.recordingBalance
            ? 'balance'
            : (fund.balances.find(
                  (balance) => balance.id === props.correctingBalance,
              ) ?? null),
    );
    return (
        <>
            <Head title={fund.name} />
            <main className="mx-auto grid w-full max-w-5xl gap-6 p-4 md:p-8">
                <Link
                    href={index()}
                    className="inline-flex min-h-11 items-center text-sm text-muted-foreground"
                >
                    ← Back to superannuation
                </Link>
                <header className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-semibold tracking-tight">
                            {fund.name}
                        </h1>
                        <p className="mt-2 text-sm text-muted-foreground">
                            {fund.person} ·{' '}
                            {fund.investment_option ||
                                'No investment option recorded'}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            className="min-h-11"
                            disabled={editing !== null || financialEditing}
                            onClick={() => setEditing('balance')}
                        >
                            Record balance
                        </Button>
                        <Button
                            className="min-h-11"
                            variant="outline"
                            disabled={editing !== null || financialEditing}
                            onClick={() => setEditing('details')}
                        >
                            Edit details
                        </Button>
                    </div>
                </header>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Panel>
                        <p className="text-sm text-muted-foreground">
                            Latest recorded balance
                        </p>
                        <p className="mt-2 text-2xl font-semibold">
                            {money(fund.current_balance_cents)}
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                            {fund.balance_date
                                ? `As at ${dateLabel(fund.balance_date)}`
                                : 'No balance recorded'}
                        </p>
                    </Panel>
                    <Panel>
                        <p className="text-sm text-muted-foreground">
                            Estimated annual net contributions
                        </p>
                        <p className="mt-2 text-2xl font-semibold">
                            {money(fund.contributions.net_cents)}
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Employer and salary sacrifice contributions after
                            estimated contributions tax.
                        </p>
                    </Panel>
                </div>
                {fund.income_id && (
                    <Panel>
                        <p className="text-sm">
                            Salary sacrifice follows the dated changes on your
                            linked wage.
                        </p>
                        <Link
                            className="mt-2 inline-flex min-h-11 items-center text-sm font-medium underline"
                            href={incomeShow(fund.income_id)}
                        >
                            View wage & salary history
                        </Link>
                    </Panel>
                )}
                {editing === 'details' && (
                    <FundEditor
                        {...props}
                        fund={fund}
                        inline
                        onClose={() => setEditing(null)}
                    />
                )}
                {editing && editing !== 'details' && (
                    <BalanceEditor
                        fund={fund}
                        balance={editing === 'balance' ? undefined : editing}
                        today={today}
                        inline
                        onClose={() => setEditing(null)}
                    />
                )}
                {fund.balances.length > 1 && (
                    <Panel>
                        <h2 className="font-semibold">Balance over time</h2>
                        <HistoryChart
                            balances={fund.balances}
                            name={fund.name}
                        />
                    </Panel>
                )}
                <section className="grid gap-3">
                    <h2 className="text-xl font-semibold">Balance history</h2>
                    <ol className="grid gap-3">
                        {[...fund.balances].reverse().map((balance) => (
                            <li key={balance.id}>
                                <Panel>
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <p className="font-semibold">
                                                {money(balance.balance_cents)}
                                            </p>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                {dateLabel(balance.recorded_on)}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                className="min-h-11"
                                                variant="outline"
                                                size="sm"
                                                disabled={
                                                    editing !== null ||
                                                    financialEditing
                                                }
                                                onClick={() =>
                                                    setEditing(balance)
                                                }
                                                aria-label={`Correct balance from ${balance.recorded_on}`}
                                            >
                                                Correct
                                            </Button>
                                            {fund.balances.length > 1 && (
                                                <Button
                                                    className="min-h-11"
                                                    variant="ghost"
                                                    size="sm"
                                                    disabled={
                                                        editing !== null ||
                                                        financialEditing
                                                    }
                                                    onClick={() => {
                                                        if (
                                                            window.confirm(
                                                                'Remove this balance entry?',
                                                            )
                                                        )
                                                            router.delete(
                                                                removeBalance({
                                                                    super_fund:
                                                                        fund.id,
                                                                    super_balance:
                                                                        balance.id,
                                                                }),
                                                                {
                                                                    preserveScroll: true,
                                                                },
                                                            );
                                                    }}
                                                >
                                                    Remove
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                    {balance.notes && (
                                        <p className="mt-3 text-sm text-muted-foreground">
                                            {balance.notes}
                                        </p>
                                    )}
                                </Panel>
                            </li>
                        ))}
                    </ol>
                </section>
                <FinancialHistory
                    disabled={editing !== null}
                    onEditingChange={setFinancialEditing}
                    type="super"
                    id={fund.id}
                    values={financialValues(fund, 'super')}
                    changes={changes}
                    today={today}
                />
            </main>
        </>
    );
}
SuperDetail.layout = {
    breadcrumbs: [{ title: 'Superannuation', href: index.url() }],
};
