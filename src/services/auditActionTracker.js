import AuditoriaService from './AuditoriaService';
import { getUserFacingError } from '../utils/userFacingError';
import { isOperationalAuditAction } from '../utils/auditHelpers';
import {
    enqueuePendingAuditAction,
    flushPendingAuditActions,
    removePendingAuditAction,
} from './auditActionQueue';

const newQueueId = () => (
    typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
);

const buildDetalle = (detalle, capturedAt) => {
    if (typeof detalle === 'string') {
        try {
            const parsed = JSON.parse(detalle);
            return { ...parsed, occurredAt: parsed.occurredAt || capturedAt };
        } catch {
            return { text: detalle, occurredAt: capturedAt };
        }
    }
    return { ...(detalle || {}), occurredAt: detalle?.occurredAt || capturedAt };
};

const dispatchAuditAction = ({
    accion,
    detalle,
    modulo = 'Frontend',
    eventoId,
    eventoPruebaId,
}) => {
    const capturedAt = new Date().toISOString();
    const enrichedDetalle = buildDetalle(detalle, capturedAt);
    const operational = isOperationalAuditAction(accion);

    const payload = {
        accion,
        detalle: enrichedDetalle,
        modulo,
        eventoId,
        eventoPruebaId,
        capturedAt,
    };

    let queueId = null;
    if (operational) {
        queueId = enqueuePendingAuditAction(payload);
        payload.id = queueId;
    }

    const send = async () => {
        await AuditoriaService.trackClientAction({
            accion: payload.accion,
            detalle: payload.detalle,
            modulo: payload.modulo,
            eventoId: payload.eventoId,
            eventoPruebaId: payload.eventoPruebaId,
        });
        if (queueId) removePendingAuditAction(queueId);
    };

    send().catch((err) => {
        if (operational) {
            console.warn('[Audit] acción operativa en cola local hasta reconectar:', accion);
            return;
        }
        enqueuePendingAuditAction({ ...payload, id: newQueueId() });
        console.warn('[Audit] no se pudo registrar acción cliente:', err?.message || err);
    });
};

/** Registra acciones de UI (módulo abierto, botón apretado) sin bloquear la pantalla. */
export const trackAuditAction = (params) => {
    dispatchAuditAction(params);
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

export { flushPendingAuditActions };
