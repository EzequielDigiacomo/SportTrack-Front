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
};

export default AudienceService;
