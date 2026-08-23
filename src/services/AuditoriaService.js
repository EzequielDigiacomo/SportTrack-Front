import api from './api';
import { ENDPOINTS } from '../utils/constants';

const AuditoriaService = {
    getPorEventos: async ({ eventosLimit = 12, logsPerEvento = 8 } = {}) => {
        const response = await api.get(ENDPOINTS.AUDITORIA.POR_EVENTOS, {
            params: { eventosLimit, logsPerEvento },
        });
        return response.data || [];
    },

    getByEvento: async (eventoId, limit = 50) => {
        const response = await api.get(ENDPOINTS.AUDITORIA.BASE, {
            params: { eventoId, limit },
        });
        return response.data || [];
    },

    trackClientAction: async ({ accion, detalle, modulo = 'Frontend', eventoId, eventoPruebaId }) => {
        await api.post(ENDPOINTS.AUDITORIA.CLIENT_ACTION, {
            accion,
            detalle: typeof detalle === 'string' ? detalle : JSON.stringify(detalle ?? {}),
            modulo,
            eventoId: eventoId ?? null,
            eventoPruebaId: eventoPruebaId ?? null,
        });
    },
};

export default AuditoriaService;
