import api from './api';
import { ENDPOINTS } from '../utils/constants';

const TimingOutboxService = {
    upsert: async (payload) => {
        const response = await api.post(ENDPOINTS.TIMING_OUTBOX.BASE, payload);
        return response.data;
    },
    getPending: async () => {
        const response = await api.get(ENDPOINTS.TIMING_OUTBOX.PENDING);
        return response.data;
    },
    commit: async (faseId) => {
        const response = await api.post(ENDPOINTS.TIMING_OUTBOX.COMMIT(faseId));
        return response.data;
    },
    flush: async () => {
        const response = await api.post(ENDPOINTS.TIMING_OUTBOX.FLUSH);
        return response.data;
    },
    remove: async (faseId) => {
        await api.delete(ENDPOINTS.TIMING_OUTBOX.REMOVE(faseId));
    },
};

export default TimingOutboxService;
