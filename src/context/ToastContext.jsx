import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((arg1, arg2, duration = 4000) => {
        const known = ['success', 'error', 'warning', 'info'];
        let type;
        let message;
        if (known.includes(arg1) && typeof arg2 === 'string') {
            type = arg1;
            message = arg2;
        } else if (known.includes(arg2)) {
            // Convención usada en gran parte de la app: (mensaje, tipo)
            type = arg2;
            message = arg1;
        } else {
            type = 'info';
            message = typeof arg1 === 'string' ? arg1 : String(arg2 ?? '');
        }
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, type, message, duration }]);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ addToast, removeToast, toasts }}>
            {children}
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};
