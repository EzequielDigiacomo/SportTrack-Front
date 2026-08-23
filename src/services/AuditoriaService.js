import SupportService from './SupportService';
import EventoService from './EventoService';
import FaseService from './FaseService';
import api from './api';
import { ENDPOINTS } from '../utils/constants';

const FASE_ID_RE = /\(ID:\s*(\d+)\)/i;

const tryEventoIdFromDetalle = (detalle) => {
    if (!detalle || typeof detalle !== 'string') return null;
    const trimmed = detalle.trim();
    if (trimmed.startsWith('{')) {
        try {
            const parsed = JSON.parse(trimmed);
            if (parsed?.eventoId != null) return Number(parsed.eventoId);
            if (parsed?.text) return tryEventoIdFromDetalle(parsed.text);
        } catch {
            /* ignore */
        }
    }
    return null;
};

const EVENT_MODULES = new Set([
    'Competencia', 'Inscripciones', 'Eventos', 'Frontend',
    'Cronometrista', 'Largador', 'JuezControl', 'Resultados',
]);

const isEventRelatedLog = (log) => {
    if (log?.idEvento || log?.IdEvento) return true;
    const modulo = log?.modulo || log?.Modulo || '';
    const accion = log?.accion || log?.Accion || '';
    if (EVENT_MODULES.has(modulo)) return true;
    if (accion.startsWith('CLICK_') || accion.startsWith('OPEN_')) return true;
    return false;
};

const normalizeLog = (log) => ({
    id: log.id ?? log.Id,
    fecha: log.fecha ?? log.Fecha,
    accion: log.accion ?? log.Accion,
    detalle: log.detalle ?? log.Detalle,
    usuario: log.usuario ?? log.Usuario,
    modulo: log.modulo ?? log.Modulo,
    ip: log.ip ?? log.IP,
    idEvento: log.idEvento ?? log.IdEvento ?? null,
    idEventoPrueba: log.idEventoPrueba ?? log.IdEventoPrueba ?? null,
});

/** Fallback: arma cards desde /support/logs (siempre disponible en prod). */
export async function buildEventCardsFromSupportLogs({ eventosLimit = 12, logsPerEvento = 8 } = {}) {
    const [logs, eventos] = await Promise.all([
        SupportService.getLogs({ limit: 500 }),
        EventoService.getAll().catch(() => []),
    ]);

    const eventoMeta = new Map((eventos || []).map(e => [Number(e.id), e]));
    const faseToEvento = new Map();

    const recentEventos = [...(eventos || [])]
        .sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0))
        .slice(0, 20);

    await Promise.all(recentEventos.map(async (ev) => {
        try {
            const fases = await FaseService.getByEvento(ev.id);
            (fases || []).forEach((f) => {
                const faseId = f.id ?? f.Id;
                if (faseId != null) faseToEvento.set(Number(faseId), Number(ev.id));
            });
        } catch {
            /* ignore */
        }
    }));

    const byEvento = new Map();

    for (const raw of logs || []) {
        if (!isEventRelatedLog(raw)) continue;
        const log = normalizeLog(raw);
        let eventoId = log.idEvento ? Number(log.idEvento) : null;

        if (!eventoId) eventoId = tryEventoIdFromDetalle(log.detalle);

        if (!eventoId) {
            const detalle = log.detalle || '';
            const faseMatch = FASE_ID_RE.exec(detalle);
            if (faseMatch) {
                eventoId = faseToEvento.get(Number(faseMatch[1])) ?? null;
            }
            if (!eventoId && log.modulo === 'Eventos') {
                const evMatch = FASE_ID_RE.exec(detalle);
                if (evMatch) eventoId = Number(evMatch[1]);
            }
        }

        if (!eventoId) continue;
        if (!byEvento.has(eventoId)) byEvento.set(eventoId, []);
        byEvento.get(eventoId).push({ ...log, idEvento: eventoId });
    }

    return [...byEvento.entries()]
        .map(([eventoId, evLogs]) => {
            const ev = eventoMeta.get(eventoId);
            const sorted = evLogs.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
            return {
                eventoId,
                eventoNombre: ev?.nombre || `Evento #${eventoId}`,
                eventoEstado: ev?.estado,
                eventoFecha: ev?.fecha,
                ultimaActividad: sorted[0]?.fecha,
                totalRegistros: sorted.length,
                logs: sorted.slice(0, logsPerEvento),
            };
        })
        .sort((a, b) => new Date(b.ultimaActividad || 0) - new Date(a.ultimaActividad || 0))
        .slice(0, eventosLimit);
}

const AuditoriaService = {
    getPorEventos: async ({ eventosLimit = 12, logsPerEvento = 8 } = {}) => {
        const params = { eventosLimit, logsPerEvento };
        const endpoints = [
            '/support/por-eventos',
            ENDPOINTS.AUDITORIA.POR_EVENTOS,
        ];

        let lastError;
        for (const url of endpoints) {
            try {
                const response = await api.get(url, { params });
                return response.data || [];
            } catch (err) {
                lastError = err;
            }
        }

        try {
            return await buildEventCardsFromSupportLogs(params);
        } catch (fallbackErr) {
            throw lastError || fallbackErr;
        }
    },

    getByEvento: async (eventoId, limit = 50) => {
        const response = await api.get(ENDPOINTS.AUDITORIA.BASE, {
            params: { eventoId, limit },
        });
        return response.data || [];
    },

    trackClientAction: async ({ accion, detalle, modulo = 'Frontend', eventoId, eventoPruebaId }) => {
        const payload = {
            accion,
            detalle: typeof detalle === 'string' ? detalle : JSON.stringify(detalle ?? {}),
            modulo,
            eventoId: eventoId ?? null,
            eventoPruebaId: eventoPruebaId ?? null,
        };
        try {
            await api.post('/support/client-action', payload);
        } catch {
            await api.post(ENDPOINTS.AUDITORIA.CLIENT_ACTION, payload);
        }
    },
};

export default AuditoriaService;
