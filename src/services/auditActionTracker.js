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

/** Envía al API; si ambos endpoints fallan, lanza error (para mantener cola local). */
const postClientActionStrict = async (payload) => {
    try {
        await AuditoriaService.trackClientAction(payload);
    } catch (err) {
        throw err;
    }
};

const dispatchAuditAction = ({
    accion,
    detalle,
    modulo = 'Frontend',
    eventoId,
    eventoPruebaId,
    queueId: forcedQueueId,
}) => {
    const capturedAt = new Date().toISOString();
    const enrichedDetalle = buildDetalle(detalle, capturedAt);
    const operational = isOperationalAuditAction(accion);

    // Incluye fase en texto plano para el resolver legacy `(ID: N)`
    if (enrichedDetalle.faseId != null && !String(enrichedDetalle.message || '').includes('(ID:')) {
        const label = enrichedDetalle.faseNombre || `fase ${enrichedDetalle.faseId}`;
        enrichedDetalle.message = enrichedDetalle.message
            ? `${enrichedDetalle.message} (${label}, ID: ${enrichedDetalle.faseId})`
            : `Fallo en ${label} (ID: ${enrichedDetalle.faseId})`;
    }

    const payload = {
        id: forcedQueueId || null,
        accion,
        detalle: enrichedDetalle,
        modulo,
        eventoId: eventoId != null ? Number(eventoId) : null,
        eventoPruebaId: eventoPruebaId != null ? Number(eventoPruebaId) : null,
        capturedAt: enrichedDetalle.occurredAt || capturedAt,
    };

    // Write-ahead: siempre encolar operativos antes de intentar red
    let queueId = null;
    if (operational) {
        queueId = enqueuePendingAuditAction(payload);
        payload.id = queueId;
    }

    const send = async () => {
        await postClientActionStrict({
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
            console.warn('[Audit] operativa en cola local hasta reconectar:', accion, err?.message || err);
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
    occurredAt,
    queueId,
}) => {
    const detalle = {
        message: message || getUserFacingError(err, 'Operación fallida'),
        online: typeof navigator !== 'undefined' ? navigator.onLine : null,
        path: typeof window !== 'undefined' ? window.location.pathname : null,
        occurredAt: occurredAt || new Date().toISOString(),
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
        queueId,
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

/**
 * Cuando se recupera un envío de tiempos que había fallado offline,
 * asegura el fallo en cola (id estable) + recuperación, y fuerza flush.
 */
export const syncTimingFailureAuditFromBackup = (entry) => {
    if (!entry?.submitFailure) {
        flushPendingAuditActions().catch(() => {});
        return;
    }

    const fail = entry.submitFailure;
    const occurredAt = fail.occurredAt || entry.capturedAt || new Date().toISOString();
    const stableId = `timing-fail-${entry.faseId}-${occurredAt}`;

    trackOperationalError({
        accion: fail.accion || 'TIMING_SUBMIT_FAILED',
        modulo: fail.modulo || 'Cronometrista',
        eventoId: entry.eventoId ?? fail.eventoId,
        message: fail.message || 'Envío de tiempos falló (sin conexión)',
        occurredAt,
        queueId: stableId,
        context: {
            faseId: entry.faseId,
            faseNombre: entry.faseNombre || fail.faseNombre,
            eventoNombre: entry.eventoNombre || fail.eventoNombre,
            filas: fail.filas ?? entry.resultados?.length,
            queuedLocally: true,
            recoveredLater: true,
            ...(fail.context || {}),
        },
    });

    trackOperationalRecovery({
        accion: 'TIMING_RECOVERED',
        modulo: 'Cronometrista',
        eventoId: entry.eventoId ?? fail.eventoId,
        message: 'Tiempos enviados tras reconexión',
        context: {
            faseId: entry.faseId,
            faseNombre: entry.faseNombre,
            eventoNombre: entry.eventoNombre,
            filas: entry.resultados?.length,
            auto: true,
            source: 'timing-backup',
        },
    });

    // Pequeño delay para que los write-ahead terminen de encolar
    setTimeout(() => {
        flushPendingAuditActions().catch(() => {});
    }, 100);
};

export { flushPendingAuditActions };
