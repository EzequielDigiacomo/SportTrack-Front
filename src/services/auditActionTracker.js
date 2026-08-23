import AuditoriaService from './AuditoriaService';

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
