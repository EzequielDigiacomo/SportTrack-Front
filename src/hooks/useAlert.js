import { useState, useCallback, useEffect } from 'react';

/**
 * Hook for managing temporary alert messages
 * @param {number} duration - Time in ms before the message disappears
 */
export const useAlert = (duration = 4000) => {
    const [alert, setAlert] = useState(null);

    const showAlert = useCallback((type, text) => {
        setAlert({ type, text });
    }, []);

    const hideAlert = useCallback(() => {
        setAlert(null);
    }, []);

    useEffect(() => {
        if (alert) {
            const timer = setTimeout(() => {
                setAlert(null);
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [alert, duration]);

    return {
        alert,
        showAlert,
        hideAlert
    };
};
