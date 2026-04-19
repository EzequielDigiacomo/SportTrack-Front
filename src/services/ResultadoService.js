import api from './api';
import { ENDPOINTS } from '../utils/constants';

const ResultadoService = {
    batchUpdate: async (resultadosData) => {
        const response = await api.put(ENDPOINTS.RESULTADOS.BATCH_UPDATE, resultadosData);
        return response.data;
    },
    getByFase: async (faseId) => {
        const response = await api.get(ENDPOINTS.RESULTADOS.BY_FASE(faseId));
        return response.data;
    }
};

export default ResultadoService;
