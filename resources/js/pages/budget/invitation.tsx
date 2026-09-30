import { Head, useForm } from '@inertiajs/react';
import { Panel } from '@/components/budget/shared';
import { Button } from '@/components/ui/button';
import { update } from '@/routes/invitations';

export default function Invitation({
    householdName,
    token,
}: {
    householdName: string;
    token: string;
}) {
    const form = useForm({ invitation: '' });
    return (
        <div className="mx-auto w-full max-w-xl p-6">
            <Head title="Join household" />
            <Panel>
                <h1 className="text-2xl font-semibold">Join {householdName}</h1>
                <p className="my-5 leading-relaxed text-muted-foreground">
                    You’ll share income, bills, accounts and the spending plan,
                    with equal editing access.
                </p>
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        form.put(update.url(token));
                    }}
                >
                    {Object.values(form.errors).map((error) => (
                        <p
                            role="alert"
                            className="mb-3 text-destructive"
                            key={error}
                        >
                            {error}
                        </p>
                    ))}
                    <Button disabled={form.processing}>Join household</Button>
                </form>
            </Panel>
        </div>
    );
}
