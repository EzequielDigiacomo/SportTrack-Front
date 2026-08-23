import AuditoriaService from './AuditoriaService';
import { getUserFacingError } from '../utils/userFacingError';

/** Registra acciones de UI (módulo abierto, botón apretado) sin bloquear la pantalla. */
export const trackAuditAction = ({
    accion,
    detalle,
    modulo = 'Frontend',
    eventoId,
    eventoPruebaId,
}) => {
    AuditoriaService.trackClientAction({
        accion,
        detalle,
        modulo,
        eventoId,
        eventoPruebaId,
    }).catch((err) => {
        console.warn('[Audit] no se pudo registrar acción cliente:', err?.message || err);
    });
};

export const trackJudgeModuleOpen = ({ modulo, eventoId, eventoNombre, faseId, faseNombre }) => {
    trackAuditAction({
        accion: 'OPEN_JUDGE_MODULE',
        modulo,
        eventoId,
        detalle: {
            eventoNombre: eventoNombre || null,
            faseId: faseId ?? null,
            faseNombre: faseNombre || null,
            path: typeof window !== 'undefined' ? window.location.pathname : null,
        },
    });
};

export const trackJudgeButton = ({ accion, modulo, eventoId, eventoPruebaId, detalle }) => {
    trackAuditAction({
        accion,
        modulo,
        eventoId,
        eventoPruebaId,
        detalle,
    });
};

/** Fallos operativos del cronometrista/largador (sin conexión, envío fallido, etc.). */
export const trackOperationalError = ({
    accion,
    modulo = 'Cronometrista',
    eventoId,
    eventoPruebaId,
    message,
    err,
    context = {},
}) => {
    const detalle = {
        message: message || getUserFacingError(err, 'Operación fallida'),
        online: typeof navigator !== 'undefined' ? navigator.onLine : null,
        path: typeof window !== 'undefined' ? window.location.pathname : null,
        ...context,
    };

    const status = err?.status ?? err?.response?.status;
    if (status) detalle.httpStatus = status;

    const raw = err?.message;
    if (raw && typeof raw === 'string' && raw.length <= 180) {
        detalle.technicalHint = raw;
    }

    trackAuditAction({
        accion,
        detalle,
        modulo,
        eventoId,
        eventoPruebaId,
    });
};

export const trackOperationalRecovery = ({
    accion,
    modulo = 'Cronometrista',
    eventoId,
    eventoPruebaId,
    message,
    context = {},
}) => {
    trackAuditAction({
        accion,
        detalle: {
            message: message || 'Operación completada tras reconexión',
            online: typeof navigator !== 'undefined' ? navigator.onLine : null,
            ...context,
        },
        modulo,
        eventoId,
        eventoPruebaId,
    });
};
