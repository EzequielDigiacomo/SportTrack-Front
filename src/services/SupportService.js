import api from './api';

const SupportService = {
    getLogs: async (params = {}) => {
        const response = await api.get('/support/logs', { params });
        return response.data;
    },

    clearErrorLogs: async () => {
        const response = await api.delete('/support/logs/clear');
        return response.data;
    }
};

export default SupportService;
