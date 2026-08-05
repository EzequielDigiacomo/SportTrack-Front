import api from './api';

const parseFilename = (disposition, fallback) => {
    let filename = fallback;
    if (disposition && disposition.includes('filename=')) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
        if (matches != null && matches[1]) {
            filename = matches[1].replace(/['"]/g, '');
        }
    }
    return filename;
};

const triggerBlobDownload = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
};

const BackupService = {
    downloadDatabase: async ({ scope = 'full', idFederacion } = {}) => {
        const params = { scope };
        if (scope === 'federacion' && idFederacion) {
            params.idFederacion = idFederacion;
        }

        const response = await api.get('/backup/download', {
            params,
            responseType: 'blob',
            timeout: 300000,
        });

        // Si el backend devolvió JSON de error empaquetado como blob
        const contentType = response.headers['content-type'] || '';
        if (contentType.includes('application/json')) {
            const text = await response.data.text?.() ?? await new Response(response.data).text();
            let message = 'Error al generar el backup';
            try {
                message = JSON.parse(text).message || message;
            } catch {
                /* ignore */
            }
            throw new Error(message);
        }

        const fallback =
            scope === 'federacion'
                ? `backup_federacion_${idFederacion}_${new Date().toISOString().slice(0, 10)}.sql`
                : `backup_full_${new Date().toISOString().slice(0, 10)}.sql`;

        const filename = parseFilename(response.headers['content-disposition'], fallback);
        triggerBlobDownload(new Blob([response.data]), filename);
        return filename;
    },

    getHistory: async (limit = 50) => {
        const response = await api.get('/backup/history', { params: { limit } });
        return response.data || [];
    },
};

export default BackupService;
