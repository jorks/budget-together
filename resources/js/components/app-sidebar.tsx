import { Link, usePage } from '@inertiajs/react';
import {
    Banknote,
    CalendarDays,
    House,
    Landmark,
    ListChecks,
    Receipt,
    Sprout,
    Users,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import {
    dashboard,
    income,
    bills,
    plan,
    calendar,
    funds,
    accounts,
    household,
} from '@/routes';
import { index as mortgage } from '@/routes/mortgage';
import { index as debts } from '@/routes/debts';
import type { NavItem } from '@/types';

const mainNavItems: NavItem[] = [
    { title: 'Overview', href: dashboard(), icon: House },
    { title: 'Income', href: income(), icon: Banknote },
    { title: 'Bills & expenses', href: bills(), icon: Receipt },
    { title: 'Mortgage', href: mortgage(), icon: House },
    { title: 'Debts & financing', href: debts(), icon: Landmark },
    { title: 'Spending plan', href: plan(), icon: ListChecks },
    { title: 'Money calendar', href: calendar(), icon: CalendarDays },
    { title: 'Save ahead', href: funds(), icon: Sprout },
    { title: 'Accounts & banks', href: accounts(), icon: Landmark },
    { title: 'Household', href: household(), icon: Users },
];

export function AppSidebar() {
    const { features } = usePage<{
        features: { mortgage_enabled: boolean; debts_enabled: boolean };
    }>().props;
    const items = mainNavItems.filter((item) =>
        item.title === 'Mortgage'
            ? features.mortgage_enabled
            : item.title === 'Debts & financing'
              ? features.debts_enabled
              : true,
    );
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={items} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
