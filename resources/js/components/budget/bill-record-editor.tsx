import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { useForm } from '@inertiajs/react';
import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
    cents,
    dateLabel,
    dollars,
    Field,
    money,
    Panel,
} from '@/components/budget/shared';
import { Button } from '@/components/ui/button';
import { store, update } from '@/routes/bill-records';
import type { BudgetItem, BillRecord } from '@/types/budget';

type BillInput = {
    entry_key: string;
    amount_cents: string;
    billed_on: string;
    period_start: string;
    period_end: string;
    due_on: string;
    paid_on: string;
    notes: string;
};
const blankBill = (today: string): BillInput => ({
    entry_key: crypto.randomUUID(),
    amount_cents: '',
    billed_on: today,
    period_start: '',
    period_end: '',
    due_on: '',
    paid_on: '',
    notes: '',
});

export function BillRecordEditor({
    item,
    today,
    record,
    onClose,
}: {
    item: BudgetItem;
    today: string;
    record?: BillRecord;
    onClose: () => void;
}) {
    const form = useForm({
        records: record
            ? [
                  {
                      entry_key: record.entry_key,
                      amount_cents: dollars(record.amount_cents),
                      billed_on: record.billed_on,
                      period_start: record.period_start ?? '',
                      period_end: record.period_end ?? '',
                      due_on: record.due_on ?? '',
                      paid_on: record.paid_on ?? '',
                      notes: record.notes ?? '',
                  },
              ]
            : [blankBill(today)],
    });
    const [reviewing, setReviewing] = useState(false);
    const errors = form.errors as Record<string, string>;
    const set = (index: number, field: keyof BillInput, value: string) => {
        form.setData(
            'records',
            form.data.records.map((row, rowIndex) =>
                rowIndex === index ? { ...row, [field]: value } : row,
            ),
        );
        setReviewing(false);
    };
    useUnsavedChanges(form.isDirty && !form.processing);
    const close = () => {
        if (!form.isDirty || window.confirm('Discard your unsaved changes?'))
            onClose();
    };
    return (
        <Panel>
            <h2 className="text-lg font-semibold">
                {record ? 'Correct actual bill' : 'Record actual bills'}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
                Enter one bill or add your past bills together. Billing periods
                help suggest a realistic estimate. Your planned amount stays
                unchanged.
            </p>
            <form
                className="mt-5 grid gap-5"
                onSubmit={(event) => {
                    event.preventDefault();
                    if (!reviewing) {
                        setReviewing(true);
                        return;
                    }
                    form.transform((data) => ({
                        records: data.records.map((row) => ({
                            ...row,
                            amount_cents: cents(row.amount_cents),
                        })),
                    }));
                    form.submit(
                        record ? update([item.id, record.id]) : store(item.id),
                        {
                            preserveScroll: true,
                            onSuccess: onClose,
                            onError: () => setReviewing(false),
                        },
                    );
                }}
            >
                {reviewing ? (
                    <div className="grid gap-3 rounded-lg border p-4">
                        <h3 className="font-medium">
                            Review{' '}
                            {form.data.records.length === 1
                                ? 'bill'
                                : `${form.data.records.length} bills`}
                        </h3>
                        {form.data.records.map((row) => (
                            <div
                                key={row.entry_key}
                                className="flex flex-wrap justify-between gap-2 border-b py-2 last:border-0"
                            >
                                <div>
                                    <p>{dateLabel(row.billed_on)}</p>
                                    {row.period_start && row.period_end && (
                                        <p className="text-xs text-muted-foreground">
                                            {dateLabel(row.period_start)} –{' '}
                                            {dateLabel(row.period_end)}
                                        </p>
                                    )}
                                    <p className="text-xs text-muted-foreground">
                                        {row.paid_on
                                            ? `Paid ${dateLabel(row.paid_on)}`
                                            : 'Payment not recorded'}
                                    </p>
                                </div>
                                <strong>
                                    {money(cents(row.amount_cents) ?? 0)}
                                </strong>
                            </div>
                        ))}
                        <p className="text-sm text-muted-foreground">
                            Recording bills does not move account balances,
                            advance recurring due dates, or change the estimate.
                        </p>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setReviewing(false)}
                        >
                            Back to editing
                        </Button>
                    </div>
                ) : (
                    form.data.records.map((row, index) => (
                        <fieldset
                            key={row.entry_key}
                            className="grid min-w-0 gap-4 rounded-lg border p-4"
                        >
                            <legend className="px-2 text-sm font-semibold">
                                Bill {index + 1}
                            </legend>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field
                                    label="Actual amount (AUD)"
                                    type="money"
                                    value={row.amount_cents}
                                    onChange={(value) =>
                                        set(index, 'amount_cents', value)
                                    }
                                    error={
                                        errors[`records.${index}.amount_cents`]
                                    }
                                    required
                                />
                                <Field
                                    label="Bill date"
                                    type="date"
                                    value={row.billed_on}
                                    onChange={(value) =>
                                        set(index, 'billed_on', value)
                                    }
                                    error={errors[`records.${index}.billed_on`]}
                                    required
                                    hint="Use the date on the bill, even when entering old bills."
                                />
                            </div>
                            <details
                                open={item.is_variable || !!record}
                                className="group"
                            >
                                <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">
                                    Billing period, payment and notes (optional)
                                </summary>
                                <div className="grid gap-4 pt-2 sm:grid-cols-2">
                                    <Field
                                        label="Period start"
                                        type="date"
                                        value={row.period_start}
                                        onChange={(value) =>
                                            set(index, 'period_start', value)
                                        }
                                        error={
                                            errors[
                                                `records.${index}.period_start`
                                            ]
                                        }
                                        required={!!row.period_end}
                                    />
                                    <Field
                                        label="Period end"
                                        type="date"
                                        value={row.period_end}
                                        onChange={(value) =>
                                            set(index, 'period_end', value)
                                        }
                                        error={
                                            errors[
                                                `records.${index}.period_end`
                                            ]
                                        }
                                        required={!!row.period_start}
                                    />
                                    <Field
                                        label="Due date"
                                        type="date"
                                        value={row.due_on}
                                        onChange={(value) =>
                                            set(index, 'due_on', value)
                                        }
                                        error={
                                            errors[`records.${index}.due_on`]
                                        }
                                    />
                                    <Field
                                        label="Paid on"
                                        type="date"
                                        value={row.paid_on}
                                        onChange={(value) =>
                                            set(index, 'paid_on', value)
                                        }
                                        error={
                                            errors[`records.${index}.paid_on`]
                                        }
                                        hint="Leave blank if payment has not been recorded."
                                    />
                                    <Field
                                        label="Notes"
                                        value={row.notes}
                                        onChange={(value) =>
                                            set(index, 'notes', value)
                                        }
                                        error={errors[`records.${index}.notes`]}
                                    />
                                </div>
                            </details>
                            {!record && form.data.records.length > 1 && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="min-h-11 justify-self-start"
                                    onClick={() =>
                                        form.setData(
                                            'records',
                                            form.data.records.filter(
                                                (_, rowIndex) =>
                                                    rowIndex !== index,
                                            ),
                                        )
                                    }
                                >
                                    <Trash2 className="size-4" />
                                    Remove bill {index + 1}
                                </Button>
                            )}
                        </fieldset>
                    ))
                )}
                {errors.records && (
                    <p role="alert" className="text-sm text-destructive">
                        {errors.records}
                    </p>
                )}
                {!record && !reviewing && form.data.records.length < 20 && (
                    <Button
                        type="button"
                        variant="outline"
                        className="min-h-11"
                        onClick={() =>
                            form.setData('records', [
                                ...form.data.records,
                                blankBill(today),
                            ])
                        }
                    >
                        <Plus className="size-4" />
                        Add another past bill
                    </Button>
                )}
                <div className="sticky bottom-0 flex gap-3 border-t bg-card py-4">
                    <Button
                        className="min-h-11 flex-1 sm:flex-none"
                        disabled={form.processing}
                    >
                        {form.processing
                            ? 'Saving…'
                            : reviewing
                              ? record
                                  ? 'Save correction'
                                  : 'Save bill history'
                              : 'Review bills'}
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
