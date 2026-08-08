import api from './api';
import { ENDPOINTS } from '../utils/constants';

const ParticipanteService = {
    getById: async (id) => {
        const response = await api.get(`${ENDPOINTS.PARTICIPANTES.BASE}/${id}`);
        return response.data;
    },

    update: async (id, data) => {
        const response = await api.put(`${ENDPOINTS.PARTICIPANTES.BASE}/${id}`, data);
        return response.data;
    },
};

export default ParticipanteService;
