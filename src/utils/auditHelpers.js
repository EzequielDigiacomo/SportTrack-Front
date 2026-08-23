/** Acciones de problemas operativos (conexión, envío de tiempos, largada, etc.) */
export const OPERATIONAL_ISSUE_ACTIONS = new Set([
    'TIMING_SUBMIT_FAILED',
    'TIMING_RETRY_FAILED',
    'TIMING_FLUSH_FAILED',
    'TIMING_QUEUED_OFFLINE',
    'RACE_START_QUEUED',
    'RACE_START_FAILED',
]);

export const OPERATIONAL_RECOVERY_ACTIONS = new Set([
    'TIMING_RECOVERED',
    'RACE_START_RECOVERED',
]);

export const isOperationalIssueAction = (accion) => OPERATIONAL_ISSUE_ACTIONS.has(accion);

export const isOperationalAuditAction = (accion) =>
    isOperationalIssueAction(accion) || OPERATIONAL_RECOVERY_ACTIONS.has(accion);

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
    TIMING_SUBMIT_FAILED: 'Envío de tiempos falló',
    TIMING_RETRY_FAILED: 'Reintento de envío falló',
    TIMING_FLUSH_FAILED: 'Cola de tiempos no se pudo vaciar',
    TIMING_QUEUED_OFFLINE: 'Tiempos guardados sin conexión',
    TIMING_RECOVERED: 'Tiempos enviados tras reconexión',
    RACE_START_QUEUED: 'Largada en cola sin conexión',
    RACE_START_FAILED: 'Largada no pudo enviarse',
    RACE_START_RECOVERED: 'Largada enviada tras reconexión',
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

const parseAuditDetalleObject = (detalle) => {
    if (!detalle) return null;
    if (typeof detalle === 'object') return detalle;
    try {
        const parsed = JSON.parse(detalle);
        if (parsed?.text && typeof parsed.text === 'string' && parsed.text.trim().startsWith('{')) {
            try {
                return { ...parsed, ...JSON.parse(parsed.text) };
            } catch {
                return parsed;
            }
        }
        return parsed;
    } catch {
        return null;
    }
};

const formatOperationalDetail = (detalle) => {
    const parsed = parseAuditDetalleObject(detalle);
    if (!parsed) return fixAuditEncoding(typeof detalle === 'string' ? detalle : '');

    const parts = [];
    if (parsed.message) parts.push(parsed.message);
    if (parsed.faseNombre) parts.push(`Serie: ${parsed.faseNombre}`);
    else if (parsed.faseId) parts.push(`Fase #${parsed.faseId}`);
    if (parsed.filas != null) parts.push(`${parsed.filas} tiempos`);
    if (parsed.online === false) parts.push('Sin conexión');
    if (parsed.queuedLocally) parts.push('Respaldo local activo');
    if (parsed.auto) parts.push('Reintento automático');
    return fixAuditEncoding(parts.filter(Boolean).join(' · '));
};

/** Fecha/hora real del evento (prioriza occurredAt guardado offline). */
export const getAuditLogWhen = (log) => {
    const parsed = parseAuditDetalleObject(log?.detalle);
    return parsed?.occurredAt || log?.fecha || null;
};

/** Texto amigable para la columna de detalle */
export const formatAuditDetail = (log) => {
    if (!log?.detalle) return '';

    if (isOperationalAuditAction(log.accion)) {
        return formatOperationalDetail(log.detalle);
    }

    const parsed = parseAuditDetalleObject(log.detalle);
    if (parsed?.text && typeof parsed.text === 'string') {
        return fixAuditEncoding(parsed.text);
    }

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
