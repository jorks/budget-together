import { describe, expect, it } from 'vitest';
import {
    groupAccounts,
    groupBudgetItems,
    linkedAccountItems,
} from './budget-groups';
import type { Account, BudgetItem } from '../types/budget';

const item = (id: number, changes: Partial<BudgetItem> = {}) =>
    ({
        id,
        category: null,
        cadence: 'monthly',
        payments_per_year: null,
        account_id: null,
        saving_account_id: null,
        is_active: true,
        ...changes,
    }) as BudgetItem;
const account = (id: number, type: string, bank: Account['bank'] = null) =>
    ({ id, type, bank }) as Account;

describe('budget grouping', () => {
    it('groups by category without hiding uncategorised items', () => {
        const utilities = item(1, { category: 'Utilities' });
        const uncategorised = item(2);
        expect(
            groupBudgetItems([utilities, uncategorised], 'category'),
        ).toEqual([
            ['Uncategorised', [uncategorised]],
            ['Utilities', [utilities]],
        ]);
        expect(groupBudgetItems([utilities, uncategorised], 'none')).toEqual([
            ['', [utilities, uncategorised]],
        ]);
    });
    it('groups by frequency and distinguishes custom instalment counts', () => {
        const quarterly = item(1, { cadence: 'quarterly' });
        const ten = item(2, { cadence: 'custom', payments_per_year: 10 });
        const four = item(3, { cadence: 'custom', payments_per_year: 4 });
        expect(groupBudgetItems([quarterly, ten, four], 'frequency')).toEqual([
            ['custom:10', [ten]],
            ['custom:4', [four]],
            ['quarterly', [quarterly]],
        ]);
    });
});

describe('accounts', () => {
    it('groups by bank and account type including unassigned banks', () => {
        const bank = {
            id: 1,
            name: 'Everyday Bank',
            notes: null,
            accounts_count: 2,
        };
        const everyday = account(1, 'transaction', bank);
        const savings = account(2, 'savings', bank);
        const mortgage = account(3, 'mortgage');
        expect(groupAccounts([everyday, savings, mortgage], 'bank')).toEqual([
            ['Everyday Bank', [everyday, savings]],
            ['No bank assigned', [mortgage]],
        ]);
        expect(groupAccounts([everyday, savings, mortgage], 'type')).toEqual([
            ['mortgage', [mortgage]],
            ['savings', [savings]],
            ['transaction', [everyday]],
        ]);
        expect(groupAccounts([everyday, savings], 'none')).toEqual([
            ['', [everyday, savings]],
        ]);
    });
    it('shows all direct and funding links once including paused items', () => {
        const direct = item(1, { account_id: 5 });
        const funding = item(2, { saving_account_id: 5, is_active: false });
        const both = item(3, { account_id: 5, saving_account_id: 5 });
        const other = item(4, { account_id: 6 });
        expect(linkedAccountItems([direct, funding, both, other], 5)).toEqual([
            direct,
            funding,
            both,
        ]);
        expect(linkedAccountItems([other], 5)).toEqual([]);
    });
});
