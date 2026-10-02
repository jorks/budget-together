import { Link } from '@inertiajs/react';
import { useState } from 'react';
import { dateLabel, Field, money, Panel } from '@/components/budget/shared';
import type { Projection } from '@/lib/mortgage';
import {
    mortgageBalanceAtYear,
    combinedSuperProjection,
    superBalanceAtYear,
} from '@/lib/retirement';
import { household } from '@/routes';
import type { RetirementMember } from '@/types/retirement';

export function RetirementOutlook({
    members,
    mortgageProjection,
}: {
    members: RetirementMember[];
    mortgageProjection: Projection | null;
}) {
    const [selected, setSelected] = useState('household');
    const combined = selected === 'household';
    const member = members.find((person) => `member-${person.id}` === selected);
    const includedMembers = combined
        ? members.filter((person) => person.years_remaining !== null)
        : member
          ? [member]
          : [];
    const years = combined
        ? Math.max(
              0,
              ...includedMembers.map((person) => person.years_remaining ?? 0),
          )
        : (member?.years_remaining ?? 0);
    const superPoints = combined
        ? combinedSuperProjection(members)
        : (member?.super_projection ?? []);
    const canProject = combined
        ? includedMembers.length > 0
        : Boolean(member?.date_of_birth);
    const fundsCount = includedMembers.reduce(
        (total, person) => total + person.super_funds_count,
        0,
    );
    const finalSuper = superPoints.at(-1)?.balance_cents;
    const finalMortgage = mortgageProjection
        ? mortgageBalanceAtYear(mortgageProjection, years)
        : null;
    const elapsed = Array.from({ length: Math.ceil(years) + 1 }, (_, i) =>
        Math.min(i, years),
    );
    const timeline = [
        ...new Set([
            ...elapsed,
            ...superPoints.map((point) => point.year),
            ...(mortgageProjection
                ? mortgageProjection.years
                      .map((point) => point.year)
                      .filter((year) => year <= years)
                : []),
        ]),
    ].sort((a, b) => a - b);
    const superAt = (year: number) => superBalanceAtYear(superPoints, year);
    const max = Math.max(
        1,
        ...superPoints.map((point) => point.balance_cents),
        mortgageProjection?.years[0]?.balance ?? 0,
    );
    const x = (year: number) => 80 + (year / Math.max(1, years)) * 580;
    const y = (balance: number) => 225 - (balance / max) * 190;
    const path = (getBalance: (year: number) => number) =>
        timeline
            .map(
                (year, i) =>
                    `${i ? 'L' : 'M'}${x(year)},${y(getBalance(year))}`,
            )
            .join(' ');
    const ageNow = (member?.retirement_age ?? 65) - years;
    return (
        <Panel>
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h2 className="font-semibold">
                        Super and mortgage at retirement
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Compare combined household super with your mortgage, or
                        explore one person’s outlook.
                    </p>
                </div>
                {members.length > 0 && (
                    <div className="w-48">
                        <Field
                            label="Outlook view"
                            value={selected}
                            onChange={setSelected}
                            options={{
                                household: 'Combined household',
                                ...Object.fromEntries(
                                    members.map((person) => [
                                        `member-${person.id}`,
                                        person.name,
                                    ]),
                                ),
                            }}
                        />
                    </div>
                )}
            </div>
            {!canProject ? (
                <p className="mt-4 text-sm text-muted-foreground">
                    Add a date of birth in{' '}
                    <Link href={household()} className="underline">
                        Household
                    </Link>{' '}
                    to plot age and retirement. Retirement age defaults to 65
                    and can be changed for each person.
                </p>
            ) : (
                <>
                    <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                        {includedMembers.map((person) => (
                            <p key={person.id}>
                                {person.name} · age {person.age} · retirement
                                target {person.retirement_age} (
                                {person.retirement_date
                                    ? dateLabel(person.retirement_date)
                                    : ''}
                                )
                            </p>
                        ))}
                    </div>
                    {combined &&
                        members.some(
                            (person) => person.years_remaining === null,
                        ) && (
                            <p className="mt-3 text-sm text-amber-700 dark:text-amber-400">
                                Partial household projection: add dates of birth
                                for{' '}
                                {members
                                    .filter(
                                        (person) =>
                                            person.years_remaining === null,
                                    )
                                    .map((person) => person.name)
                                    .join(', ')}{' '}
                                to include their super.
                            </p>
                        )}
                    {years === 0 && (
                        <p className="mt-2 text-sm text-muted-foreground">
                            This retirement age has already been reached.
                            Showing starting balances today; no future
                            contributions or retirement drawdowns are modelled.
                        </p>
                    )}
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <div className="rounded-lg bg-muted p-4">
                            <p className="text-xs text-muted-foreground">
                                {years === 0
                                    ? 'Recorded super balance'
                                    : combined
                                      ? 'Combined super at last retirement'
                                      : `Super at age ${member?.retirement_age}`}
                            </p>
                            <p className="mt-2 text-xl font-semibold tabular-nums">
                                {finalSuper === undefined
                                    ? 'No linked funds'
                                    : money(finalSuper)}
                            </p>
                        </div>
                        <div className="rounded-lg bg-muted p-4">
                            <p className="text-xs text-muted-foreground">
                                {years === 0
                                    ? 'Starting household mortgage'
                                    : combined
                                      ? 'Mortgage at last retirement'
                                      : `Household mortgage at age ${member?.retirement_age}`}
                            </p>
                            <p className="mt-2 text-xl font-semibold tabular-nums">
                                {finalMortgage === null
                                    ? 'No mortgage projection'
                                    : money(finalMortgage)}
                            </p>
                        </div>
                    </div>
                    {years > 0 &&
                        (superPoints.length > 0 || mortgageProjection) && (
                            <svg
                                viewBox="0 0 720 280"
                                role="img"
                                aria-label={
                                    combined
                                        ? 'Combined household super and mortgage through retirement'
                                        : `Super and household mortgage by age for ${member?.name}, up to retirement age ${member?.retirement_age}`
                                }
                                className="mt-4 w-full"
                            >
                                <title>
                                    Super and household mortgage by age for{' '}
                                    {combined ? 'the household' : member?.name}
                                </title>
                                {[0, 0.5, 1].map((fraction) => (
                                    <g key={fraction}>
                                        <line
                                            x1="80"
                                            x2="660"
                                            y1={y(max * fraction)}
                                            y2={y(max * fraction)}
                                            className="stroke-border"
                                        />
                                        <text
                                            x="72"
                                            y={y(max * fraction) + 4}
                                            textAnchor="end"
                                            className="fill-muted-foreground text-[11px]"
                                        >
                                            $
                                            {Math.round(
                                                (max * fraction) / 100000,
                                            )}
                                            k
                                        </text>
                                    </g>
                                ))}
                                {superPoints.length > 0 && (
                                    <path
                                        d={path(superAt)}
                                        fill="none"
                                        strokeWidth="3"
                                        className="stroke-primary"
                                    />
                                )}
                                {mortgageProjection && (
                                    <path
                                        d={path((year) =>
                                            mortgageBalanceAtYear(
                                                mortgageProjection,
                                                year,
                                            ),
                                        )}
                                        fill="none"
                                        strokeWidth="2"
                                        strokeDasharray="6 4"
                                        className="stroke-muted-foreground"
                                    />
                                )}
                                {[0, 0.5, 1].map((fraction) => (
                                    <text
                                        key={fraction}
                                        x={x(years * fraction)}
                                        y="252"
                                        textAnchor="middle"
                                        className="fill-muted-foreground text-[11px]"
                                    >
                                        {combined ? 'Year ' : 'Age '}
                                        {fraction === 1
                                            ? combined
                                                ? Math.round(years * 10) / 10
                                                : member?.retirement_age
                                            : Math.round(
                                                  ((combined ? 0 : ageNow) +
                                                      years * fraction) *
                                                      10,
                                              ) / 10}
                                    </text>
                                ))}
                                {includedMembers.map((person, index) => (
                                    <g key={person.id}>
                                        <line
                                            x1={x(person.years_remaining ?? 0)}
                                            x2={x(person.years_remaining ?? 0)}
                                            y1="25"
                                            y2="225"
                                            strokeDasharray="3 4"
                                            className="stroke-primary/50"
                                        />
                                        <text
                                            x={x(person.years_remaining ?? 0)}
                                            y={index % 2 === 0 ? 18 : 32}
                                            textAnchor="end"
                                            className="fill-muted-foreground text-[10px]"
                                        >
                                            {combined
                                                ? `${person.name} retires`
                                                : 'Retirement'}
                                        </text>
                                    </g>
                                ))}
                            </svg>
                        )}
                    <div className="mt-3 flex flex-wrap gap-5 text-xs text-muted-foreground">
                        {superPoints.length > 0 && (
                            <span>
                                ━━{' '}
                                {combined
                                    ? 'Combined household super'
                                    : `${member?.name}’s super`}{' '}
                                ({fundsCount} funds)
                            </span>
                        )}
                        {mortgageProjection && (
                            <span>┄┄ Shared household mortgage</span>
                        )}
                    </div>
                    {superPoints.length === 0 && (
                        <p className="mt-3 text-sm text-muted-foreground">
                            Link funds to their household members in Edit fund
                            to include super here.
                        </p>
                    )}
                    <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                        Uses the latest recorded super balances as starting
                        amounts today; update old statements first. Super
                        follows each fund’s return, costs and contribution
                        assumptions. The mortgage includes offset and extra
                        repayments; balances between annual points are
                        estimates. Future dollars, without inflation or
                        withdrawals after retirement.{' '}
                        {combined &&
                            'Each person’s balance is held steady after their own retirement; the timeline ends at the last retirement. '}
                        <Link href={household()} className="underline">
                            Edit date of birth and retirement age
                        </Link>
                        .
                    </p>
                </>
            )}
        </Panel>
    );
}
