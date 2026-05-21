import api from './api';

const PagoService = {
    getHistorial: async () => {
        const response = await api.get('/pagos/historial');
        return response.data;
    },

    registrarPago: async (pagoData) => {
        const response = await api.post('/pagos/registrar', pagoData);
        return response.data;
    },

    toggleClubStatus: async (clubId, alDia) => {
        const response = await api.put(`/pagos/clubes/${clubId}/toggle`, alDia);
        return response.data;
    },

    toggleAtletaStatus: async (atletaId, alDia) => {
        const response = await api.put(`/pagos/atletas/${atletaId}/toggle`, alDia);
        return response.data;
    },

    toggleInscripcionStatus: async (inscripcionId, pagado) => {
        const response = await api.put(`/pagos/inscripciones/${inscripcionId}/toggle`, pagado);
        return response.data;
    },
};

export default PagoService;
