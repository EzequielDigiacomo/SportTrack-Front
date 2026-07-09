/**
 * Formato estándar de cronómetro deportivo: mm:ss.SSS
 * Ejemplos: 00:39.239, 01:50.229
 */

export const timeToMs = (timeStr) => {
    if (!timeStr || timeStr === '') return null;
    try {
        const parts = String(timeStr).split(':');
        if (parts.length === 3) {
            const [hh, mm, rest] = parts;
            const [ss, ms = '0'] = rest.split('.');
            return (parseInt(hh) * 3600000) + (parseInt(mm) * 60000) + (parseInt(ss) * 1000) + parseInt(ms.padEnd(3, '0').slice(0, 3));
        }
        if (parts.length === 2) {
            const [mm, rest] = parts;
            const [ss, ms = '0'] = rest.split('.');
            return (parseInt(mm) * 60000) + (parseInt(ss) * 1000) + parseInt(ms.padEnd(3, '0').slice(0, 3));
        }
    } catch {
        return null;
    }
    return null;
};

export const formatRaceTimeFromMs = (ms) => {
    if (ms == null || Number.isNaN(ms) || ms < 0) return '';
    const totalMs = Math.floor(ms);
    const minutes = Math.floor(totalMs / 60000);
    const seconds = Math.floor((totalMs % 60000) / 1000);
    const millis = totalMs % 1000;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
};

/** Tiempo registrado real (excluye placeholder 00:00.000 pre-largada). */
export const isMeaningfulRaceTime = (timeStr) => {
    const ms = timeToMs(timeStr);
    return ms !== null && ms > 0;
};

/** Normaliza cualquier tiempo del backend/cronómetro al formato mm:ss.SSS */
export const formatRaceTime = (timeStr) => {
    if (!timeStr || timeStr === '') return '';
    const ms = timeToMs(timeStr);
    if (ms === null) return String(timeStr);
    return formatRaceTimeFromMs(ms);
};
