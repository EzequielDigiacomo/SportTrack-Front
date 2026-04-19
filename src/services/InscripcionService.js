import api from './api';
import { ENDPOINTS } from '../utils/constants';

const InscripcionService = {
    create: async (data) => {
        const response = await api.post(ENDPOINTS.INSCRIPCIONES.BASE, data);
        return response.data;
    },
    getByEventoPrueba: async (eventoPruebaId) => {
        const response = await api.get(ENDPOINTS.INSCRIPCIONES.BY_EVENTO_PRUEBA(eventoPruebaId));
        return response.data;
    },
    getByEventoAndClub: async (eventoId, clubId) => {
        const response = await api.get(`${ENDPOINTS.INSCRIPCIONES.BASE}/evento/${eventoId}/club/${clubId}`);
        return response.data;
    },
    delete: async (id) => {
        const response = await api.delete(`${ENDPOINTS.INSCRIPCIONES.BASE}/${id}`);
        return response.data;
    },
    update: async (id, data) => {
        const response = await api.put(`${ENDPOINTS.INSCRIPCIONES.BASE}/${id}`, data);
        return response.data;
    },
    toggleSeeding: async (id) => {
        const response = await api.patch(`${ENDPOINTS.INSCRIPCIONES.BASE}/${id}/toggle-seeding`);
        return response.data;
    }
};

export default InscripcionService;
