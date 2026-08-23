const STORAGE_KEY = 'sporttrack_pending_timing_saves';

const readAll = () => {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
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
