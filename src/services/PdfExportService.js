import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Format TimeSpan string from backend to mm:ss.cc
const formatTime = (timeStr) => {
    if (!timeStr || timeStr === '') return '-';
    try {
        const parts = timeStr.split(':');
        if (parts.length === 3) {
            const [h, m, sFull] = parts;
            const [s, ms] = sFull.split('.');
            const msShort = (ms || '00').substring(0, 2);
            const totalMin = parseInt(h) * 60 + parseInt(m);
            return `${String(totalMin).padStart(2, '0')}:${s.padStart(2, '0')}.${msShort}`;
        }
    } catch {}
    return timeStr;
};

const buildFaseTable = (doc, fase, yPos, showEtapa = true) => {
    // Section title
    if (showEtapa) {
        doc.setFontSize(11);
        doc.setTextColor(100, 180, 255);
        doc.text(fase.nombreFase, 14, yPos);
        yPos += 6;
    }

    const rows = [...fase.resultados]
        .sort((a, b) => (a.posicion || 99) - (b.posicion || 99) || (a.carril || 99) - (b.carril || 99))
        .map(r => [
            r.posicion || '-',
            r.carril || '-',
            r.participanteNombre || '-',
            r.clubNombre || r.clubSigla || '-',
            formatTime(r.tiempoOficial),
        ]);

    autoTable(doc, {
        startY: yPos,
        head: [['Pos.', 'Carril', 'Atleta / Tripulación', 'Club', 'Tiempo']],
        body: rows,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [30, 50, 90], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [240, 244, 255] },
        columnStyles: {
            0: { halign: 'center', cellWidth: 18 },
            1: { halign: 'center', cellWidth: 18 },
            4: { halign: 'center', cellWidth: 30, font: 'courier' },
        },
        margin: { left: 14, right: 14 },
    });

    return doc.lastAutoTable.finalY + 8;
};

const addHeader = (doc, pruebaNombre, eventoNombre, subtitulo) => {
    // Logo / Brand
    doc.setFillColor(18, 26, 48);
    doc.rect(0, 0, 210, 28, 'F');
    doc.setTextColor(100, 180, 255);
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('SportTrack', 14, 14);
    doc.setFontSize(9);
    doc.setTextColor(180, 200, 240);
    doc.setFont(undefined, 'normal');
    doc.text('Sistema de Gestión de Regattas', 14, 20);

    // Event info
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(eventoNombre || 'Evento', 14, 38);
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(pruebaNombre || '', 14, 45);
    if (subtitulo) {
        doc.setFontSize(10);
        doc.setTextColor(120, 120, 120);
        doc.text(subtitulo, 14, 51);
    }

    // Date stamp
    const dateStr = new Date().toLocaleString('es-AR');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generado: ${dateStr}`, 196, 10, { align: 'right' });

    // Divider
    doc.setDrawColor(100, 180, 255);
    doc.setLineWidth(0.5);
    doc.line(14, 54, 196, 54);

    return 62; // startY for content
};

const PdfExportService = {
    /**
     * Export a single fase
     */
    exportFase: (fase, eventoNombre, pruebaNombre) => {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        let y = addHeader(doc, pruebaNombre, eventoNombre, `Resultados: ${fase.nombreFase}`);
        buildFaseTable(doc, fase, y);
        doc.save(`${eventoNombre}_${fase.nombreFase}.pdf`.replace(/\s+/g, '_'));
    },

    /**
     * Export a group of fases (e.g. all heats, or all semis)
     */
    exportGrupo: (fases, eventoNombre, pruebaNombre, grupoLabel) => {
        if (!fases || fases.length === 0) return;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        let y = addHeader(doc, pruebaNombre, eventoNombre, grupoLabel);

        fases.forEach((fase, idx) => {
            if (idx > 0) {
                doc.addPage();
                y = 20;
            }
            doc.setFontSize(13);
            doc.setTextColor(100, 180, 255);
            doc.setFont(undefined, 'bold');
            doc.text(fase.nombreFase, 14, y);
            doc.setFont(undefined, 'normal');
            y += 7;
            y = buildFaseTable(doc, fase, y, false);
        });

        doc.save(`${eventoNombre}_${grupoLabel}.pdf`.replace(/\s+/g, '_'));
    },

    /**
     * Export all fases of a prueba in one document
     */
    exportPrueba: (fases, eventoNombre, pruebaNombre) => {
        if (!fases || fases.length === 0) return;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        let y = addHeader(doc, pruebaNombre, eventoNombre, 'Resultados Completos');

        // Group by etapa
        const grouped = fases.reduce((acc, f) => {
            const g = f.etapaNombre || f.EtapaNombre || 'Competencia';
            if (!acc[g]) acc[g] = [];
            acc[g].push(f);
            return acc;
        }, {});

        let firstSection = true;
        Object.entries(grouped).forEach(([etapa, fasesGrupo]) => {
            if (!firstSection) { doc.addPage(); y = 20; }
            firstSection = false;

            // Etapa header
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(60, 60, 60);
            doc.text(etapa.toUpperCase(), 14, y);
            doc.setFont(undefined, 'normal');
            y += 7;

            fasesGrupo.forEach((fase) => {
                doc.setFontSize(11);
                doc.setTextColor(100, 180, 255);
                doc.text(fase.nombreFase, 14, y);
                y += 5;
                y = buildFaseTable(doc, fase, y, false);
                if (y > 260) { doc.addPage(); y = 20; }
            });
        });

        doc.save(`${eventoNombre}_${pruebaNombre}_Completo.pdf`.replace(/\s+/g, '_'));
    },
};

export default PdfExportService;
