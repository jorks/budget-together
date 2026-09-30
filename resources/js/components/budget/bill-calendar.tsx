import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { dateLabel, Empty, money, Panel } from '@/components/budget/shared';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { calendar } from '@/routes';
import type { BillEvent } from '@/types/budget';

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
                        {events.length} scheduled bills ·{' '}
                        {money(
                            events.reduce(
                                (sum, event) => sum + event.amount_cents,
                                0,
                            ),
                        )}{' '}
                        forecast
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
                <div className="grid grid-cols-7 border-b bg-muted/40">
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
                                                            className="min-w-0 rounded-md bg-primary/8 p-2 text-left text-xs transition hover:bg-primary/15 focus-visible:ring-2 focus-visible:ring-ring"
                                                        >
                                                            <span className="block truncate font-medium">
                                                                {event.name}
                                                            </span>
                                                            <span className="text-muted-foreground">
                                                                {money(
                                                                    event.amount_cents,
                                                                )}
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
                        className="flex w-full items-center justify-between gap-4 border-t py-4 text-left hover:bg-muted/30"
                    >
                        <div>
                            <p className="text-sm font-medium">{event.name}</p>
                            <p className="text-xs text-muted-foreground">
                                {dateLabel(event.date)} ·{' '}
                                {event.account ?? 'Account not assigned'}
                            </p>
                        </div>
                        <p className="text-sm font-semibold tabular-nums">
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
                        Add a due date to a bill to see it here.
                    </Empty>
                )}
            </Panel>
            <p className="text-xs leading-relaxed text-muted-foreground">
                Scheduled dates are forecasts, not payment confirmations. Weekly
                and fortnightly bills follow real dates; calendar totals can
                differ from annualised budget averages. Custom instalments show
                only the entered due date.
            </p>
        </div>
    );
}
