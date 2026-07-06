import api from './api';
import { ENDPOINTS } from '../utils/constants';
import { mapFederacionFromApi, normalizeFederacionesList } from '../utils/apiHelpers';

const FederacionService = {
    getAll: async () => {
        const response = await api.get(ENDPOINTS.FEDERACIONES);
        return normalizeFederacionesList(response.data);
    },

    getById: async (id) => {
        const response = await api.get(`${ENDPOINTS.FEDERACIONES}/${id}`);
        return mapFederacionFromApi(response.data);
    },
};

export default FederacionService;
