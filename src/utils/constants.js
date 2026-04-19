// API Base URL - El proxy de Vite redirige /api → http://localhost:5029/api
export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'
console.log('--- DEBUG INFO ---');
console.log('API_BASE_URL:', API_BASE_URL);
console.log('--- END DEBUG ---');

// API Endpoints
export const ENDPOINTS = {
    // Auth
    AUTH: {
        LOGIN: '/auth/login',
        REGISTER: '/auth/register',
    },

    // Participantes (Atletas)
    PARTICIPANTES: {
        BASE: '/participantes',
        BY_CLUB: (clubId) => `/participantes/club/${clubId}`,
    },

    // Clubes
    CLUBES: '/clubes',

    // Eventos
    EVENTOS: {
        BASE: '/eventos',
        PROXIMOS: '/eventos/proximos',
    },

    // Inscripciones
    INSCRIPCIONES: {
        BASE: '/inscripciones',
        BY_EVENTO_PRUEBA: (id) => `/inscripciones/evento-prueba/${id}`,
    },

    // Fases
    FASES: {
        BASE: '/fases',
        BY_EVENTO_PRUEBA: (id) => `/fases/EventoPrueba/${id}`,
        GENERAR: (id) => `/fases/Generar/${id}`,
        PROMOVER: (id) => `/fases/Promover/${id}`,
    },

    // Resultados
    RESULTADOS: {
        BATCH_UPDATE: '/resultados/BatchUpdate',
        BY_FASE: (id) => `/resultados/Fase/${id}`,
    },

    // Catalogos
    BOTES: '/botes',
    CATEGORIAS: '/categorias',
    DISTANCIAS: '/distancias',
}

// Application Constants
export const APP_NAME = 'SportTrack'
export const APP_VERSION = '1.0.0'

// Pagination
export const DEFAULT_PAGE_SIZE = 20
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

// Local Storage Keys
export const STORAGE_KEYS = {
    AUTH_TOKEN: 'sporttrack_auth_token',
    REFRESH_TOKEN: 'sporttrack_refresh_token',
    USER_DATA: 'sporttrack_user_data',
    THEME: 'sporttrack_theme',
}
