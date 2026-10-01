import { useId } from 'react';
import type { ReactNode } from 'react';
import {
    Baby,
    BriefcaseBusiness,
    Car,
    HeartPulse,
    House,
    PawPrint,
    PiggyBank,
    ShieldCheck,
    ShoppingBasket,
    Tag,
    Tv,
    UserRound,
    Wrench,
    Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const categoryIcons: Record<string, LucideIcon> = {
    transport: Car,
    daycare: Baby,
    childcare: Baby,
    family: Baby,
    utilities: Zap,
    subscriptions: Tv,
    insurance: ShieldCheck,
    mortgage: House,
    'health & fitness': HeartPulse,
    personal: UserRound,
    everyday: ShoppingBasket,
    savings: PiggyBank,
    salary: BriefcaseBusiness,
    pets: PawPrint,
    'home maintenance': Wrench,
};

export function CategoryIcon({
    category,
    className,
}: {
    category: string | null;
    className?: string;
}) {
    const Icon = categoryIcons[category?.trim().toLowerCase() ?? ''] ?? Tag;

    return (
        <Icon
            aria-hidden="true"
            className={cn('size-4 shrink-0 text-primary', className)}
        />
    );
}

export const money = (cents: number) =>
    new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: 'AUD',
    }).format(cents / 100);
export const dateLabel = (date: string) =>
    new Date(`${date.slice(0, 10)}T12:00:00`).toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
export const cadences: Record<string, string> = {
    weekly: 'Weekly',
    fortnightly: 'Fortnightly',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    half_yearly: 'Every six months',
    annually: 'Annually',
    custom: 'Custom payments per year',
};
export const factors: Record<string, number> = {
    weekly: 52,
    fortnightly: 26,
    monthly: 12,
    quarterly: 4,
    half_yearly: 2,
    annually: 1,
};
export const dollars = (value: number | null | undefined) =>
    value == null ? '' : (value / 100).toFixed(2);
export const cents = (value: string) =>
    value === '' ? null : Math.round(Number(value) * 100);

export function Field({
    label,
    value,
    onChange,
    error,
    type = 'text',
    required = false,
    hint,
    options,
    list,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    error?: string;
    type?: string;
    required?: boolean;
    hint?: string;
    options?: Record<string, string>;
    list?: string;
}) {
    const id = useId();
    const attributes = {
        id,
        value,
        onChange: (
            event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
        ) => onChange(event.target.value),
        required,
        'aria-invalid': !!error,
        'aria-describedby': error ? `${id}-error` : undefined,
    };
    return (
        <div className="grid gap-2">
            <Label htmlFor={id}>{label}</Label>
            {options ? (
                <select
                    {...attributes}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                    {Object.entries(options).map(([key, name]) => (
                        <option key={key} value={key}>
                            {name}
                        </option>
                    ))}
                </select>
            ) : (
                <Input
                    {...attributes}
                    type={type === 'money' ? 'number' : type}
                    step={
                        type === 'money'
                            ? '0.01'
                            : type === 'number'
                              ? '1'
                              : undefined
                    }
                    list={list}
                />
            )}
            {hint && (
                <p className="text-xs leading-relaxed text-muted-foreground">
                    {hint}
                </p>
            )}
            {error && (
                <p id={`${id}-error`} className="text-sm text-destructive">
                    {error}
                </p>
            )}
        </div>
    );
}
export function Toggle({
    label,
    checked,
    onChange,
}: {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}) {
    return (
        <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed">
            <input
                type="checkbox"
                className="mt-1 size-4 accent-primary"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
            />
            {label}
        </label>
    );
}
export function Panel({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <section
            className={cn('rounded-xl border bg-card p-5 shadow-xs', className)}
        >
            {children}
        </section>
    );
}
export function Empty({
    title,
    children,
}: {
    title: string;
    children: ReactNode;
}) {
    return (
        <div className="rounded-xl border border-dashed p-10 text-center">
            <h3 className="font-medium">{title}</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                {children}
            </p>
        </div>
    );
}
