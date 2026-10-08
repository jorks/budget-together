import { useEffect, useRef } from 'react';
import { useForm } from '@inertiajs/react';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';

import { Field, Panel, dollars, cents } from '@/components/budget/shared';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { store, update } from '@/routes/debts';

type Projection = {
    periods: number | null;
    interest_cents: number | null;
    balances: number[];
};
export type Debt = {
    projection: Projection;
    baseline: Projection;
    id: number;
    name: string;
    type: string;
    lender: string | null;
    balance_cents: number;
    annual_rate: number;
    repayment_cents: number;
    extra_cents: number;
    frequency: string;
    due_date: string | null;
    account_id: number | null;
    account?: { name: string } | null;
    is_active: boolean;
    notes: string | null;
};
export type DebtProps = {
    debts: Debt[];
    accounts: { id: number; name: string }[];
    types: Record<string, string>;
};
export function DebtEditor({
    debt,
    accounts,
    types,
    onClose,
}: Omit<DebtProps, 'debts'> & { debt?: Debt; onClose: () => void }) {
    const form = useForm({
        name: debt?.name ?? '',
        type: debt?.type ?? 'car_loan',
        lender: debt?.lender ?? '',
        balance: dollars(debt?.balance_cents),
        annual_rate: String(debt?.annual_rate ?? 0),
        repayment: dollars(debt?.repayment_cents),
        extra: dollars(debt?.extra_cents ?? 0),
        frequency: debt?.frequency ?? 'monthly',
        due_date: debt?.due_date ?? '',
        account_id: debt?.account_id ? String(debt.account_id) : '',
        is_active: debt?.is_active ?? true,
        notes: debt?.notes ?? '',
    });
    const heading = useRef<HTMLHeadingElement>(null);
    useEffect(() => {
        heading.current?.focus();
        heading.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }, []);
    const errors = form.errors as Record<string, string>;
    useUnsavedChanges(form.isDirty && !form.processing);
    return (
        <Panel>
            <h2 ref={heading} tabIndex={-1} className="text-lg font-semibold">
                {debt ? 'Edit debt details' : 'Add debt'}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
                Use your lender statement to set up a debt. Record subsequent
                financial changes in its timeline.
            </p>
            <form
                className="grid gap-4 p-6"
                onSubmit={(event) => {
                    event.preventDefault();
                    form.transform(
                        ({ balance, repayment, extra, ...data }) => ({
                            ...data,
                            balance_cents: cents(balance),
                            repayment_cents: cents(repayment),
                            extra_cents: cents(extra),
                            account_id: data.account_id || null,
                            due_date: data.due_date || null,
                        }),
                    );
                    form.submit(debt ? update(debt.id) : store(), {
                        onSuccess: onClose,
                    });
                }}
            >
                <Field
                    label="Name"
                    value={form.data.name}
                    onChange={(v) => form.setData('name', v)}
                    error={errors.name}
                    required
                />
                <Field
                    label="Debt type"
                    value={form.data.type}
                    options={types}
                    onChange={(v) => form.setData('type', v)}
                    error={errors.type}
                />
                <Field
                    label="Lender"
                    value={form.data.lender}
                    onChange={(v) => form.setData('lender', v)}
                    error={errors.lender}
                />
                {!debt && (
                    <>
                        <Field
                            label="Current balance ($)"
                            type="money"
                            value={form.data.balance}
                            onChange={(v) => form.setData('balance', v)}
                            error={errors.balance_cents}
                            required
                        />
                        <div className="grid gap-2">
                            <Label htmlFor="debt-rate">
                                Annual interest rate (%)
                            </Label>
                            <Input
                                id="debt-rate"
                                type="number"
                                step="0.001"
                                min="0"
                                max="50"
                                value={form.data.annual_rate}
                                onChange={(event) =>
                                    form.setData(
                                        'annual_rate',
                                        event.target.value,
                                    )
                                }
                                aria-invalid={!!errors.annual_rate}
                                aria-describedby={
                                    errors.annual_rate
                                        ? 'debt-rate-error'
                                        : undefined
                                }
                                required
                            />
                            {errors.annual_rate && (
                                <p
                                    id="debt-rate-error"
                                    className="text-sm text-destructive"
                                >
                                    {errors.annual_rate}
                                </p>
                            )}
                        </div>
                        <Field
                            label="Repayment frequency"
                            value={form.data.frequency}
                            options={{
                                weekly: 'Weekly',
                                fortnightly: 'Fortnightly',
                                monthly: 'Monthly',
                            }}
                            onChange={(v) => form.setData('frequency', v)}
                            error={errors.frequency}
                        />
                        <Field
                            label="Regular repayment ($)"
                            type="money"
                            value={form.data.repayment}
                            onChange={(v) => form.setData('repayment', v)}
                            error={errors.repayment_cents}
                            hint="For credit cards, enter the amount you plan to pay each period and review it when your statement changes."
                            required
                        />
                        <Field
                            label="Extra repayment each period ($)"
                            type="money"
                            value={form.data.extra}
                            onChange={(v) => form.setData('extra', v)}
                            error={errors.extra_cents}
                            required
                        />
                        <Field
                            label="Next repayment date"
                            type="date"
                            value={form.data.due_date}
                            onChange={(v) => form.setData('due_date', v)}
                            error={errors.due_date}
                        />
                    </>
                )}
                <Field
                    label="Repayment account"
                    value={form.data.account_id}
                    options={{
                        '': 'No account assigned',
                        ...Object.fromEntries(
                            accounts.map((a) => [String(a.id), a.name]),
                        ),
                    }}
                    onChange={(v) => form.setData('account_id', v)}
                    error={errors.account_id}
                />
                <Field
                    label="Notes"
                    value={form.data.notes}
                    onChange={(v) => form.setData('notes', v)}
                    error={errors.notes}
                />
                <label className="flex items-center gap-3">
                    <Checkbox
                        checked={form.data.is_active}
                        onCheckedChange={(v) =>
                            form.setData('is_active', v === true)
                        }
                    />
                    Include repayments in budget
                </label>
                <Button disabled={form.processing}>Save debt</Button>
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
        </Panel>
    );
}
