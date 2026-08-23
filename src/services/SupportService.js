import api from './api';

const SupportService = {
    getLogs: async (params = {}) => {
        const response = await api.get('/support/logs', { params });
        return response.data;
    },

    clearErrorLogs: async () => {
        const response = await api.delete('/support/logs/clear');
        return response.data;
    },

    getTimingOutbox: async () => {
        const response = await api.get('/support/timing-outbox');
        return response.data;
    },

    commitTimingOutbox: async (faseId, username) => {
        const response = await api.post(`/support/timing-outbox/${faseId}/commit`, { username });
        return response.data;
    },

    discardTimingOutbox: async (id) => {
        await api.delete(`/support/timing-outbox/${id}`);
    },
};

export default SupportService;
