import { router, useForm } from '@inertiajs/react';
import { Trash2 } from 'lucide-react';
import { cents, dateLabel, Field, money } from '@/components/budget/shared';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { store, destroy } from '@/routes/payments';
import type { BudgetItem } from '@/types/budget';

export function PaymentHistory({
    item,
    today,
    onClose,
}: {
    item: BudgetItem;
    today: string;
    onClose: () => void;
}) {
    const form = useForm({ amount_cents: '', paid_on: today, notes: '' });
    return (
        <Sheet
            open
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
                <SheetHeader className="p-6">
                    <SheetTitle>{item.name}: actual bills</SheetTitle>
                    <SheetDescription>
                        Record what you paid. Your forecast stays at{' '}
                        {money(item.amount_cents)} per payment until you edit
                        it.
                    </SheetDescription>
                </SheetHeader>
                <form
                    className="grid gap-4 border-b px-6 pb-6"
                    onSubmit={(e) => {
                        e.preventDefault();
                        form.transform((data) => ({
                            ...data,
                            amount_cents: cents(data.amount_cents),
                        }));
                        form.post(store.url(item.id), {
                            preserveScroll: true,
                            onSuccess: () =>
                                form.reset('amount_cents', 'notes'),
                        });
                    }}
                >
                    <Field
                        label="Actual amount (AUD)"
                        type="money"
                        value={form.data.amount_cents}
                        onChange={(v) => form.setData('amount_cents', v)}
                        error={form.errors.amount_cents}
                        required
                    />
                    <Field
                        label="Paid on"
                        type="date"
                        value={form.data.paid_on}
                        onChange={(v) => form.setData('paid_on', v)}
                        error={form.errors.paid_on}
                        required
                    />
                    <Field
                        label="Notes / billing period"
                        value={form.data.notes}
                        onChange={(v) => form.setData('notes', v)}
                        error={form.errors.notes}
                    />
                    <Button disabled={form.processing}>
                        Record actual payment
                    </Button>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                        This records bill history only. It does not move bank
                        balances, advance the next due date, or reduce money set
                        aside. Update those manually after paying.
                    </p>
                </form>
                <div className="grid gap-3 px-6 pb-6">
                    <h3 className="font-semibold">Payment history</h3>
                    {!item.payments.length && (
                        <p className="text-sm text-muted-foreground">
                            No payments recorded yet.
                        </p>
                    )}
                    {item.payments.map((payment) => (
                        <div
                            key={payment.id}
                            className="flex items-center justify-between gap-3 rounded-lg border p-3"
                        >
                            <div>
                                <p className="font-semibold">
                                    {money(payment.amount_cents)}{' '}
                                    <span className="text-xs font-normal text-muted-foreground">
                                        {dateLabel(payment.paid_on)}
                                    </span>
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {payment.notes}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {money(
                                        payment.amount_cents -
                                            item.amount_cents,
                                    )}{' '}
                                    vs current forecast
                                </p>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Delete payment"
                                onClick={() => {
                                    if (
                                        window.confirm(
                                            'Delete this recorded payment?',
                                        )
                                    )
                                        router.delete(destroy(payment.id), {
                                            preserveScroll: true,
                                        });
                                }}
                            >
                                <Trash2 className="size-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            </SheetContent>
        </Sheet>
    );
}
