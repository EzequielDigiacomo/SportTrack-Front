import api from './api';
import { ENDPOINTS } from '../utils/constants';

const buildListUrl = (base, { clubId = null, federacionId = null } = {}) => {
    const params = new URLSearchParams();
    if (federacionId != null && federacionId !== '') params.set('federacionId', String(federacionId));
    if (clubId != null && clubId !== '') params.set('clubId', String(clubId));
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
};

/** @param {number|string|null} [clubOrFedId] clubId legacy, o federacionId si options.asFederation */
const EventoService = {
    getAll: async (clubOrFedId = null, options = {}) => {
        const asFederation = options.asFederation === true
            || options.federacionId != null
            || (clubOrFedId != null && options.scope === 'federation');
        const federacionId = options.federacionId ?? (asFederation ? clubOrFedId : null);
        const clubId = asFederation ? (options.clubId ?? null) : clubOrFedId;
        const url = buildListUrl(ENDPOINTS.EVENTOS.BASE, { clubId, federacionId });
        const response = await api.get(url);
        return response.data;
    },

    getProximos: async (clubOrFedId = null, options = {}) => {
        const asFederation = options.asFederation === true
            || options.federacionId != null
            || (clubOrFedId != null && options.scope === 'federation');
        const federacionId = options.federacionId ?? (asFederation ? clubOrFedId : null);
        const clubId = asFederation ? (options.clubId ?? null) : clubOrFedId;
        const url = buildListUrl(ENDPOINTS.EVENTOS.PROXIMOS, { clubId, federacionId });
        const response = await api.get(url);
        return response.data;
    },

    create: async (eventoData) => {
        const response = await api.post(ENDPOINTS.EVENTOS.BASE, eventoData);
        return response.data;
    },

    getById: async (id) => {
        const response = await api.get(`${ENDPOINTS.EVENTOS.BASE}/${id}`);
        return response.data;
    },

    update: async (id, eventoData) => {
        const response = await api.put(`${ENDPOINTS.EVENTOS.BASE}/${id}`, eventoData);
        return response.data;
    },

    delete: async (id) => {
        const response = await api.delete(`${ENDPOINTS.EVENTOS.BASE}/${id}`);
        return response.data;
    },

    updateEventoPrueba: async (eventoPruebaId, data) => {
        const response = await api.put(`${ENDPOINTS.EVENTOS.BASE}/pruebas/${eventoPruebaId}`, data);
        return response.data;
    }
};

export default EventoService;
