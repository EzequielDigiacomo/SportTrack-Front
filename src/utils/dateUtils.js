/**
 * Formats an ISO date string to Spanish (AR) format.
 * @param {string} isoString 
 * @returns {string} dd/mm/yyyy
 */
export const formatDate = (isoString) => {
    if (!isoString) return '--/--/--';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '--/--/--';
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
    if (!isoString) return '';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
