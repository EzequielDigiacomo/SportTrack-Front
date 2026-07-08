import api from './api';
import { ENDPOINTS, STORAGE_KEYS } from '../utils/constants';

const AuthService = {
    login: async (credentials) => {
        const response = await api.post(ENDPOINTS.AUTH.LOGIN, credentials);
        return response.data;
    },

    register: async (userData) => {
        const clubId = userData.clubId != null && userData.clubId !== ''
            ? parseInt(userData.clubId, 10)
            : null;
        const federacionId = userData.federacionId != null && userData.federacionId !== ''
            ? parseInt(userData.federacionId, 10)
            : null;
        const rolFederacion = userData.rolFederacion || userData.rol || 'Club';

        if (String(rolFederacion).toLowerCase() === 'club' && (!clubId || Number.isNaN(clubId))) {
            throw new Error('Un login de club debe estar vinculado a un club.');
        }

        const payload = {
            username: userData.username,
            password: userData.password,
            email: userData.email,
            telefono: userData.telefono,
            nombre: userData.nombre,
            apellido: userData.apellido,
            dni: userData.dni,
            clubId: clubId && !Number.isNaN(clubId) ? clubId : null,
            federacionId: federacionId && !Number.isNaN(federacionId) ? federacionId : null,
            rolFederacion,
        };
        const response = await api.post(ENDPOINTS.AUTH.REGISTER, payload);
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

    updatePerfil: async (id, data) => {
        const response = await api.put(`/auth/usuarios/${id}/perfil`, data);
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
