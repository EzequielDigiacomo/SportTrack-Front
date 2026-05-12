import api from './api';

const SaaSService = {
    getPlanes: async () => {
        const response = await api.get('/SaaS/planes');
        return response.data;
    },

    asignarPlan: async (clubId, planId) => {
        const response = await api.post(`/SaaS/asignar-plan?clubId=${clubId}&planId=${planId}`);
        return response.data;
    }
};

export default SaaSService;
