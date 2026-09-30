import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowRight, CalendarDays, Receipt, Sprout } from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { Button } from '@/components/ui/button';
import { dashboard, login, register } from '@/routes';

export default function Welcome() {
    const { auth } = usePage().props;
    return (
        <>
            <Head title="A calmer household budget" />
            <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8 md:px-12">
                <header className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <AppLogo />
                    </div>
                    <Button variant="outline" asChild>
                        <Link href={auth.user ? dashboard() : login()}>
                            {auth.user ? 'Open your budget' : 'Log in'}
                        </Link>
                    </Button>
                </header>
                <main className="grid flex-1 items-center gap-12 py-20 lg:grid-cols-[1.2fr_1fr]">
                    <div>
                        <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
                            A plan you can live with
                        </p>
                        <h1 className="mt-5 max-w-2xl text-5xl leading-tight font-semibold tracking-tight md:text-6xl">
                            Your money.
                            <br />
                            Your life.
                            <br />
                            <span className="text-primary">Together.</span>
                        </h1>
                        <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">
                            Know what’s coming in, what’s going out, and what
                            you can put aside. A shared household budget for the
                            things that matter.
                        </p>
                        <Button size="lg" className="mt-8" asChild>
                            <Link href={auth.user ? dashboard() : register()}>
                                {auth.user
                                    ? 'See your household'
                                    : 'Start your household'}
                                <ArrowRight className="size-4" />
                            </Link>
                        </Button>
                    </div>
                    <div className="grid gap-4 rounded-3xl border bg-card p-5 shadow-sm md:p-8">
                        {[
                            {
                                icon: Receipt,
                                title: 'Every bill, in perspective',
                                text: 'Enter weekly, fortnightly, monthly or annual amounts. Compare them on the same basis.',
                            },
                            {
                                icon: CalendarDays,
                                title: 'Fewer surprises',
                                text: 'See upcoming bills on a calendar, with forecasts for the ones that vary.',
                            },
                            {
                                icon: Sprout,
                                title: 'Ready for the big ones',
                                text: 'Work out what to save now, so annual bills are covered when they arrive.',
                            },
                        ].map(({ icon: Icon, title, text }) => (
                            <div
                                key={title}
                                className="flex gap-4 rounded-xl bg-muted/40 p-5"
                            >
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                    <Icon className="size-5" />
                                </div>
                                <div>
                                    <h2 className="font-semibold">{title}</h2>
                                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                                        {text}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </main>
                <footer className="border-t py-5 text-xs text-muted-foreground">
                    Built for a household. Planned together.
                </footer>
            </div>
        </>
    );
}
