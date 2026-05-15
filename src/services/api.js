import axios from 'axios'
import { API_BASE_URL, STORAGE_KEYS } from '../utils/constants'

// Create axios instance
const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
})

// Interceptor de solicitud - El navegador enviará las cookies automáticamente
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
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
            localStorage.removeItem(STORAGE_KEYS.USER_DATA)
            // Podríamos redirigir al login aquí si fuera necesario
            return Promise.reject(error)
        }

        // Handle other errors
        const errorMessage = error.response?.data?.message || error.message || 'Error desconocido'

        console.error('API Error:', error.response?.data || error.message);

        console.error('API Context:', {
            status: error.response?.status,
            message: errorMessage,
            url: error.config?.url,
        })

        return Promise.reject({
            status: error.response?.status,
            message: errorMessage,
            data: error.response?.data,
        })
    }
)

export default api
