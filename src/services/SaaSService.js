import api from './api';

const SaaSService = {
    getPlanes: async () => {
        const response = await api.get('/SaaS/planes');
        return response.data;
    },

    asignarPlan: async (clubId, planId) => {
        const response = await api.post(`/SaaS/asignar-plan?clubId=${clubId}&planId=${planId}`);
        return response.data;
    },

    getClubesStatus: async () => {
        const response = await api.get('/SaaS/clubes-status');
        return response.data;
    },

    toggleClubActivo: async (clubId) => {
        const response = await api.patch(`/SaaS/clubes/${clubId}/toggle-activo`);
        return response.data;
    },

    // CRUD Federaciones (Base data)
    createFederacion: async (data) => {
        const response = await api.post('/SaaS/create-federacion', data);
        return response.data;
    },

    updateFederacion: async (id, data) => {
        const response = await api.put(`/Federaciones/${id}`, data);
        return response.data;
    },

    deleteFederacion: async (id) => {
        const response = await api.delete(`/Federaciones/${id}`);
        return response.data;
    },

    getGlobalMetrics: async () => {
        const response = await api.get('/SaaS/global-metrics');
        return response.data;
    }
};

export default SaaSService;
