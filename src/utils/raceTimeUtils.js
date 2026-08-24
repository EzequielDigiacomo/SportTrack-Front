/**
 * Formato estándar de cronómetro deportivo:
 * - Velocidad: mm:ss.SSS (y H:MM:SS.mmm si supera 60')
 * - Maratón / reloj largo: H:MM:SS.mmm (hora:minutos:segundos)
 */

const toInt = (v, fallback = 0) => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : fallback;
};

/** ¿El string parece un tiempo completo parseable? (no borronear mientras se escribe) */
export const isCompleteRaceTimeInput = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string') return false;
    const t = timeStr.trim();
    if (!t) return false;
    if (/[:.,]$/.test(t)) return false;
    if (/^\d{1,2}:$/.test(t)) return false;
    if (/^\d{1,2}:\d{0,2}$/.test(t) && !t.includes('.')) {
        const parts = t.split(':');
        return parts.length === 2 && parts[1].length >= 1;
    }
    return timeToMs(t) !== null;
};

/**
 * Parsea tiempos a milisegundos.
 * Soporta: mm:ss.SSS | H:MM:SS.mmm | 1hs, 15m 45s | legacy 73:05.830
 */
export const timeToMs = (timeStr) => {
    if (timeStr == null || timeStr === '') return null;
    const raw = String(timeStr).trim();
    if (!raw) return null;

    try {
        const human = raw.match(
            /^(\d+)\s*hs?,?\s*(\d+)\s*m(?:in)?s?\s*(\d+)(?:[.,](\d{1,3}))?\s*s?$/i
        );
        if (human) {
            const hh = toInt(human[1]);
            const mm = toInt(human[2]);
            const ss = toInt(human[3]);
            const ms = toInt((human[4] || '0').padEnd(3, '0').slice(0, 3));
            if (mm > 59 || ss > 59) return null;
            const total = (hh * 3600000) + (mm * 60000) + (ss * 1000) + ms;
            return Number.isFinite(total) ? total : null;
        }

        const parts = raw.split(':');
        if (parts.length === 3) {
            const [hh, mm, rest] = parts;
            if (rest === '' || rest == null) return null;
            const [ss, frac = '0'] = rest.split('.');
            if (ss === '') return null;
            const total = (toInt(hh) * 3600000)
                + (toInt(mm) * 60000)
                + (toInt(ss) * 1000)
                + toInt(frac.padEnd(3, '0').slice(0, 3));
            return Number.isFinite(total) ? total : null;
        }
        if (parts.length === 2) {
            const [mm, rest] = parts;
            if (rest === '' || rest == null) return null;
            const [ss, frac = '0'] = rest.split('.');
            if (ss === '') return null;
            // mm puede ser > 59 (legacy cronómetro: 73:05.830)
            const total = (toInt(mm) * 60000)
                + (toInt(ss) * 1000)
                + toInt(frac.padEnd(3, '0').slice(0, 3));
            return Number.isFinite(total) ? total : null;
        }
    } catch {
        return null;
    }
    return null;
};

const splitMs = (ms) => {
    const totalMs = Math.floor(ms);
    const hours = Math.floor(totalMs / 3600000);
    const minutes = Math.floor((totalMs % 3600000) / 60000);
    const seconds = Math.floor((totalMs % 60000) / 1000);
    const millis = totalMs % 1000;
    return { hours, minutes, seconds, millis, totalMs };
};

/**
 * Reloj / tiempos con horas: H:MM:SS.mmm
 * Ej: 0:05:12.340 · 1:13:05.830
 */
export const formatClockWithHoursFromMs = (ms) => {
    if (ms == null || Number.isNaN(ms) || ms < 0) return '';
    const { hours, minutes, seconds, millis } = splitMs(ms);
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
};

/**
 * Canonical:
 * - sprint < 60': mm:ss.SSS
 * - ≥ 60' o forceHours: H:MM:SS.mmm
 */
export const formatRaceTimeFromMs = (ms, { forceHours = false } = {}) => {
    if (ms == null || Number.isNaN(ms) || ms < 0) return '';
    const { hours, minutes, seconds, millis, totalMs } = splitMs(ms);
    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');
    const mmm = String(millis).padStart(3, '0');

    if (forceHours || hours > 0 || totalMs >= 3600000) {
        return `${hours}:${mm}:${ss}.${mmm}`;
    }
    const totalMinutes = Math.floor(totalMs / 60000);
    return `${String(totalMinutes).padStart(2, '0')}:${ss}.${mmm}`;
};

/** Display maratón = mismo que el cronómetro: H:MM:SS.mmm */
export const formatMaratonRaceTimeFromMs = (ms) => formatClockWithHoursFromMs(ms);

export const isMeaningfulRaceTime = (timeStr) => {
    const ms = timeToMs(timeStr);
    return ms !== null && ms > 0;
};

export const formatRaceTime = (timeStr, opts = {}) => {
    if (!timeStr || timeStr === '') return '';
    const ms = timeToMs(timeStr);
    if (ms === null) return String(timeStr);
    if (opts.marathon) return formatMaratonRaceTimeFromMs(ms);
    return formatRaceTimeFromMs(ms);
};

export const normalizeRaceTimeInput = (timeStr, { marathon = false } = {}) => {
    if (!timeStr || !String(timeStr).trim()) return '';
    const ms = timeToMs(timeStr);
    if (ms === null) return String(timeStr).trim();
    return marathon ? formatMaratonRaceTimeFromMs(ms) : formatRaceTimeFromMs(ms);
};

export const parseTimeToTimeSpan = (timeStr) => {
    if (!timeStr || String(timeStr).trim() === '') return null;
    const ms = timeToMs(timeStr);
    if (ms === null || !Number.isFinite(ms)) return null;

    const { hours, minutes, seconds, millis } = splitMs(ms);
    const msFormatted = String(millis).padStart(3, '0').padEnd(7, '0');

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${msFormatted}`;
};
