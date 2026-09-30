import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowDownLeft,
    ArrowUpRight,
    CalendarDays,
    Check,
    CircleDollarSign,
    History,
    Pencil,
    PiggyBank,
    Plus,
    Search,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { Accounts } from '@/components/budget/accounts';
import { BillCalendar } from '@/components/budget/bill-calendar';
import { Household } from '@/components/budget/household';
import { ItemEditor } from '@/components/budget/item-editor';
import { PaymentHistory } from '@/components/budget/payment-history';
import {
    cadences,
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
import type { BudgetItem, BudgetProps, Kind, Period } from '@/types/budget';

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
    calendar: ['Your bill calendar', 'See when things land, before they do.'],
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
const periods: Record<Period, string> = {
    weekly: 'Weekly',
    fortnightly: 'Fortnightly',
    monthly: 'Monthly',
    annually: 'Annually',
};

function ItemTable({
    items,
    onEdit,
    onHistory,
    isIncome = false,
}: {
    items: BudgetItem[];
    onEdit: (item: BudgetItem) => void;
    onHistory: (item: BudgetItem) => void;
    isIncome?: boolean;
}) {
    return (
        <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full min-w-225 text-left text-sm">
                <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                    <tr>
                        {[
                            'Name / category',
                            isIncome ? 'Take-home basis' : 'Entered amount',
                            'Per year',
                            'Per month',
                            'Per fortnight',
                            'Per week',
                            '',
                        ].map((name, i) => (
                            <th
                                key={i}
                                className={cn(
                                    'px-4 py-4 font-medium',
                                    i > 1 && i < 6 && 'text-right',
                                )}
                            >
                                {name || (
                                    <span className="sr-only">Actions</span>
                                )}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {items.map((item) => (
                        <tr
                            key={item.id}
                            className={cn(
                                'border-b last:border-0 hover:bg-muted/20',
                                !item.is_active && 'opacity-60',
                            )}
                        >
                            <td className="px-4 py-4">
                                <button
                                    className="text-left font-semibold hover:underline"
                                    onClick={() => onEdit(item)}
                                >
                                    {item.name}
                                </button>
                                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                                    <span>
                                        {item.person ||
                                            item.category ||
                                            'Uncategorised'}
                                    </span>
                                    {item.is_variable && (
                                        <Badge variant="secondary">
                                            Forecast
                                        </Badge>
                                    )}
                                    {!item.is_active && (
                                        <Badge variant="outline">Paused</Badge>
                                    )}
                                </div>
                                {item.due_date && (
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Due {dateLabel(item.due_date)}
                                    </p>
                                )}
                            </td>
                            <td className="px-4 py-4">
                                <p className="tabular-nums">
                                    {item.use_tax_estimate
                                        ? 'Tax estimate'
                                        : money(item.amount_cents)}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {item.use_tax_estimate
                                        ? `${item.tax_year}–${String(item.tax_year + 1).slice(-2)} · ${item.include_bonus ? 'with bonus' : 'before bonus'}`
                                        : item.cadence === 'custom'
                                          ? `${item.payments_per_year} times / year`
                                          : cadences[item.cadence]}
                                </p>
                            </td>
                            {(
                                [
                                    'annually',
                                    'monthly',
                                    'fortnightly',
                                    'weekly',
                                ] as Period[]
                            ).map((period) => (
                                <td
                                    key={period}
                                    className="px-4 py-4 text-right whitespace-nowrap tabular-nums"
                                >
                                    {money(item.equivalents[period])}
                                </td>
                            ))}
                            <td className="px-2 py-4">
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
                                                    { preserveScroll: true },
                                                );
                                        }}
                                    >
                                        <Trash2 className="size-4" />
                                    </Button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
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
    const [period, setPeriod] = useState<Period>('fortnightly');
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState('all');
    const [showPaused, setShowPaused] = useState(false);
    const [editing, setEditing] = useState<{
        item?: BudgetItem;
        kind: Kind;
    } | null>(null);
    const [historyId, setHistoryId] = useState<number | null>(null);
    const history = items.find((item) => item.id === historyId);
    const edit = (item: BudgetItem) => setEditing({ item, kind: item.kind });
    const add = (kind: Kind) => setEditing({ kind });
    const categories = [
        ...new Set([
            ...items
                .map((item) => item.category)
                .filter((name): name is string => !!name),
            'Mortgage',
            'Daycare',
            'Utilities',
            'Subscriptions',
            'Insurance',
            'Transport',
            'Health & fitness',
            'Personal',
            'Everyday',
            'Savings',
        ]),
    ].sort();
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
            (category === 'all' || item.category === category) &&
            `${item.name} ${item.category ?? ''} ${item.person ?? ''}`
                .toLowerCase()
                .includes(query.toLowerCase()),
    );
    const upcoming = props.events
        .filter((event) => event.date >= today)
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
                    {['overview', 'income', 'bills', 'plan', 'funds'].includes(
                        view,
                    ) && (
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
                {['overview', 'plan'].includes(view) && (
                    <>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <h2 className="text-sm font-medium">
                                The household picture
                            </h2>
                            <div
                                className="flex flex-wrap gap-1 rounded-lg bg-muted p-1"
                                aria-label="Budget period"
                            >
                                {(Object.keys(periods) as Period[]).map(
                                    (value) => (
                                        <button
                                            key={value}
                                            className={cn(
                                                'rounded-md px-3 py-1.5 text-xs transition',
                                                period === value
                                                    ? 'bg-background font-semibold shadow-xs'
                                                    : 'text-muted-foreground hover:text-foreground',
                                            )}
                                            aria-pressed={period === value}
                                            onClick={() => setPeriod(value)}
                                        >
                                            {periods[value]}
                                        </button>
                                    ),
                                )}
                            </div>
                        </div>
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
                                    <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
                                        <span>{stat.label}</span>
                                        <stat.icon className="size-4" />
                                    </div>
                                    <p
                                        className={cn(
                                            'mt-4 text-3xl font-semibold tracking-tight tabular-nums',
                                            stat.value < 0 &&
                                                'text-destructive',
                                        )}
                                    >
                                        {money(stat.value)}
                                    </p>
                                    <p className="mt-2 text-xs text-muted-foreground">
                                        {stat.caption}
                                    </p>
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
                                    <h2 className="font-semibold">
                                        Where the plan goes
                                    </h2>
                                    <Button variant="ghost" size="sm" asChild>
                                        <Link href={plan()}>
                                            View plan{' '}
                                            <ArrowUpRight className="size-4" />
                                        </Link>
                                    </Button>
                                </div>
                                {[
                                    {
                                        name: 'Known bills',
                                        value: totals.bill[period],
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
                                ].map(({ name, value, route }, index) => (
                                    <div className="mb-5" key={name}>
                                        <div className="mb-2 flex justify-between gap-3 text-sm">
                                            <Link
                                                className="hover:underline"
                                                href={route}
                                            >
                                                {name}
                                            </Link>
                                            <span className="font-medium tabular-nums">
                                                {money(Number(value))}
                                            </span>
                                        </div>
                                        <div className="h-2 rounded-full bg-muted">
                                            <div
                                                className={cn(
                                                    'h-2 rounded-full',
                                                    [
                                                        'bg-primary',
                                                        'bg-sky-500',
                                                        'bg-amber-400',
                                                    ][index],
                                                )}
                                                style={{
                                                    width: `${Math.min(100, (Number(value) / Math.max(1, totals.income[period])) * 100)}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
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
                {['income', 'bills', 'plan'].includes(view) && (
                    <>
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
                        {visible.length ? (
                            <ItemTable
                                items={visible}
                                onEdit={edit}
                                onHistory={(item) => setHistoryId(item.id)}
                                isIncome={view === 'income'}
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
                            months. Paused items are excluded from totals.
                        </p>
                        {view === 'income' && (
                            <div className="grid gap-4 md:grid-cols-2">
                                {visible
                                    .filter((item) => item.tax_estimate)
                                    .map((item) => (
                                        <Panel key={item.id}>
                                            <h3 className="font-semibold">
                                                {item.person || item.name} · tax
                                                estimate
                                            </h3>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                {item.tax_year}–
                                                {String(
                                                    item.tax_year + 1,
                                                ).slice(-2)}{' '}
                                                ·{' '}
                                                {item.include_bonus
                                                    ? 'Including bonus'
                                                    : 'Before bonus'}{' '}
                                                ·{' '}
                                                {item.use_tax_estimate
                                                    ? 'Used in budget'
                                                    : 'Budget uses manual take-home'}
                                            </p>
                                            <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
                                                {[
                                                    [
                                                        'Gross income',
                                                        item.tax_estimate!
                                                            .gross_cents,
                                                    ],
                                                    [
                                                        'Income tax',
                                                        item.tax_estimate!
                                                            .tax_cents,
                                                    ],
                                                    [
                                                        'Standard Medicare levy',
                                                        item.tax_estimate!
                                                            .medicare_cents,
                                                    ],
                                                    [
                                                        'Estimated take-home',
                                                        item.tax_estimate!
                                                            .net_cents,
                                                    ],
                                                ].map(([name, value]) => (
                                                    <div key={name}>
                                                        <dt className="text-muted-foreground">
                                                            {name}
                                                        </dt>
                                                        <dd className="mt-1 font-semibold tabular-nums">
                                                            {money(
                                                                Number(value),
                                                            )}
                                                        </dd>
                                                    </div>
                                                ))}
                                            </dl>
                                            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                                                Resident marginal tax estimate
                                                only. Excludes offsets,
                                                deductions, HELP, Medicare
                                                surcharge and levy reductions.
                                                Salary excludes employer super.
                                            </p>
                                        </Panel>
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
                    />
                )}
                {view === 'household' && (
                    <Household
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
                    categories={categories}
                    today={today}
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
