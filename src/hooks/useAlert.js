import { useCallback } from 'react';
import { useToast } from '../context/ToastContext';

/**
 * Hook for managing temporary alert messages (Refactored to use global Toasts)
 */
export const useAlert = () => {
    const { addToast } = useToast();

    const showAlert = useCallback((type, text) => {
        addToast(type, text);
    }, [addToast]);

    // Returning empty alert and hideAlert for compatibility, but they are no longer needed
    return {
        alert: null, 
        showAlert,
        hideAlert: () => {}
    };
};
