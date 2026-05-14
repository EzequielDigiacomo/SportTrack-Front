import api from './api';
import { ENDPOINTS } from '../utils/constants';

const EventoService = {
    getAll: async (clubId = null) => {
        const url = clubId ? `${ENDPOINTS.EVENTOS.BASE}?clubId=${clubId}` : ENDPOINTS.EVENTOS.BASE;
        const response = await api.get(url);
        return response.data;
    },

    getProximos: async (clubId = null) => {
        const url = clubId ? `${ENDPOINTS.EVENTOS.PROXIMOS}?clubId=${clubId}` : ENDPOINTS.EVENTOS.PROXIMOS;
        const response = await api.get(url);
        return response.data;
    },

    create: async (eventoData) => {
        const response = await api.post(ENDPOINTS.EVENTOS.BASE, eventoData);
        return response.data;
    },

    getById: async (id) => {
        const response = await api.get(`${ENDPOINTS.EVENTOS.BASE}/${id}`);
        return response.data;
    },

    update: async (id, eventoData) => {
        const response = await api.put(`${ENDPOINTS.EVENTOS.BASE}/${id}`, eventoData);
        return response.data;
    },

    delete: async (id) => {
        const response = await api.delete(`${ENDPOINTS.EVENTOS.BASE}/${id}`);
        return response.data;
    },

    updateEventoPrueba: async (eventoPruebaId, data) => {
        const response = await api.put(`${ENDPOINTS.EVENTOS.BASE}/pruebas/${eventoPruebaId}`, data);
        return response.data;
    }
};

export default EventoService;
