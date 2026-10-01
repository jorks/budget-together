import { ChevronDown, Info } from 'lucide-react';
import { money } from '@/components/budget/shared';
import type { TaxBracket } from '@/types/budget';

export function TaxInfo({
    year,
    brackets,
}: {
    year: number;
    brackets: TaxBracket[];
}) {
    return (
        <details className="group rounded-xl border bg-muted/30 p-4">
            <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                <Info className="size-4" /> {year}–{String(year + 1).slice(-2)}{' '}
                resident tax brackets
                <ChevronDown className="ml-auto size-4 transition-transform group-open:rotate-180" />
            </summary>
            <p className="mt-3 text-xs text-muted-foreground">
                1 July {year} to 30 June {year + 1}. Each rate applies to the
                portion of taxable income in that band.
            </p>
            <table className="mt-3 w-full text-left text-sm">
                <thead>
                    <tr>
                        <th scope="col">Annual taxable income</th>
                        <th scope="col" className="text-right">
                            Marginal rate
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {brackets.map((bracket) => (
                        <tr key={bracket.floor_cents} className="border-t">
                            <td className="py-2">
                                {bracket.floor_cents === 0 ? 'Up to' : 'Over'}{' '}
                                {money(
                                    bracket.floor_cents === 0
                                        ? bracket.ceiling_cents!
                                        : bracket.floor_cents,
                                )}
                                {bracket.floor_cents > 0 &&
                                    bracket.ceiling_cents !== null &&
                                    ` to ${money(bracket.ceiling_cents)}`}
                            </td>
                            <td className="text-right tabular-nums">
                                {bracket.rate}%
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                Optional standard Medicare levy: 2% of taxable income. Excludes
                offsets, HELP, levy reductions/exemptions, Medicare surcharge
                and super contribution taxes or caps.
            </p>
            <a
                className="mt-2 inline-block text-xs underline"
                href="https://www.ato.gov.au/law/view/pdf/acts/20250028.pdf"
                target="_blank"
                rel="noreferrer"
            >
                Legislated resident rates
            </a>
        </details>
    );
}
