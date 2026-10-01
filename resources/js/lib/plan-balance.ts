import type { BudgetItem, BudgetProps, Equivalents } from '@/types/budget';

export type CalculatedRow = {
    direction: 'income' | 'expense';
    label: string;
    description: string;
    equivalents: Equivalents;
};

export type PlanBalance = {
    rows: CalculatedRow[];
    remaining: Equivalents;
};

function equivalents(annual: number): Equivalents {
    return {
        annually: annual,
        monthly: Math.round(annual / 12),
        fortnightly: Math.round(annual / 26),
        weekly: Math.round(annual / 52),
    };
}

export function planBalance(
    items: BudgetItem[],
    totals: BudgetProps['totals'],
): PlanBalance {
    const mortgageAnnual = items.reduce(
        (sum, item) =>
            sum +
            (item.is_active &&
            item.kind === 'bill' &&
            item.category?.trim().toLowerCase() === 'mortgage'
                ? item.equivalents.annually
                : 0),
        0,
    );

    return {
        rows: [
            {
                direction: 'income',
                label: 'Total income',
                description: 'Calculated from take-home income',
                equivalents: totals.income,
            },
            {
                direction: 'expense',
                label: 'Mortgage',
                description: 'Calculated from mortgage bills',
                equivalents: equivalents(mortgageAnnual),
            },
            {
                direction: 'expense',
                label: 'Bills & expenses',
                description: 'Calculated from bills, excluding mortgage',
                equivalents: equivalents(totals.bill.annually - mortgageAnnual),
            },
        ],
        remaining: totals.remaining,
    };
}
