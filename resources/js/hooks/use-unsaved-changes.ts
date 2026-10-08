import { router } from '@inertiajs/react';
import { useEffect } from 'react';

export function useUnsavedChanges(isDirty: boolean) {
    useEffect(() => {
        if (!isDirty) return;
        const removeListener = router.on('before', (event) => {
            if (
                event.detail.visit.method === 'get' &&
                !window.confirm('Discard your unsaved changes?')
            )
                return false;
        });
        const beforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
        };
        window.addEventListener('beforeunload', beforeUnload);
        return () => {
            removeListener();
            window.removeEventListener('beforeunload', beforeUnload);
        };
    }, [isDirty]);
}
