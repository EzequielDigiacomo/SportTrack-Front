import api from './api';

const MessageService = {
    getHilos: async (campanaId = null) => {
        const params = campanaId != null ? { campanaId } : undefined;
        const response = await api.get('/mensajes/hilos', { params });
        return response.data;
    },

    getHilo: async (hiloId) => {
        const response = await api.get(`/mensajes/hilos/${hiloId}`);
        return response.data;
    },

    crearHilo: async ({ destinatarioId, asunto, cuerpo }) => {
        const response = await api.post('/mensajes/hilos', {
            destinatarioId,
            asunto,
            cuerpo,
        });
        return response.data;
    },

    enviarMasivo: async ({ asunto, cuerpo, destinatarioIds }) => {
        const response = await api.post('/mensajes/hilos/masivo', {
            asunto,
            cuerpo,
            destinatarioIds,
        });
        return response.data;
    },

    getCampanas: async () => {
        const response = await api.get('/mensajes/campanas');
        return response.data;
    },

    getCampana: async (campanaId) => {
        const response = await api.get(`/mensajes/campanas/${campanaId}`);
        return response.data;
    },

    responderHilo: async (hiloId, cuerpo) => {
        const response = await api.post(`/mensajes/hilos/${hiloId}/responder`, { cuerpo });
        return response.data;
    },

    marcarLeido: async (hiloId) => {
        const response = await api.patch(`/mensajes/hilos/${hiloId}/leer`);
        return response.data;
    },

    getNoLeidosCount: async () => {
        const response = await api.get('/mensajes/no-leidos/count');
        return response.data;
    },
};

export default MessageService;
