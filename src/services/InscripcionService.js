import api from './api';
import { ENDPOINTS } from '../utils/constants';

const InscripcionService = {
    create: async (data) => {
        const response = await api.post(ENDPOINTS.INSCRIPCIONES.BASE, data);
        return response.data;
    },
    getByEventoPrueba: async (eventoPruebaId) => {
        const response = await api.get(ENDPOINTS.INSCRIPCIONES.BY_EVENTO_PRUEBA(eventoPruebaId));
        return response.data;
    },
    getByEventoAndClub: async (eventoId, clubId) => {
        const response = await api.get(`${ENDPOINTS.INSCRIPCIONES.BASE}/evento/${eventoId}/club/${clubId}`);
        return response.data;
    },
    delete: async (id) => {
        const response = await api.delete(`${ENDPOINTS.INSCRIPCIONES.BASE}/${id}`);
        return response.data;
    },
    update: async (id, data) => {
        const response = await api.put(`${ENDPOINTS.INSCRIPCIONES.BASE}/${id}`, data);
        return response.data;
    },
    updateTripulacion: async (id, data) => {
        const response = await api.patch(`${ENDPOINTS.INSCRIPCIONES.BASE}/${id}/tripulacion`, data);
        return response.data;
    },
    toggleSeeding: async (id) => {
        const response = await api.patch(`${ENDPOINTS.INSCRIPCIONES.BASE}/${id}/toggle-seeding`);
        return response.data;
    },
    getRegistro: async (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.eventoId) searchParams.set('eventoId', params.eventoId);
        if (params.clubId) searchParams.set('clubId', params.clubId);
        if (params.participanteId) searchParams.set('participanteId', params.participanteId);
        if (params.busqueda) searchParams.set('busqueda', params.busqueda);
        const query = searchParams.toString();
        const url = query ? `${ENDPOINTS.INSCRIPCIONES.REGISTRO}?${query}` : ENDPOINTS.INSCRIPCIONES.REGISTRO;
        const response = await api.get(url);
        return response.data;
    },

    // Link mágico
    getCambiosByToken: async (token) => {
        const response = await api.get(`/cambios-acceso/${token}`);
        return response.data;
    },
    updateTripulacionByToken: async (token, id, data) => {
        const response = await api.patch(`/cambios-acceso/${token}/inscripciones/${id}/tripulacion`, data);
        return response.data;
    },
    listTokensCambios: async (eventoId) => {
        const response = await api.get(`/Eventos/${eventoId}/tokens-cambios`);
        return response.data;
    },
    generarTokensCambios: async (eventoId, data = {}) => {
        const response = await api.post(`/Eventos/${eventoId}/tokens-cambios`, data);
        return response.data;
    },
    revocarTokenCambios: async (eventoId, tokenId) => {
        const response = await api.delete(`/Eventos/${eventoId}/tokens-cambios/${tokenId}`);
        return response.data;
    },

    // Live ops admin
    liveUpdateTripulacion: async (id, data) => {
        const response = await api.patch(`${ENDPOINTS.INSCRIPCIONES.BASE}/live/${id}/tripulacion`, data);
        return response.data;
    },
    livePatchNombre: async (participanteId, data) => {
        const response = await api.patch(`${ENDPOINTS.INSCRIPCIONES.BASE}/live/participantes/${participanteId}/nombre`, data);
        return response.data;
    },
    liveUpdateNumero: async (id, numeroCompetidor) => {
        const response = await api.patch(`${ENDPOINTS.INSCRIPCIONES.BASE}/live/${id}/numero`, { numeroCompetidor });
        return response.data;
    },
    liveReasignarCarriles: async (faseId, asignaciones) => {
        const response = await api.put(`${ENDPOINTS.INSCRIPCIONES.BASE}/live/fases/${faseId}/carriles`, { asignaciones });
        return response.data;
    },
    liveBaja: async (id, force = false) => {
        const response = await api.delete(`${ENDPOINTS.INSCRIPCIONES.BASE}/live/${id}?force=${force ? 'true' : 'false'}`);
        return response.data;
    },
    liveAgregar: async (data) => {
        const response = await api.post(`${ENDPOINTS.INSCRIPCIONES.BASE}/live/agregar`, data);
        return response.data;
    },
    liveMoverPrueba: async (id, data) => {
        const response = await api.post(`${ENDPOINTS.INSCRIPCIONES.BASE}/live/${id}/mover-prueba`, data);
        return response.data;
    },
};

export default InscripcionService;
