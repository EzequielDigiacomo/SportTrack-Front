/** Etiquetas legibles para acciones de auditoría */
export const formatAuditAction = (accion) => ({
    LOGIN_SUCCESS: 'Inicio de sesión',
    LOGIN_FAILED: 'Contraseña incorrecta',
    LOGIN_BLOCKED: 'Acceso bloqueado',
    ACCOUNT_LOCKED: 'Cuenta bloqueada',
    ERROR_FATAL: 'Error del sistema',
    REGISTER_USER: 'Usuario registrado',
    FRONTEND_CRASH: 'Error en la app',
}[accion] || accion);

/** Corrige texto guardado con encoding roto (UTF-8 leído como Latin-1) */
export const fixAuditEncoding = (text) => {
    if (!text || typeof text !== 'string') return text;
    try {
        // Intenta reparar mojibake clásico si detectamos patrones
        if (!text.includes('Ã')) return text;
        return decodeURIComponent(escape(text));
    } catch {
        return text
            .replace(/iniciÃ³ sesiÃ³n/gi, 'inició sesión')
            .replace(/estÃ¡/gi, 'está')
            .replace(/instituciÃ³n/gi, 'institución')
            .replace(/suscripciÃ³n/gi, 'suscripción')
            .replace(/situaciÃ³n/gi, 'situación')
            .replace(/FederaciÃ³n/gi, 'Federación')
            .replace(/federaciÃ³n/gi, 'federación');
    }
};

/** Texto amigable para la columna de detalle */
export const formatAuditDetail = (log) => {
    if (!log?.detalle) return '';

    if (log.accion === 'ERROR_FATAL') {
        try {
            const parsed = JSON.parse(log.detalle);
            return fixAuditEncoding(parsed.Error || log.detalle);
        } catch {
            return fixAuditEncoding(log.detalle);
        }
    }

    return fixAuditEncoding(log.detalle);
};
