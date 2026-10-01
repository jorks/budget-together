import { Link, router, useForm } from '@inertiajs/react';
import { Copy, Users, Pencil } from 'lucide-react';
import { useState } from 'react';
import { dateLabel, Field, Panel } from '@/components/budget/shared';
import { Button } from '@/components/ui/button';
import { store, destroy } from '@/routes/invitations';
import { update, member as updateMember } from '@/routes/household';
import { edit as editProfile } from '@/routes/profile';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from '@/components/ui/sheet';
import type { BudgetProps } from '@/types/budget';

function MemberEditor({
    member,
    onClose,
}: {
    member: BudgetProps['members'][number];
    onClose: () => void;
}) {
    const form = useForm({ name: member.name });
    return (
        <Sheet
            open
            onOpenChange={(open) => {
                if (
                    !open &&
                    (!form.isDirty ||
                        window.confirm('Discard your unsaved changes?'))
                )
                    onClose();
            }}
        >
            <SheetContent>
                <SheetHeader>
                    <SheetTitle>Edit person</SheetTitle>
                    <SheetDescription>
                        Update the name used in your household. Each person
                        manages their own email and sign-in details in profile
                        settings.
                    </SheetDescription>
                </SheetHeader>
                <form
                    className="grid gap-4 p-6"
                    onSubmit={(event) => {
                        event.preventDefault();
                        form.submit(updateMember(member.id), {
                            preserveScroll: true,
                            onSuccess: onClose,
                        });
                    }}
                >
                    <Field
                        label="Name"
                        value={form.data.name}
                        onChange={(name) => form.setData('name', name)}
                        error={form.errors.name}
                        required
                    />
                    <p className="text-sm text-muted-foreground">
                        {member.email}
                    </p>
                    <Button disabled={form.processing}>Save person</Button>
                    <Button type="button" variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                </form>
            </SheetContent>
        </Sheet>
    );
}

export function Household({
    household,
    members,
    invitations,
    invitation_url,
}: Pick<
    BudgetProps,
    'household' | 'members' | 'invitations' | 'invitation_url'
>) {
    const form = useForm({ email: '' });
    const householdForm = useForm({ name: household.name });
    const [editingMember, setEditingMember] = useState<
        BudgetProps['members'][number] | null
    >(null);
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
                <form
                    className="mb-6 grid gap-3"
                    onSubmit={(event) => {
                        event.preventDefault();
                        householdForm.submit(update(), {
                            preserveScroll: true,
                        });
                    }}
                >
                    <Field
                        label="Household name"
                        value={householdForm.data.name}
                        onChange={(name) => householdForm.setData('name', name)}
                        error={householdForm.errors.name}
                        required
                    />
                    <Button
                        disabled={
                            householdForm.processing || !householdForm.isDirty
                        }
                    >
                        Save household name
                    </Button>
                </form>
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
                        <Button
                            className="ml-auto"
                            variant="ghost"
                            size="icon"
                            aria-label={`Edit ${member.name}`}
                            onClick={() => setEditingMember(member)}
                        >
                            <Pencil className="size-4" />
                        </Button>
                    </div>
                ))}
                <Button variant="outline" className="mt-4" asChild>
                    <Link href={editProfile()}>My profile and email</Link>
                </Button>
                {editingMember && (
                    <MemberEditor
                        member={editingMember}
                        onClose={() => setEditingMember(null)}
                    />
                )}
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
