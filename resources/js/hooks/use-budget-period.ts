import { usePage } from '@inertiajs/react';
import type { BudgetProps } from '@/types/budget';

export function useBudgetPeriod() {
    const { household } = usePage<{ household: BudgetProps['household'] }>()
        .props;
    const preferredPeriod = household.preferred_frequency ?? null;

    return { preferredPeriod, period: preferredPeriod ?? 'annually' };
}
