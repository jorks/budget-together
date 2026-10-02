import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { ArrowUpRight, Plus, Sprout } from 'lucide-react';
import {
    dateLabel,
    Empty,
    Field,
    money,
    Panel,
} from '@/components/budget/shared';
import { HistoryChart, ProjectionChart } from '@/components/super-charts';
import { FundEditor } from '@/components/super-fund-editor';
import { BalanceEditor } from '@/components/super-balance-editor';
import { Button } from '@/components/ui/button';

import { income as incomeRoute } from '@/routes';
import { destroy, index } from '@/routes/superannuation';
import { destroy as deleteBalance } from '@/routes/super-balances';
import type {
    SuperBalance,
    SuperFund,
    SuperProps,
} from '@/types/superannuation';

export default function SuperannuationPage(props: SuperProps) {
    const { funds, today } = props;
    const [editor, setEditor] = useState<SuperFund | 'new' | null>(null);
    const [balanceEditor, setBalanceEditor] = useState<{
        fund: SuperFund;
        balance?: SuperBalance;
    } | null>(null);
    const [years, setYears] = useState('20');
    const horizon = Number(years);
    const totalBalance = funds.reduce(
        (sum, fund) => sum + fund.current_balance_cents,
        0,
    );
    const netContributions = funds.reduce(
        (sum, fund) => sum + fund.contributions.net_cents,
        0,
    );
    const projected = funds.reduce(
        (sum, fund) => sum + (fund.projection[horizon]?.balance_cents ?? 0),
        0,
    );
    const projection = Array.from({ length: horizon + 1 }, (_, year) => ({
        year,
        balance_cents: funds.reduce(
            (sum, fund) => sum + (fund.projection[year]?.balance_cents ?? 0),
            0,
        ),
        contributions_cents: funds.reduce(
            (sum, fund) =>
                sum + (fund.projection[year]?.contributions_cents ?? 0),
            0,
        ),
    }));
    const grouped = new Map<string, SuperFund[]>();
    for (const fund of funds) {
        const memberId =
            fund.member_id ??
            props.members?.find(
                (member) =>
                    member.name.trim().toLocaleLowerCase('en-AU') ===
                    fund.person.trim().toLocaleLowerCase('en-AU'),
            )?.id;
        const key = memberId
            ? `member-${memberId}`
            : fund.person.trim().toLocaleLowerCase('en-AU');
        grouped.set(key, [...(grouped.get(key) ?? []), fund]);
    }
    const multiple = [...grouped.values()].filter((group) => group.length > 1);
    return (
        <div className="flex flex-col gap-6 p-4 md:p-6">
            <Head title="Superannuation" />
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <div className="mb-2 flex items-center gap-2 text-primary">
                        <Sprout className="size-5" />
                        <span className="text-sm font-medium">Future you</span>
                    </div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Superannuation
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        A simple view of your funds, contributions and the years
                        ahead.
                    </p>
                </div>
                <Button onClick={() => setEditor('new')}>
                    <Plus className="size-4" />
                    Add super fund
                </Button>
            </div>
            {multiple.map((group) => (
                <Panel
                    key={group[0].person}
                    className="border-amber-500/40 bg-amber-500/5"
                >
                    <h2 className="font-semibold">
                        {group[0].person} has {group.length} super funds
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Consider whether consolidation could reduce duplicate
                        fees. Compare insurance, benefits and any exit costs
                        before closing an account.{' '}
                        <a
                            className="underline"
                            href="https://moneysmart.gov.au/how-super-works/consolidating-super-funds"
                            target="_blank"
                            rel="noreferrer"
                        >
                            Read MoneySmart’s consolidation guide
                        </a>
                        .
                    </p>
                </Panel>
            ))}
            {funds.length === 0 ? (
                <Empty title="Add your first super fund">
                    Start with a current balance and link a PAYG wage to
                    estimate contributions. Record a new balance every few
                    months or at least once a year.
                </Empty>
            ) : (
                <>
                    <div className="grid gap-4 sm:grid-cols-3">
                        {[
                            [
                                'Recorded super balance',
                                totalBalance,
                                'Total of the latest entry for each fund; statement dates may differ.',
                            ],
                            [
                                'Net annual contributions',
                                netContributions,
                                'Employer plus salary sacrifice, after assumed 15% contribution tax.',
                            ],
                            [
                                `Projected in ${horizon} years`,
                                projected,
                                'Illustrative future dollars using each fund’s return and costs.',
                            ],
                        ].map(([label, value, caption]) => (
                            <Panel key={String(label)}>
                                <p className="text-sm text-muted-foreground">
                                    {label}
                                </p>
                                <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">
                                    {money(Number(value))}
                                </p>
                                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                                    {caption}
                                </p>
                            </Panel>
                        ))}
                    </div>
                    <Panel>
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <h2 className="font-semibold">
                                    Where your super could go
                                </h2>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Starting from each fund’s latest recorded
                                    balance.
                                </p>
                            </div>
                            <div className="w-40">
                                <Field
                                    label="Projection horizon"
                                    value={years}
                                    onChange={setYears}
                                    options={{
                                        '10': '10 years',
                                        '20': '20 years',
                                        '30': '30 years',
                                    }}
                                />
                            </div>
                        </div>
                        <ProjectionChart points={projection} />
                        <div className="flex flex-wrap gap-5 text-xs text-muted-foreground">
                            <span>━━ Projected balance after costs</span>
                            <span>
                                ┄┄ Starting balance + net contributions, before
                                costs
                            </span>
                        </div>
                        <details className="mt-4 text-sm text-muted-foreground">
                            <summary className="cursor-pointer font-medium">
                                Projection assumptions
                            </summary>
                            <p className="mt-2 leading-relaxed">
                                Monthly compounding; constant wages,
                                contributions, returns and costs. Contributions
                                arrive at month end with 15% contribution tax.
                                The return you enter is after investment tax and
                                before the separately entered fees and
                                insurance. These are future dollars, without
                                inflation adjustment. Projections exclude
                                bonuses, employer contribution limits,
                                contribution cap rules, extra tax for high
                                incomes, retirement withdrawals and government
                                incentives. Returns are assumptions, not
                                forecasts.
                            </p>
                            <p className="mt-2">
                                <a
                                    href="https://www.ato.gov.au/tax-rates-and-codes/key-superannuation-rates-and-thresholds"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="underline"
                                >
                                    ATO rates and contribution limits
                                </a>
                            </p>
                        </details>
                    </Panel>
                    <div className="grid gap-6 xl:grid-cols-2">
                        {funds.map((fund) => (
                            <Panel key={fund.id}>
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-medium text-primary">
                                            {fund.person}
                                        </p>
                                        <h2 className="mt-1 text-lg font-semibold">
                                            {fund.name}
                                        </h2>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            {fund.investment_option ||
                                                'Investment option not entered'}{' '}
                                            · {fund.return_rate}% assumed return
                                        </p>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setEditor(fund)}
                                    >
                                        Edit fund
                                    </Button>
                                </div>
                                <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
                                    <div>
                                        <p className="text-3xl font-semibold tracking-tight tabular-nums">
                                            {money(fund.current_balance_cents)}
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {fund.balance_date
                                                ? `Recorded ${dateLabel(fund.balance_date)}`
                                                : 'No balance recorded'}
                                        </p>
                                    </div>
                                    <Button
                                        size="sm"
                                        onClick={() =>
                                            setBalanceEditor({ fund })
                                        }
                                    >
                                        Record balance
                                        <ArrowUpRight className="size-4" />
                                    </Button>
                                </div>
                                {fund.needs_update && (
                                    <p
                                        role="status"
                                        className="mt-3 rounded-lg bg-amber-500/10 p-3 text-sm"
                                    >
                                        Time for a balance update. Record a
                                        fresh statement at least once a year.
                                    </p>
                                )}
                                <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                                    <div>
                                        <dt className="text-muted-foreground">
                                            Employer / year
                                        </dt>
                                        <dd className="mt-1 font-medium">
                                            {money(
                                                fund.contributions
                                                    .employer_cents,
                                            )}{' '}
                                            <span className="text-xs text-muted-foreground">
                                                ({fund.employer_rate}%)
                                            </span>
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-muted-foreground">
                                            Salary sacrifice / year
                                        </dt>
                                        <dd className="mt-1 font-medium">
                                            {money(
                                                fund.contributions
                                                    .sacrifice_cents,
                                            )}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-muted-foreground">
                                            Fees + insurance / year
                                        </dt>
                                        <dd className="mt-1 font-medium">
                                            {money(
                                                fund.annual_fee_cents +
                                                    fund.annual_insurance_cents,
                                            )}{' '}
                                            + {fund.fee_rate}%
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-muted-foreground">
                                            Projected in {horizon} years
                                        </dt>
                                        <dd className="mt-1 font-medium">
                                            {money(
                                                fund.projection[horizon]
                                                    ?.balance_cents ?? 0,
                                            )}
                                        </dd>
                                    </div>
                                </dl>
                                <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                                    {fund.income
                                        ? `Linked wage: ${fund.income.name}. Salary sacrifice is shared with Income.`
                                        : 'No linked wage. Employer contributions are zero; salary sacrifice is a projection assumption only.'}{' '}
                                    <Link
                                        href={incomeRoute()}
                                        className="underline"
                                    >
                                        Manage income
                                    </Link>
                                </p>
                                {fund.balances.length >= 2 ? (
                                    <HistoryChart
                                        balances={fund.balances}
                                        name={fund.name}
                                    />
                                ) : (
                                    <p className="mt-5 rounded-lg bg-muted p-4 text-sm text-muted-foreground">
                                        Record another balance to see your
                                        balance history chart. Changes include
                                        contributions, returns and costs.
                                    </p>
                                )}
                                <details className="mt-4 text-sm">
                                    <summary className="cursor-pointer font-medium">
                                        Balance history ({fund.balances.length})
                                    </summary>
                                    <div className="mt-3 grid gap-3">
                                        {[...fund.balances]
                                            .reverse()
                                            .map((balance) => (
                                                <div
                                                    key={balance.id}
                                                    className="flex flex-wrap items-center justify-between gap-2 border-t pt-3"
                                                >
                                                    <div>
                                                        <p>
                                                            {dateLabel(
                                                                balance.recorded_on,
                                                            )}{' '}
                                                            ·{' '}
                                                            <span className="font-medium">
                                                                {money(
                                                                    balance.balance_cents,
                                                                )}
                                                            </span>
                                                        </p>
                                                        {balance.notes && (
                                                            <p className="mt-1 text-xs text-muted-foreground">
                                                                {balance.notes}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() =>
                                                                setBalanceEditor(
                                                                    {
                                                                        fund,
                                                                        balance,
                                                                    },
                                                                )
                                                            }
                                                        >
                                                            Correct
                                                        </Button>
                                                        {fund.balances.length >
                                                            1 && (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => {
                                                                    if (
                                                                        window.confirm(
                                                                            'Remove this balance entry?',
                                                                        )
                                                                    )
                                                                        router.delete(
                                                                            deleteBalance(
                                                                                {
                                                                                    super_fund:
                                                                                        fund.id,
                                                                                    super_balance:
                                                                                        balance.id,
                                                                                },
                                                                            ),
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
                                            ))}
                                    </div>
                                </details>
                                {(fund.member_number || fund.notes) && (
                                    <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                                        {fund.member_number && (
                                            <>
                                                Member number:{' '}
                                                {fund.member_number}
                                                <br />
                                            </>
                                        )}
                                        {fund.notes}
                                    </p>
                                )}
                                <Button
                                    className="mt-4"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        if (
                                            window.confirm(
                                                `Remove ${fund.name} and all its balance history? Salary sacrifice on a linked wage will remain in Income.`,
                                            )
                                        )
                                            router.delete(destroy(fund.id), {
                                                preserveScroll: true,
                                            });
                                    }}
                                >
                                    Remove fund
                                </Button>
                            </Panel>
                        ))}
                    </div>
                </>
            )}
            {editor && (
                <FundEditor
                    {...props}
                    fund={editor === 'new' ? undefined : editor}
                    onClose={() => setEditor(null)}
                />
            )}
            {balanceEditor && (
                <BalanceEditor
                    {...balanceEditor}
                    today={today}
                    onClose={() => setBalanceEditor(null)}
                />
            )}
        </div>
    );
}

SuperannuationPage.layout = {
    breadcrumbs: [{ title: 'Superannuation', href: index.url() }],
};
