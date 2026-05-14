import React, { createContext, useState, useContext, useEffect } from 'react';
import { STORAGE_KEYS } from '../utils/constants';
import AuthService from '../services/AuthService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkSession = async () => {
            try {
                // Intentamos validar la sesión contra el servidor (usa la Cookie HttpOnly)
                const userData = await AuthService.validateSession();
                const normalized = normalizeUser(userData);
                setUser(normalized);
                localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(normalized));
            } catch (e) {
                // Si falla (401), limpiamos cualquier rastro local
                setUser(null);
                localStorage.removeItem(STORAGE_KEYS.USER_DATA);
            } finally {
                setLoading(false);
            }
        };

        checkSession();
    }, []);

    const normalizeUser = (data) => {
        if (!data) return null;
        return {
            ...data,
            rol: data.rol || data.Rol || data.role || data.Role || ''
        };
    };

    const login = (userData, token) => {
        const normalized = normalizeUser(userData);
        setUser(normalized);
        // El token ya no se guarda en localStorage por seguridad (usamos HttpOnly Cookies)
        localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(normalized));
    };

    const logout = async () => {
        // Limpiamos el estado local INMEDIATAMENTE para evitar flashes de contenido protegido
        setUser(null);
        localStorage.removeItem(STORAGE_KEYS.USER_DATA);

        try {
            await AuthService.logout();
        } catch (e) {
            console.error("Error al cerrar sesión en el servidor", e);
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
