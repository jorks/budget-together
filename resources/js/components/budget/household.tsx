import { router, useForm } from '@inertiajs/react';
import { Copy, Users } from 'lucide-react';
import { useState } from 'react';
import { dateLabel, Field, Panel } from '@/components/budget/shared';
import { Button } from '@/components/ui/button';
import { store, destroy } from '@/routes/invitations';
import type { BudgetProps } from '@/types/budget';

export function Household({
    members,
    invitations,
    invitation_url,
}: Pick<BudgetProps, 'members' | 'invitations' | 'invitation_url'>) {
    const form = useForm({ email: '' });
    const [copied, setCopied] = useState(false);
    return (
        <div className="grid gap-6 lg:grid-cols-2">
            <Panel>
                <div className="mb-5 flex items-center gap-2">
                    <Users className="size-5" />
                    <h3 className="font-semibold">Your household</h3>
                </div>
                <p className="mb-5 text-sm text-muted-foreground">
                    Everyone has equal access to view and edit the shared
                    budget.
                </p>
                {members.map((member) => (
                    <div
                        key={member.id}
                        className="flex items-center gap-3 border-t py-4"
                    >
                        <div className="flex size-10 items-center justify-center rounded-full bg-muted font-medium">
                            {member.name.slice(0, 1)}
                        </div>
                        <div>
                            <p className="font-medium">{member.name}</p>
                            <p className="text-sm text-muted-foreground">
                                {member.email}
                            </p>
                        </div>
                    </div>
                ))}
            </Panel>
            <Panel>
                <h3 className="mb-2 font-semibold">Invite your partner</h3>
                <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
                    Create a private link for their email address, then send it
                    yourself. They’ll need to register or sign in and verify
                    that email, then open the invitation link. Links expire
                    after seven days.
                </p>
                <form
                    className="grid gap-4"
                    onSubmit={(e) => {
                        e.preventDefault();
                        setCopied(false);
                        form.post(store.url(), {
                            preserveScroll: true,
                            onSuccess: () => form.reset(),
                        });
                    }}
                >
                    <Field
                        label="Email address"
                        type="email"
                        value={form.data.email}
                        onChange={(v) => form.setData('email', v)}
                        error={form.errors.email}
                        required
                    />
                    <Button disabled={form.processing}>
                        Create invitation link
                    </Button>
                </form>
                {invitation_url && (
                    <div className="mt-5 grid gap-3 rounded-lg bg-muted p-4">
                        <p className="text-sm font-medium">
                            Your link is ready
                        </p>
                        <input
                            aria-label="Invitation link"
                            readOnly
                            value={invitation_url}
                            className="w-full rounded-md border bg-background p-2 text-xs"
                            onFocus={(event) => event.target.select()}
                        />
                        <Button
                            variant="outline"
                            onClick={() => {
                                void navigator.clipboard
                                    .writeText(invitation_url)
                                    .then(() => setCopied(true))
                                    .catch(() => setCopied(false));
                            }}
                        >
                            <Copy className="size-4" />
                            {copied ? 'Copied' : 'Copy invitation link'}
                        </Button>
                    </div>
                )}
                <div className="mt-6 grid gap-3">
                    {invitations.map((invitation) => (
                        <div
                            key={invitation.id}
                            className="flex items-center justify-between gap-3 border-t pt-3"
                        >
                            <div className="min-w-0">
                                <p className="truncate text-sm">
                                    {invitation.email}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Expires {dateLabel(invitation.expires_at)}
                                </p>
                            </div>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                    if (
                                        window.confirm(
                                            'Revoke this invitation?',
                                        )
                                    )
                                        router.delete(destroy(invitation.id), {
                                            preserveScroll: true,
                                        });
                                }}
                            >
                                Revoke
                            </Button>
                        </div>
                    ))}
                </div>
            </Panel>
        </div>
    );
}
