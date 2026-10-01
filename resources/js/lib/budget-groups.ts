import type { Account, BudgetItem } from '../types/budget';

export function groupBudgetItems(
    items: BudgetItem[],
    by: string,
): [string, BudgetItem[]][] {
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
