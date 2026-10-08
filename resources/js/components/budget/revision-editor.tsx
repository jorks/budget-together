import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { useForm } from '@inertiajs/react';
import {
    cadences,
    cents,
    dollars,
    factors,
    Field,
    money,
    Panel,
} from '@/components/budget/shared';
import { Button } from '@/components/ui/button';
import { store, update } from '@/routes/item-revisions';
import type { BudgetItem, ItemRevision } from '@/types/budget';

export function RevisionEditor({
    item,
    today,
    revision,
    suggestedAmount,
    onClose,
}: {
    item: BudgetItem;
    today: string;
    revision?: ItemRevision;
    suggestedAmount?: number;
    onClose: () => void;
}) {
    const form = useForm({
        amount_cents: dollars(
            revision?.amount_cents ?? suggestedAmount ?? item.amount_cents,
        ),
        cadence: revision?.cadence ?? item.cadence,
        payments_per_year: String(
            revision?.payments_per_year ?? item.payments_per_year ?? 10,
        ),
        effective_from: revision?.effective_from ?? today,
        notes:
            revision?.notes ??
            (suggestedAmount != null ? 'Estimate based on recorded bills' : ''),
    });
    const annual =
        (cents(form.data.amount_cents) ?? 0) *
        (form.data.cadence === 'custom'
            ? Number(form.data.payments_per_year)
            : factors[form.data.cadence]);
    useUnsavedChanges(form.isDirty && !form.processing);
    const close = () => {
        if (!form.isDirty || window.confirm('Discard your unsaved changes?'))
            onClose();
    };
    return (
        <Panel>
            <h2 className="text-lg font-semibold">
                {revision
                    ? 'Correct a recorded change'
                    : suggestedAmount != null
                      ? 'Review suggested estimate'
                      : item.is_variable
                        ? 'Change estimate'
                        : 'Change price'}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
                {revision
                    ? 'Fix this entry. Use a new dated change for a real price increase or decrease.'
                    : 'Earlier amounts stay in history. Your plan changes from the effective date.'}
            </p>
            <form
                className="mt-5 grid gap-5"
                onSubmit={(event) => {
                    event.preventDefault();
                    form.transform((data) => ({
                        ...data,
                        amount_cents: cents(data.amount_cents),
                        payments_per_year: Number(data.payments_per_year),
                    }));
                    form.submit(
                        revision
                            ? update([item.id, revision.id])
                            : store(item.id),
                        { preserveScroll: true, onSuccess: onClose },
                    );
                }}
            >
                <div className="grid gap-5 sm:grid-cols-2">
                    <Field
                        label="Amount (AUD)"
                        type="money"
                        value={form.data.amount_cents}
                        onChange={(value) =>
                            form.setData('amount_cents', value)
                        }
                        error={form.errors.amount_cents}
                        required
                    />
                    <Field
                        label="Frequency"
                        value={form.data.cadence}
                        onChange={(value) => form.setData('cadence', value)}
                        error={form.errors.cadence}
                        options={cadences}
                    />
                    {form.data.cadence === 'custom' && (
                        <Field
                            label="Payments per year"
                            type="number"
                            value={form.data.payments_per_year}
                            onChange={(value) =>
                                form.setData('payments_per_year', value)
                            }
                            error={form.errors.payments_per_year}
                            required
                        />
                    )}
                    <Field
                        label="Effective from"
                        type="date"
                        value={form.data.effective_from}
                        onChange={(value) =>
                            form.setData('effective_from', value)
                        }
                        error={form.errors.effective_from}
                        required
                        hint="Choose a past date to backdate, or a future date to schedule a change."
                    />
                    <Field
                        label="Note (optional)"
                        value={form.data.notes}
                        onChange={(value) => form.setData('notes', value)}
                        error={form.errors.notes}
                    />
                </div>
                <div className="rounded-lg bg-muted/50 p-4 text-sm">
                    <p>
                        New monthly equivalent:{' '}
                        <strong>{money(annual / 12)}</strong>
                    </p>
                    <p className="mt-1 text-muted-foreground">
                        {money(annual - item.equivalents.annually)} a year
                        compared with your current plan.
                        {!item.is_active &&
                            ' This item is paused and excluded from totals.'}
                    </p>
                    {form.data.cadence !== item.cadence && (
                        <p className="mt-2 text-muted-foreground">
                            Changing frequency starts the new calendar schedule
                            on the effective date, or your entered due date if
                            later. Custom frequency shows only its entered date.
                        </p>
                    )}
                </div>
                <div className="sticky bottom-0 flex gap-3 border-t bg-card py-4">
                    <Button
                        className="min-h-11 flex-1 sm:flex-none"
                        disabled={form.processing}
                    >
                        {form.processing
                            ? 'Saving…'
                            : revision
                              ? 'Save correction'
                              : 'Save dated change'}
                    </Button>
                    <Button
                        className="min-h-11"
                        type="button"
                        variant="outline"
                        onClick={close}
                    >
                        Cancel
                    </Button>
                </div>
            </form>
        </Panel>
    );
}
