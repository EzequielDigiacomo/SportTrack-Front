import api from './api';
import { ENDPOINTS } from '../utils/constants';

const FaseService = {
    getByEventoPrueba: async (eventoPruebaId) => {
        const response = await api.get(ENDPOINTS.FASES.BY_EVENTO_PRUEBA(eventoPruebaId));
        return response.data;
    },
    generar: async (eventoPruebaId) => {
        const response = await api.post(ENDPOINTS.FASES.GENERAR(eventoPruebaId));
        return response.data;
    },
    promover: async (eventoPruebaId) => {
        const response = await api.post(ENDPOINTS.FASES.PROMOVER(eventoPruebaId));
        return response.data;
    },
    delete: async (id) => {
        await api.delete(`${ENDPOINTS.FASES.BASE}/${id}`);
    },
    iniciar: async (id) => {
        const response = await api.post(`${ENDPOINTS.FASES.BASE}/${id}/Iniciar`);
        return response.data;
    },
    finalizar: async (id) => {
        const response = await api.post(`${ENDPOINTS.FASES.BASE}/${id}/Finalizar`);
        return response.data;
    },
    reiniciar: async (id) => {
        const response = await api.post(`${ENDPOINTS.FASES.BASE}/${id}/Reiniciar`);
        return response.data;
    },
    enviarARevision: async (id) => {
        const response = await api.post(`${ENDPOINTS.FASES.BASE}/${id}/EnviarARevision`);
        return response.data;
    },
    getByEvento: async (eventoId) => {
        const url = ENDPOINTS.FASES.BY_EVENTO(eventoId);
        const response = await api.get(url);
        console.log('[DEBUG_FASES] Data returned:', JSON.stringify(response.data[0], null, 2));
        return response.data;
    },
    batchUpdate: async (dto) => {
        const response = await api.post(ENDPOINTS.FASES.BATCH_UPDATE, dto);
        return response.data;
    }
};

export default FaseService;
