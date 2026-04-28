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

// Request interceptor - Add auth token to requests
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

        // Handle 401 Unauthorized - Token expired
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true

            const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
            if (refreshToken) {
                try {
                    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
                        refreshToken,
                    })

                    const { token } = response.data
                    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token)

                    // Retry original request
                    originalRequest.headers.Authorization = `Bearer ${token}`
                    return api(originalRequest)
                } catch (refreshError) {
                    // Refresh failed
                    console.error('Refresh token failed', refreshError)
                }
            }

            // If we reach here, either there was no refresh token or refresh failed
            localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN)
            localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)
            localStorage.removeItem(STORAGE_KEYS.USER_DATA)
            
            if (window.location.pathname !== '/login') {
                window.location.href = '/login'
            }
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
