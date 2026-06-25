import api from './api';

const BackupService = {
    downloadDatabase: async () => {
        // We use responseType 'blob' to handle binary/file data correctly
        const response = await api.get('/backup/download', {
            responseType: 'blob',
        });
        
        // Extract filename from the Content-Disposition header if possible
        let filename = `backup_${new Date().toISOString().slice(0, 10)}.sql`;
        const disposition = response.headers['content-disposition'];
        if (disposition && disposition.includes('filename=')) {
            const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
            if (matches != null && matches[1]) {
                filename = matches[1].replace(/['"]/g, '');
            }
        }

        // Create a blob from the response and trigger download
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        
        // Cleanup
        link.parentNode.removeChild(link);
        window.URL.revokeObjectURL(url);
    }
};

export default BackupService;
