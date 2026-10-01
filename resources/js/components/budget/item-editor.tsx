import { useForm } from '@inertiajs/react';
import { useState } from 'react';
import { TaxInfo } from '@/components/budget/tax-info';
import { store as storeCategory } from '@/routes/categories';
import { Save, Plus } from 'lucide-react';
import {
    cadences,
    cents,
    dollars,
    factors,
    Field,
    money,
    Toggle,
} from '@/components/budget/shared';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { store, update } from '@/routes/budget-items';
import type { Account, BudgetItem, Kind, BudgetProps } from '@/types/budget';

export function ItemEditor({
    item,
    kind,
    accounts,
    categories,
    today,
    financialYear,
    taxBrackets,
    onClose,
}: {
    item?: BudgetItem;
    kind: Kind;
    accounts: Account[];
    categories: string[];
    today: string;
    financialYear: number;
    taxBrackets: BudgetProps['taxBrackets'];
    onClose: () => void;
}) {
    const form = useForm({
        name: item?.name ?? '',
        kind: item?.kind ?? kind,
        category: item?.category ?? '',
        person: item?.person ?? '',
        amount_cents: dollars(item?.amount_cents),
        cadence: item?.cadence ?? 'monthly',
        payments_per_year: String(item?.payments_per_year ?? 10),
        is_variable: item?.is_variable ?? false,
        is_active: item?.is_active ?? true,
        due_date: item?.due_date ?? '',
        pay_date: item?.pay_date ?? '',
        salary_sacrifice_cents: dollars(item?.salary_sacrifice_cents ?? 0),
        workplace_giving_cents: dollars(item?.workplace_giving_cents ?? 0),
        other_deductions_cents: dollars(item?.other_deductions_cents ?? 0),
        account_id: String(item?.account_id ?? ''),
        gross_annual_cents: dollars(item?.gross_annual_cents),
        bonus_annual_cents: dollars(item?.bonus_annual_cents),
        use_tax_estimate: item?.use_tax_estimate ?? false,
        tax_year: String(item?.tax_year ?? financialYear),
        include_bonus: item?.include_bonus ?? false,
        include_medicare: item?.include_medicare ?? true,
        notes: item?.notes ?? '',
        has_sinking_fund: item?.has_sinking_fund ?? false,
        saved_cents: dollars(item?.saved_cents ?? 0),
        saving_start_date: item?.saving_start_date ?? today,
        contribution_cents: dollars(item?.contribution_cents),
        contribution_cadence: item?.contribution_cadence ?? 'weekly',
        saving_account_id: String(item?.saving_account_id ?? ''),
    });
    const { data, setData, errors } = form;
    const categoryForm = useForm({ name: '' });
    const [addingCategory, setAddingCategory] = useState(false);
    const names = {
        income: 'income',
        bill: 'bill',
        spending: 'spending allowance',
        saving: 'savings allocation',
    };
    const annual =
        (cents(data.amount_cents) ?? 0) *
        (data.cadence === 'custom'
            ? Number(data.payments_per_year)
            : factors[data.cadence]);
    const accountOptions = {
        '': 'Not assigned',
        ...Object.fromEntries(
            accounts.map((account) => [account.id, account.name]),
        ),
    };
    const close = () => {
        if (!form.isDirty || window.confirm('Discard your unsaved changes?'))
            onClose();
    };
    function submit(event: React.FormEvent) {
        event.preventDefault();
        form.transform((values) => ({
            ...values,
            amount_cents: cents(values.amount_cents) ?? 0,
            gross_annual_cents: cents(values.gross_annual_cents),
            bonus_annual_cents: cents(values.bonus_annual_cents),
            saved_cents: cents(values.saved_cents) ?? 0,
            salary_sacrifice_cents: cents(values.salary_sacrifice_cents) ?? 0,
            workplace_giving_cents: cents(values.workplace_giving_cents) ?? 0,
            other_deductions_cents: cents(values.other_deductions_cents) ?? 0,
            contribution_cents: cents(values.contribution_cents),
            has_sinking_fund: values.kind === 'bill' && values.has_sinking_fund,
            use_tax_estimate:
                values.kind === 'income' && values.use_tax_estimate,
        }));
        form.submit(item ? update(item.id) : store(), {
            preserveScroll: true,
            onSuccess: onClose,
        });
    }
    return (
        <Sheet
            open
            onOpenChange={(open) => {
                if (!open) close();
            }}
        >
            <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
                <SheetHeader className="border-b p-6">
                    <SheetTitle>
                        {item ? 'Edit' : 'Add'} {names[data.kind]}
                    </SheetTitle>
                    <SheetDescription>
                        Enter it the way you pay it. We’ll work out the rest.
                    </SheetDescription>
                </SheetHeader>
                <form
                    onSubmit={submit}
                    className="flex flex-1 flex-col gap-6 px-6 pb-6"
                >
                    <Field
                        label="Name"
                        value={data.name}
                        onChange={(v) => setData('name', v)}
                        error={errors.name}
                        required
                        hint={
                            data.kind === 'bill'
                                ? 'For example, home insurance or daycare.'
                                : undefined
                        }
                    />
                    {['spending', 'saving'].includes(data.kind) && (
                        <Field
                            label="Allocation type"
                            value={data.kind}
                            onChange={(v) => setData('kind', v as Kind)}
                            options={{
                                spending: 'Spending allowance',
                                saving: 'Savings allocation',
                            }}
                        />
                    )}
                    <div className="grid grid-cols-2 gap-4">
                        <Field
                            label={
                                data.kind === 'income'
                                    ? 'Income category'
                                    : 'Category'
                            }
                            value={data.category}
                            onChange={(v) => setData('category', v)}
                            error={errors.category}
                            options={{
                                '': 'Uncategorised',
                                ...Object.fromEntries(
                                    [
                                        ...new Set(
                                            [
                                                ...categories,
                                                data.category,
                                            ].filter(Boolean),
                                        ),
                                    ].map((name) => [name, name]),
                                ),
                            }}
                        />
                        <Field
                            label="Person / owner"
                            value={data.person}
                            onChange={(v) => setData('person', v)}
                            error={errors.person}
                        />
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setAddingCategory(!addingCategory)}
                    >
                        <Plus className="size-4" /> Add category
                    </Button>
                    {addingCategory && (
                        <div className="grid gap-3 rounded-lg border p-4">
                            <Field
                                label="New category name"
                                value={categoryForm.data.name}
                                onChange={(name) =>
                                    categoryForm.setData('name', name)
                                }
                                error={categoryForm.errors.name}
                            />
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    disabled={
                                        categoryForm.processing ||
                                        !categoryForm.data.name.trim()
                                    }
                                    onClick={() =>
                                        categoryForm.post(storeCategory.url(), {
                                            preserveScroll: true,
                                            onSuccess: () => {
                                                setData(
                                                    'category',
                                                    categories.find(
                                                        (name) =>
                                                            name.toLowerCase() ===
                                                            categoryForm.data.name
                                                                .trim()
                                                                .toLowerCase(),
                                                    ) ??
                                                        categoryForm.data.name.trim(),
                                                );
                                                categoryForm.reset();
                                                setAddingCategory(false);
                                            },
                                        })
                                    }
                                >
                                    Save category
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setAddingCategory(false)}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    )}
                    {data.kind === 'income' &&
                        data.category.trim().toLowerCase() === 'bonus' && (
                            <div>
                                <Toggle
                                    label="Include this bonus in my budget"
                                    checked={data.include_bonus}
                                    onChange={(v) =>
                                        setData('include_bonus', v)
                                    }
                                />
                                <p className="mt-2 text-xs text-muted-foreground">
                                    Leave off to keep this bonus out of income
                                    totals and money left to allocate. It will
                                    still appear in your income list and
                                    calendar.
                                </p>
                            </div>
                        )}
                    {data.kind === 'income' && (
                        <div className="grid gap-4 rounded-xl bg-muted/50 p-4">
                            <h3 className="font-medium">
                                Salary & tax estimate
                            </h3>
                            <Field
                                label="Gross annual salary, excluding super (AUD)"
                                type="money"
                                value={data.gross_annual_cents}
                                onChange={(v) =>
                                    setData('gross_annual_cents', v)
                                }
                                error={errors.gross_annual_cents}
                            />
                            <Field
                                label="Annual bonus before tax (AUD)"
                                type="money"
                                value={data.bonus_annual_cents}
                                onChange={(v) =>
                                    setData('bonus_annual_cents', v)
                                }
                                error={errors.bonus_annual_cents}
                            />
                            {(
                                [
                                    'salary_sacrifice_cents',
                                    'workplace_giving_cents',
                                    'other_deductions_cents',
                                ] as const
                            ).map((field) => (
                                <Field
                                    key={field}
                                    type="money"
                                    label={
                                        {
                                            salary_sacrifice_cents:
                                                'Annual salary sacrifice to super (AUD)',
                                            workplace_giving_cents:
                                                'Annual tax-deductible workplace giving (AUD)',
                                            other_deductions_cents:
                                                'Annual after-tax payroll deductions (AUD)',
                                        }[field]
                                    }
                                    value={data[field]}
                                    onChange={(value) => setData(field, value)}
                                    error={errors[field]}
                                />
                            ))}
                            <p className="text-xs text-muted-foreground">
                                Super sacrifice and eligible giving reduce
                                estimated taxable income and cash received.
                                Other payroll deductions reduce cash only.
                                Manual take-home pay should already include
                                these deductions.
                            </p>
                            <Field
                                label="Financial year"
                                error={errors.tax_year}
                                value={data.tax_year}
                                onChange={(v) => setData('tax_year', v)}
                                options={{
                                    '2025': '2025–26',
                                    '2026': '2026–27',
                                    '2027': '2027–28',
                                }}
                            />
                            <TaxInfo
                                year={Number(data.tax_year)}
                                brackets={taxBrackets[data.tax_year] ?? []}
                            />
                            {data.category.trim().toLowerCase() !== 'bonus' && (
                                <Toggle
                                    label="Include the bonus in the estimate"
                                    checked={data.include_bonus}
                                    onChange={(v) =>
                                        setData('include_bonus', v)
                                    }
                                />
                            )}
                            <Toggle
                                label="Include the standard 2% Medicare levy"
                                checked={data.include_medicare}
                                onChange={(v) => setData('include_medicare', v)}
                            />
                            <Toggle
                                label="Use estimated take-home pay in my budget"
                                checked={data.use_tax_estimate}
                                onChange={(v) => setData('use_tax_estimate', v)}
                            />
                            <p className="text-xs leading-relaxed text-muted-foreground">
                                Full-year Australian resident estimate. Excludes
                                offsets, other deductions, HELP, Medicare levy
                                surcharge and levy reductions/exemptions. Use
                                manual take-home pay for your actual payslip.
                                Enter one combined taxable income per person.{' '}
                                <a
                                    className="underline"
                                    href="https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/tax-rates-and-codes/tax-rates-australian-residents"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    ATO rates
                                </a>
                            </p>
                        </div>
                    )}
                    {!data.use_tax_estimate && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <Field
                                    label={
                                        data.kind === 'income'
                                            ? 'Take-home amount (AUD)'
                                            : 'Amount (AUD)'
                                    }
                                    type="money"
                                    value={data.amount_cents}
                                    onChange={(v) => setData('amount_cents', v)}
                                    error={errors.amount_cents}
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3 rounded-xl border p-4 text-sm">
                                {[
                                    ['Year', annual],
                                    ['Month', annual / 12],
                                    ['Fortnight', annual / 26],
                                    ['Week', annual / 52],
                                ].map(([label, amount]) => (
                                    <div key={label}>
                                        <span className="text-muted-foreground">
                                            {label}
                                        </span>
                                        <div className="font-semibold tabular-nums">
                                            {money(Number(amount))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                    <Field
                        label="Frequency"
                        value={data.cadence}
                        onChange={(v) => setData('cadence', v)}
                        options={cadences}
                        error={errors.cadence}
                    />
                    {data.cadence === 'custom' && (
                        <Field
                            label="Payments per year"
                            type="number"
                            value={data.payments_per_year}
                            onChange={(v) => setData('payments_per_year', v)}
                            error={errors.payments_per_year}
                            hint="Used for budgeting only. The calendar shows your entered date, without inventing dates for irregular instalments."
                        />
                    )}
                    {data.kind === 'income' && (
                        <Field
                            label="Known pay date"
                            type="date"
                            value={data.pay_date}
                            onChange={(value) => setData('pay_date', value)}
                            error={errors.pay_date}
                            hint="The calendar repeats from this date using your pay frequency. For monthly pay on the 15th, choose a 15th; for fortnightly pay, choose a known payday."
                        />
                    )}
                    {data.kind === 'bill' && (
                        <>
                            <Toggle
                                label="Variable bill — this amount is a forecast"
                                checked={data.is_variable}
                                onChange={(v) => setData('is_variable', v)}
                            />
                            <Field
                                label="Next bill due"
                                type="date"
                                value={data.due_date}
                                onChange={(v) => setData('due_date', v)}
                                error={errors.due_date}
                                hint="Recurring calendar dates start here. Update this date after paying an annual bill."
                            />
                        </>
                    )}
                    <Field
                        label={
                            data.kind === 'income'
                                ? 'Paid into account'
                                : data.kind === 'saving'
                                  ? 'Save into account'
                                  : 'Paid from account'
                        }
                        value={data.account_id}
                        onChange={(v) => setData('account_id', v)}
                        options={accountOptions}
                        error={errors.account_id}
                        hint={
                            accounts.length
                                ? undefined
                                : 'Add your bank accounts on the Accounts page whenever you’re ready.'
                        }
                    />
                    {data.kind === 'bill' && (
                        <div className="grid gap-4 rounded-xl bg-muted/50 p-4">
                            <Toggle
                                label="Save ahead for this bill"
                                checked={data.has_sinking_fund}
                                onChange={(v) => setData('has_sinking_fund', v)}
                            />
                            {data.has_sinking_fund && (
                                <>
                                    <p className="text-xs text-muted-foreground">
                                        The target is one bill payment. This
                                        funding plan does not add a second
                                        expense to your budget.
                                    </p>
                                    <Field
                                        label="Already set aside for this bill (AUD)"
                                        type="money"
                                        value={data.saved_cents}
                                        onChange={(v) =>
                                            setData('saved_cents', v)
                                        }
                                        error={errors.saved_cents}
                                    />
                                    <Field
                                        label="Start contributing"
                                        type="date"
                                        value={data.saving_start_date}
                                        onChange={(v) =>
                                            setData('saving_start_date', v)
                                        }
                                        error={errors.saving_start_date}
                                        hint="Contributions begin on this date or today, whichever is later, and must arrive before the bill is due."
                                    />
                                    <div className="grid grid-cols-2 gap-4">
                                        <Field
                                            label="Planned contribution (AUD)"
                                            type="money"
                                            value={data.contribution_cents}
                                            onChange={(v) =>
                                                setData('contribution_cents', v)
                                            }
                                            error={errors.contribution_cents}
                                            hint="Leave blank to use the required amount."
                                        />
                                        <Field
                                            label="Contribute every"
                                            value={data.contribution_cadence}
                                            onChange={(v) =>
                                                setData(
                                                    'contribution_cadence',
                                                    v,
                                                )
                                            }
                                            options={{
                                                weekly: 'Week',
                                                fortnightly: 'Fortnight',
                                                monthly: 'Month',
                                            }}
                                        />
                                    </div>
                                    <Field
                                        label="Held in account"
                                        value={data.saving_account_id}
                                        onChange={(v) =>
                                            setData('saving_account_id', v)
                                        }
                                        options={accountOptions}
                                        error={errors.saving_account_id}
                                    />
                                </>
                            )}
                        </div>
                    )}
                    <Field
                        label="Notes"
                        value={data.notes}
                        onChange={(v) => setData('notes', v)}
                        error={errors.notes}
                    />
                    <Toggle
                        label="Active — include in the budget"
                        checked={data.is_active}
                        onChange={(v) => setData('is_active', v)}
                    />
                    {Object.keys(errors).length > 0 && (
                        <div
                            role="alert"
                            className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
                        >
                            Please check the highlighted fields.
                            {Object.entries(errors)
                                .filter(([key]) =>
                                    [
                                        'has_sinking_fund',
                                        'use_tax_estimate',
                                        'is_active',
                                        'include_bonus',
                                        'include_medicare',
                                        'is_variable',
                                    ].includes(key),
                                )
                                .map(([key, error]) => (
                                    <p key={key}>{error}</p>
                                ))}
                        </div>
                    )}
                    <div className="sticky bottom-0 -mx-6 flex gap-3 border-t bg-background px-6 py-4">
                        <Button type="submit" disabled={form.processing}>
                            <Save className="size-4" />
                            {form.processing
                                ? 'Saving…'
                                : 'Save ' + names[data.kind]}
                        </Button>
                        <Button type="button" variant="outline" onClick={close}>
                            Cancel
                        </Button>
                    </div>
                </form>
            </SheetContent>
        </Sheet>
    );
}
