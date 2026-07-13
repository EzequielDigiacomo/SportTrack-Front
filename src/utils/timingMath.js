/**
 * Contrato de timing absoluto: t0 = click del largador (ISO / ms).
 * El cronometrista siempre calcula: ahoraSync − t0 (el lag de red no suma al tiempo).
 */

/** Normaliza fecha de largada (API / SignalR) a epoch ms. */
export const parseStartMs = (fechaHoraInicioReal) => {
    if (fechaHoraInicioReal == null || fechaHoraInicioReal === '') return NaN;
    if (typeof fechaHoraInicioReal === 'number' && Number.isFinite(fechaHoraInicioReal)) {
        return fechaHoraInicioReal;
    }
    if (fechaHoraInicioReal instanceof Date) {
        const t = fechaHoraInicioReal.getTime();
        return Number.isNaN(t) ? NaN : t;
    }
    let raw = String(fechaHoraInicioReal).trim();
    // Si viene sin zona, asumir UTC (mismo criterio que Control)
    if (/^\d{4}-\d{2}-\d{2}T/.test(raw) && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(raw)) {
        raw = `${raw}Z`;
    }
    const t = new Date(raw).getTime();
    return Number.isNaN(t) ? NaN : t;
};

/** Elapsed desde t0 usando un "ahora" en ms (p.ej. getSyncedNow().getTime()). */
export const elapsedMs = (startMs, nowMs = Date.now()) => {
    if (!Number.isFinite(startMs)) return 0;
    return Math.max(0, nowMs - startMs);
};

export const PENDING_START_KEY = 'sporttrack_pending_race_start';

export const loadPendingRaceStart = () => {
    try {
        const raw = sessionStorage.getItem(PENDING_START_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed?.faseId || !parsed?.t0Iso) return null;
        return parsed;
    } catch {
        return null;
    }
};

export const savePendingRaceStart = (faseId, t0Iso) => {
    try {
        sessionStorage.setItem(PENDING_START_KEY, JSON.stringify({
            faseId: String(faseId),
            t0Iso,
            savedAt: Date.now()
        }));
    } catch {
        // sessionStorage lleno / privado
    }
};

export const clearPendingRaceStart = (faseId = null) => {
    try {
        if (!faseId) {
            sessionStorage.removeItem(PENDING_START_KEY);
            return;
        }
        const pending = loadPendingRaceStart();
        if (pending && String(pending.faseId) === String(faseId)) {
            sessionStorage.removeItem(PENDING_START_KEY);
        }
    } catch {
        // ignore
    }
};
