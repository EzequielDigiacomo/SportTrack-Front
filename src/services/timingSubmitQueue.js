import TimingOutboxService from './timingOutboxService';
import {
    clearPendingTimingBackup,
    getPendingTimingBackup,
    listPendingTimingBackups,
    savePendingTimingBackup,
} from './timingBackupService';
import { enqueuePendingAuditAction } from './auditActionQueue';

const mergeBackupEntries = (localEntries, serverEntries = []) => {
    const byFase = new Map();

    for (const entry of serverEntries) {
        if (!entry?.faseId) continue;
        byFase.set(String(entry.faseId), {
            faseId: entry.faseId,
            eventoId: entry.eventoId,
            eventoNombre: entry.eventoNombre || '',
            faseNombre: entry.faseNombre || '',
            soloMode: !!entry.soloMode,
            capturedAt: entry.createdAtUtc || entry.capturedAt || new Date().toISOString(),
            resultados: entry.resultados || [],
            submitFailure: entry.submitFailure || null,
            source: 'server',
        });
    }

    for (const entry of localEntries) {
        const key = String(entry.faseId);
        const existing = byFase.get(key);
        const localDate = new Date(entry.capturedAt || 0).getTime();
        const serverDate = existing ? new Date(existing.capturedAt || 0).getTime() : 0;
        if (!existing || localDate >= serverDate) {
            byFase.set(key, {
                ...entry,
                submitFailure: entry.submitFailure || existing?.submitFailure || null,
                source: existing ? 'merged' : 'local',
            });
        } else if (existing && entry.submitFailure && !existing.submitFailure) {
            byFase.set(key, { ...existing, submitFailure: entry.submitFailure });
        }
    }

    return Array.from(byFase.values());
};

/** Si un respaldo viejo no tiene submitFailure, lo sintetiza para poder auditar al recuperar. */
export const withSubmitFailureFallback = (entry) => {
    if (!entry) return entry;
    if (entry.submitFailure) return entry;
    const occurredAt = entry.capturedAt || new Date().toISOString();
    return {
        ...entry,
        submitFailure: {
            accion: 'TIMING_SUBMIT_FAILED',
            modulo: 'Cronometrista',
            message: 'Envío de tiempos falló (sin conexión / señal débil)',
            occurredAt,
            eventoId: entry.eventoId,
            faseNombre: entry.faseNombre,
            eventoNombre: entry.eventoNombre,
            filas: entry.resultados?.length ?? 0,
            context: { synthesized: true, queuedLocally: true },
        },
    };
};

const buildSubmitFailure = (faseId, payload) => {
    const occurredAt = payload.submitFailure?.occurredAt
        || payload.occurredAt
        || new Date().toISOString();
    const filas = payload.submitFailure?.filas
        ?? payload.resultados?.length
        ?? 0;
    const message = payload.submitFailure?.message
        || payload.failureMessage
        || 'Envío de tiempos falló (sin conexión / señal débil)';

    return {
        accion: 'TIMING_SUBMIT_FAILED',
        modulo: 'Cronometrista',
        message,
        occurredAt,
        eventoId: payload.eventoId ?? null,
        faseNombre: payload.faseNombre || '',
        eventoNombre: payload.eventoNombre || '',
        filas,
        context: {
            online: typeof navigator !== 'undefined' ? navigator.onLine : null,
            queuedLocally: true,
            ...(payload.submitFailure?.context || {}),
        },
    };
};

/** Encola fallo en auditoría local (sin depender de red ni del dashboard). */
const enqueueTimingFailureAuditLocal = (faseId, submitFailure, payload) => {
    const occurredAt = submitFailure.occurredAt || new Date().toISOString();
    const queueId = `timing-fail-${faseId}-${occurredAt}`;
    const faseLabel = payload.faseNombre || `fase ${faseId}`;

    enqueuePendingAuditAction({
        id: queueId,
        accion: 'TIMING_SUBMIT_FAILED',
        modulo: 'Cronometrista',
        eventoId: payload.eventoId ?? submitFailure.eventoId ?? null,
        eventoPruebaId: null,
        capturedAt: occurredAt,
        detalle: {
            message: `${submitFailure.message} (${faseLabel}, ID: ${faseId})`,
            occurredAt,
            faseId: Number(faseId),
            faseNombre: payload.faseNombre || null,
            eventoNombre: payload.eventoNombre || null,
            filas: submitFailure.filas,
            queuedLocally: true,
            online: typeof navigator !== 'undefined' ? navigator.onLine : null,
            ...(submitFailure.context || {}),
        },
    });
};

/**
 * Guarda en localStorage (tiempos + fallo de auditoría) y, si hay red, cola del servidor.
 * El registro de auditoría queda anclado acá para no depender de HMR del dashboard.
 */
export const enqueueFailedTimingSubmit = async (faseId, payload = {}) => {
    const submitFailure = buildSubmitFailure(faseId, payload);

    savePendingTimingBackup(faseId, {
        ...payload,
        submitFailure,
    });

    // Write-ahead a cola de auditoría (localStorage) — siempre, incluso sin Wi‑Fi
    try {
        enqueueTimingFailureAuditLocal(faseId, submitFailure, payload);
    } catch (err) {
        console.warn('[TimingQueue] No se pudo encolar auditoría local:', err);
    }

    try {
        await TimingOutboxService.upsert({
            faseId,
            eventoId: payload.eventoId,
            eventoNombre: payload.eventoNombre,
            faseNombre: payload.faseNombre,
            soloMode: !!payload.soloMode,
            resultados: (payload.resultados || []).map(r => ({
                id: r.id,
                carril: r.carril,
                participanteNombre: r.participanteNombre,
                tiempoOficial: r.tiempoOficial,
                msLlegada: r.msLlegada ?? null,
                estadoCanto: r.estadoCanto || 'Pendiente',
            })),
        });
    } catch (err) {
        console.warn('[TimingQueue] No se pudo guardar en cola del servidor:', err);
    }

    return submitFailure;
};

export const clearTimingSubmitQueue = async (faseId) => {
    clearPendingTimingBackup(faseId);
    try {
        await TimingOutboxService.remove(faseId);
    } catch (err) {
        console.warn('[TimingQueue] No se pudo limpiar cola del servidor:', err);
    }
};

/**
 * Intenta vaciar pendientes: primero envío directo, luego commit server-side.
 * @param {{ submitDirect?: (entry) => Promise<boolean>, onSuccess?: (entry) => void }} handlers
 */
export const flushPendingTimingSubmits = async ({
    submitDirect,
    onSuccess,
} = {}) => {
    let serverPending = [];
    try {
        serverPending = await TimingOutboxService.getPending();
    } catch (err) {
        console.warn('[TimingQueue] No se pudo leer cola del servidor:', err);
    }

    const pending = mergeBackupEntries(listPendingTimingBackups(), serverPending)
        .map(withSubmitFailureFallback);
    const results = [];

    for (const entry of pending) {
        let delivered = false;

        if (typeof submitDirect === 'function') {
            try {
                delivered = await submitDirect(entry);
            } catch (err) {
                console.warn('[TimingQueue] Envío directo falló para fase', entry.faseId, err);
            }
        }

        if (!delivered) {
            try {
                const commit = await TimingOutboxService.commit(entry.faseId);
                delivered = !!commit?.success;
            } catch (err) {
                console.warn('[TimingQueue] Commit server-side falló para fase', entry.faseId, err);
            }
        }

        if (delivered) {
            await clearTimingSubmitQueue(entry.faseId);
            onSuccess?.(entry);
        }

        results.push({ faseId: entry.faseId, delivered });
    }

    return results;
};

export const getMergedPendingTimingBackups = async () => {
    let serverPending = [];
    try {
        serverPending = await TimingOutboxService.getPending();
    } catch {
        serverPending = [];
    }
    return mergeBackupEntries(listPendingTimingBackups(), serverPending)
        .map(withSubmitFailureFallback);
};

export const getPendingTimingEntry = (faseId) =>
    withSubmitFailureFallback(getPendingTimingBackup(faseId));
