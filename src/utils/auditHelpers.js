/** Etiquetas legibles para acciones de auditoría */
export const formatAuditAction = (accion) => ({
    LOGIN_SUCCESS: 'Inicio de sesión',
    LOGIN_FAILED: 'Contraseña incorrecta',
    LOGIN_BLOCKED: 'Acceso bloqueado',
    ACCOUNT_LOCKED: 'Cuenta bloqueada',
    ERROR_FATAL: 'Error del sistema',
    REGISTER_USER: 'Usuario registrado',
    FRONTEND_CRASH: 'Error en la app',
    START_RACE: 'Largada iniciada',
    FINISH_RACE: 'Serie oficializada',
    REVIEW_RACE: 'Enviado a revisión',
    RESET_RACE: 'Serie reiniciada',
    SAVE_TIMING: 'Tiempos guardados',
    PROMOTE_STAGE: 'Promoción de etapa',
    GENERATE_HEATS_AUTO: 'Sorteo automático',
    CREATE_INSCRIPTION: 'Inscripción creada',
    UPDATE_INSCRIPTION: 'Inscripción actualizada',
    DELETE_INSCRIPTION: 'Inscripción eliminada',
    CREATE_EVENT: 'Evento creado',
    UPDATE_EVENT: 'Evento actualizado',
    DELETE_EVENT: 'Evento eliminado',
    OPEN_JUDGE_MODULE: 'Módulo de juez abierto',
    OPEN_RESULTS_MODULE: 'Módulo resultados abierto',
    CLICK_SEND_TIMES: 'Botón Enviar (cronometrista)',
    CLICK_SAVE_OFFICIAL: 'Guardar tiempos oficiales',
    CLICK_START_RACE: 'Botón Largar',
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
