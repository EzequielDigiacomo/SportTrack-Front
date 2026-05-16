import api from './api';
import { ENDPOINTS, STORAGE_KEYS } from '../utils/constants';

const AuthService = {
    login: async (credentials) => {
        const response = await api.post(ENDPOINTS.AUTH.LOGIN, credentials);
        return response.data;
    },

    register: async (userData) => {
        const response = await api.post(ENDPOINTS.AUTH.REGISTER, userData);
        return response.data;
    },

    getUsuarios: async () => {
        const response = await api.get('/auth/usuarios');
        return response.data;
    },

    updatePassword: async (id, newPassword) => {
        const response = await api.put(`/auth/usuarios/${id}/password`, `"${newPassword}"`, {
            headers: { 'Content-Type': 'application/json' }
        });
        return response.data;
    },

    toggleActivo: async (id) => {
        const response = await api.patch(`/auth/usuarios/${id}/toggle-activo`);
        return response.data;
    },

    logout: async () => {
        try {
            const response = await api.post('/auth/logout');
            return response.data;
        } catch (error) {
            console.error("Error on backend logout", error);
            return { message: 'Sesión cerrada localmente (fallo servidor)' };
        }
    },

    validateSession: async () => {
        const response = await api.get('/auth/me');
        return response.data;
    },

    getCurrentUser: () => {
        const userData = localStorage.getItem(STORAGE_KEYS.USER_DATA);
        return userData ? JSON.parse(userData) : null;
    }
};

export default AuthService;
