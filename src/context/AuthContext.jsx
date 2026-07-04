import React, { createContext, useState, useContext, useEffect } from 'react';
import { STORAGE_KEYS } from '../utils/constants';
import AuthService from '../services/AuthService';
import timingSignalRService from '../services/TimingSignalRService';

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

                // /auth/me no devuelve plan; lo restauramos del localStorage si existe
                const stored = localStorage.getItem(STORAGE_KEYS.USER_DATA);
                if (stored) {
                    try {
                        const storedUser = JSON.parse(stored);
                        if (storedUser.plan) normalized.plan = storedUser.plan;
                    } catch (_) { /* ignorar */ }
                }

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
        
        // Guardamos tanto el usuario como el token para compatibilidad total (especialmente móviles)
        localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(normalized));
        if (token) {
            localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
        }
    };

    const logout = async () => {
        try {
            timingSignalRService.disconnect();
        } catch (e) {
            console.error("Error al desconectar SignalR en el cierre de sesión", e);
        }

        // Limpiamos el estado local INMEDIATAMENTE
        setUser(null);
        localStorage.removeItem(STORAGE_KEYS.USER_DATA);
        localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);

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
