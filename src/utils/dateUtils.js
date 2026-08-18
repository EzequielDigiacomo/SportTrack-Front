/**
 * Parsea una fecha de calendario (YYYY-MM-DD o ISO) en hora local,
 * evitando el desfase de un día que produce `new Date('YYYY-MM-DD')` en UTC.
 * @param {string|Date} value
 * @returns {Date|null}
 */
export const parseLocalDate = (value) => {
    if (!value) return null;
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }

    const str = String(value).trim();
    const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
        const [, year, month, day] = match;
        return new Date(Number(year), Number(month) - 1, Number(day));
    }

    const parsed = new Date(str);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * Partes de calendario (año/mes/día) en hora local.
 * @param {string|Date} value
 * @returns {{ year: number, month: number, day: number }|null}
 */
export const getLocalDateParts = (value) => {
    const date = parseLocalDate(value);
    if (!date) return null;
    return {
        year: date.getFullYear(),
        month: date.getMonth(),
        day: date.getDate(),
    };
};

/**
 * Fecha de inicio del evento (campo `fecha` / `fechaInicio`).
 * @param {object} evento
 * @returns {string|Date|null}
 */
export const getEventStartDate = (evento) =>
    evento?.fecha ?? evento?.fechaInicio ?? evento?.Fecha ?? evento?.FechaInicio ?? null;

/**
 * Formats an ISO date string to Spanish (AR) format.
 * @param {string} isoString 
 * @returns {string} dd/mm/yyyy
 */
export const formatDate = (isoString) => {
    if (!isoString) return '--/--/--';
    const date = parseLocalDate(isoString);
    if (!date) return '--/--/--';
    return date.toLocaleDateString('es-AR');
};

/**
 * Formats an ISO date string to HH:MM format.
 * @param {string} isoString 
 * @returns {string} HH:MM
 */
export const formatTime = (isoString) => {
    if (!isoString) return '--:--';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '--:--';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

/**
 * Extracts the YYYY-MM-DD part of an ISO string.
 * @param {string} isoString 
 */
export const getISODatePart = (isoString) => {
    const parts = getLocalDateParts(isoString);
    if (!parts) return '';
    return `${parts.year}-${String(parts.month + 1).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
};

/**
 * Formato corto para badges de agenda (ej: "22 ago").
 * @param {string|Date} value
 * @param {string} locale
 */
export const formatLocalDateShort = (value, locale = 'es-ES') => {
    const date = parseLocalDate(value);
    if (!date) return '';
    return date.toLocaleDateString(locale, { day: '2-digit', month: 'short' });
};

/** Compara si una fecha cae en un mes/año concretos (calendario local). */
export const isSameMonthYear = (value, month, year) => {
    const parts = getLocalDateParts(value);
    if (!parts) return false;
    return parts.month === month && parts.year === year;
};

/** Compara si una fecha cae en un día concreto del mes (calendario local). */
export const isSameDayOfMonth = (value, day) => {
    const parts = getLocalDateParts(value);
    if (!parts) return false;
    return parts.day === day;
};
