import { enqueuePendingAuditAction } from './auditActionQueue';
import { listPendingTimingBackups, savePendingTimingBackup } from './timingBackupService';

/** Repara respaldos viejos sin submitFailure / sin cola de auditoría. */
export const repairPendingTimingAuditGaps = () => {
    if (typeof window === 'undefined') return;
    try {
        const pending = listPendingTimingBackups();
        for (const entry of pending) {
            if (!entry?.faseId) continue;
            const occurredAt = entry.submitFailure?.occurredAt || entry.capturedAt || new Date().toISOString();
            const submitFailure = entry.submitFailure || {
                accion: 'TIMING_SUBMIT_FAILED',
                modulo: 'Cronometrista',
                message: 'Envío de tiempos falló (sin conexión / señal débil)',
                occurredAt,
                eventoId: entry.eventoId,
                faseNombre: entry.faseNombre,
                eventoNombre: entry.eventoNombre,
                filas: entry.resultados?.length ?? 0,
                context: { repaired: true, queuedLocally: true },
            };

            if (!entry.submitFailure) {
                savePendingTimingBackup(entry.faseId, {
                    ...entry,
                    submitFailure,
                });
            }

            const faseLabel = entry.faseNombre || `fase ${entry.faseId}`;
            enqueuePendingAuditAction({
                id: `timing-fail-${entry.faseId}-${occurredAt}`,
                accion: 'TIMING_SUBMIT_FAILED',
                modulo: 'Cronometrista',
                eventoId: entry.eventoId ?? null,
                capturedAt: occurredAt,
                detalle: {
                    message: `${submitFailure.message} (${faseLabel}, ID: ${entry.faseId})`,
                    occurredAt,
                    faseId: Number(entry.faseId),
                    faseNombre: entry.faseNombre || null,
                    eventoNombre: entry.eventoNombre || null,
                    filas: submitFailure.filas,
                    queuedLocally: true,
                    repaired: !entry.submitFailure,
                },
            });
        }
    } catch (err) {
        console.warn('[TimingQueue] repairPendingTimingAuditGaps:', err);
    }
};
