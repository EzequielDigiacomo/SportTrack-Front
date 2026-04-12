import api from './api';
import { ENDPOINTS } from '../utils/constants';

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

    getCurrentUser: () => {
        const userData = localStorage.getItem('sporttrack_user_data');
        return userData ? JSON.parse(userData) : null;
    }
};

export default AuthService;
