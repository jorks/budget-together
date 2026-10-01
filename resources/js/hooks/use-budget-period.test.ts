import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { usePage } from '@inertiajs/react';
import { useBudgetPeriod } from './use-budget-period';

vi.mock('@inertiajs/react', () => ({ usePage: vi.fn() }));
function Preference() {
    return JSON.stringify(useBudgetPeriod());
}

describe('personal budget frequency', () => {
    it.each(['weekly', 'fortnightly', 'monthly', 'annually', null] as const)(
        'uses the account preference %s for emphasis and summaries',
        (preferred) => {
            vi.mocked(usePage).mockReturnValue({
                props: { auth: { user: { preferred_frequency: preferred } } },
            } as unknown as ReturnType<typeof usePage>);
            const html = renderToStaticMarkup(createElement(Preference));
            expect(html).toBe(
                JSON.stringify({
                    preferredPeriod: preferred,
                    period: preferred ?? 'annually',
                }).replaceAll('"', '&quot;'),
            );
        },
    );
});
