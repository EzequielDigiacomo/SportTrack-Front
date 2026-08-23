import TimingOutboxService from './timingOutboxService';
import {
    clearPendingTimingBackup,
    getPendingTimingBackup,
    listPendingTimingBackups,
    savePendingTimingBackup,
} from './timingBackupService';

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
            source: 'server',
        });
    }

    for (const entry of localEntries) {
        const key = String(entry.faseId);
        const existing = byFase.get(key);
        const localDate = new Date(entry.capturedAt || 0).getTime();
        const serverDate = existing ? new Date(existing.capturedAt || 0).getTime() : 0;
        if (!existing || localDate >= serverDate) {
            byFase.set(key, { ...entry, source: existing ? 'merged' : 'local' });
        }
    }

    return Array.from(byFase.values());
};

/** Guarda en localStorage y, si hay red, también en la cola temporal del servidor. */
export const enqueueFailedTimingSubmit = async (faseId, payload) => {
    savePendingTimingBackup(faseId, payload);

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

    const pending = mergeBackupEntries(listPendingTimingBackups(), serverPending);
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
    return mergeBackupEntries(listPendingTimingBackups(), serverPending);
};

export const getPendingTimingEntry = (faseId) => getPendingTimingBackup(faseId);
