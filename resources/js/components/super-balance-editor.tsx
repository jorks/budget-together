import { useForm } from '@inertiajs/react';
import { cents, dollars, Field } from '@/components/budget/shared';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { store as recordBalance } from '@/routes/super-balances';
import type { SuperFund, SuperBalance } from '@/types/superannuation';

export function BalanceEditor({
    fund,
    balance,
    today,
    onClose,
}: {
    fund: SuperFund;
    balance?: SuperBalance;
    today: string;
    onClose: () => void;
}) {
    const form = useForm({
        recorded_on: balance?.recorded_on ?? today,
        balance: balance ? dollars(balance.balance_cents) : '',
        notes: balance?.notes ?? '',
    });
    const errors = form.errors as Record<string, string>;
    return (
        <Sheet
            open
            onOpenChange={(open) => {
                if (
                    !open &&
                    (!form.isDirty ||
                        window.confirm('Discard your unsaved changes?'))
                )
                    onClose();
            }}
        >
            <SheetContent>
                <SheetHeader>
                    <SheetTitle>
                        {balance ? 'Correct balance' : 'Record balance'}
                    </SheetTitle>
                    <SheetDescription>
                        {fund.person} · {fund.name}. Recording the same date
                        replaces that entry.
                    </SheetDescription>
                </SheetHeader>
                <form
                    className="grid gap-4 p-6"
                    onSubmit={(event) => {
                        event.preventDefault();
                        form.transform(({ balance: amount, ...data }) => ({
                            ...data,
                            balance_cents: cents(amount),
                        }));
                        form.submit(recordBalance(fund.id), {
                            preserveScroll: true,
                            onSuccess: onClose,
                        });
                    }}
                >
                    <Field
                        label="Balance as at"
                        type="date"
                        value={form.data.recorded_on}
                        onChange={(v) => form.setData('recorded_on', v)}
                        error={errors.recorded_on}
                        required
                        hint={
                            balance
                                ? 'Keep this date to correct the entry. A different date adds a separate entry.'
                                : 'Use the date shown on your statement or fund portal.'
                        }
                    />
                    <Field
                        label="Balance ($)"
                        type="money"
                        value={form.data.balance}
                        onChange={(v) => form.setData('balance', v)}
                        error={errors.balance_cents}
                        required
                    />
                    <Field
                        label="Notes"
                        value={form.data.notes}
                        onChange={(v) => form.setData('notes', v)}
                        error={errors.notes}
                    />
                    <Button disabled={form.processing}>Save balance</Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                            if (
                                !form.isDirty ||
                                window.confirm('Discard your unsaved changes?')
                            )
                                onClose();
                        }}
                    >
                        Cancel
                    </Button>
                </form>
            </SheetContent>
        </Sheet>
    );
}
