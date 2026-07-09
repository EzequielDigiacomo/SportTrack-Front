import api from './api';

const MessageService = {
    getHilos: async () => {
        const response = await api.get('/mensajes/hilos');
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

    responderHilo: async (hiloId, cuerpo) => {
        const response = await api.post(`/mensajes/hilos/${hiloId}/responder`, { cuerpo });
        return response.data;
    },

    marcarLeido: async (hiloId) => {
        const response = await api.patch(`/mensajes/hilos/${hiloId}/leer`);
        return response.data;
    },
};

export default MessageService;
