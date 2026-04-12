import api from './api';
import { ENDPOINTS } from '../utils/constants';

const ResultadoService = {
    upsert: async (resultadoData) => {
        const response = await api.post(ENDPOINTS.RESULTADOS.UPSERT, resultadoData);
        return response.data;
    },
    getByPrueba: async (pruebaId) => {
        const response = await api.get(ENDPOINTS.RESULTADOS.BY_PRUEBA(pruebaId));
        return response.data;
    }
};

export default ResultadoService;
