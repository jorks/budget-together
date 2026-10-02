import type { Account, BudgetItem } from '../types/budget';

export function groupBudgetItems(
    items: BudgetItem[],
    by: string,
    repaymentsFirst = false,
): [string, BudgetItem[]][] {
    if (repaymentsFirst) {
        const repayments = items.filter(
            (item) => item.source === 'mortgage' || item.source === 'debt',
        );
        const editable = items.filter(
            (item) => item.source !== 'mortgage' && item.source !== 'debt',
        );
        repayments.sort(
            (first, second) =>
                Number(second.source === 'mortgage') -
                Number(first.source === 'mortgage'),
        );
        const groups = groupBudgetItems(editable, by);
        if (repayments.length === 0) return groups;
        return by === 'none'
            ? [['', [...repayments, ...editable]]]
            : [['Calculated repayments', repayments], ...groups];
    }
    const groups = new Map<string, BudgetItem[]>();
    for (const item of items) {
        const key =
            by === 'category'
                ? item.category || 'Uncategorised'
                : by === 'frequency'
                  ? item.cadence === 'custom'
                      ? `custom:${item.payments_per_year}`
                      : item.cadence
                  : '';
        groups.set(key, [...(groups.get(key) ?? []), item]);
    }
    const annualTotal = (group: BudgetItem[]) =>
        group.reduce(
            (sum, item) =>
                sum + (item.is_active ? item.equivalents.annually : 0),
            0,
        );
    return [...groups].sort(
        ([a, first], [b, second]) =>
            (by === 'category'
                ? annualTotal(second) - annualTotal(first)
                : 0) || a.localeCompare(b),
    );
}

export function groupAccounts(
    accounts: Account[],
    by: string,
): [string, Account[]][] {
    const groups = new Map<string, Account[]>();
    for (const account of accounts) {
        const key =
            by === 'bank'
                ? (account.bank?.name ?? 'No bank assigned')
                : by === 'type'
                  ? account.type
                  : '';
        groups.set(key, [...(groups.get(key) ?? []), account]);
    }
    return [...groups].sort(([a], [b]) => a.localeCompare(b));
}

export function linkedAccountItems(
    items: BudgetItem[],
    accountId: number,
): BudgetItem[] {
    return items.filter(
        (item) =>
            item.account_id === accountId ||
            item.saving_account_id === accountId,
    );
}
