import api from './api';
import { ENDPOINTS } from '../utils/constants';

const CategoriaService = {
  getAll: async () => {
    const response = await api.get(ENDPOINTS.CATEGORIAS);
    return response.data;
  }
};

const BoteService = {
  getAll: async () => {
    const response = await api.get(ENDPOINTS.BOTES);
    return response.data;
  }
};

const DistanciaService = {
  getAll: async () => {
    const response = await api.get(ENDPOINTS.DISTANCIAS);
    return response.data;
  }
};

const PruebaService = {
  getAll: async () => {
    const response = await api.get('/pruebas');
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/pruebas', data);
    return response.data;
  },
  // Asignar prueba a evento
  assignToEvento: async (eventoId, pruebaId, data = {}) => {
    const response = await api.post(`/eventos/${eventoId}/pruebas`, {
      pruebaId,
      ...data
    });
    return response.data;
  },
  updateAssign: async (assignId, data) => {
    const response = await api.put(`/eventos/pruebas/${assignId}`, data);
    return response.data;
  },
  deleteAssign: async (assignId) => {
    const response = await api.delete(`/eventos/pruebas/${assignId}`);
    return response.data;
  },
  getByEvento: async (eventoId) => {
    const response = await api.get(`/eventos/${eventoId}/pruebas`);
    return response.data;
  }
};

export { CategoriaService, BoteService, DistanciaService, PruebaService };
