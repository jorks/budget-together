import { usePage } from '@inertiajs/react';
import type { Auth } from '@/types';

export function useBudgetPeriod() {
    const { auth } = usePage<{ auth: Auth }>().props;
    const preferredPeriod = auth.user.preferred_frequency ?? null;

    return { preferredPeriod, period: preferredPeriod ?? 'annually' };
}
