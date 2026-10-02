import { Head, Link } from '@inertiajs/react';
import { ArrowUpRight, TrendingUp } from 'lucide-react';
import { money, Panel } from '@/components/budget/shared';
import { RetirementOutlook } from '@/components/retirement-outlook';
import { Button } from '@/components/ui/button';
import { projectMortgage, mortgageFrequencies } from '@/lib/mortgage';
import type { Mortgage } from '@/lib/mortgage';
import { dashboard, household, outlook } from '@/routes';
import { index as mortgageRoute } from '@/routes/mortgage';
import { index as superannuation } from '@/routes/superannuation';
import { index as debtsRoute } from '@/routes/debts';
import type { RetirementMember } from '@/types/retirement';

export type OutlookProps = {
    retirementMembers: RetirementMember[];
    mortgage: Mortgage | null;
    debts: {
        id: number;
        name: string;
        balance_cents: number;
        payoff_years: number | null;
    }[];
    features: { mortgage_enabled: boolean; debts_enabled: boolean };
};

function payoffLabel(years: number | null): string {
    if (years === null)
        return 'Repayments do not clear the balance within 100 years';
    const totalMonths = Math.ceil(years * 12);
    if (totalMonths === 0) return 'Paid off';
    const wholeYears = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;
    const parts = [
        wholeYears
            ? `${wholeYears} ${wholeYears === 1 ? 'year' : 'years'}`
            : '',
        months ? `${months} ${months === 1 ? 'month' : 'months'}` : '',
    ].filter(Boolean);
    return `About ${parts.join(' ')} to repay`;
}

export default function OutlookPage({
    retirementMembers,
    mortgage,
    debts,
    features,
}: OutlookProps) {
    const projection = mortgage
        ? (projectMortgage(mortgage)?.planned ?? null)
        : null;
    return (
        <div className="flex flex-col gap-6 p-4 md:p-6">
            <Head title="Long-term outlook" />
            <header className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <p className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
                        <TrendingUp className="size-5" />
                        The years ahead
                    </p>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Long-term outlook
                    </h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Bring your super, mortgage and debt plans together,
                        through to retirement.
                    </p>
                </div>
                <Button variant="outline" asChild>
                    <Link href={dashboard()}>
                        Budget overview <ArrowUpRight className="size-4" />
                    </Link>
                </Button>
            </header>
            <RetirementOutlook
                members={retirementMembers}
                mortgageProjection={projection}
            />
            <div className="grid gap-6 lg:grid-cols-2">
                <Panel>
                    <h2 className="mb-2 font-semibold">
                        On the way to being debt free
                    </h2>
                    <p className="mb-4 text-sm text-muted-foreground">
                        Estimated time from today using your saved repayments,
                        extras and rates.
                    </p>
                    <div className="divide-y">
                        {mortgage && (
                            <div className="flex flex-wrap justify-between gap-2 py-3">
                                <div>
                                    <Link
                                        className="font-medium underline underline-offset-4"
                                        href={mortgageRoute()}
                                    >
                                        {mortgage.name}
                                    </Link>
                                    <p className="text-sm text-muted-foreground">
                                        {money(mortgage.balance_cents)}{' '}
                                        remaining
                                    </p>
                                </div>
                                <p className="text-sm">
                                    {projection
                                        ? payoffLabel(
                                              projection.periods /
                                                  mortgageFrequencies[
                                                      mortgage.frequency
                                                  ],
                                          )
                                        : 'Check your mortgage details'}
                                </p>
                            </div>
                        )}
                        {debts.map((debt) => (
                            <div
                                key={debt.id}
                                className="flex flex-wrap justify-between gap-2 py-3"
                            >
                                <div>
                                    <Link
                                        className="font-medium underline underline-offset-4"
                                        href={debtsRoute()}
                                    >
                                        {debt.name}
                                    </Link>
                                    <p className="text-sm text-muted-foreground">
                                        {money(debt.balance_cents)} remaining
                                    </p>
                                </div>
                                <p className="text-sm">
                                    {payoffLabel(debt.payoff_years)}
                                </p>
                            </div>
                        ))}
                        {!mortgage && debts.length === 0 && (
                            <p className="py-3 text-sm text-muted-foreground">
                                No mortgage or active debts to project.
                            </p>
                        )}
                    </div>
                </Panel>
                <Panel>
                    <h2 className="mb-2 font-semibold">
                        Keep your outlook up to date
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        This view uses your saved plans and latest manually
                        recorded super balances. Update each topic as life
                        changes; edit birth dates and retirement ages in
                        Household.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                        <Button variant="outline" asChild>
                            <Link href={superannuation()}>Superannuation</Link>
                        </Button>
                        {features.mortgage_enabled && (
                            <Button variant="outline" asChild>
                                <Link href={mortgageRoute()}>Mortgage</Link>
                            </Button>
                        )}
                        {features.debts_enabled && (
                            <Button variant="outline" asChild>
                                <Link href={debtsRoute()}>
                                    Debts & financing
                                </Link>
                            </Button>
                        )}
                        <Button variant="outline" asChild>
                            <Link href={household()}>Household</Link>
                        </Button>
                    </div>
                    <p className="mt-4 text-xs text-muted-foreground">
                        Illustrative estimates, not guaranteed outcomes. Future
                        dollars are not adjusted for inflation; retirement
                        spending and withdrawals are not modelled.
                    </p>
                </Panel>
            </div>
        </div>
    );
}
OutlookPage.layout = {
    breadcrumbs: [{ title: 'Long-term outlook', href: outlook() }],
};
