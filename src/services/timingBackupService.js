const STORAGE_KEY = 'sporttrack_pending_timing_saves';
/** Alineado con sesión extendida del cronometrista (24 h). */
const BACKUP_TTL_MS = 24 * 60 * 60 * 1000;

const isBackupExpired = (entry) => {
    if (!entry?.capturedAt) return true;
    const age = Date.now() - new Date(entry.capturedAt).getTime();
    return !Number.isFinite(age) || age > BACKUP_TTL_MS;
};

const readAll = () => {
    try {
        const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        let changed = false;
        const fresh = {};
        for (const [key, entry] of Object.entries(raw)) {
            if (isBackupExpired(entry)) {
                changed = true;
                continue;
            }
            fresh[key] = entry;
        }
        if (changed) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
        }
        return fresh;
    } catch {
        return {};
    }
};

const writeAll = (data) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

/** Guarda snapshot local por si falla red al Enviar. */
export const savePendingTimingBackup = (faseId, { eventoId, eventoNombre, faseNombre, resultados, soloMode }) => {
    const all = readAll();
    all[String(faseId)] = {
        faseId,
        eventoId,
        eventoNombre: eventoNombre || '',
        faseNombre: faseNombre || '',
        soloMode: !!soloMode,
        capturedAt: new Date().toISOString(),
        resultados: (resultados || []).map(r => ({
            id: r.id,
            carril: r.carril,
            participanteNombre: r.participanteNombre,
            tiempoOficial: r.tiempoOficial,
            msLlegada: r.msLlegada ?? null,
            estadoCanto: r.estadoCanto || 'Pendiente',
        })),
    };
    writeAll(all);
};

export const getPendingTimingBackup = (faseId) => {
    const all = readAll();
    return all[String(faseId)] || null;
};

export const clearPendingTimingBackup = (faseId) => {
    const all = readAll();
    delete all[String(faseId)];
    writeAll(all);
};

export const listPendingTimingBackups = () => Object.values(readAll());
