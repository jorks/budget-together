import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
    cadences,
    CategoryIcon,
    dateLabel,
    Empty,
    money,
    Panel,
} from '@/components/budget/shared';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { calendar } from '@/routes';
import type { BillEvent } from '@/types/budget';

function isMortgageBill(event: BillEvent): boolean {
    return (
        event.kind === 'bill' &&
        event.category?.trim().toLowerCase() === 'mortgage'
    );
}

function isAnnualBill(event: BillEvent): boolean {
    return (
        event.kind === 'bill' &&
        event.cadence === 'annually' &&
        !isMortgageBill(event)
    );
}

export function BillCalendar({
    month,
    today,
    events,
    onEdit,
}: {
    month: string;
    today: string;
    events: BillEvent[];
    onEdit: (id: number) => void;
}) {
    const [year, monthNumber] = month.split('-').map(Number);
    const first = new Date(year, monthNumber - 1, 1);
    const offset = (first.getDay() + 6) % 7;
    const days = new Date(year, monthNumber, 0).getDate();
    const shift = (delta: number) => {
        const date = new Date(year, monthNumber - 1 + delta, 1);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    };
    return (
        <div className="grid gap-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-semibold">
                        {first.toLocaleDateString('en-AU', {
                            month: 'long',
                            year: 'numeric',
                        })}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {events.length} scheduled events ·{' '}
                        <span className="text-primary">
                            Income +
                            {money(
                                events
                                    .filter((event) => event.kind === 'income')
                                    .reduce(
                                        (sum, event) =>
                                            sum + event.amount_cents,
                                        0,
                                    ),
                            )}
                        </span>{' '}
                        ·{' '}
                        <span className="text-foreground">
                            Bills −
                            {money(
                                events
                                    .filter((event) => event.kind === 'bill')
                                    .reduce(
                                        (sum, event) =>
                                            sum + event.amount_cents,
                                        0,
                                    ),
                            )}
                        </span>
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" asChild>
                        <Link
                            href={calendar({ query: { month: shift(-1) } })}
                            aria-label="Previous month"
                        >
                            <ChevronLeft className="size-4" />
                        </Link>
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href={calendar()}>This month</Link>
                    </Button>
                    <Button variant="outline" size="icon" asChild>
                        <Link
                            href={calendar({ query: { month: shift(1) } })}
                            aria-label="Next month"
                        >
                            <ChevronRight className="size-4" />
                        </Link>
                    </Button>
                </div>
            </div>
            <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
                <div className="grid grid-cols-7 border-b bg-primary/5">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(
                        (day) => (
                            <div
                                key={day}
                                className="p-3 text-xs font-medium text-muted-foreground"
                            >
                                {day}
                            </div>
                        ),
                    )}
                </div>
                <div className="grid grid-cols-7">
                    {Array.from(
                        { length: Math.ceil((offset + days) / 7) * 7 },
                        (_, index) => {
                            const day = index - offset + 1;
                            const valid = day > 0 && day <= days;
                            const date = `${month}-${String(day).padStart(2, '0')}`;
                            return (
                                <div
                                    key={index}
                                    className={cn(
                                        'min-h-32 min-w-0 border-r border-b p-2 last:border-r-0',
                                        !valid && 'bg-muted/30',
                                    )}
                                >
                                    {valid && (
                                        <>
                                            <span
                                                className={cn(
                                                    'mb-2 inline-flex size-7 items-center justify-center rounded-full text-xs',
                                                    date === today &&
                                                        'bg-primary font-semibold text-primary-foreground',
                                                )}
                                            >
                                                {day}
                                            </span>
                                            <div className="grid gap-1">
                                                {events
                                                    .filter(
                                                        (event) =>
                                                            event.date === date,
                                                    )
                                                    .map((event) => (
                                                        <button
                                                            key={`${event.id}-${date}`}
                                                            onClick={() =>
                                                                onEdit(event.id)
                                                            }
                                                            className={cn(
                                                                'min-w-0 rounded-md p-2 text-left text-xs transition focus-visible:ring-2 focus-visible:ring-ring',
                                                                event.kind ===
                                                                    'income'
                                                                    ? 'bg-primary/10 text-primary hover:bg-primary/20'
                                                                    : isMortgageBill(
                                                                            event,
                                                                        )
                                                                      ? 'bg-red-900/5 ring-1 ring-red-900/15 ring-inset hover:bg-red-900/10 dark:bg-red-300/10 dark:ring-red-300/20 dark:hover:bg-red-300/15'
                                                                      : isAnnualBill(
                                                                              event,
                                                                          )
                                                                        ? 'bg-blue-900/5 ring-1 ring-blue-900/15 ring-inset hover:bg-blue-900/10 dark:bg-blue-300/10 dark:ring-blue-300/20 dark:hover:bg-blue-300/15'
                                                                        : 'bg-muted/70 hover:bg-primary/10',
                                                            )}
                                                        >
                                                            <span className="flex items-center gap-1.5">
                                                                <CategoryIcon
                                                                    category={
                                                                        event.category
                                                                    }
                                                                    className={cn(
                                                                        'size-3.5',
                                                                        isAnnualBill(
                                                                            event,
                                                                        )
                                                                            ? 'text-blue-900/65 dark:text-blue-300/70'
                                                                            : event.kind ===
                                                                                  'bill' &&
                                                                                  'text-red-900/65 dark:text-red-300/70',
                                                                    )}
                                                                />
                                                                <span
                                                                    className={
                                                                        isMortgageBill(
                                                                            event,
                                                                        ) ||
                                                                        isAnnualBill(
                                                                            event,
                                                                        )
                                                                            ? 'font-semibold'
                                                                            : 'truncate font-medium'
                                                                    }
                                                                >
                                                                    {event.name}
                                                                </span>
                                                            </span>
                                                            <span
                                                                className={cn(
                                                                    'mt-1 block',
                                                                    event.kind ===
                                                                        'income'
                                                                        ? 'text-primary/80'
                                                                        : 'text-muted-foreground',
                                                                )}
                                                            >
                                                                {event.kind ===
                                                                'income'
                                                                    ? 'Income '
                                                                    : isAnnualBill(
                                                                            event,
                                                                        )
                                                                      ? 'Annual bill '
                                                                      : 'Bill '}
                                                                <span
                                                                    className={
                                                                        event.kind ===
                                                                        'bill'
                                                                            ? 'text-muted-foreground'
                                                                            : undefined
                                                                    }
                                                                >
                                                                    {event.kind ===
                                                                    'income'
                                                                        ? '+'
                                                                        : '−'}
                                                                    {money(
                                                                        event.amount_cents,
                                                                    )}
                                                                </span>
                                                                {event.is_variable
                                                                    ? ' est.'
                                                                    : ''}
                                                            </span>
                                                        </button>
                                                    ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        },
                    )}
                </div>
            </div>
            <Panel>
                <h3 className="mb-3 font-semibold">Month at a glance</h3>
                {events.map((event) => (
                    <button
                        key={`${event.id}-${event.date}`}
                        onClick={() => onEdit(event.id)}
                        className={cn(
                            'flex w-full items-center justify-between gap-4 border-t py-4 text-left',
                            event.kind === 'income'
                                ? 'rounded-md bg-primary/10 px-3 hover:bg-primary/20'
                                : isMortgageBill(event)
                                  ? 'rounded-md bg-red-900/5 px-3 hover:bg-red-900/10 dark:bg-red-300/10 dark:hover:bg-red-300/15'
                                  : isAnnualBill(event)
                                    ? 'rounded-md bg-blue-900/5 px-3 hover:bg-blue-900/10 dark:bg-blue-300/10 dark:hover:bg-blue-300/15'
                                    : 'hover:bg-muted/30',
                        )}
                    >
                        <div className="flex min-w-0 items-center gap-3">
                            <CategoryIcon
                                category={event.category}
                                className={
                                    isAnnualBill(event)
                                        ? 'text-blue-900/65 dark:text-blue-300/70'
                                        : event.kind === 'bill'
                                          ? 'text-red-900/65 dark:text-red-300/70'
                                          : undefined
                                }
                            />
                            <div className="min-w-0">
                                <p
                                    className={cn(
                                        'text-sm font-medium',
                                        (isMortgageBill(event) ||
                                            isAnnualBill(event)) &&
                                            'font-semibold',
                                        event.kind === 'income' &&
                                            'text-primary',
                                    )}
                                >
                                    {event.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {dateLabel(event.date)} ·{' '}
                                    {event.kind === 'income'
                                        ? 'Income'
                                        : isAnnualBill(event)
                                          ? 'Annual bill'
                                          : 'Bill'}{' '}
                                    · {cadences[event.cadence]} ·{' '}
                                    {event.account ?? 'Account not assigned'}
                                </p>
                            </div>
                        </div>
                        <p
                            className={cn(
                                'shrink-0 text-sm font-semibold tabular-nums',
                                event.kind === 'income'
                                    ? 'text-primary'
                                    : 'text-muted-foreground',
                            )}
                        >
                            {event.kind === 'income' ? '+' : '−'}
                            {money(event.amount_cents)}
                            {event.is_variable && (
                                <span className="ml-1 font-normal text-muted-foreground">
                                    est.
                                </span>
                            )}
                        </p>
                    </button>
                ))}
                {!events.length && (
                    <Empty title="Nothing scheduled this month">
                        Add a due date to a bill or a known pay date to income
                        to see it here.
                    </Empty>
                )}
            </Panel>
            <p className="text-xs leading-relaxed text-muted-foreground">
                Scheduled dates are forecasts, not payment confirmations. Weekly
                and fortnightly schedules follow real dates; calendar totals can
                differ from annualised budget averages. Custom instalments show
                only the entered due date.
            </p>
        </div>
    );
}
