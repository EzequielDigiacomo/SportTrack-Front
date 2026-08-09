import api from './api';

const AudienceService = {
    getLive: async () => {
        const response = await api.get('/Audience/live');
        return response.data;
    },

    getPeaks: async (limit = 100) => {
        const response = await api.get('/Audience/peaks', { params: { limit } });
        return response.data;
    },

    getCapacity: async () => {
        const response = await api.get('/Audience/capacity');
        return response.data;
    },

    updateCapacity: async ({ presetId, softCapacity }) => {
        const response = await api.put('/Audience/capacity', { presetId, softCapacity });
        return response.data;
    },
};

export default AudienceService;
