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

    logout: async () => {
        // En JWT el logout es local (borrar tokens), el servidor no necesita un endpoint.
        return Promise.resolve({ message: 'Sesión cerrada localmente' });
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
