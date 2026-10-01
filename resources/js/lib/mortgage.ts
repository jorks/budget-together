export type MortgageInputs = {
    balance_cents: number;
    annual_rate: number;
    term_years: number;
    frequency: 'weekly' | 'fortnightly' | 'monthly';
    offset_cents: number;
    extra_cents: number;
};
export type Mortgage = MortgageInputs & {
    id: number;
    name: string;
    due_date?: string | null;
    account_id?: number | null;
};
export type LoanYear = {
    year: number;
    balance: number;
    principal: number;
    interest: number;
};
export type Projection = {
    periods: number;
    interest: number;
    total: number;
    years: LoanYear[];
};
export const mortgageFrequencies = { weekly: 52, fortnightly: 26, monthly: 12 };

export function projectMortgage(inputs: MortgageInputs) {
    const {
        balance_cents: balance,
        annual_rate: rate,
        term_years: term,
        frequency,
        offset_cents: offset,
        extra_cents: extra,
    } = inputs;
    const frequencyCount = mortgageFrequencies[frequency];
    if (
        !frequencyCount ||
        ![balance, rate, term, offset, extra].every(Number.isFinite) ||
        balance <= 0 ||
        balance > 99999999999 ||
        rate < 0 ||
        rate > 30 ||
        !Number.isInteger(term) ||
        term < 1 ||
        term > 40 ||
        offset < 0 ||
        extra < 0 ||
        offset > 99999999999 ||
        extra > 99999999999
    ) {
        return null;
    }
    const periodicRate = rate / 100 / frequencyCount;
    const count = term * frequencyCount;
    const repayment = Math.ceil(
        periodicRate === 0
            ? balance / count
            : (balance * periodicRate) /
                  -Math.expm1(-count * Math.log1p(periodicRate)),
    );

    function simulate(offsetBalance: number, additional: number): Projection {
        let remaining = balance;
        let interestTotal = 0;
        let principalYear = 0;
        let interestYear = 0;
        let periods = 0;
        const years: LoanYear[] = [
            { year: 0, balance, principal: 0, interest: 0 },
        ];
        while (remaining > 0 && periods < count) {
            const interest =
                Math.max(0, remaining - offsetBalance) * periodicRate;
            const payment = Math.min(
                repayment + additional,
                remaining + interest,
            );
            const principal = payment - interest;
            remaining = Math.max(0, remaining - principal);
            if (remaining < 0.0001) remaining = 0;
            interestTotal += interest;
            principalYear += principal;
            interestYear += interest;
            periods++;
            if (periods % frequencyCount === 0 || remaining === 0) {
                years.push({
                    year: periods / frequencyCount,
                    balance: remaining,
                    principal: principalYear,
                    interest: interestYear,
                });
                principalYear = 0;
                interestYear = 0;
            }
        }
        return {
            periods,
            interest: interestTotal,
            total: balance + interestTotal,
            years,
        };
    }

    const baseline = simulate(0, 0);
    const planned = simulate(offset, extra);
    return {
        repayment,
        frequencyCount,
        baseline,
        planned,
        interestSaved: Math.max(0, baseline.interest - planned.interest),
        yearsSaved: Math.max(
            0,
            (baseline.periods - planned.periods) / frequencyCount,
        ),
    };
}
