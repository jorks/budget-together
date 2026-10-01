import { UserRound } from 'lucide-react';
import type { BudgetItem, Period } from '@/types/budget';
import { Metric } from './metric';
import { factors, money, Panel } from './shared';

export function TaxEstimateCard({
    item,
    period,
    bonusExcludedFromBudget = false,
}: {
    item: BudgetItem;
    period: Period;
    bonusExcludedFromBudget?: boolean;
}) {
    const estimate = item.tax_estimate;
    if (!estimate) return null;

    return (
        <Panel>
            <Metric
                icon={<UserRound className="size-4.5" />}
                label={`${item.person || item.name} · estimated take-home`}
                value={Math.round(estimate.net_cents / factors[period])}
                period={period}
                caption={`${item.tax_year}–${String(item.tax_year + 1).slice(-2)} · ${item.include_bonus ? 'Including bonus' : 'Before bonus'} · ${bonusExcludedFromBudget ? 'Bonus excluded from budget' : item.use_tax_estimate ? 'Used in budget' : 'Estimate only; budget uses manual take-home'}`}
            />
            <details open className="mt-5 border-t pt-4">
                <summary className="cursor-pointer text-sm font-medium text-primary">
                    Annual tax breakdown
                </summary>
                <dl className="mt-4 space-y-3 text-sm">
                    {[
                        ['Gross income', estimate.gross_cents],
                        ['Payroll deductions', estimate.deductions_cents],
                        ['Taxable income', estimate.taxable_cents],
                        ['Income tax', estimate.tax_cents],
                        ['Standard Medicare levy', estimate.medicare_cents],
                        ['Estimated take-home', estimate.net_cents],
                    ].map(([label, value]) => (
                        <div
                            key={label}
                            className="flex justify-between gap-4 last:border-t last:pt-3 last:font-semibold"
                        >
                            <dt className="text-muted-foreground">{label}</dt>
                            <dd className="tabular-nums">
                                {money(Number(value))}
                            </dd>
                        </div>
                    ))}
                </dl>
                <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                    Resident marginal tax estimate only. Excludes offsets, other
                    deductions, HELP, Medicare surcharge and levy reductions.
                    Salary excludes employer super.
                </p>
            </details>
        </Panel>
    );
}
