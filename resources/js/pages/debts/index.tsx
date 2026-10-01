import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { CreditCard, Plus } from 'lucide-react';
import {
    Field,
    Panel,
    money,
    dollars,
    cents,
    cadences,
    dateLabel,
} from '@/components/budget/shared';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from '@/components/ui/sheet';
import { index, store, update, destroy } from '@/routes/debts';

type Projection = {
    periods: number | null;
    interest_cents: number | null;
    balances: number[];
};
type Debt = {
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
type Props = {
    debts: Debt[];
    accounts: { id: number; name: string }[];
    types: Record<string, string>;
};
function DebtEditor({
    debt,
    accounts,
    types,
    onClose,
}: Omit<Props, 'debts'> & { debt?: Debt; onClose: () => void }) {
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
            <SheetContent className="overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>{debt ? 'Edit debt' : 'Add debt'}</SheetTitle>
                    <SheetDescription>
                        Use your current lender statement. Repayments include
                        any regular fees.
                    </SheetDescription>
                </SheetHeader>
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
                                form.setData('annual_rate', event.target.value)
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
                    <Button type="button" variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                </form>
            </SheetContent>
        </Sheet>
    );
}
export default function DebtsPage({ debts, accounts, types }: Props) {
    const [editing, setEditing] = useState<Debt | 'new' | null>(null);
    const active = debts.filter((d) => d.is_active && d.balance_cents > 0);
    const monthly = active.reduce(
        (sum, d) =>
            sum +
            ((d.repayment_cents + d.extra_cents) *
                ({ weekly: 52, fortnightly: 26, monthly: 12 }[d.frequency] ??
                    12)) /
                12,
        0,
    );
    return (
        <>
            <Head title="Debts & financing" />
            <div className="flex flex-col gap-6 p-4 md:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">
                            Debts & financing
                        </h1>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Car loans, credit cards, personal loans and
                            instalments, together in your family budget.
                        </p>
                    </div>
                    <Button onClick={() => setEditing('new')}>
                        <Plus className="size-4" />
                        Add debt
                    </Button>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                    {[
                        [
                            'Total outstanding',
                            money(
                                debts.reduce(
                                    (sum, d) => sum + d.balance_cents,
                                    0,
                                ),
                            ),
                        ],
                        ['Planned monthly repayments', money(monthly)],
                        ['Active debts', String(active.length)],
                    ].map(([label, value]) => (
                        <Panel key={label}>
                            <p className="text-sm text-muted-foreground">
                                {label}
                            </p>
                            <p className="mt-2 text-2xl font-semibold">
                                {value}
                            </p>
                        </Panel>
                    ))}
                </div>
                <p className="text-sm text-muted-foreground">
                    Active repayments appear in bills, the spending plan,
                    totals, calendar and account views. Keep the same repayment
                    out of ordinary bills to avoid counting it twice. Account
                    balances stay separate. Payoff estimates assume a constant
                    rate, no new spending or additional fees, and regular
                    payments. Paid-off debts stop contributing to the budget.
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                    {debts.map((debt) => (
                        <Panel key={debt.id}>
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h2 className="font-semibold">
                                        {debt.name}
                                    </h2>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {types[debt.type]} ·{' '}
                                        {debt.lender || 'No lender recorded'}
                                    </p>
                                </div>
                                <CreditCard className="size-5 text-primary" />
                            </div>
                            <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <dt className="text-muted-foreground">
                                        Balance
                                    </dt>
                                    <dd className="mt-1 font-semibold">
                                        {money(debt.balance_cents)}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">
                                        Interest rate
                                    </dt>
                                    <dd className="mt-1">
                                        {debt.annual_rate}% p.a.
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">
                                        Planned repayment
                                    </dt>
                                    <dd className="mt-1">
                                        {money(
                                            debt.repayment_cents +
                                                debt.extra_cents,
                                        )}{' '}
                                        · {cadences[debt.frequency]}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">
                                        Status
                                    </dt>
                                    <dd className="mt-1">
                                        {debt.balance_cents === 0
                                            ? 'Paid off'
                                            : debt.is_active
                                              ? 'In budget'
                                              : 'Paused'}
                                    </dd>
                                </div>
                            </dl>
                            <div className="mt-5 border-t pt-4">
                                {debt.projection.periods === null ? (
                                    <p className="text-sm text-destructive">
                                        This repayment does not clear the debt
                                        within 100 years. Increase your
                                        repayment; it may not cover interest.
                                    </p>
                                ) : (
                                    <>
                                        <p className="text-sm">
                                            Estimated payoff:{' '}
                                            {debt.projection.periods}{' '}
                                            {debt.frequency === 'monthly'
                                                ? 'months'
                                                : debt.frequency === 'weekly'
                                                  ? 'weeks'
                                                  : 'fortnights'}{' '}
                                            ·{' '}
                                            {money(
                                                debt.projection
                                                    .interest_cents ?? 0,
                                            )}{' '}
                                            interest
                                        </p>
                                        {debt.extra_cents > 0 &&
                                            debt.baseline.interest_cents !==
                                                null && (
                                                <p className="mt-1 text-sm text-primary">
                                                    Extras save an estimated{' '}
                                                    {money(
                                                        Math.max(
                                                            0,
                                                            debt.baseline
                                                                .interest_cents -
                                                                (debt.projection
                                                                    .interest_cents ??
                                                                    0),
                                                        ),
                                                    )}{' '}
                                                    in interest.
                                                </p>
                                            )}
                                        {debt.balance_cents > 0 && (
                                            <svg
                                                viewBox="0 0 300 80"
                                                className="mt-3 h-24 w-full"
                                                role="img"
                                                aria-label={`Projected balance for ${debt.name} falls from ${money(debt.balance_cents)} to zero`}
                                            >
                                                <path
                                                    d={debt.projection.balances
                                                        .map(
                                                            (balance, i, all) =>
                                                                `${i === 0 ? 'M' : 'L'} ${(i * 300) / Math.max(1, all.length - 1)} ${75 - (balance / debt.balance_cents) * 70}`,
                                                        )
                                                        .join(' ')}
                                                    fill="none"
                                                    className="stroke-primary"
                                                    strokeWidth="2"
                                                />
                                            </svg>
                                        )}
                                    </>
                                )}
                            </div>
                            <p className="mt-3 text-xs text-muted-foreground">
                                {debt.due_date
                                    ? `Next repayment ${dateLabel(debt.due_date)}`
                                    : 'No repayment date set'}{' '}
                                · {debt.account?.name ?? 'No account assigned'}
                            </p>
                            {debt.notes && (
                                <p className="mt-4 text-sm text-muted-foreground">
                                    {debt.notes}
                                </p>
                            )}
                            <div className="mt-5 flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setEditing(debt)}
                                >
                                    Edit debt
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={() => {
                                        if (
                                            window.confirm(
                                                `Remove ${debt.name}? Its repayments will leave the budget.`,
                                            )
                                        )
                                            router.delete(destroy(debt.id));
                                    }}
                                >
                                    Remove
                                </Button>
                            </div>
                        </Panel>
                    ))}
                </div>
                {debts.length === 0 && (
                    <Panel className="py-12 text-center">
                        <CreditCard className="mx-auto size-10 text-primary" />
                        <h2 className="mt-4 font-semibold">
                            A clear picture of what you owe
                        </h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Add your first debt and its repayment schedule to
                            get started.
                        </p>
                    </Panel>
                )}
                {editing && (
                    <DebtEditor
                        key={editing === 'new' ? 'new' : editing.id}
                        debt={editing === 'new' ? undefined : editing}
                        accounts={accounts}
                        types={types}
                        onClose={() => setEditing(null)}
                    />
                )}
            </div>
        </>
    );
}
DebtsPage.layout = {
    breadcrumbs: [{ title: 'Debts & financing', href: index.url() }],
};
