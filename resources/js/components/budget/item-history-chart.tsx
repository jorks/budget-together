import { dateLabel, factors, money, Panel } from '@/components/budget/shared';
import type { BillRecord, ItemRevision } from '@/types/budget';

type Point = { date: string; amount: number; label: string };

function HistoryChart({
    points,
    title,
    description,
    today,
    step,
}: {
    points: Point[];
    title: string;
    description: string;
    today: string;
    step: boolean;
}) {
    if (points.length < 2) return null;
    const ordered = [...points].sort((a, b) => a.date.localeCompare(b.date));
    const timestamp = (date: string) => Date.parse(`${date}T12:00:00Z`);
    const first = timestamp(ordered[0].date);
    const last = timestamp(ordered.at(-1)!.date);
    const span = Math.max(1, last - first);
    const maximum = Math.max(1, ...ordered.map((point) => point.amount));
    const x = (date: string) => 80 + ((timestamp(date) - first) / span) * 540;
    const y = (amount: number) => 195 - (amount / maximum) * 150;
    return (
        <Panel>
            <h2 className="font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            <svg
                className="mt-4 w-full"
                viewBox="0 0 700 250"
                role="img"
                aria-label={title}
            >
                <title>{title}</title>
                <desc>
                    {ordered
                        .map(
                            (point) =>
                                `${dateLabel(point.date)}: ${point.label}${point.date > today ? ' (scheduled)' : ''}`,
                        )
                        .join('; ')}
                </desc>
                {[0, 0.5, 1].map((fraction) => (
                    <g key={fraction}>
                        <line
                            x1="80"
                            x2="620"
                            y1={y(maximum * fraction)}
                            y2={y(maximum * fraction)}
                            className="stroke-border"
                        />
                        <text
                            x="72"
                            y={y(maximum * fraction) + 4}
                            textAnchor="end"
                            className="fill-muted-foreground text-[13px]"
                        >
                            {money(maximum * fraction)}
                        </text>
                    </g>
                ))}
                {ordered.slice(1).map((point, index) => {
                    const previous = ordered[index];
                    const path = step
                        ? `M${x(previous.date)},${y(previous.amount)} H${x(point.date)} V${y(point.amount)}`
                        : `M${x(previous.date)},${y(previous.amount)} L${x(point.date)},${y(point.amount)}`;
                    if (step && previous.date <= today && point.date > today) {
                        return (
                            <g key={`${point.date}-${index}`}>
                                <path
                                    d={`M${x(previous.date)},${y(previous.amount)} H${x(today)}`}
                                    fill="none"
                                    strokeWidth="3"
                                    className="stroke-primary"
                                />
                                <path
                                    d={`M${x(today)},${y(previous.amount)} H${x(point.date)} V${y(point.amount)}`}
                                    fill="none"
                                    strokeWidth="3"
                                    strokeDasharray="6 5"
                                    className="stroke-primary"
                                />
                            </g>
                        );
                    }
                    return (
                        <path
                            key={`${point.date}-${index}`}
                            d={path}
                            fill="none"
                            strokeWidth="3"
                            strokeDasharray={
                                point.date > today ? '6 5' : undefined
                            }
                            className="stroke-primary"
                        />
                    );
                })}
                {ordered.map((point, index) => (
                    <g key={`${point.date}-${index}`}>
                        <circle
                            cx={x(point.date)}
                            cy={y(point.amount)}
                            r="4"
                            className="fill-primary"
                        >
                            <title>
                                {`${dateLabel(point.date)}: ${point.label}${point.date > today ? ' (scheduled)' : ''}`}
                            </title>
                        </circle>
                        {(index === 0 || index === ordered.length - 1) && (
                            <text
                                x={x(point.date)}
                                y="230"
                                textAnchor="middle"
                                className="fill-muted-foreground text-[13px]"
                            >
                                {dateLabel(point.date)}
                            </text>
                        )}
                    </g>
                ))}
            </svg>
        </Panel>
    );
}

export function ItemHistoryCharts({
    revisions,
    bills,
    today,
}: {
    revisions: ItemRevision[];
    bills: BillRecord[];
    today: string;
}) {
    const pricePoints = revisions
        .filter((revision) => revision.effective_from !== null)
        .map((revision) => {
            const annual =
                revision.amount_cents *
                (revision.cadence === 'custom'
                    ? revision.payments_per_year!
                    : factors[revision.cadence]);
            return {
                date: revision.effective_from!,
                amount: annual / 12,
                label: `${money(annual / 12)} monthly equivalent`,
            };
        });
    return (
        <>
            <HistoryChart
                points={pricePoints}
                title="Planned cost over time"
                description="Monthly equivalents let you compare different frequencies. Dashed lines show scheduled changes. The starting plan has no known effective date and is listed in history below."
                today={today}
                step
            />
            <HistoryChart
                points={bills.map((bill) => ({
                    date: bill.billed_on,
                    amount: bill.amount_cents,
                    label: money(bill.amount_cents),
                }))}
                title="Actual bills over time"
                description="Amounts on each bill date. Check billing periods in history when comparing bills of different lengths."
                today={today}
                step={false}
            />
        </>
    );
}
