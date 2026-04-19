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
    }
};

export default FaseService;
