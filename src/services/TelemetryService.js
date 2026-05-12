import api from './api';

const TelemetryService = {
    init: () => {
        window.onerror = (message, source, lineno, colno, error) => {
            TelemetryService.reportError({
                message,
                url: source,
                stack: error?.stack,
                browserInfo: navigator.userAgent
            });
        };

        window.onunhandledrejection = (event) => {
            TelemetryService.reportError({
                message: 'Unhandled Promise Rejection: ' + event.reason,
                url: window.location.href,
                stack: event.reason?.stack,
                browserInfo: navigator.userAgent
            });
        };
    },

    reportError: async (errorData) => {
        try {
            // Usamos axios directamente para evitar interceptores si es necesario, 
            // pero 'api' ya está configurado.
            await api.post('/support/frontend-error', errorData);
        } catch (e) {
            // Si falla el reporte, no hacemos nada para evitar bucles infinitos
            console.error("Falla al enviar reporte de telemetría", e);
        }
    }
};

export default TelemetryService;
