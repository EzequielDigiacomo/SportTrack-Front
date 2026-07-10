import { useCallback, useEffect, useState } from 'react';
import MessageService from '../services/MessageService';
import { useAuth } from '../context/AuthContext';
import { isSuperAdminUser, isFederationAdminUser, isClubUser } from '../utils/authHelpers';

const POLL_MS = 90_000;

/**
 * Contador de mensajes no leídos con polling silencioso.
 * Si falla la API, no rompe la UI (queda en 0).
 */
export default function useUnreadMessages(enabled = true) {
    const { user, isAuthenticated } = useAuth();
    const [unreadCount, setUnreadCount] = useState(0);

    const canUse = enabled
        && isAuthenticated
        && (isSuperAdminUser(user) || isFederationAdminUser(user) || isClubUser(user));

    const refresh = useCallback(async () => {
        if (!canUse) {
            setUnreadCount(0);
            return 0;
        }
        try {
            const data = await MessageService.getNoLeidosCount();
            const count = Number(data?.count ?? data?.Count ?? 0) || 0;
            setUnreadCount(count);
            return count;
        } catch {
            return 0;
        }
    }, [canUse]);

    useEffect(() => {
        if (!canUse) {
            setUnreadCount(0);
            return undefined;
        }

        let cancelled = false;

        const tick = async () => {
            if (cancelled) return;
            try {
                const data = await MessageService.getNoLeidosCount();
                if (!cancelled) {
                    setUnreadCount(Number(data?.count ?? data?.Count ?? 0) || 0);
                }
            } catch {
                // ignore
            }
        };

        tick();
        const id = setInterval(tick, POLL_MS);

        const onFocus = () => tick();
        const onVisibility = () => {
            if (document.visibilityState === 'visible') tick();
        };

        window.addEventListener('focus', onFocus);
        document.addEventListener('visibilitychange', onVisibility);

        return () => {
            cancelled = true;
            clearInterval(id);
            window.removeEventListener('focus', onFocus);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [canUse]);

    // Permite refrescar desde otras pantallas (ej. al marcar leído)
    useEffect(() => {
        const handler = () => refresh();
        window.addEventListener('mensajes:refresh-unread', handler);
        return () => window.removeEventListener('mensajes:refresh-unread', handler);
    }, [refresh]);

    return {
        unreadCount,
        hasUnread: unreadCount > 0,
        refresh,
    };
}

export const notifyUnreadMessagesChanged = () => {
    window.dispatchEvent(new Event('mensajes:refresh-unread'));
};
