import {
    FinancialHistory,
    financialValues,
} from '@/components/financial-history';
import { ItemHistoryCharts } from '@/components/budget/item-history-chart';
import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import {
    ArrowLeft,
    History,
    Pencil,
    Plus,
    Receipt,
    Settings2,
    TrendingUp,
} from 'lucide-react';
import { ItemEditor } from '@/components/budget/item-editor';
import { RevisionEditor } from '@/components/budget/revision-editor';
import { BillRecordEditor } from '@/components/budget/bill-record-editor';
import { cadences, dateLabel, money, Panel } from '@/components/budget/shared';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { bills, income, plan } from '@/routes';
import { destroy as removeRevision } from '@/routes/item-revisions';
import { destroy as removeBill } from '@/routes/bill-records';
import { destroy as removePayment } from '@/routes/payments';
import type { BillRecord, ItemDetailProps, ItemRevision } from '@/types/budget';

type Action =
    | { type: 'price'; revision?: ItemRevision; suggestedAmount?: number }
    | { type: 'bill'; record?: BillRecord }
    | { type: 'settings' };

export default function ItemDetail(props: ItemDetailProps) {
    const { item, revisions, billRecords, suggestion, today } = props;
    const [action, setAction] = useState<Action | null>(
        props.editingSettings ? { type: 'settings' } : null,
    );
    const [financialEditing, setFinancialEditing] = useState(false);
    const formHeading = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (action) {
            formHeading.current?.focus();
            formHeading.current?.scrollIntoView({
                block: 'start',
                behavior: 'smooth',
            });
        }
    }, [action]);
    const back =
        item.kind === 'bill'
            ? bills()
            : item.kind === 'income'
              ? income()
              : plan();
    const timeline = [
        ...revisions.map((revision) => ({
            key: `revision-${revision.id}`,
            date: revision.effective_from,
            revision,
        })),
        ...billRecords.map((record) => ({
            key: `bill-${record.id}`,
            date: record.billed_on,
            record,
        })),
        ...item.payments.map((payment) => ({
            key: `payment-${payment.id}`,
            date: payment.paid_on,
            payment,
        })),
    ].sort(
        (a, b) =>
            (b.date ?? '').localeCompare(a.date ?? '') ||
            b.key.localeCompare(a.key),
    );
    const upcoming = revisions
        .filter(
            (revision) =>
                revision.effective_from && revision.effective_from > today,
        )
        .sort((a, b) => a.effective_from!.localeCompare(b.effective_from!));
    return (
        <>
            <Head title={item.name} />
            <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:p-8">
                <Link
                    href={back}
                    className="inline-flex min-h-11 items-center gap-2 self-start text-sm text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="size-4" />
                    Back to{' '}
                    {item.kind === 'bill'
                        ? 'bills & expenses'
                        : item.kind === 'income'
                          ? 'income'
                          : 'spending plan'}
                </Link>
                <header className="flex flex-col gap-4">
                    <div>
                        <div className="mb-2 flex flex-wrap gap-2">
                            <Badge variant="secondary">
                                {item.category || 'Uncategorised'}
                            </Badge>
                            {!item.is_active && (
                                <Badge variant="outline">Paused</Badge>
                            )}
                            {item.is_variable && (
                                <Badge variant="outline">Estimated</Badge>
                            )}
                        </div>
                        <h1 className="text-3xl font-semibold tracking-tight">
                            {item.name}
                        </h1>
                        <p className="mt-2 text-sm text-muted-foreground">
                            {item.person ? `For ${item.person} · ` : ''}
                            {item.account
                                ? item.account.name
                                : 'No account assigned'}
                        </p>
                    </div>
                    <div className="grid gap-2 sm:flex sm:flex-wrap">
                        {item.kind === 'bill' && (
                            <>
                                <Button
                                    disabled={
                                        action !== null || financialEditing
                                    }
                                    className="min-h-11"
                                    onClick={() => setAction({ type: 'bill' })}
                                >
                                    <Plus className="size-4" />
                                    Record actual bill
                                </Button>
                                <Button
                                    disabled={
                                        action !== null || financialEditing
                                    }
                                    className="min-h-11"
                                    variant="outline"
                                    onClick={() => setAction({ type: 'price' })}
                                >
                                    <TrendingUp className="size-4" />
                                    {item.is_variable
                                        ? 'Change estimate'
                                        : 'Change price'}
                                </Button>
                            </>
                        )}
                        <Button
                            disabled={action !== null || financialEditing}
                            className="min-h-11"
                            variant="outline"
                            onClick={() => setAction({ type: 'settings' })}
                        >
                            <Settings2 className="size-4" />
                            Edit settings
                        </Button>
                    </div>
                </header>
                <div className="grid gap-4 sm:grid-cols-3">
                    <Panel>
                        <p className="text-sm text-muted-foreground">
                            {item.is_variable
                                ? 'Current estimate'
                                : 'Current planned amount'}
                        </p>
                        <p className="mt-2 text-2xl font-semibold tabular-nums">
                            {money(item.amount_cents)}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {item.cadence === 'custom'
                                ? `${item.payments_per_year} payments per year`
                                : cadences[item.cadence]}
                            {item.use_tax_estimate &&
                                ' · Budget uses estimated take-home pay'}
                        </p>
                    </Panel>
                    <Panel>
                        <p className="text-sm text-muted-foreground">
                            Monthly budget equivalent
                        </p>
                        <p className="mt-2 text-2xl font-semibold tabular-nums">
                            {money(item.equivalents.monthly)}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {money(item.equivalents.annually)} per year
                            {!item.is_active && ' · Excluded from totals'}
                        </p>
                    </Panel>
                    <Panel>
                        <p className="text-sm text-muted-foreground">
                            {item.kind === 'income'
                                ? 'Entered pay date'
                                : 'Entered recurring due date'}
                        </p>
                        <p className="mt-2 text-xl font-semibold">
                            {item.kind === 'income'
                                ? item.pay_date
                                    ? dateLabel(item.pay_date)
                                    : 'Not set'
                                : item.due_date
                                  ? dateLabel(item.due_date)
                                  : 'Not set'}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Manage your recurring schedule in settings.
                        </p>
                    </Panel>
                </div>
                {upcoming.length > 0 && (
                    <Panel className="border-primary/30 bg-primary/5">
                        <h2 className="font-semibold">Scheduled changes</h2>
                        <ul className="mt-3 grid gap-2">
                            {upcoming.map((revision) => (
                                <li key={revision.id} className="text-sm">
                                    {money(revision.amount_cents)} ·{' '}
                                    {cadences[revision.cadence]} from{' '}
                                    {dateLabel(revision.effective_from!)}
                                    {revision.notes && ` — ${revision.notes}`}
                                </li>
                            ))}
                        </ul>
                    </Panel>
                )}
                {item.is_variable && item.kind === 'bill' && (
                    <Panel>
                        <h2 className="font-semibold">
                            Estimate from your actual bills
                        </h2>
                        {suggestion ? (
                            <div className="mt-3 grid gap-3">
                                <p className="text-2xl font-semibold">
                                    {money(suggestion.amount_cents)}{' '}
                                    <span className="text-sm font-normal text-muted-foreground">
                                        · {cadences[item.cadence]}
                                    </span>
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Based on {suggestion.bill_count} bills
                                    covering {suggestion.covered_days} days,
                                    from {dateLabel(suggestion.from)} to{' '}
                                    {dateLabel(suggestion.until)}. Total cost
                                    divided by covered days, annualised, then
                                    converted to your frequency. Gaps are
                                    excluded.
                                </p>
                                {suggestion.covered_days < 365 && (
                                    <p className="text-sm text-muted-foreground">
                                        Less than a full year of coverage.
                                        Seasonal bills may make this estimate
                                        less representative.
                                    </p>
                                )}
                                <p className="text-sm">
                                    Your current estimate is{' '}
                                    {money(item.amount_cents)}. Applying this
                                    suggestion is your choice.
                                </p>
                                <Button
                                    disabled={
                                        action !== null || financialEditing
                                    }
                                    className="min-h-11 justify-self-start"
                                    variant="outline"
                                    onClick={() =>
                                        setAction({
                                            type: 'price',
                                            suggestedAmount:
                                                suggestion.amount_cents,
                                        })
                                    }
                                >
                                    Review and apply estimate
                                </Button>
                            </div>
                        ) : (
                            <p className="mt-2 text-sm text-muted-foreground">
                                Add billing periods to actual bills to calculate
                                a suggestion. Overlapping periods need
                                correcting first so costs are not counted twice.
                            </p>
                        )}
                    </Panel>
                )}
                {action && (
                    <div
                        ref={formHeading}
                        tabIndex={-1}
                        className="scroll-mt-4 outline-none"
                    >
                        {action.type === 'price' && (
                            <RevisionEditor
                                key={
                                    action.revision?.id ??
                                    `new-${action.suggestedAmount ?? ''}`
                                }
                                item={item}
                                today={today}
                                revision={action.revision}
                                suggestedAmount={action.suggestedAmount}
                                onClose={() => setAction(null)}
                            />
                        )}
                        {action.type === 'bill' && (
                            <BillRecordEditor
                                key={action.record?.id ?? 'new-bill'}
                                item={item}
                                today={today}
                                record={action.record}
                                onClose={() => setAction(null)}
                            />
                        )}
                        {action.type === 'settings' && (
                            <ItemEditor
                                inline
                                item={item}
                                kind={item.kind}
                                accounts={props.accounts}
                                categories={props.categories}
                                today={today}
                                financialYear={props.financialYear}
                                taxBrackets={props.taxBrackets}
                                onClose={() => setAction(null)}
                            />
                        )}
                    </div>
                )}
                {item.kind !== 'bill' && (
                    <FinancialHistory
                        disabled={action !== null}
                        onEditingChange={setFinancialEditing}
                        type="item"
                        id={item.id}
                        values={financialValues(item, 'item')}
                        changes={props.financialChanges}
                        today={today}
                    />
                )}
                {item.kind === 'bill' && (
                    <>
                        <ItemHistoryCharts
                            revisions={revisions}
                            bills={billRecords}
                            today={today}
                        />
                        <section
                            className="grid gap-4"
                            aria-labelledby="item-history-heading"
                        >
                            <h2
                                id="item-history-heading"
                                className="flex items-center gap-2 text-xl font-semibold"
                            >
                                <History className="size-5" />
                                History
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Price changes and actual bills stay separate. A
                                bill records what happened; a dated change sets
                                the plan.
                            </p>
                            {timeline.length === 0 && (
                                <Panel>
                                    <p className="font-medium">
                                        Your history starts here
                                    </p>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        {item.kind === 'bill'
                                            ? 'Record a bill or a dated change. You can enter earlier bills at any time.'
                                            : 'Dated bill history is available for bills. Manage this item in settings.'}
                                    </p>
                                </Panel>
                            )}
                            <ol className="grid gap-4">
                                {timeline.map((entry) => (
                                    <li
                                        key={entry.key}
                                        className="rounded-xl border bg-card p-4 sm:p-5"
                                    >
                                        {'revision' in entry && (
                                            <>
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <Badge variant="outline">
                                                        {entry.date === null
                                                            ? 'Starting plan'
                                                            : entry.date > today
                                                              ? 'Scheduled change'
                                                              : item.is_variable
                                                                ? 'Estimate change'
                                                                : 'Price change'}
                                                    </Badge>
                                                    <span className="text-sm text-muted-foreground">
                                                        {entry.date
                                                            ? `Effective ${dateLabel(entry.date)}`
                                                            : 'Earlier effective date unknown'}
                                                    </span>
                                                </div>
                                                <p className="mt-3 text-lg font-semibold">
                                                    {money(
                                                        entry.revision
                                                            .amount_cents,
                                                    )}{' '}
                                                    ·{' '}
                                                    {entry.revision.cadence ===
                                                    'custom'
                                                        ? `${entry.revision.payments_per_year} payments per year`
                                                        : cadences[
                                                              entry.revision
                                                                  .cadence
                                                          ]}
                                                </p>
                                                {entry.revision.notes && (
                                                    <p className="mt-1 text-sm text-muted-foreground">
                                                        {entry.revision.notes}
                                                    </p>
                                                )}
                                                <p className="mt-2 text-xs text-muted-foreground">
                                                    Entered{' '}
                                                    {dateLabel(
                                                        entry.revision
                                                            .created_at,
                                                    )}
                                                    {entry.revision
                                                        .updated_at !==
                                                        entry.revision
                                                            .created_at &&
                                                        ` · Corrected ${dateLabel(entry.revision.updated_at)}`}
                                                </p>
                                                {entry.date !== null && (
                                                    <div className="mt-3 flex flex-wrap gap-2">
                                                        <Button
                                                            disabled={
                                                                action !== null
                                                            }
                                                            className="min-h-11"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() =>
                                                                setAction({
                                                                    type: 'price',
                                                                    revision:
                                                                        entry.revision,
                                                                })
                                                            }
                                                        >
                                                            <Pencil className="size-4" />
                                                            Correct entry
                                                        </Button>
                                                        <Button
                                                            disabled={
                                                                action !== null
                                                            }
                                                            className="min-h-11"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => {
                                                                if (
                                                                    window.confirm(
                                                                        'Remove this recorded change? The previous plan will apply again.',
                                                                    )
                                                                )
                                                                    router.delete(
                                                                        removeRevision(
                                                                            [
                                                                                item.id,
                                                                                entry
                                                                                    .revision
                                                                                    .id,
                                                                            ],
                                                                        ),
                                                                        {
                                                                            preserveScroll: true,
                                                                        },
                                                                    );
                                                            }}
                                                        >
                                                            Remove mistake
                                                        </Button>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                        {'record' in entry && (
                                            <>
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <Badge variant="secondary">
                                                        <Receipt className="mr-1 size-3" />
                                                        Actual bill
                                                    </Badge>
                                                    <span className="text-sm text-muted-foreground">
                                                        {dateLabel(
                                                            entry.record
                                                                .billed_on,
                                                        )}
                                                    </span>
                                                </div>
                                                <p className="mt-3 text-lg font-semibold">
                                                    {money(
                                                        entry.record
                                                            .amount_cents,
                                                    )}
                                                </p>
                                                {entry.record.period_start &&
                                                    entry.record.period_end && (
                                                        <p className="mt-1 text-sm text-muted-foreground">
                                                            Covers{' '}
                                                            {dateLabel(
                                                                entry.record
                                                                    .period_start,
                                                            )}{' '}
                                                            –{' '}
                                                            {dateLabel(
                                                                entry.record
                                                                    .period_end,
                                                            )}
                                                        </p>
                                                    )}
                                                <p className="mt-1 text-sm text-muted-foreground">
                                                    {entry.record.paid_on
                                                        ? `Paid ${dateLabel(entry.record.paid_on)}`
                                                        : 'Payment not recorded'}
                                                    {entry.record.due_on &&
                                                        ` · Due ${dateLabel(entry.record.due_on)}`}
                                                </p>
                                                <p className="mt-2 text-sm text-muted-foreground">
                                                    Plan for this bill date:{' '}
                                                    {money(
                                                        entry.record
                                                            .expected_amount_cents,
                                                    )}{' '}
                                                    ·{' '}
                                                    {
                                                        cadences[
                                                            entry.record
                                                                .expected_cadence
                                                        ]
                                                    }
                                                    .{' '}
                                                    {entry.record
                                                        .amount_cents >=
                                                    entry.record
                                                        .expected_amount_cents
                                                        ? 'Above'
                                                        : 'Below'}{' '}
                                                    that per-payment amount by{' '}
                                                    {money(
                                                        Math.abs(
                                                            entry.record
                                                                .amount_cents -
                                                                entry.record
                                                                    .expected_amount_cents,
                                                        ),
                                                    )}
                                                    ; billing periods may
                                                    differ.
                                                </p>
                                                {entry.record.notes && (
                                                    <p className="mt-2 text-sm">
                                                        {entry.record.notes}
                                                    </p>
                                                )}
                                                <p className="mt-2 text-xs text-muted-foreground">
                                                    Entered{' '}
                                                    {dateLabel(
                                                        entry.record.created_at,
                                                    )}
                                                    {entry.record.updated_at !==
                                                        entry.record
                                                            .created_at &&
                                                        ` · Corrected ${dateLabel(entry.record.updated_at)}`}
                                                </p>
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    <Button
                                                        disabled={
                                                            action !== null
                                                        }
                                                        className="min-h-11"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() =>
                                                            setAction({
                                                                type: 'bill',
                                                                record: entry.record,
                                                            })
                                                        }
                                                    >
                                                        <Pencil className="size-4" />
                                                        Correct bill
                                                    </Button>
                                                    <Button
                                                        disabled={
                                                            action !== null
                                                        }
                                                        className="min-h-11"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            if (
                                                                window.confirm(
                                                                    'Remove this bill from history? Your planned amount will stay unchanged.',
                                                                )
                                                            )
                                                                router.delete(
                                                                    removeBill([
                                                                        item.id,
                                                                        entry
                                                                            .record
                                                                            .id,
                                                                    ]),
                                                                    {
                                                                        preserveScroll: true,
                                                                    },
                                                                );
                                                        }}
                                                    >
                                                        Remove mistake
                                                    </Button>
                                                </div>
                                            </>
                                        )}
                                        {'payment' in entry && (
                                            <>
                                                <div className="flex flex-wrap justify-between gap-2">
                                                    <Badge variant="secondary">
                                                        Previously recorded
                                                        payment
                                                    </Badge>
                                                    <span className="text-sm text-muted-foreground">
                                                        Paid{' '}
                                                        {dateLabel(
                                                            entry.payment
                                                                .paid_on,
                                                        )}
                                                    </span>
                                                </div>
                                                <p className="mt-3 text-lg font-semibold">
                                                    {money(
                                                        entry.payment
                                                            .amount_cents,
                                                    )}
                                                </p>
                                                <p className="mt-1 text-sm text-muted-foreground">
                                                    {entry.payment.notes}
                                                </p>
                                                <p className="mt-2 text-xs text-muted-foreground">
                                                    Bill date and structured
                                                    billing period were not
                                                    recorded. This payment is
                                                    excluded from estimate
                                                    suggestions.
                                                </p>
                                                <Button
                                                    disabled={
                                                        action !== null ||
                                                        financialEditing
                                                    }
                                                    className="mt-3 min-h-11"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        if (
                                                            window.confirm(
                                                                'Remove this payment from history?',
                                                            )
                                                        )
                                                            router.delete(
                                                                removePayment(
                                                                    entry
                                                                        .payment
                                                                        .id,
                                                                ),
                                                                {
                                                                    preserveScroll: true,
                                                                },
                                                            );
                                                    }}
                                                >
                                                    Remove mistake
                                                </Button>
                                            </>
                                        )}
                                    </li>
                                ))}
                            </ol>
                        </section>
                    </>
                )}
                {item.notes && (
                    <Panel>
                        <h2 className="font-semibold">Notes</h2>
                        <p className="mt-2 text-sm whitespace-pre-wrap text-muted-foreground">
                            {item.notes}
                        </p>
                    </Panel>
                )}
            </main>
        </>
    );
}
