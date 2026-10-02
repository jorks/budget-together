import { dateLabel, money } from '@/components/budget/shared';
import type { SuperBalance, SuperPoint } from '@/types/superannuation';

function Chart({
    points,
    label,
    baseline,
}: {
    points: { x: number; value: number; label: string }[];
    label: string;
    baseline?: number[];
}) {
    const maximum = Math.max(
        1,
        ...points.map((point) => point.value),
        ...(baseline ?? []),
    );
    const minX = points[0]?.x ?? 0;
    const span = Math.max(1, (points.at(-1)?.x ?? 0) - minX);
    const x = (value: number) => 85 + ((value - minX) / span) * 585;
    const y = (value: number) => 220 - (value / maximum) * 190;
    const path = (values: number[]) =>
        values
            .map((value, i) => `${i ? 'L' : 'M'}${x(points[i].x)},${y(value)}`)
            .join(' ');
    return (
        <svg
            viewBox="0 0 720 270"
            role="img"
            aria-label={label}
            className="w-full"
        >
            <title>{label}</title>
            {[0, 0.5, 1].map((fraction) => (
                <g key={fraction}>
                    <line
                        x1="85"
                        x2="670"
                        y1={y(maximum * fraction)}
                        y2={y(maximum * fraction)}
                        className="stroke-border"
                    />
                    <text
                        x="77"
                        y={y(maximum * fraction) + 4}
                        textAnchor="end"
                        className="fill-muted-foreground text-[11px]"
                    >
                        ${Math.round((maximum * fraction) / 100000)}k
                    </text>
                </g>
            ))}
            {baseline && (
                <path
                    d={path(baseline)}
                    fill="none"
                    strokeWidth="2"
                    strokeDasharray="5 5"
                    className="stroke-muted-foreground"
                />
            )}
            <path
                d={path(points.map((point) => point.value))}
                fill="none"
                strokeWidth="3"
                className="stroke-primary"
            />
            {points.map((point, i) => (
                <g key={point.x}>
                    <circle
                        cx={x(point.x)}
                        cy={y(point.value)}
                        r="3"
                        className="fill-primary"
                    >
                        <title>
                            {point.label}: {money(point.value)}
                        </title>
                    </circle>
                    {(i === 0 ||
                        i === points.length - 1 ||
                        (points.length > 6 &&
                            i === Math.floor(points.length / 2))) && (
                        <text
                            x={x(point.x)}
                            y="250"
                            textAnchor="middle"
                            className="fill-muted-foreground text-[11px]"
                        >
                            {point.label}
                        </text>
                    )}
                </g>
            ))}
        </svg>
    );
}

export function ProjectionChart({ points }: { points: SuperPoint[] }) {
    return (
        <Chart
            label="Projected super balance compared with starting balance plus net contributions"
            points={points.map((point) => ({
                x: point.year,
                value: point.balance_cents,
                label: `Year ${point.year}`,
            }))}
            baseline={points.map((point) => point.contributions_cents)}
        />
    );
}

export function HistoryChart({
    balances,
    name,
}: {
    balances: SuperBalance[];
    name: string;
}) {
    return (
        <Chart
            label={`Recorded balance history for ${name}`}
            points={balances.map((balance) => ({
                x: new Date(`${balance.recorded_on}T12:00:00`).getTime(),
                value: balance.balance_cents,
                label: dateLabel(balance.recorded_on),
            }))}
        />
    );
}
