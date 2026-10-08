import { useForm, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import {
    Field,
    Panel,
    cents,
    dollars,
    dateLabel,
    money,
    cadences,
} from '@/components/budget/shared';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { store, update, destroy } from '@/routes/financial-changes';

export type FinancialValues = Record<string, string | number | boolean | null>;
export type FinancialChange = {
    id: number;
    effective_from: string | null;
    event_type: string;
    values: FinancialValues;
    payment_cents: number | null;
    notes: string | null;
};
export type RecordType = 'item' | 'mortgage' | 'debt' | 'super';
const labels: Record<string, string> = {
    amount_cents: 'Amount',
    cadence: 'Frequency',
    payments_per_year: 'Payments per year',
    gross_annual_cents: 'Gross annual salary, excluding super',
    bonus_annual_cents: 'Annual bonus before tax',
    salary_sacrifice_cents: 'Annual salary sacrifice',
    workplace_giving_cents: 'Annual workplace giving',
    other_deductions_cents: 'Annual after-tax deductions',
    use_tax_estimate: 'Use estimated take-home pay',
    include_bonus: 'Include bonus',
    include_medicare: 'Include Medicare levy',
    tax_year: 'Financial year',
    pay_date: 'Known pay date',
    balance_cents: 'Loan balance',
    annual_rate: 'Annual interest rate',
    term_years: 'Remaining term (years)',
    frequency: 'Repayment frequency',
    offset_cents: 'Offset balance',
    extra_cents: 'Extra repayment each period',
    repayment_cents: 'Regular repayment',
    due_date: 'Known repayment date',
    employer_rate: 'Employer contribution rate',
    annual_fee_cents: 'Annual fixed fee',
    fee_rate: 'Annual percentage fee',
    annual_insurance_cents: 'Annual insurance',
    return_rate: 'Estimated annual return',
};
const events: Record<string, string> = {
    update: 'Financial update',
    balance: 'Balance update',
    rate_change: 'Interest rate change',
    refinance: 'Refinance',
    extra_payment: 'Extra payment',
    baseline: 'Starting details',
};
const frequencies = {
    weekly: 'Weekly',
    fortnightly: 'Fortnightly',
    monthly: 'Monthly',
};
export function financialValues(
    source: object,
    type: RecordType,
): FinancialValues {
    const record = Object.fromEntries(Object.entries(source));
    const keys =
        type === 'mortgage'
            ? [
                  'balance_cents',
                  'annual_rate',
                  'term_years',
                  'frequency',
                  'offset_cents',
                  'extra_cents',
                  'due_date',
              ]
            : type === 'debt'
              ? [
                    'balance_cents',
                    'annual_rate',
                    'repayment_cents',
                    'extra_cents',
                    'frequency',
                    'due_date',
                ]
              : type === 'super'
                ? [
                      'employer_rate',
                      'annual_fee_cents',
                      'fee_rate',
                      'annual_insurance_cents',
                      'return_rate',
                      ...(record.income_id ? [] : ['salary_sacrifice_cents']),
                  ]
                : [
                      'amount_cents',
                      'cadence',
                      'payments_per_year',
                      ...(record.kind === 'income'
                          ? [
                                'gross_annual_cents',
                                'bonus_annual_cents',
                                'salary_sacrifice_cents',
                                'workplace_giving_cents',
                                'other_deductions_cents',
                                'use_tax_estimate',
                                'include_bonus',
                                'include_medicare',
                                'tax_year',
                                'pay_date',
                            ]
                          : []),
                  ];
    return Object.fromEntries(keys.map((key) => [key, record[key] ?? null]));
}
function displayValue(key: string, value: FinancialValues[string]): string {
    if (value === null || value === '') return 'Not set';
    if (key.endsWith('_cents')) return money(Number(value));
    if (key.includes('rate')) return `${value}%`;
    if (key.endsWith('_date')) return dateLabel(String(value));
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (key === 'cadence' || key === 'frequency')
        return cadences[String(value)] ?? String(value);
    return String(value);
}

export function FinancialEditor({
    type,
    id,
    values,
    today,
    change,
    onClose,
}: {
    type: RecordType;
    id: number;
    values: FinancialValues;
    today: string;
    change?: FinancialChange;
    onClose: () => void;
}) {
    const initial = Object.fromEntries(
        Object.entries(values).map(([key, value]) => [
            key,
            change && key in change.values ? change.values[key] : value,
        ]),
    );
    const form = useForm({
        effective_from: change?.effective_from ?? today,
        event_type: change?.event_type ?? 'update',
        payment: change?.payment_cents ? dollars(change.payment_cents) : '',
        notes: change?.notes ?? '',
        values: Object.fromEntries(
            Object.entries(initial).map(([key, value]) => [
                key,
                key.endsWith('_cents')
                    ? dollars(value === null ? undefined : Number(value))
                    : value === null
                      ? ''
                      : String(value),
            ]),
        ),
    });
    useUnsavedChanges(form.isDirty && !form.processing);
    const heading = useRef<HTMLHeadingElement>(null);
    useEffect(() => {
        heading.current?.focus();
        heading.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }, []);
    const errors = form.errors as Record<string, string>;
    const close = () => {
        if (!form.isDirty || window.confirm('Discard your unsaved changes?'))
            onClose();
    };
    return (
        <Panel>
            <form
                className="grid gap-5"
                onSubmit={(event) => {
                    event.preventDefault();
                    form.transform((data) => ({
                        effective_from: data.effective_from,
                        event_type: data.event_type,
                        payment_cents:
                            data.event_type === 'extra_payment'
                                ? cents(data.payment)
                                : null,
                        notes: data.notes,
                        values: Object.fromEntries(
                            Object.entries(data.values).map(([key, value]) => [
                                key,
                                key.endsWith('_cents')
                                    ? cents(value)
                                    : [
                                            'use_tax_estimate',
                                            'include_bonus',
                                            'include_medicare',
                                        ].includes(key)
                                      ? value === 'true'
                                      : value === ''
                                        ? null
                                        : value,
                            ]),
                        ),
                    }));
                    form.submit(
                        change
                            ? update({
                                  record_type: type,
                                  record_id: id,
                                  change: change.id,
                              })
                            : store({ record_type: type, record_id: id }),
                        { preserveScroll: true, onSuccess: onClose },
                    );
                }}
            >
                <div>
                    <h2
                        ref={heading}
                        tabIndex={-1}
                        className="text-lg font-semibold"
                    >
                        {change
                            ? 'Correct financial update'
                            : 'Record financial update'}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Enter the values that apply from this date. Scheduled
                        changes take effect automatically. Later recorded
                        balances remain separate snapshots.
                    </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                        label="Effective from"
                        type="date"
                        value={form.data.effective_from}
                        onChange={(value) =>
                            form.setData('effective_from', value)
                        }
                        error={errors.effective_from}
                        required
                    />
                    {(type === 'debt' || type === 'mortgage') && (
                        <Field
                            label="Update type"
                            value={form.data.event_type}
                            options={Object.fromEntries(
                                Object.entries(events).filter(
                                    ([key]) => key !== 'baseline',
                                ),
                            )}
                            onChange={(value) =>
                                form.setData('event_type', value)
                            }
                            error={errors.event_type}
                        />
                    )}
                </div>
                {form.data.event_type === 'extra_payment' && (
                    <>
                        <Field
                            label="Extra payment ($)"
                            type="money"
                            value={form.data.payment}
                            onChange={(value) => form.setData('payment', value)}
                            error={errors.payment_cents}
                            required
                        />
                        <p className="text-sm text-muted-foreground">
                            Also enter the loan balance after this payment, as
                            shown by your lender. We use that balance in
                            projections and record the payment once.
                        </p>
                    </>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                    {Object.keys(initial)
                        .filter(
                            (key) =>
                                key !== 'payments_per_year' ||
                                form.data.values.cadence === 'custom',
                        )
                        .map((key) => {
                            const boolean = [
                                'use_tax_estimate',
                                'include_bonus',
                                'include_medicare',
                            ].includes(key);
                            const options =
                                key === 'cadence'
                                    ? cadences
                                    : key === 'frequency'
                                      ? frequencies
                                      : boolean
                                        ? { true: 'Yes', false: 'No' }
                                        : key === 'tax_year'
                                          ? {
                                                '2025': '2025–26',
                                                '2026': '2026–27',
                                                '2027': '2027–28',
                                            }
                                          : undefined;
                            return (
                                <Field
                                    key={key}
                                    label={`${labels[key] ?? key}${key.endsWith('_cents') ? ' ($)' : key.includes('rate') ? ' (%)' : ''}`}
                                    type={
                                        key.endsWith('_cents')
                                            ? 'money'
                                            : key.endsWith('_date')
                                              ? 'date'
                                              : options
                                                ? undefined
                                                : 'number'
                                    }
                                    step={
                                        key.includes('rate')
                                            ? '0.001'
                                            : undefined
                                    }
                                    value={form.data.values[key]}
                                    options={options}
                                    onChange={(value) =>
                                        form.setData('values', {
                                            ...form.data.values,
                                            [key]: value,
                                        })
                                    }
                                    error={errors[`values.${key}`]}
                                />
                            );
                        })}
                </div>
                {'use_tax_estimate' in initial && (
                    <p className="text-sm text-muted-foreground">
                        Salary and payroll deductions are annual amounts. The
                        Australian resident take-home estimate excludes HELP,
                        Medicare surcharge and offsets. Use manual take-home pay
                        to match your payslip.
                    </p>
                )}
                <Field
                    label="Update notes"
                    value={form.data.notes}
                    onChange={(value) => form.setData('notes', value)}
                    error={errors.notes}
                    hint="For example, annual pay rise, new lender, or a statement balance."
                />
                {errors.values && (
                    <p role="alert" className="text-sm text-destructive">
                        {errors.values}
                    </p>
                )}
                <div className="flex flex-wrap gap-2">
                    <Button className="min-h-11" disabled={form.processing}>
                        Save financial update
                    </Button>
                    <Button
                        className="min-h-11"
                        variant="outline"
                        type="button"
                        onClick={close}
                    >
                        Cancel
                    </Button>
                </div>
            </form>
        </Panel>
    );
}

export function FinancialHistory({
    type,
    id,
    values,
    changes = [],
    today,
    disabled = false,
    onEditingChange,
}: {
    disabled?: boolean;
    onEditingChange?: (editing: boolean) => void;
    type: RecordType;
    id: number;
    values: FinancialValues;
    changes?: FinancialChange[];
    today: string;
}) {
    const [editing, setEditing] = useState<FinancialChange | 'new' | null>(
        null,
    );
    const ordered = [...changes].sort((a, b) =>
        (b.effective_from ?? '').localeCompare(a.effective_from ?? ''),
    );
    const points = [...ordered]
        .reverse()
        .filter((change) => change.effective_from !== null);
    const chartKey =
        type === 'debt' || type === 'mortgage'
            ? 'balance_cents'
            : type === 'super'
              ? 'annual_fee_cents'
              : values.gross_annual_cents !== null &&
                  values.gross_annual_cents !== undefined
                ? 'gross_annual_cents'
                : 'amount_cents';
    const max = Math.max(
        1,
        ...points.map((point) => Number(point.values[chartKey] ?? 0)),
    );
    const dates = points.map((point) => Date.parse(point.effective_from!));
    const firstDate = dates[0] ?? 0;
    const dateSpan = Math.max(1, (dates.at(-1) ?? firstDate) - firstDate);
    const x = (index: number) =>
        20 + ((dates[index] - firstDate) / dateSpan) * 560;
    return (
        <section className="grid gap-4" aria-label="Financial history">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-xl font-semibold">Financial history</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Dated financial changes and transactions.
                    </p>
                </div>
                <Button
                    className="min-h-11"
                    disabled={editing !== null || disabled}
                    onClick={() => {
                        setEditing('new');
                        onEditingChange?.(true);
                    }}
                >
                    Record financial update
                </Button>
            </div>
            {editing && (
                <FinancialEditor
                    key={editing === 'new' ? 'new' : editing.id}
                    type={type}
                    id={id}
                    values={values}
                    today={today}
                    change={editing === 'new' ? undefined : editing}
                    onClose={() => {
                        setEditing(null);
                        onEditingChange?.(false);
                    }}
                />
            )}
            {points.length > 1 && (
                <Panel>
                    <h3 className="font-medium">
                        {labels[chartKey]} over time
                    </h3>
                    <svg
                        viewBox="0 0 600 160"
                        className="mt-4 w-full"
                        role="img"
                        aria-label={`${labels[chartKey]} history. Exact values and dates appear in the timeline below.`}
                    >
                        <path
                            fill="none"
                            className="stroke-primary"
                            strokeWidth="3"
                            d={points
                                .map(
                                    (point, i) =>
                                        `${i === 0 ? 'M' : type === 'item' || type === 'super' ? 'H' : 'L'}${x(i)}${i > 0 && (type === 'item' || type === 'super') ? 'V' : ','}${140 - (Number(point.values[chartKey] ?? 0) / max) * 120}`,
                                )
                                .join(' ')}
                        />
                        {points.map((point, i) => (
                            <circle
                                key={point.id}
                                className={
                                    point.effective_from! > today
                                        ? 'fill-background stroke-primary'
                                        : 'fill-primary'
                                }
                                r="4"
                                cx={x(i)}
                                cy={
                                    140 -
                                    (Number(point.values[chartKey] ?? 0) /
                                        max) *
                                        120
                                }
                            >
                                <title>
                                    {`${dateLabel(point.effective_from!)}: ${displayValue(chartKey, point.values[chartKey])}`}
                                </title>
                            </circle>
                        ))}
                    </svg>
                    <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                        <span>{dateLabel(points[0].effective_from!)}</span>
                        <span>{dateLabel(points.at(-1)!.effective_from!)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Recorded snapshots, ordered by effective date. Future
                        entries are marked in the timeline.
                    </p>
                </Panel>
            )}
            {ordered.length === 0 ? (
                <Panel>
                    <p className="text-sm text-muted-foreground">
                        No financial updates yet. Record a past statement or a
                        future change to start your timeline.
                    </p>
                </Panel>
            ) : (
                <ol className="grid gap-3">
                    {ordered.map((change) => (
                        <li key={change.id}>
                            <Panel>
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="font-semibold">
                                                {events[change.event_type] ??
                                                    'Financial update'}
                                            </h3>
                                            {change.effective_from &&
                                                change.effective_from >
                                                    today && (
                                                    <Badge variant="outline">
                                                        Scheduled
                                                    </Badge>
                                                )}
                                        </div>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            {change.effective_from
                                                ? `Effective ${dateLabel(change.effective_from)}`
                                                : 'Earlier date unknown'}
                                        </p>
                                    </div>
                                    {change.effective_from && (
                                        <div className="flex gap-2">
                                            <Button
                                                className="min-h-11"
                                                variant="outline"
                                                size="sm"
                                                disabled={
                                                    editing !== null || disabled
                                                }
                                                onClick={() => {
                                                    setEditing(change);
                                                    onEditingChange?.(true);
                                                }}
                                                aria-label={`Correct financial update from ${change.effective_from}`}
                                            >
                                                Correct
                                            </Button>
                                            <Button
                                                className="min-h-11"
                                                variant="ghost"
                                                size="sm"
                                                disabled={
                                                    editing !== null || disabled
                                                }
                                                onClick={() => {
                                                    if (
                                                        window.confirm(
                                                            'Remove this financial update? Later snapshots will keep their recorded values.',
                                                        )
                                                    )
                                                        router.delete(
                                                            destroy({
                                                                record_type:
                                                                    type,
                                                                record_id: id,
                                                                change: change.id,
                                                            }),
                                                            {
                                                                preserveScroll: true,
                                                            },
                                                        );
                                                }}
                                                aria-label={`Remove financial update from ${change.effective_from}`}
                                            >
                                                Remove
                                            </Button>
                                        </div>
                                    )}
                                </div>
                                {change.payment_cents !== null && (
                                    <p className="mt-3 font-medium">
                                        Extra payment:{' '}
                                        {money(change.payment_cents)}
                                    </p>
                                )}
                                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                                    {Object.entries(change.values).map(
                                        ([key, value]) => (
                                            <div key={key}>
                                                <dt className="text-muted-foreground">
                                                    {labels[key] ?? key}
                                                </dt>
                                                <dd className="mt-1 font-medium tabular-nums">
                                                    {displayValue(key, value)}
                                                </dd>
                                            </div>
                                        ),
                                    )}
                                </dl>
                                {change.notes && (
                                    <p className="mt-4 text-sm whitespace-pre-wrap text-muted-foreground">
                                        {change.notes}
                                    </p>
                                )}
                            </Panel>
                        </li>
                    ))}
                </ol>
            )}
        </section>
    );
}
