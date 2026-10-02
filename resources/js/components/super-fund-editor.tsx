import { useForm } from '@inertiajs/react';
import { useId } from 'react';
import { cents, dollars, Field } from '@/components/budget/shared';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { store, update } from '@/routes/superannuation';
import type { SuperFund, SuperProps } from '@/types/superannuation';

export function FundEditor({
    fund,
    funds,
    incomes,
    people,
    today,
    members = [],
    onClose,
}: SuperProps & { fund?: SuperFund; onClose: () => void }) {
    const peopleId = useId();
    const form = useForm({
        name: fund?.name ?? '',
        person: fund?.person ?? incomes[0]?.person ?? people[0] ?? '',
        member_id: fund?.member_id ? String(fund.member_id) : '',
        member_number: fund?.member_number ?? '',
        investment_option: fund?.investment_option ?? 'Balanced',
        income_id: fund?.income_id ? String(fund.income_id) : '',
        employer_rate: String(fund?.employer_rate ?? 12),
        sacrifice: dollars(fund?.contributions.sacrifice_cents ?? 0),
        annual_fee: dollars(fund?.annual_fee_cents ?? 0),
        fee_rate: String(fund?.fee_rate ?? 0),
        insurance: dollars(fund?.annual_insurance_cents ?? 0),
        return_rate: String(fund?.return_rate ?? 6),
        notes: fund?.notes ?? '',
        balance: '',
        recorded_on: today,
    });
    const errors = form.errors as Record<string, string>;
    const selectedIncome = incomes.find(
        (item) => String(item.id) === form.data.income_id,
    );
    const eligibleIncomes = incomes.filter(
        (item) =>
            item.person === form.data.person &&
            !funds.some(
                (other) => other.id !== fund?.id && other.income_id === item.id,
            ),
    );
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
                    <SheetTitle>
                        {fund ? 'Edit super fund' : 'Add super fund'}
                    </SheetTitle>
                    <SheetDescription>
                        Use details from your fund statement. All amounts are in
                        Australian dollars.
                    </SheetDescription>
                </SheetHeader>
                <form
                    className="grid gap-4 p-6"
                    onSubmit={(event) => {
                        event.preventDefault();
                        form.transform(
                            ({
                                sacrifice,
                                annual_fee,
                                insurance,
                                balance,
                                ...data
                            }) => ({
                                ...data,
                                income_id: data.income_id || null,
                                member_id: data.member_id || null,
                                salary_sacrifice_cents: cents(sacrifice),
                                annual_fee_cents: cents(annual_fee),
                                annual_insurance_cents: cents(insurance),
                                ...(!fund
                                    ? { balance_cents: cents(balance) }
                                    : {}),
                            }),
                        );
                        form.submit(fund ? update(fund.id) : store(), {
                            preserveScroll: true,
                            onSuccess: onClose,
                        });
                    }}
                >
                    <Field
                        label="Fund name"
                        value={form.data.name}
                        onChange={(v) => form.setData('name', v)}
                        error={errors.name}
                        required
                    />
                    <Field
                        label="Person"
                        value={form.data.person}
                        onChange={(v) => {
                            form.setData('person', v);
                            form.setData('income_id', '');
                        }}
                        list={peopleId}
                        error={errors.person}
                        required
                        hint="Use the same person name as their wage in Income."
                    />
                    <datalist id={peopleId}>
                        {people.map((person) => (
                            <option key={person} value={person} />
                        ))}
                    </datalist>
                    <Field
                        label="Household member for retirement planning"
                        value={form.data.member_id}
                        onChange={(value) => form.setData('member_id', value)}
                        options={{
                            '': 'Match by person name',
                            ...Object.fromEntries(
                                members.map((member) => [
                                    member.id,
                                    member.name,
                                ]),
                            ),
                        }}
                        error={errors.member_id}
                        hint="Links this fund to their date of birth and retirement age, even if their name changes."
                    />
                    {!fund && (
                        <>
                            <Field
                                label="Current balance ($)"
                                type="money"
                                value={form.data.balance}
                                onChange={(v) => form.setData('balance', v)}
                                error={errors.balance_cents}
                                required
                            />
                            <Field
                                label="Balance as at"
                                type="date"
                                value={form.data.recorded_on}
                                onChange={(v) => form.setData('recorded_on', v)}
                                error={errors.recorded_on}
                                required
                            />
                        </>
                    )}
                    <Field
                        label="Linked PAYG wage"
                        value={form.data.income_id}
                        options={{
                            '': 'No linked wage',
                            ...Object.fromEntries(
                                eligibleIncomes.map((item) => [
                                    item.id,
                                    item.name,
                                ]),
                            ),
                            ...(fund?.income &&
                            !eligibleIncomes.some(
                                (item) => item.id === fund.income_id,
                            )
                                ? {
                                      [fund.income.id]:
                                          `${fund.income.name} (unavailable — unlink to save)`,
                                  }
                                : {}),
                        }}
                        onChange={(v) => {
                            form.setData('income_id', v);
                            const selected = incomes.find(
                                (item) => String(item.id) === v,
                            );
                            if (selected)
                                form.setData(
                                    'sacrifice',
                                    dollars(
                                        selected.salary_sacrifice_cents ?? 0,
                                    ),
                                );
                        }}
                        error={errors.income_id}
                        hint="Each wage can feed one fund. Enter gross base wages excluding super in Income; bonuses are excluded from this estimate."
                    />
                    <Field
                        label="Employer contribution (%)"
                        type="money"
                        value={form.data.employer_rate}
                        onChange={(v) => form.setData('employer_rate', v)}
                        error={errors.employer_rate}
                        hint="Defaults to 12% of the linked gross annual wage. Adjust for your employer arrangement."
                        required
                    />
                    <Field
                        label="Annual salary sacrifice ($)"
                        type="money"
                        value={form.data.sacrifice}
                        onChange={(v) => form.setData('sacrifice', v)}
                        error={errors.salary_sacrifice_cents}
                        required
                        hint={
                            selectedIncome
                                ? 'Saving also updates salary sacrifice on this wage in Income.'
                                : 'Without a linked wage, this is a projection assumption only. It does not change your household budget.'
                        }
                    />
                    {selectedIncome && !selectedIncome.use_tax_estimate && (
                        <p
                            role="status"
                            className="text-sm text-muted-foreground"
                        >
                            This wage uses manual take-home pay. Update that
                            amount in Income to reflect salary sacrifice.
                        </p>
                    )}
                    <Field
                        label="Investment option"
                        value={form.data.investment_option}
                        onChange={(v) => form.setData('investment_option', v)}
                        error={errors.investment_option}
                        hint="For example: Balanced, Growth, Conservative or a custom mix."
                    />
                    <Field
                        label="Assumed annual return (%)"
                        type="money"
                        value={form.data.return_rate}
                        onChange={(v) => form.setData('return_rate', v)}
                        error={errors.return_rate}
                        required
                        hint="Your own assumption after investment tax, before the fees entered below. An investment option does not guarantee a return."
                    />
                    <Field
                        label="Annual fixed fees ($)"
                        type="money"
                        value={form.data.annual_fee}
                        onChange={(v) => form.setData('annual_fee', v)}
                        error={errors.annual_fee_cents}
                        required
                    />
                    <Field
                        label="Annual balance-based fees (%)"
                        type="money"
                        value={form.data.fee_rate}
                        onChange={(v) => form.setData('fee_rate', v)}
                        error={errors.fee_rate}
                        required
                        hint="Only include costs not already deducted from your assumed return."
                    />
                    <Field
                        label="Annual insurance cost ($)"
                        type="money"
                        value={form.data.insurance}
                        onChange={(v) => form.setData('insurance', v)}
                        error={errors.annual_insurance_cents}
                        required
                    />
                    <Field
                        label="Member number (optional)"
                        value={form.data.member_number}
                        onChange={(v) => form.setData('member_number', v)}
                        error={errors.member_number}
                    />
                    <Field
                        label="Notes"
                        value={form.data.notes}
                        onChange={(v) => form.setData('notes', v)}
                        error={errors.notes}
                    />
                    <Button disabled={form.processing}>
                        {fund ? 'Save fund' : 'Add fund'}
                    </Button>
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
