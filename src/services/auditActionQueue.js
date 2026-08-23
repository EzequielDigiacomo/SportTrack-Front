import AuditoriaService from './AuditoriaService';
import { STORAGE_KEYS } from '../utils/constants';

const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_QUEUE = 120;
const FLUSH_INTERVAL_MS = 30_000;

const newQueueId = () => (
    typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
);

const isExpired = (entry) => {
    const ts = entry?.capturedAt || entry?.occurredAt;
    if (!ts) return false;
    const age = Date.now() - new Date(ts).getTime();
    return !Number.isFinite(age) || age > TTL_MS;
};

const readQueue = () => {
    try {
        const raw = JSON.parse(localStorage.getItem(STORAGE_KEYS.PENDING_AUDIT_ACTIONS) || '[]');
        if (!Array.isArray(raw)) return [];
        const fresh = raw.filter(e => e?.id && !isExpired(e));
        if (fresh.length !== raw.length) {
            localStorage.setItem(STORAGE_KEYS.PENDING_AUDIT_ACTIONS, JSON.stringify(fresh));
        }
        return fresh;
    } catch {
        return [];
    }
};

const writeQueue = (entries) => {
    try {
        localStorage.setItem(
            STORAGE_KEYS.PENDING_AUDIT_ACTIONS,
            JSON.stringify(entries.slice(-MAX_QUEUE)),
        );
    } catch {
        /* ignore quota */
    }
};

/** Guarda acción de auditoría para enviar cuando vuelva la conexión. */
export const enqueuePendingAuditAction = (payload) => {
    const queue = readQueue();
    const capturedAt = payload.capturedAt || new Date().toISOString();
    const entry = {
        id: payload.id || newQueueId(),
        accion: payload.accion,
        detalle: payload.detalle,
        modulo: payload.modulo,
        eventoId: payload.eventoId ?? null,
        eventoPruebaId: payload.eventoPruebaId ?? null,
        capturedAt,
    };

    const idx = queue.findIndex(q => q.id === entry.id);
    if (idx >= 0) queue[idx] = entry;
    else queue.push(entry);

    writeQueue(queue);
    return entry.id;
};

export const removePendingAuditAction = (id) => {
    if (!id) return;
    writeQueue(readQueue().filter(e => e.id !== id));
};

export const flushPendingAuditActions = async () => {
    const queue = readQueue();
    if (!queue.length) return { sent: 0, pending: 0 };

    let sent = 0;
    const remaining = [];

    for (const entry of queue) {
        try {
            const detalle = typeof entry.detalle === 'string'
                ? entry.detalle
                : JSON.stringify({
                    ...(entry.detalle || {}),
                    occurredAt: entry.detalle?.occurredAt || entry.capturedAt,
                    syncedAt: new Date().toISOString(),
                });

            await AuditoriaService.trackClientAction({
                accion: entry.accion,
                detalle,
                modulo: entry.modulo,
                eventoId: entry.eventoId,
                eventoPruebaId: entry.eventoPruebaId,
            });
            sent += 1;
        } catch (err) {
            console.warn('[AuditQueue] no se pudo enviar acción pendiente:', entry.accion, err?.message || err);
            remaining.push(entry);
        }
    }

    writeQueue(remaining);
    return { sent, pending: remaining.length };
};

let initialized = false;

/** Reintenta enviar auditoría pendiente al volver la conexión. */
export const initAuditActionQueue = () => {
    if (initialized || typeof window === 'undefined') return;
    initialized = true;

    const tryFlush = () => {
        flushPendingAuditActions().catch(() => {});
    };

    window.addEventListener('online', tryFlush);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') tryFlush();
    });
    tryFlush();
    setInterval(tryFlush, FLUSH_INTERVAL_MS);
};
