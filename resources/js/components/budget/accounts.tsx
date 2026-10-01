import { router, useForm } from '@inertiajs/react';
import {
    CreditCard,
    Landmark,
    Pencil,
    Plus,
    Trash2,
    Wallet,
    PiggyBank,
    House,
} from 'lucide-react';
import { groupAccounts, linkedAccountItems } from '@/lib/budget-groups';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import {
    cents,
    dollars,
    Empty,
    Field,
    money,
    Panel,
} from '@/components/budget/shared';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { store, update, destroy } from '@/routes/accounts';
import {
    store as storeBank,
    update as updateBank,
    destroy as destroyBank,
} from '@/routes/banks';
import type { Account, Bank, BudgetItem } from '@/types/budget';

const accountTypes = {
    transaction: 'Everyday account',
    savings: 'Savings',
    offset: 'Mortgage offset',
    mortgage: 'Mortgage / loan',
    credit_card: 'Credit card',
    cash: 'Cash',
};
function AccountEditor({
    account,
    banks,
    onClose,
}: {
    account?: Account;
    banks: Bank[];
    onClose: () => void;
}) {
    const form = useForm({
        name: account?.name ?? '',
        bank_id: String(account?.bank_id ?? ''),
        type: account?.type ?? 'transaction',
        owner: account?.owner ?? 'Joint',
        last_four: account?.last_four ?? '',
        purpose: account?.purpose ?? '',
        balance_cents: dollars(account?.balance_cents ?? 0),
        credit_limit_cents: dollars(account?.credit_limit_cents),
    });
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
                <SheetHeader className="border-b p-6">
                    <SheetTitle>
                        {account ? 'Edit account' : 'Add account'}
                    </SheetTitle>
                    <SheetDescription>
                        Give every account a clear purpose.
                    </SheetDescription>
                </SheetHeader>
                <form
                    className="grid gap-5 p-6 pt-0"
                    onSubmit={(e) => {
                        e.preventDefault();
                        form.transform((data) => ({
                            ...data,
                            balance_cents: cents(data.balance_cents) ?? 0,
                            credit_limit_cents: cents(data.credit_limit_cents),
                        }));
                        form.submit(account ? update(account.id) : store(), {
                            preserveScroll: true,
                            onSuccess: onClose,
                        });
                    }}
                >
                    <Field
                        label="Account name"
                        value={form.data.name}
                        onChange={(v) => form.setData('name', v)}
                        error={form.errors.name}
                        required
                    />
                    <Field
                        label="Bank"
                        value={form.data.bank_id}
                        onChange={(v) => form.setData('bank_id', v)}
                        error={form.errors.bank_id}
                        options={{
                            '': 'No bank assigned',
                            ...Object.fromEntries(
                                banks.map((bank) => [bank.id, bank.name]),
                            ),
                        }}
                    />
                    <Field
                        label="Account type"
                        value={form.data.type}
                        onChange={(v) => form.setData('type', v)}
                        options={accountTypes}
                        error={form.errors.type}
                    />
                    <Field
                        label="Owner"
                        value={form.data.owner}
                        onChange={(v) => form.setData('owner', v)}
                        error={form.errors.owner}
                    />
                    <Field
                        label="Last four digits"
                        value={form.data.last_four}
                        onChange={(v) => form.setData('last_four', v)}
                        error={form.errors.last_four}
                        hint="An optional identifier. Do not enter full card or account numbers."
                    />
                    <Field
                        label="Purpose"
                        value={form.data.purpose}
                        onChange={(v) => form.setData('purpose', v)}
                        error={form.errors.purpose}
                    />
                    <Field
                        label="Current balance (AUD)"
                        type="money"
                        value={form.data.balance_cents}
                        onChange={(v) => form.setData('balance_cents', v)}
                        error={form.errors.balance_cents}
                        hint="Enter debts as a negative balance. This is a manual snapshot, not a bank feed."
                    />
                    {form.data.type === 'credit_card' && (
                        <Field
                            label="Credit limit (AUD)"
                            type="money"
                            value={form.data.credit_limit_cents}
                            onChange={(v) =>
                                form.setData('credit_limit_cents', v)
                            }
                            error={form.errors.credit_limit_cents}
                        />
                    )}
                    <div className="flex gap-3">
                        <Button disabled={form.processing}>Save account</Button>
                        <Button type="button" variant="outline" onClick={close}>
                            Cancel
                        </Button>
                    </div>
                </form>
            </SheetContent>
        </Sheet>
    );
}
function BankEditor({ bank, onClose }: { bank?: Bank; onClose: () => void }) {
    const form = useForm({ name: bank?.name ?? '', notes: bank?.notes ?? '' });
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
            <SheetContent className="w-full sm:max-w-lg">
                <SheetHeader className="p-6">
                    <SheetTitle>{bank ? 'Edit bank' : 'Add bank'}</SheetTitle>
                    <SheetDescription>
                        Group your accounts by institution.
                    </SheetDescription>
                </SheetHeader>
                <form
                    className="grid gap-5 px-6"
                    onSubmit={(e) => {
                        e.preventDefault();
                        form.submit(bank ? updateBank(bank.id) : storeBank(), {
                            preserveScroll: true,
                            onSuccess: onClose,
                        });
                    }}
                >
                    <Field
                        label="Bank name"
                        value={form.data.name}
                        onChange={(v) => form.setData('name', v)}
                        error={form.errors.name}
                        required
                    />
                    <Field
                        label="Notes"
                        value={form.data.notes}
                        onChange={(v) => form.setData('notes', v)}
                        error={form.errors.notes}
                    />
                    <Button disabled={form.processing}>Save bank</Button>
                </form>
            </SheetContent>
        </Sheet>
    );
}
export function Accounts({
    accounts,
    banks,
    items,
    onEditItem,
}: {
    accounts: Account[];
    banks: Bank[];
    items: BudgetItem[];
    onEditItem: (item: BudgetItem) => void;
}) {
    const [editing, setEditing] = useState<Account | 'new' | null>(null);
    const [bankEditing, setBankEditing] = useState<Bank | 'new' | null>(null);
    const [error, setError] = useState('');
    const [groupBy, setGroupBy] = useState('none');
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const selected = accounts.find((account) => account.id === selectedId);
    return (
        <div className="grid gap-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                    Where money comes in, lives, and goes out.
                </p>
                <div className="flex flex-wrap gap-2">
                    <select
                        aria-label="Group accounts"
                        className="h-9 rounded-md border bg-background px-3 text-sm"
                        value={groupBy}
                        onChange={(event) => setGroupBy(event.target.value)}
                    >
                        <option value="none">No grouping</option>
                        <option value="bank">Group by bank</option>
                        <option value="type">Group by account type</option>
                    </select>
                    <Button
                        variant="outline"
                        onClick={() => setBankEditing('new')}
                    >
                        <Landmark className="size-4" />
                        Add bank
                    </Button>
                    <Button onClick={() => setEditing('new')}>
                        <Plus className="size-4" />
                        Add account
                    </Button>
                </div>
            </div>
            {error && (
                <p role="alert" className="text-destructive">
                    {error}
                </p>
            )}
            {groupAccounts(accounts, groupBy).map(
                ([group, groupedAccounts]) => (
                    <section key={group}>
                        {groupBy !== 'none' && (
                            <h2 className="mb-3 flex items-center gap-2 font-semibold">
                                <Landmark className="size-4" />
                                {groupBy === 'type'
                                    ? accountTypes[
                                          group as keyof typeof accountTypes
                                      ]
                                    : group}{' '}
                                <span className="text-xs text-muted-foreground">
                                    ({groupedAccounts.length})
                                </span>
                            </h2>
                        )}
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {groupedAccounts.map((account) => {
                                const linked = linkedAccountItems(
                                    items,
                                    account.id,
                                );
                                const AccountIcon =
                                    account.type === 'credit_card'
                                        ? CreditCard
                                        : ['mortgage', 'offset'].includes(
                                                account.type,
                                            )
                                          ? House
                                          : account.type === 'savings'
                                            ? PiggyBank
                                            : Wallet;
                                return (
                                    <Panel
                                        key={account.id}
                                        className="flex h-full flex-col gap-5"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="rounded-lg bg-primary/5 p-3 text-primary">
                                                <AccountIcon className="size-5" />
                                            </div>
                                            <div className="flex">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    aria-label={`Edit ${account.name}`}
                                                    onClick={() =>
                                                        setEditing(account)
                                                    }
                                                >
                                                    <Pencil className="size-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    aria-label={`Delete ${account.name}`}
                                                    onClick={() => {
                                                        if (
                                                            window.confirm(
                                                                `Delete ${account.name}? Linked budget items will remain, with this account unassigned.`,
                                                            )
                                                        )
                                                            router.delete(
                                                                destroy(
                                                                    account.id,
                                                                ),
                                                                {
                                                                    preserveScroll: true,
                                                                },
                                                            );
                                                    }}
                                                >
                                                    <Trash2 className="size-4" />
                                                </Button>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                                                {account.bank?.name ??
                                                    'No bank assigned'}
                                            </p>
                                            <h3 className="mt-1 text-lg font-semibold">
                                                <button
                                                    className="text-left hover:underline"
                                                    onClick={() =>
                                                        setSelectedId(
                                                            account.id,
                                                        )
                                                    }
                                                >
                                                    {account.name}
                                                </button>
                                            </h3>
                                            <Badge
                                                variant="outline"
                                                className="mt-2 border-border font-normal text-muted-foreground"
                                            >
                                                {
                                                    accountTypes[
                                                        account.type as keyof typeof accountTypes
                                                    ]
                                                }
                                            </Badge>
                                            <p className="mt-2 text-xs text-muted-foreground">
                                                {account.owner}
                                                {account.last_four &&
                                                    ` · •••• ${account.last_four}`}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-2xl font-semibold tabular-nums">
                                                {money(account.balance_cents)}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Manual balance
                                                {account.credit_limit_cents !=
                                                    null &&
                                                    ` · Limit ${money(account.credit_limit_cents)}`}
                                            </p>
                                        </div>
                                        <p className="min-h-10 text-sm text-muted-foreground">
                                            {account.purpose ||
                                                'Add a purpose to make this account easier to plan around.'}
                                        </p>
                                        <div className="mt-auto border-t pt-4 text-xs text-muted-foreground">
                                            <p>
                                                {linked.length} linked{' '}
                                                {linked.length === 1
                                                    ? 'item'
                                                    : 'items'}
                                            </p>
                                            <Button
                                                variant="link"
                                                className="h-auto px-0 pt-2"
                                                onClick={() =>
                                                    setSelectedId(account.id)
                                                }
                                            >
                                                View account details
                                            </Button>
                                        </div>
                                    </Panel>
                                );
                            })}
                        </div>
                    </section>
                ),
            )}
            {!accounts.length && (
                <Empty title="A home for every dollar">
                    Add an everyday account, your mortgage offset, savings
                    accounts or credit cards.
                </Empty>
            )}
            {selected && (
                <Sheet
                    open
                    onOpenChange={(open) => {
                        if (!open) setSelectedId(null);
                    }}
                >
                    <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
                        <SheetHeader>
                            <SheetTitle>{selected.name}</SheetTitle>
                            <SheetDescription>
                                {selected.bank?.name ?? 'No bank assigned'} ·{' '}
                                {
                                    accountTypes[
                                        selected.type as keyof typeof accountTypes
                                    ]
                                }{' '}
                                · {selected.owner || 'No owner specified'}
                            </SheetDescription>
                        </SheetHeader>
                        <div className="grid gap-5 p-6">
                            <p className="text-sm text-muted-foreground">
                                {selected.purpose || 'No purpose recorded.'}
                            </p>
                            <p className="text-2xl font-semibold tabular-nums">
                                {money(selected.balance_cents)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Manual balance
                                {selected.last_four &&
                                    ` · •••• ${selected.last_four}`}
                                {selected.credit_limit_cents != null &&
                                    ` · Credit limit ${money(selected.credit_limit_cents)}`}
                            </p>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setSelectedId(null);
                                    setEditing(selected);
                                }}
                            >
                                <Pencil className="size-4" />
                                Edit account
                            </Button>
                            <h3 className="font-semibold">
                                Linked income and budget items
                            </h3>
                            {linkedAccountItems(items, selected.id).map(
                                (item) => (
                                    <button
                                        className="grid gap-1 border-t pt-3 text-left hover:underline"
                                        key={item.id}
                                        onClick={() => {
                                            setSelectedId(null);
                                            onEditItem(item);
                                        }}
                                    >
                                        <span className="font-medium">
                                            {item.name}{' '}
                                            {!item.is_active && (
                                                <Badge variant="outline">
                                                    Paused
                                                </Badge>
                                            )}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {item.kind} ·{' '}
                                            {item.category || 'Uncategorised'}
                                            {item.source === 'mortgage' && (
                                                <span className="block text-xs text-muted-foreground">
                                                    Calculated · manage in
                                                    Mortgage
                                                </span>
                                            )}
                                            {item.saving_account_id ===
                                                selected.id &&
                                                ' · Save-ahead account'}
                                        </span>
                                        <span className="text-sm tabular-nums">
                                            {money(item.equivalents.monthly)} /
                                            month
                                        </span>
                                    </button>
                                ),
                            )}
                            {!linkedAccountItems(items, selected.id).length && (
                                <p className="text-sm text-muted-foreground">
                                    No linked items. Choose this account when
                                    editing an income, bill or allocation.
                                </p>
                            )}
                        </div>
                    </SheetContent>
                </Sheet>
            )}
            <Panel>
                <h3 className="mb-4 font-semibold">Your banks</h3>
                {!banks.length && (
                    <p className="text-sm text-muted-foreground">
                        Add the banks and institutions you use.
                    </p>
                )}
                {banks.map((bank) => (
                    <div
                        key={bank.id}
                        className="flex items-center justify-between gap-3 border-t py-3 first:border-0"
                    >
                        <div>
                            <p className="font-medium">{bank.name}</p>
                            <p className="text-sm text-muted-foreground">
                                {bank.accounts_count} accounts
                                {bank.notes && ` · ${bank.notes}`}
                            </p>
                        </div>
                        <div className="flex">
                            <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Edit ${bank.name}`}
                                onClick={() => setBankEditing(bank)}
                            >
                                <Pencil className="size-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Delete ${bank.name}`}
                                onClick={() => {
                                    if (window.confirm(`Delete ${bank.name}?`))
                                        router.delete(destroyBank(bank.id), {
                                            preserveScroll: true,
                                            onError: (errors) =>
                                                setError(
                                                    errors.bank ??
                                                        'Unable to delete bank.',
                                                ),
                                        });
                                }}
                            >
                                <Trash2 className="size-4" />
                            </Button>
                        </div>
                    </div>
                ))}
            </Panel>
            {editing && (
                <AccountEditor
                    key={editing === 'new' ? 'new' : editing.id}
                    account={editing === 'new' ? undefined : editing}
                    banks={banks}
                    onClose={() => setEditing(null)}
                />
            )}
            {bankEditing && (
                <BankEditor
                    bank={bankEditing === 'new' ? undefined : bankEditing}
                    onClose={() => setBankEditing(null)}
                />
            )}
        </div>
    );
}
