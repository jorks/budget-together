import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { useForm } from '@inertiajs/react';
import { cadences, cents, Field, Toggle } from '@/components/budget/shared';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from '@/components/ui/sheet';
import { store } from '@/routes/budget-items';
import type { Kind } from '@/types/budget';

export function QuickItemEditor({
    kind,
    financialYear,
    onClose,
}: {
    kind: Kind;
    financialYear: number;
    onClose: () => void;
}) {
    const form = useForm({
        name: '',
        amount: '',
        cadence: 'monthly',
        payments_per_year: '10',
        kind,
        is_variable: false,
    });
    const names = {
        bill: 'bill',
        income: 'income',
        spending: 'spending allowance',
        saving: 'savings allocation',
    };
    const errors = form.errors as Record<string, string>;
    useUnsavedChanges(form.isDirty && !form.processing);
    const close = () => {
        if (!form.isDirty || window.confirm('Discard your unsaved changes?'))
            onClose();
    };
    return (
        <Sheet
            open
            onOpenChange={(open) => {
                if (!open) close();
            }}
        >
            <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
                <SheetHeader className="p-6">
                    <SheetTitle>Add {names[form.data.kind]}</SheetTitle>
                    <SheetDescription>
                        Start with the basics. Add accounts, dates and other
                        settings on the detail page.
                    </SheetDescription>
                </SheetHeader>
                <form
                    className="grid gap-5 px-6 pb-6"
                    onSubmit={(event) => {
                        event.preventDefault();
                        form.transform((data) => ({
                            name: data.name,
                            amount_cents: cents(data.amount),
                            cadence: data.cadence,
                            payments_per_year: Number(data.payments_per_year),
                            kind: data.kind,
                            is_variable: data.is_variable,
                            is_active: true,
                            use_tax_estimate: false,
                            include_bonus: false,
                            include_medicare: true,
                            tax_year: financialYear,
                            has_sinking_fund: false,
                            saved_cents: 0,
                            contribution_cadence: 'weekly',
                        }));
                        form.submit(store(), { onSuccess: onClose });
                    }}
                >
                    <Field
                        label="Name"
                        value={form.data.name}
                        onChange={(name) => form.setData('name', name)}
                        error={errors.name}
                        required
                    />
                    {['spending', 'saving'].includes(kind) && (
                        <Field
                            label="Allocation type"
                            value={form.data.kind}
                            onChange={(value) =>
                                form.setData('kind', value as Kind)
                            }
                            options={{
                                spending: 'Spending allowance',
                                saving: 'Savings allocation',
                            }}
                        />
                    )}
                    <Field
                        label={
                            kind === 'income'
                                ? 'Take-home amount (AUD)'
                                : 'Amount (AUD)'
                        }
                        type="money"
                        value={form.data.amount}
                        onChange={(amount) => form.setData('amount', amount)}
                        error={errors.amount_cents}
                        required
                    />
                    <Field
                        label="Frequency"
                        value={form.data.cadence}
                        onChange={(cadence) => form.setData('cadence', cadence)}
                        options={cadences}
                        error={errors.cadence}
                    />
                    {form.data.cadence === 'custom' && (
                        <Field
                            label="Payments per year"
                            type="number"
                            value={form.data.payments_per_year}
                            onChange={(value) =>
                                form.setData('payments_per_year', value)
                            }
                            error={errors.payments_per_year}
                            required
                        />
                    )}
                    {kind === 'bill' && (
                        <Toggle
                            label="Variable bill — this amount is an estimate"
                            checked={form.data.is_variable}
                            onChange={(value) =>
                                form.setData('is_variable', value)
                            }
                        />
                    )}
                    <div className="sticky bottom-0 -mx-6 flex gap-3 border-t bg-background px-6 py-4">
                        <Button
                            className="min-h-11 flex-1"
                            disabled={form.processing}
                        >
                            {form.processing
                                ? 'Saving…'
                                : `Add ${names[form.data.kind]}`}
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
            </SheetContent>
        </Sheet>
    );
}
