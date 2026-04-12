import api from './api';
import { ENDPOINTS } from '../utils/constants';

const AtletaService = {
    getAll: async () => {
        const response = await api.get(ENDPOINTS.PARTICIPANTES.BASE);
        return response.data;
    },

    getByClub: async (clubId) => {
        const response = await api.get(ENDPOINTS.PARTICIPANTES.BY_CLUB(clubId));
        return response.data;
    },

    create: async (atletaData) => {
        const response = await api.post(ENDPOINTS.PARTICIPANTES.BASE, atletaData);
        return response.data;
    },

    update: async (id, atletaData) => {
        const response = await api.put(`${ENDPOINTS.PARTICIPANTES.BASE}/${id}`, atletaData);
        return response.data;
    },

    delete: async (id) => {
        const response = await api.delete(`${ENDPOINTS.PARTICIPANTES.BASE}/${id}`);
        return response.data;
    }
};

export default AtletaService;
