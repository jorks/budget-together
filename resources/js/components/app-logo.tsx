import { Sprout } from 'lucide-react';

export default function AppLogo() {
    return (
        <>
            <div className="flex aspect-square size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Sprout className="size-5" />
            </div>
            <div className="ml-1 grid flex-1 text-left">
                <span className="text-base font-semibold tracking-tight">
                    Together
                </span>
                <span className="text-[10px] tracking-widest text-muted-foreground uppercase">
                    Household budget
                </span>
            </div>
        </>
    );
}
