export type SuperBalance = {
    id: number;
    recorded_on: string;
    balance_cents: number;
    notes: string | null;
};
export type SuperIncome = {
    id: number;
    name: string;
    person: string;
    gross_annual_cents: number;
    salary_sacrifice_cents: number | null;
    use_tax_estimate: boolean;
};
export type SuperPoint = {
    year: number;
    balance_cents: number;
    contributions_cents: number;
};
export type SuperFund = {
    id: number;
    name: string;
    person: string;
    member_id?: number | null;
    member_number: string | null;
    investment_option: string | null;
    income_id: number | null;
    income: SuperIncome | null;
    employer_rate: number;
    salary_sacrifice_cents: number;
    annual_fee_cents: number;
    fee_rate: number;
    annual_insurance_cents: number;
    return_rate: number;
    notes: string | null;
    balances: SuperBalance[];
    current_balance_cents: number;
    balance_date: string | null;
    needs_update: boolean;
    contributions: {
        employer_cents: number;
        sacrifice_cents: number;
        tax_cents: number;
        net_cents: number;
    };
    projection: SuperPoint[];
};
export type SuperProps = {
    members?: { id: number; name: string }[];
    funds: SuperFund[];
    incomes: SuperIncome[];
    people: string[];
    today: string;
};
