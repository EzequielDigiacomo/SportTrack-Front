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

const newGrupoId = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `g-${Date.now()}-${Math.random().toString(16).slice(2)}`;

/** Crea el producto cartesiano cat × bote × sexo vía POST /pruebas (API sin /largada). */
const assignLargadaFallback = async (eventoId, data) => {
  const grupoId = data.grupoLargadaId && !String(data.grupoLargadaId).startsWith('synth:')
    ? data.grupoLargadaId
    : newGrupoId();

  const results = [];
  for (const categoriaId of data.categoriaIds || []) {
    for (const boteId of data.boteIds || []) {
      for (const sexoId of data.sexoIds || []) {
        const created = await api.post(`/eventos/${eventoId}/pruebas`, {
          categoriaId,
          boteId,
          distanciaId: data.distanciaId,
          sexoId,
          fechaHora: data.fechaHora,
          grupoLargadaId: grupoId,
        });
        results.push(created.data);
      }
    }
  }
  return results;
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
  assignToEvento: async (eventoId, pruebaId, data = {}) => {
    const response = await api.post(`/eventos/${eventoId}/pruebas`, {
      pruebaId,
      ...data
    });
    return response.data;
  },
  /**
   * Largada Maratón. Usa /pruebas/largada si existe; si la API remota aún no la tiene (404),
   * crea cada combinación con POST /pruebas.
   */
  assignLargada: async (eventoId, data) => {
    try {
      const response = await api.post(`/eventos/${eventoId}/pruebas/largada`, data);
      return response.data;
    } catch (err) {
      const status = err?.response?.status || err?.status;
      if (status !== 404) throw err;
      return assignLargadaFallback(eventoId, data);
    }
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
