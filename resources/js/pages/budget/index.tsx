import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowDownLeft,
    ArrowUpRight,
    CalendarDays,
    Check,
    CircleDollarSign,
    History,
    LockKeyhole,
    Pencil,
    PiggyBank,
    Plus,
    Search,
    Trash2,
    Repeat,
} from 'lucide-react';
import { useState } from 'react';
import { useBudgetPeriod } from '@/hooks/use-budget-period';
import { groupBudgetItems } from '@/lib/budget-groups';
import { planBalance } from '@/lib/plan-balance';
import type { CalculatedRow, PlanBalance } from '@/lib/plan-balance';
import { Metric, periodLabels } from '@/components/budget/metric';
import { TaxEstimateCard } from '@/components/budget/tax-estimate-card';
import { TaxInfo } from '@/components/budget/tax-info';
import { Accounts } from '@/components/budget/accounts';
import { BillCalendar } from '@/components/budget/bill-calendar';
import { Household } from '@/components/budget/household';
import { ItemEditor } from '@/components/budget/item-editor';
import { PaymentHistory } from '@/components/budget/payment-history';
import {
    cadences,
    CategoryIcon,
    dateLabel,
    Empty,
    money,
    Panel,
} from '@/components/budget/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { bills, calendar, funds, plan } from '@/routes';
import { destroy } from '@/routes/budget-items';
import { index as mortgage } from '@/routes/mortgage';
import { household } from '@/routes';
import type {
    BudgetItem,
    BudgetProps,
    Equivalents,
    Kind,
    Period,
} from '@/types/budget';

const titles: Record<string, [string, string]> = {
    overview: [
        'A little clarity. A lot more breathing room.',
        'Your household, planned together.',
    ],
    income: [
        'Money coming in',
        'Your salaries, bonuses and take-home pay, in one place.',
    ],
    bills: [
        'Know what’s coming',
        'Every fixed commitment and variable bill, on your terms.',
    ],
    plan: [
        'Give your money a plan',
        'Make room for everyday life, personal spending and the future.',
    ],
    calendar: ['Your money calendar', 'See when things land, before they do.'],
    funds: [
        'Big bills, small steps',
        'Set money aside now, ready for the day it’s needed.',
    ],
    accounts: [
        'Everything in its place',
        'Your banks, accounts and cards, with a purpose for each.',
    ],
    household: [
        'Better, together',
        'One shared view for the people planning a life together.',
    ],
};
function annualPreTaxIncome(item: BudgetItem): number | null {
    return (
        item.gross_annual_cents ??
        (item.category?.trim().toLowerCase() === 'bonus'
            ? item.bonus_annual_cents
            : null) ??
        null
    );
}

function includedInTotal(item: BudgetItem): boolean {
    return (
        item.is_active &&
        !(
            item.kind === 'income' &&
            item.category?.trim().toLowerCase() === 'bonus' &&
            !item.include_bonus
        )
    );
}

function balanceMoney(amount: number, direction: 'income' | 'expense'): string {
    if (amount === 0) {
        return money(0);
    }
    const signed = direction === 'expense' ? -amount : amount;
    return `${signed > 0 ? '+' : ''}${money(signed)}`;
}

function CalculatedIndicator() {
    return (
        <span className="inline-flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
            <LockKeyhole aria-hidden="true" className="size-3" />
            Calculated
        </span>
    );
}

export function ItemTable({
    items,
    onEdit,
    onHistory,
    period,
    summaryOnly = false,
    totalLabel = 'Total',
    calculatedRows = [],
    remaining,
    showCashFlow = false,
}: {
    showCashFlow?: boolean;
    calculatedRows?: CalculatedRow[];
    remaining?: Equivalents;
    summaryOnly?: boolean;
    totalLabel?: string;
    items: BudgetItem[];
    onEdit: (item: BudgetItem) => void;
    onHistory: (item: BudgetItem) => void;
    period: Period | null;
}) {
    const columns: Period[] = ['annually', 'monthly', 'fortnightly', 'weekly'];
    const showPreTaxIncome = items.some((item) => item.kind === 'income');
    const included = items.filter(includedInTotal);
    const preTaxAmounts = included
        .map(annualPreTaxIncome)
        .filter((amount) => amount !== null);
    return (
        <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full min-w-200 table-fixed text-left text-sm">
                <colgroup>
                    <col />
                    {showPreTaxIncome && <col className="w-40" />}
                    {columns.map((column) => (
                        <col key={column} className="w-36" />
                    ))}
                    <col className="w-32" />
                </colgroup>
                <thead className="border-b bg-primary/5 text-xs text-muted-foreground">
                    <tr>
                        <th className="px-4 py-3 font-medium">
                            Item / category
                        </th>
                        {showPreTaxIncome && (
                            <th className="px-4 py-3 text-right font-medium">
                                Annual pre-tax income
                            </th>
                        )}
                        {columns.map((column) => (
                            <th
                                key={column}
                                className={cn(
                                    'px-4 py-3 text-right font-medium',
                                    period === column &&
                                        'bg-primary/8 font-semibold text-primary',
                                )}
                            >
                                Per {periodLabels[column]}
                                {showPreTaxIncome && (
                                    <span className="mt-1 block text-xs font-normal">
                                        After tax
                                    </span>
                                )}
                                {period === column && (
                                    <span className="sr-only">
                                        {' '}
                                        (preferred)
                                    </span>
                                )}
                            </th>
                        ))}
                        <th className="px-2 py-3">
                            <span className="sr-only">Actions</span>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {calculatedRows.map((row) => (
                        <tr
                            key={row.label}
                            className={cn(
                                row.direction === 'income'
                                    ? 'bg-primary/5'
                                    : 'bg-muted/30',
                            )}
                        >
                            <th
                                scope="row"
                                className="px-4 py-4 font-semibold"
                                title={row.description}
                            >
                                {row.source === 'mortgage' ? (
                                    <Link
                                        href={mortgage()}
                                        className="hover:underline"
                                    >
                                        {row.label}
                                    </Link>
                                ) : (
                                    row.label
                                )}
                                <span className="sr-only">
                                    {row.direction === 'income'
                                        ? ' Money in'
                                        : ' Money out'}
                                </span>
                                <span className="mt-1 block text-xs font-normal text-muted-foreground">
                                    {row.description}
                                </span>
                            </th>
                            {columns.map((column) => (
                                <td
                                    key={column}
                                    className={cn(
                                        'px-4 py-4 text-right whitespace-nowrap tabular-nums',
                                        row.direction === 'income'
                                            ? 'text-primary'
                                            : 'text-foreground',
                                        period === column &&
                                            'bg-primary/5 font-semibold',
                                    )}
                                >
                                    {balanceMoney(
                                        row.equivalents[column],
                                        row.direction,
                                    )}
                                </td>
                            ))}
                            <td className="px-3 py-4 text-right">
                                <CalculatedIndicator />
                            </td>
                        </tr>
                    ))}
                    {(summaryOnly ? [] : items).map((item, index) => (
                        <tr
                            key={item.id}
                            className={cn(
                                'last:border-0 hover:bg-muted/20',
                                !showCashFlow && 'border-b',
                                index === 0 &&
                                    calculatedRows.length > 0 &&
                                    'border-t border-border/60',
                                !item.is_active && 'opacity-60',
                                item.source === 'mortgage' && 'bg-muted/30',
                            )}
                        >
                            <td className="px-4 py-4">
                                {item.source === 'mortgage' ? (
                                    <Link
                                        href={mortgage()}
                                        className="flex items-center gap-2 text-left font-semibold hover:underline"
                                    >
                                        {item.name}
                                    </Link>
                                ) : (
                                    <button
                                        className="flex items-center gap-2 text-left font-semibold hover:underline"
                                        onClick={() => onEdit(item)}
                                    >
                                        {item.name}
                                    </button>
                                )}
                                {item.source === 'mortgage' && (
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        From Mortgage · includes extra
                                        repayments
                                    </p>
                                )}
                                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                                    <span className="inline-flex items-center gap-1.5">
                                        <CategoryIcon
                                            category={item.category}
                                            className="size-3.5"
                                        />
                                        {item.category || 'Uncategorised'}
                                    </span>
                                    {item.person && (
                                        <span>· For {item.person}</span>
                                    )}
                                    {item.is_variable && (
                                        <Badge variant="secondary">
                                            Forecast
                                        </Badge>
                                    )}
                                    {item.kind === 'income' &&
                                        item.category?.trim().toLowerCase() ===
                                            'bonus' &&
                                        !item.include_bonus && (
                                            <Badge variant="outline">
                                                Excluded from budget
                                            </Badge>
                                        )}
                                    {!item.is_active && (
                                        <Badge variant="outline">Paused</Badge>
                                    )}
                                </div>
                                {(item.kind === 'income'
                                    ? item.pay_date
                                    : item.due_date) && (
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {item.kind === 'income'
                                            ? 'Pay date'
                                            : 'Due'}{' '}
                                        {dateLabel(
                                            (item.kind === 'income'
                                                ? item.pay_date
                                                : item.due_date)!,
                                        )}
                                    </p>
                                )}
                            </td>
                            {showPreTaxIncome && (
                                <td className="w-40 px-4 py-4 text-right whitespace-nowrap tabular-nums">
                                    {annualPreTaxIncome(item) != null ? (
                                        money(annualPreTaxIncome(item)!)
                                    ) : (
                                        <span aria-label="Not provided">—</span>
                                    )}
                                </td>
                            )}
                            {columns.map((column) => (
                                <td
                                    key={column}
                                    className={cn(
                                        'w-36 px-4 py-4 text-right whitespace-nowrap tabular-nums',
                                        period === column &&
                                            'bg-primary/5 font-semibold',
                                    )}
                                >
                                    {showCashFlow
                                        ? balanceMoney(
                                              item.equivalents[column],
                                              'expense',
                                          )
                                        : money(item.equivalents[column])}
                                </td>
                            ))}
                            <td className="px-2 py-4">
                                {item.source === 'mortgage' ? (
                                    <div className="flex flex-col items-end gap-2">
                                        <CalculatedIndicator />
                                        <Link
                                            href={mortgage()}
                                            className="text-xs text-primary hover:underline"
                                        >
                                            Manage mortgage
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="flex justify-end">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            aria-label={`Edit ${item.name}`}
                                            onClick={() => onEdit(item)}
                                        >
                                            <Pencil className="size-4" />
                                        </Button>
                                        {item.kind === 'bill' && (
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                aria-label={`Actual payments for ${item.name}`}
                                                onClick={() => onHistory(item)}
                                            >
                                                <History className="size-4" />
                                            </Button>
                                        )}
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            aria-label={`Delete ${item.name}`}
                                            onClick={() => {
                                                if (
                                                    window.confirm(
                                                        `Delete ${item.name} and its recorded payment history? You can pause it instead to keep its history.`,
                                                    )
                                                )
                                                    router.delete(
                                                        destroy(item.id),
                                                        {
                                                            preserveScroll: true,
                                                        },
                                                    );
                                            }}
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    </div>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
                <tfoot className="border-t bg-muted/30 font-semibold">
                    <tr>
                        <th scope="row" className="px-4 py-4">
                            {totalLabel}
                        </th>
                        {showPreTaxIncome && (
                            <td className="w-40 px-4 py-4 text-right whitespace-nowrap tabular-nums">
                                {preTaxAmounts.length ? (
                                    money(
                                        preTaxAmounts.reduce(
                                            (sum, amount) => sum + amount,
                                            0,
                                        ),
                                    )
                                ) : (
                                    <span aria-label="Not provided">—</span>
                                )}
                            </td>
                        )}
                        {columns.map((column) => (
                            <td
                                key={column}
                                className={cn(
                                    'w-36 px-4 py-4 text-right whitespace-nowrap tabular-nums',
                                    period === column &&
                                        (showCashFlow
                                            ? 'bg-primary/8'
                                            : 'bg-primary/8 text-primary'),
                                )}
                            >
                                {showCashFlow
                                    ? balanceMoney(
                                          included.reduce(
                                              (sum, item) =>
                                                  sum +
                                                  item.equivalents[column],
                                              0,
                                          ),
                                          'expense',
                                      )
                                    : money(
                                          included.reduce(
                                              (sum, item) =>
                                                  sum +
                                                  item.equivalents[column],
                                              0,
                                          ),
                                      )}
                            </td>
                        ))}
                        <td />
                    </tr>
                    {remaining && (
                        <tr className="border-t bg-primary/5">
                            <th scope="row" className="px-4 py-4">
                                Remaining
                            </th>
                            {columns.map((column) => (
                                <td
                                    key={column}
                                    className={cn(
                                        'px-4 py-4 text-right whitespace-nowrap tabular-nums',
                                        period === column && 'bg-primary/8',
                                        remaining[column] < 0
                                            ? 'text-destructive'
                                            : 'text-primary',
                                    )}
                                >
                                    {balanceMoney(remaining[column], 'income')}
                                </td>
                            ))}
                            <td className="px-3 py-4 text-right">
                                <CalculatedIndicator />
                            </td>
                        </tr>
                    )}
                </tfoot>
            </table>
        </div>
    );
}
export function ItemTables({
    items,
    groupBy,
    onEdit,
    onHistory,
    period,
    balance,
}: {
    balance?: PlanBalance;
    items: BudgetItem[];
    groupBy: string;
    onEdit: (item: BudgetItem) => void;
    onHistory: (item: BudgetItem) => void;
    period: Period | null;
}) {
    const groups = groupBudgetItems(items, groupBy);
    if (balance && groups.length === 0) {
        groups.push(['', []]);
    }
    return (
        <div className="grid gap-5">
            {groups.map(([name, grouped], index) => (
                <section key={name}>
                    {groupBy !== 'none' && grouped.length > 0 && (
                        <h2 className="mb-3 flex items-center gap-2 font-semibold">
                            {groupBy === 'frequency' ? (
                                <Repeat className="size-4" />
                            ) : (
                                <CategoryIcon category={name} />
                            )}
                            {groupBy === 'frequency'
                                ? name.startsWith('custom:')
                                    ? `${name.split(':')[1]} payments per year`
                                    : cadences[name]
                                : name}
                            <span className="text-xs text-muted-foreground">
                                ({grouped.length})
                            </span>
                        </h2>
                    )}
                    <ItemTable
                        items={grouped}
                        showCashFlow={!!balance}
                        onEdit={onEdit}
                        onHistory={onHistory}
                        period={period}
                        totalLabel={
                            groupBy !== 'none'
                                ? 'Subtotal'
                                : balance
                                  ? 'Spending & savings total'
                                  : 'Total'
                        }
                        calculatedRows={index === 0 ? balance?.rows : undefined}
                        remaining={
                            groupBy === 'none' ? balance?.remaining : undefined
                        }
                    />
                </section>
            ))}
            {groupBy !== 'none' && (
                <ItemTable
                    items={items}
                    showCashFlow={!!balance}
                    onEdit={onEdit}
                    onHistory={onHistory}
                    period={period}
                    summaryOnly
                    totalLabel={
                        balance ? 'Spending & savings total' : 'Grand total'
                    }
                    remaining={balance?.remaining}
                />
            )}
        </div>
    );
}

function FundCards({
    items,
    onEdit,
    today,
}: {
    items: BudgetItem[];
    onEdit: (item: BudgetItem) => void;
    today: string;
}) {
    return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => {
                const fund = item.sinking_fund;
                if (!fund) return null;
                const percent = item.amount_cents
                    ? Math.min(
                          100,
                          (item.saved_cents / item.amount_cents) * 100,
                      )
                    : 100;
                return (
                    <Panel key={item.id} className="grid gap-5">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-xs text-muted-foreground">
                                    {item.category || 'Save ahead'}
                                </p>
                                <h3 className="mt-1 text-lg font-semibold">
                                    {item.name}
                                </h3>
                            </div>
                            <Badge
                                variant={
                                    fund.on_track ? 'secondary' : 'outline'
                                }
                                className={cn(
                                    !fund.on_track &&
                                        'border-amber-500/40 text-amber-700 dark:text-amber-400',
                                )}
                            >
                                {fund.overdue
                                    ? 'Review due date'
                                    : fund.on_track
                                      ? 'On track'
                                      : 'Needs attention'}
                            </Badge>
                        </div>
                        <div>
                            <div className="mb-2 flex justify-between text-sm">
                                <span>{money(item.saved_cents)} saved</span>
                                <span className="text-muted-foreground">
                                    of {money(item.amount_cents)}
                                </span>
                            </div>
                            <div
                                role="progressbar"
                                aria-label={`${item.name} funding progress`}
                                aria-valuenow={Math.round(percent)}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                className="h-2 overflow-hidden rounded-full bg-muted"
                            >
                                <div
                                    className="h-full rounded-full bg-primary"
                                    style={{ width: `${percent}%` }}
                                />
                            </div>
                        </div>
                        <div>
                            <p className="text-2xl font-semibold tabular-nums">
                                {money(fund.required_cents)}{' '}
                                <span className="text-sm font-normal text-muted-foreground">
                                    {fund.cadence}
                                </span>
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {fund.contributions_left > 0
                                    ? `Required across ${fund.contributions_left} contributions before ${dateLabel(item.due_date!)}`
                                    : `Remaining amount needed now · due ${dateLabel(item.due_date!)}`}
                            </p>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-3 text-sm">
                            <p>
                                Planned: {money(fund.contribution_cents)}{' '}
                                {fund.cadence}
                            </p>
                            <p className="mt-1 text-muted-foreground">
                                {fund.shortfall_cents
                                    ? `${money(fund.shortfall_cents)} short at the due date`
                                    : 'Your planned contributions cover the bill.'}
                            </p>
                        </div>
                        <Button variant="outline" onClick={() => onEdit(item)}>
                            Update funding plan
                        </Button>
                    </Panel>
                );
            })}
            {!items.length && (
                <div className="col-span-full">
                    <Empty title="Make the next big bill feel smaller">
                        Edit a bill, add its next due date and turn on “Save
                        ahead”. We’ll calculate what to put aside from{' '}
                        {dateLabel(today)}.
                    </Empty>
                </div>
            )}
        </div>
    );
}
export default function Budget(props: BudgetProps) {
    const { view, items, totals, today } = props;
    const { preferredPeriod, period } = useBudgetPeriod();
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState('all');
    const [groupBy, setGroupBy] = useState('none');
    const [showPaused, setShowPaused] = useState(false);
    const [editing, setEditing] = useState<{
        item?: BudgetItem;
        kind: Kind;
    } | null>(null);
    const [historyId, setHistoryId] = useState<number | null>(null);
    const history = items.find((item) => item.id === historyId);
    const edit = (item: BudgetItem) => {
        if (item.source === 'mortgage') {
            router.visit(mortgage());
            return;
        }
        setEditing({ item, kind: item.kind });
    };
    const add = (kind: Kind) => setEditing({ kind });
    const categories = props.categories;
    const balance = planBalance(items, totals);
    const fundsList = items.filter(
        (item) => item.is_active && item.has_sinking_fund,
    );
    const kind: Kind =
        view === 'income' ? 'income' : view === 'plan' ? 'spending' : 'bill';
    const visible = items.filter(
        (item) =>
            (view === 'plan'
                ? ['spending', 'saving'].includes(item.kind)
                : item.kind === kind) &&
            (showPaused || item.is_active) &&
            (view === 'income' ||
                category === 'all' ||
                (item.category || 'Uncategorised') === category) &&
            (view === 'income' ||
                `${item.name} ${item.category ?? ''} ${item.person ?? ''}`
                    .toLowerCase()
                    .includes(query.toLowerCase())),
    );
    if (view === 'income') {
        visible.sort(
            (first, second) =>
                Number(first.category?.trim().toLowerCase() === 'bonus') -
                Number(second.category?.trim().toLowerCase() === 'bonus'),
        );
    } else if (groupBy === 'none') {
        const sorted = groupBudgetItems(visible, 'category').flatMap(
            ([, grouped]) => grouped,
        );
        visible.splice(0, visible.length, ...sorted);
    }
    const upcoming = props.events
        .filter((event) => event.kind === 'bill' && event.date >= today)
        .slice(0, 5);
    const [title, subtitle] = titles[view] ?? titles.overview;
    return (
        <>
            <Head
                title={
                    view === 'overview'
                        ? 'Overview'
                        : view.charAt(0).toUpperCase() + view.slice(1)
                }
            />
            <main className="mx-auto flex w-full max-w-400 flex-1 flex-col gap-7 p-4 md:p-8 lg:p-10">
                <header className="flex flex-wrap items-end justify-between gap-5">
                    <div>
                        <p className="mb-2 text-xs font-semibold tracking-[0.18em] text-primary uppercase">
                            {props.household.name} · AUD
                        </p>
                        <h1 className="text-2xl font-semibold tracking-tight lg:text-3xl">
                            {title}
                        </h1>
                        <p className="mt-2 text-sm text-muted-foreground">
                            {subtitle}
                        </p>
                    </div>
                    {['income', 'bills', 'plan', 'funds'].includes(view) && (
                        <Button onClick={() => add(kind)}>
                            <Plus className="size-4" />
                            {view === 'income'
                                ? 'Add income'
                                : view === 'plan'
                                  ? 'Add allocation'
                                  : 'Add bill'}
                        </Button>
                    )}
                </header>
                {['overview', 'income', 'bills', 'plan'].includes(view) && (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h2 className="text-sm font-medium">
                            {view === 'income'
                                ? 'Your annual pre-tax income and take-home pay'
                                : view === 'bills'
                                  ? 'Your bills at a glance'
                                  : 'The household picture'}
                            <span className="mt-1 block text-xs font-normal text-muted-foreground">
                                All periods in tables · cards and totals per{' '}
                                {periodLabels[period]}
                            </span>
                        </h2>
                        {!preferredPeriod && (
                            <Link
                                href={household()}
                                className="text-xs text-muted-foreground underline underline-offset-4 hover:text-primary"
                            >
                                Set preferred frequency
                            </Link>
                        )}
                    </div>
                )}
                {['overview', 'plan'].includes(view) && (
                    <>
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            {[
                                {
                                    label: 'Take-home income',
                                    value: totals.income[period],
                                    icon: ArrowDownLeft,
                                    caption: 'After tax, ready to plan',
                                },
                                {
                                    label: 'Bills & everyday spending',
                                    value: totals.outgoings[period],
                                    icon: ArrowUpRight,
                                    caption:
                                        'Known bills + spending allowances',
                                },
                                {
                                    label: 'Savings allocations',
                                    value: totals.saving[period],
                                    icon: PiggyBank,
                                    caption: 'Your goals beyond bill funding',
                                },
                                {
                                    label: 'Left to allocate',
                                    value: totals.remaining[period],
                                    icon: CircleDollarSign,
                                    caption:
                                        totals.remaining[period] < 0
                                            ? 'Your plan exceeds your income'
                                            : 'Breathing room in your budget',
                                },
                            ].map((stat, index) => (
                                <Panel
                                    key={stat.label}
                                    className={cn(
                                        index === 3 &&
                                            'border-primary/20 bg-primary/5',
                                    )}
                                >
                                    <Metric
                                        icon={
                                            <stat.icon className="size-4.5" />
                                        }
                                        label={stat.label}
                                        value={stat.value}
                                        period={period}
                                        caption={stat.caption}
                                    />
                                </Panel>
                            ))}
                        </div>
                    </>
                )}
                {view === 'overview' && (
                    <>
                        <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
                            <Panel>
                                <div className="mb-5 flex items-center justify-between">
                                    <div>
                                        <h2 className="font-semibold">
                                            Where the plan goes
                                        </h2>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Per {periodLabels[period]} ·{' '}
                                            {totals.income[period] > 0
                                                ? 'full bar = 100% of take-home income'
                                                : 'add take-home income to compare shares'}
                                        </p>
                                    </div>
                                    <Button variant="ghost" size="sm" asChild>
                                        <Link href={plan()}>
                                            View plan{' '}
                                            <ArrowUpRight className="size-4" />
                                        </Link>
                                    </Button>
                                </div>
                                {[
                                    {
                                        name: 'Mortgage',
                                        value: balance.rows[1].equivalents[
                                            period
                                        ],
                                        route: mortgage(),
                                    },
                                    {
                                        name: 'Known bills',
                                        value: balance.rows[2].equivalents[
                                            period
                                        ],
                                        route: bills(),
                                    },
                                    {
                                        name: 'Everyday & personal',
                                        value: totals.spending[period],
                                        route: plan(),
                                    },
                                    {
                                        name: 'Savings',
                                        value: totals.saving[period],
                                        route: plan(),
                                    },
                                ].map(({ name, value, route }) => {
                                    const share =
                                        totals.income[period] > 0
                                            ? (value / totals.income[period]) *
                                              100
                                            : null;
                                    return (
                                        <div className="mb-5" key={name}>
                                            <div className="mb-2 flex justify-between gap-3 text-sm">
                                                <Link
                                                    className="hover:underline"
                                                    href={route}
                                                >
                                                    {name}
                                                </Link>
                                                <span className="font-medium tabular-nums">
                                                    {money(value)}
                                                    {share !== null && (
                                                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                                                            {share.toFixed(1)}%
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                            <div
                                                className="h-2 rounded-full bg-muted"
                                                role="meter"
                                                aria-label={`${name} share of take-home income`}
                                                aria-valuemin={0}
                                                aria-valuemax={100}
                                                aria-valuenow={Math.min(
                                                    100,
                                                    share ?? 0,
                                                )}
                                                aria-valuetext={
                                                    share === null
                                                        ? 'No take-home income set'
                                                        : `${share.toFixed(1)}% of take-home income`
                                                }
                                            >
                                                <div
                                                    className="h-2 rounded-full bg-primary"
                                                    style={{
                                                        width: `${Math.min(100, share ?? 0)}%`,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                                <p className="border-t pt-4 text-xs leading-relaxed text-muted-foreground">
                                    Amounts are annualised averages. Bill
                                    funding is already part of your bills, so it
                                    isn’t counted again as savings.
                                </p>
                            </Panel>
                            <Panel>
                                <div className="mb-4 flex items-center justify-between">
                                    <h2 className="font-semibold">
                                        Still to come this month
                                    </h2>
                                    <Button variant="ghost" size="sm" asChild>
                                        <Link href={calendar()}>
                                            <CalendarDays className="size-4" />
                                            Calendar
                                        </Link>
                                    </Button>
                                </div>
                                {upcoming.map((event) => (
                                    <button
                                        onClick={() => {
                                            const item = items.find(
                                                (record) =>
                                                    record.id === event.id,
                                            );
                                            if (item) edit(item);
                                        }}
                                        key={`${event.id}-${event.date}`}
                                        className="flex w-full items-center justify-between gap-3 border-t py-3 text-left"
                                    >
                                        <div>
                                            <p className="text-sm font-medium">
                                                {event.name}
                                            </p>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                {dateLabel(event.date)} ·{' '}
                                                {event.account ??
                                                    'No account assigned'}
                                            </p>
                                        </div>
                                        <span className="text-sm font-semibold tabular-nums">
                                            {money(event.amount_cents)}
                                            {event.is_variable ? ' est.' : ''}
                                        </span>
                                    </button>
                                ))}
                                {!upcoming.length && (
                                    <div className="py-8 text-sm text-muted-foreground">
                                        <Check className="mb-3 size-6" />
                                        No more scheduled bills this month.
                                        Check the calendar for what’s next.
                                    </div>
                                )}
                            </Panel>
                        </div>
                        <div className="flex items-center justify-between">
                            <h2 className="font-semibold">
                                Ready for the bigger bills
                            </h2>
                            <Button variant="ghost" size="sm" asChild>
                                <Link href={funds()}>
                                    All funding plans{' '}
                                    <ArrowUpRight className="size-4" />
                                </Link>
                            </Button>
                        </div>
                        <FundCards
                            items={fundsList.slice(0, 3)}
                            today={today}
                            onEdit={edit}
                        />
                        {!items.length && (
                            <Panel>
                                <h2 className="font-semibold">
                                    Start with the things you know
                                </h2>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    Add your income, then regular bills, then a
                                    little room for life. Your overview will
                                    grow with you.
                                </p>
                                <div className="mt-4 flex flex-wrap gap-3">
                                    <Button onClick={() => add('income')}>
                                        Add first income
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => add('bill')}
                                    >
                                        Add first bill
                                    </Button>
                                </div>
                            </Panel>
                        )}
                    </>
                )}
                {view === 'bills' && props.categoryTotals.length > 0 && (
                    <Panel>
                        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h2 className="font-semibold">By category</h2>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {money(totals.bill[period])} across all
                                    active bills
                                </p>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Select a category to filter the list
                            </p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            {props.categoryTotals.map((group) => (
                                <button
                                    key={group.category}
                                    onClick={() => {
                                        setCategory(
                                            category === group.category
                                                ? 'all'
                                                : group.category,
                                        );
                                        setQuery('');
                                    }}
                                    aria-pressed={category === group.category}
                                    className={cn(
                                        'rounded-lg border p-4 text-left transition hover:bg-muted/50',
                                        category === group.category &&
                                            'border-primary bg-primary/5',
                                    )}
                                >
                                    <Metric
                                        icon={
                                            <CategoryIcon
                                                category={group.category}
                                                className="size-4.5"
                                            />
                                        }
                                        label={group.category}
                                        value={group.equivalents[period]}
                                        period={period}
                                        caption={`${group.count} ${group.count === 1 ? 'bill' : 'bills'}`}
                                    />
                                </button>
                            ))}
                        </div>
                    </Panel>
                )}
                {['income', 'bills', 'plan'].includes(view) && (
                    <>
                        {view !== 'income' && (
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="relative min-w-60 flex-1">
                                    <Search className="absolute top-3 left-3 size-4 text-muted-foreground" />
                                    <Input
                                        aria-label="Search budget items"
                                        className="pl-9"
                                        value={query}
                                        onChange={(event) =>
                                            setQuery(event.target.value)
                                        }
                                        placeholder="Find an item…"
                                    />
                                </div>
                                <select
                                    aria-label="Filter category"
                                    className="h-10 rounded-md border bg-background px-3 text-sm"
                                    value={category}
                                    onChange={(event) =>
                                        setCategory(event.target.value)
                                    }
                                >
                                    <option value="all">All categories</option>
                                    {categories.map((name) => (
                                        <option key={name}>{name}</option>
                                    ))}
                                </select>
                                <select
                                    aria-label="Group budget items"
                                    className="h-10 rounded-md border bg-background px-3 text-sm"
                                    value={groupBy}
                                    onChange={(event) =>
                                        setGroupBy(event.target.value)
                                    }
                                >
                                    <option value="none">No grouping</option>
                                    <option value="category">
                                        Group by category
                                    </option>
                                    {view !== 'plan' && (
                                        <option value="frequency">
                                            Group by frequency
                                        </option>
                                    )}
                                </select>
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={showPaused}
                                        onChange={(event) =>
                                            setShowPaused(event.target.checked)
                                        }
                                    />
                                    Show paused
                                </label>
                            </div>
                        )}
                        {visible.length || view === 'plan' ? (
                            <ItemTables
                                items={visible}
                                groupBy={view === 'income' ? 'none' : groupBy}
                                onEdit={edit}
                                onHistory={(item) => setHistoryId(item.id)}
                                period={preferredPeriod}
                                balance={view === 'plan' ? balance : undefined}
                            />
                        ) : (
                            <Empty
                                title={
                                    query || category !== 'all'
                                        ? 'No matching items'
                                        : `Add your first ${kind === 'spending' ? 'allocation' : kind}`
                                }
                            >
                                Capture an amount and its frequency. We’ll show
                                the yearly, monthly, fortnightly and weekly
                                view.
                            </Empty>
                        )}
                        <p className="text-xs text-muted-foreground">
                            Annualised using 52 weeks, 26 fortnights or 12
                            months.{' '}
                            {view === 'income'
                                ? 'Annual pre-tax income is shown first; all other income figures are after tax. '
                                : ''}
                            Paused items are excluded from totals.
                            {view === 'plan' &&
                                ' Calculated rows and remaining use the whole household budget, regardless of filters.'}
                        </p>
                        {view === 'income' && (
                            <TaxInfo
                                year={props.financialYear}
                                brackets={
                                    props.taxBrackets[props.financialYear] ?? []
                                }
                            />
                        )}
                        {view === 'income' && (
                            <div className="grid gap-4 md:grid-cols-2">
                                {props.incomeTaxEstimates.map((item) => (
                                    <TaxEstimateCard
                                        bonusExcludedFromBudget={
                                            item.bonus_excluded_from_budget
                                        }
                                        key={item.id}
                                        item={item}
                                        period={period}
                                    />
                                ))}
                            </div>
                        )}
                        {view === 'plan' && (
                            <Panel>
                                <h3 className="font-semibold">
                                    Your commitments are already included
                                </h3>
                                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                                    {money(totals.bill[period])} in known bills
                                    is already in the {period.toLowerCase()}{' '}
                                    picture above. Add groceries, personal
                                    allowances and general savings here. Avoid
                                    adding another allocation for a bill you’ve
                                    already entered.
                                </p>
                                <Button
                                    className="mt-4"
                                    variant="outline"
                                    asChild
                                >
                                    <Link href={bills()}>
                                        Review known bills
                                    </Link>
                                </Button>
                            </Panel>
                        )}
                    </>
                )}
                {view === 'funds' && (
                    <>
                        <FundCards
                            items={fundsList}
                            today={today}
                            onEdit={edit}
                        />
                        <p className="text-xs leading-relaxed text-muted-foreground">
                            These are funding plans for existing expenses.
                            Update “already set aside” with the amount reserved
                            for each bill; don’t reuse the same account balance
                            across multiple bills. Contributions start today or
                            your future start date and stop before the due date.
                        </p>
                    </>
                )}
                {view === 'calendar' && (
                    <BillCalendar
                        month={props.month}
                        today={today}
                        events={props.events}
                        onEdit={(id) => {
                            const item = items.find(
                                (record) => record.id === id,
                            );
                            if (item) edit(item);
                        }}
                    />
                )}
                {view === 'accounts' && (
                    <Accounts
                        accounts={props.accounts}
                        banks={props.banks}
                        items={items}
                        onEditItem={edit}
                    />
                )}
                {view === 'household' && (
                    <Household
                        household={props.household}
                        members={props.members}
                        invitations={props.invitations}
                        invitation_url={props.invitation_url}
                    />
                )}
                <footer className="mt-auto border-t pt-5 text-xs text-muted-foreground">
                    A plan for your money, with room for your life. ·{' '}
                    {dateLabel(today)}
                </footer>
            </main>
            {editing && (
                <ItemEditor
                    key={editing.item?.id ?? `new-${editing.kind}`}
                    item={editing.item}
                    kind={editing.kind}
                    accounts={props.accounts}
                    categories={
                        editing.kind === 'bill' &&
                        items.some((item) => item.source === 'mortgage')
                            ? categories.filter(
                                  (category) =>
                                      category.trim().toLowerCase() !==
                                      'mortgage',
                              )
                            : categories
                    }
                    today={today}
                    financialYear={props.financialYear}
                    taxBrackets={props.taxBrackets}
                    onClose={() => setEditing(null)}
                />
            )}
            {history && (
                <PaymentHistory
                    item={history}
                    today={today}
                    onClose={() => setHistoryId(null)}
                />
            )}
        </>
    );
}
