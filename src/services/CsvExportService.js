/**
 * Utility to export race results to CSV format.
 * Optimized for Excel and general purpose data analysis.
 */
const CsvExportService = {
    /**
     * Exports a group of phases to a single CSV file.
     * @param {Array} fases - List of phase objects with results.
     * @param {string} eventoNombre - Name of the event.
     * @param {string} pruebaNombre - Name of the specific race/category.
     */
    exportResultadosCsv: (fases, eventoNombre, pruebaNombre) => {
        if (!fases || fases.length === 0) return;

        // Definir encabezados
        const headers = [
            'Fase',
            'Posicion',
            'Carril',
            'Numero',
            'Atleta',
            'Tripulacion',
            'Club',
            'Tiempo',
            'Estado',
            'Viento',
            'Agua',
            'Observaciones Fase'
        ];

        const rows = [];

        fases.forEach(fase => {
            // Ordenar resultados por posición para que el CSV sea legible
            const sortedResults = [...fase.resultados].sort((a, b) => {
                if (a.posicion && b.posicion) return a.posicion - b.posicion;
                if (a.posicion) return -1;
                if (b.posicion) return 1;
                return (a.carril || 0) - (b.carril || 0);
            });
            
            sortedResults.forEach(r => {
                // Formatear tripulación si existe
                const crew = r.tripulantes?.length > 0 
                    ? r.tripulantes.map(t => t.participanteNombreCompleto).join(' / ')
                    : '';

                rows.push([
                    fase.nombreFase,
                    r.posicion || '-',
                    r.carril || '-',
                    r.numeroCompetidor || '-',
                    r.participanteNombre || '-',
                    crew,
                    r.clubNombre || r.clubSigla || '-',
                    r.tiempoOficial || '-',
                    r.estado || 'Pendiente',
                    fase.viento || '-',
                    fase.agua || '-',
                    (fase.observaciones || '').replace(/\n/g, ' ')
                ]);
            });
        });

        // Generar contenido CSV (usando punto y coma como separador para mejor compatibilidad con Excel en regiones latinas)
        const csvContent = [
            headers.join(';'),
            ...rows.map(row => row.map(cell => {
                const safeCell = String(cell).replace(/"/g, '""');
                return `"${safeCell}"`;
            }).join(';'))
        ].join('\n');

        // Agregar BOM para que Excel detecte UTF-8 correctamente
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        const fileName = `${eventoNombre}_${pruebaNombre}_Resultados.csv`.replace(/\s+/g, '_');
        
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log(`[Export] CSV exported: ${fileName}`);
    }
};

export default CsvExportService;
