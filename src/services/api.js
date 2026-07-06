import axios from 'axios'
import { API_BASE_URL, STORAGE_KEYS } from '../utils/constants'

// Create axios instance
const CLIENT_APP = 'sporttrack';

const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
        'X-Client-App': CLIENT_APP,
    },
})

const getStoredAuthToken = () => {
    const direct = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (direct) return direct;

    try {
        const userData = localStorage.getItem(STORAGE_KEYS.USER_DATA);
        if (!userData) return null;
        const parsed = JSON.parse(userData);
        return parsed?.token || parsed?.Token || null;
    } catch {
        return null;
    }
};

// Interceptor de solicitud - Bearer en header (cookie cross-origin puede fallar)
api.interceptors.request.use(
    (config) => {
        const token = getStoredAuthToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor - Handle errors globally
api.interceptors.response.use(
    (response) => {
        return response
    },
    async (error) => {
        const originalRequest = error.config

        // Manejar 401 No autorizado (Sesión expirada)
        if (error.response?.status === 401) {
            localStorage.removeItem(STORAGE_KEYS.USER_DATA);
            localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
            return Promise.reject(error);
        }

        // Handle other errors
        const errorMessage = error.response?.data?.message || error.message || 'Error desconocido'

        console.error('API Error:', error.response?.data || error.message);

        const baseURL = error.config?.baseURL || API_BASE_URL;
        const fullUrl = `${baseURL || ''}${error.config?.url || ''}`;

        console.error('API Context:', {
            status: error.response?.status,
            message: errorMessage,
            url: error.config?.url,
            baseURL,
            fullUrl,
        })

        return Promise.reject({
            status: error.response?.status,
            message: errorMessage,
            data: error.response?.data,
        })
    }
)

export default api
