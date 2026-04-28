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
                setUser(userData);
                localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
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

    const login = (userData, token) => {
        setUser(userData);
        if (token) {
            localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
        }
        localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
    };

    const logout = async () => {
        try {
            await AuthService.logout();
        } catch (e) {
            console.error("Error al cerrar sesión en el servidor", e);
        } finally {
            setUser(null);
            localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
            localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
            localStorage.removeItem(STORAGE_KEYS.USER_DATA);
            window.location.href = '/login';
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
