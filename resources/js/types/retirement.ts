import type { SuperPoint } from '@/types/superannuation';

export type RetirementMember = {
    id: number;
    name: string;
    date_of_birth: string | null;
    age: number | null;
    retirement_age: number;
    retirement_date: string | null;
    years_remaining: number | null;
    super_funds_count: number;
    super_projection: SuperPoint[];
};
