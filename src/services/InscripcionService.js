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
    },
    getRegistro: async (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.eventoId) searchParams.set('eventoId', params.eventoId);
        if (params.clubId) searchParams.set('clubId', params.clubId);
        if (params.participanteId) searchParams.set('participanteId', params.participanteId);
        if (params.busqueda) searchParams.set('busqueda', params.busqueda);
        const query = searchParams.toString();
        const url = query ? `${ENDPOINTS.INSCRIPCIONES.REGISTRO}?${query}` : ENDPOINTS.INSCRIPCIONES.REGISTRO;
        const response = await api.get(url);
        return response.data;
    },
};

export default InscripcionService;
