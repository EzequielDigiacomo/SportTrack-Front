import api from './api';
import { ENDPOINTS } from '../utils/constants';

const ClubService = {
    getAll: async () => {
        const response = await api.get(ENDPOINTS.CLUBES);
        return response.data;
    },

    getById: async (id) => {
        const response = await api.get(`${ENDPOINTS.CLUBES}/${id}`);
        return response.data;
    },

    create: async (clubData) => {
        const response = await api.post(ENDPOINTS.CLUBES, clubData);
        return response.data;
    },

    update: async (id, clubData) => {
        const response = await api.put(`${ENDPOINTS.CLUBES}/${id}`, clubData);
        return response.data;
    },

    delete: async (id) => {
        const response = await api.delete(`${ENDPOINTS.CLUBES}/${id}`);
        return response.data;
    }
};

export default ClubService;
