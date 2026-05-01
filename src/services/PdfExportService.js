import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const CATEGORIA_NAMES = {
    1: 'Pre-infantil (8-10 años)',
    2: 'Infantil (11-12 años)',
    3: 'Menor (13-14 años)',
    4: 'Cadete (14-15 años)',
    5: 'Junior (16-17 años)',
    6: 'Sub-23 (18-22 años)',
    7: 'Senior (18-35 años)',
    8: 'Master A (40-45 años)',
    9: 'Master B (46-50 años)',
    10: 'Master C (50+ años)'
};

const BOTE_NAMES = { 1: 'K1', 2: 'K2', 3: 'K4', 4: 'C1', 5: 'C2', 6: 'C4' };

const DISTANCIA_NAMES = {
    1: '200m', 2: '350m', 3: '400m', 4: '450m', 5: '500m',
    6: '1000m', 7: '1500m', 8: '2000m', 9: '3000m', 10: '5000m',
    11: '10000m', 12: '12000m', 13: '15000m', 14: '18000m', 15: '22000m', 16: '30000m'
};

const SEXO_NAMES = { 1: 'Masculino', 2: 'Femenino', 3: 'Mixto' };

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
    // Section title with Time
    if (showEtapa) {
        doc.setFontSize(11);
        doc.setTextColor(100, 180, 255);
        let timeStr = '';
        if (fase.fechaHoraProgramada && fase.fechaHoraProgramada.includes('T')) {
            timeStr = ` - ${fase.fechaHoraProgramada.split('T')[1].substring(0, 5)} hs`;
        }
        doc.text(`${fase.nombreFase}${timeStr}`, 14, yPos);
        yPos += 6;
    }

    const rows = (fase.resultados && fase.resultados.length > 0)
        ? [...fase.resultados]
            .sort((a, b) => (a.posicion || 99) - (b.posicion || 99) || (a.carril || 99) - (b.carril || 99))
            .map(r => {
                const crew = (r.tripulantes && r.tripulantes.length > 0)
                    ? [r.participanteNombre, ...r.tripulantes.map(t => t.participanteNombreCompleto || t.participanteNombre)].join(' - ')
                    : (r.participanteNombre || '-');
                
                return [
                    r.posicion || '-',
                    r.carril || '-',
                    crew,
                    r.clubNombre || r.clubSigla || '-',
                    formatTime(r.tiempoOficial),
                ];
            })
        : [['-', '-', 'A definir (según resultados previos)', '-', '-']];

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
                let timeStr = '';
                if (fase.fechaHoraProgramada && fase.fechaHoraProgramada.includes('T')) {
                    timeStr = ` - ${fase.fechaHoraProgramada.split('T')[1].substring(0, 5)} hs`;
                }
                doc.text(`${fase.nombreFase}${timeStr}`, 14, y);
                y += 5;
                y = buildFaseTable(doc, fase, y, false);
                if (y > 260) { doc.addPage(); y = 20; }
            });
        });

        doc.save(`${eventoNombre}_${pruebaNombre}_Completo.pdf`.replace(/\s+/g, '_'));
    },

    /**
     * Export all phases of an entire EVENT (the global schedule)
     */
    exportCronogramaCompleto: (cronograma, eventoNombre) => {
        if (!cronograma || cronograma.length === 0) return;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        
        // Header inicial
        let y = addHeader(doc, 'Cronograma General de Regatas', eventoNombre, 'Start List Consolidado');

        cronograma.forEach((fase, idx) => {
            // Verificar si necesitamos nueva página (si queda menos de 60mm de espacio)
            if (y > 230) {
                doc.addPage();
                y = 20;
            }

            // Encabezado de la Regata
            doc.setFontSize(11);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(18, 26, 48); // Azul oscuro
            
            // Extraer hora del string para evitar desfases de zona horaria
            let timeStr = '--:--';
            if (fase.fechaHoraProgramada && fase.fechaHoraProgramada.includes('T')) {
                timeStr = fase.fechaHoraProgramada.split('T')[1].substring(0, 5);
            }
            
            const p = fase.prueba?.prueba;
            const parts = [];
            if (p) {
                const catId = p.categoria?.id;
                const botId = p.bote?.id;
                const distId = p.distancia?.id;
                const sexId = p.sexoId || p.sexo?.id;

                const catName = CATEGORIA_NAMES[catId] || p.categoria?.nombre;
                const botName = BOTE_NAMES[botId] || p.bote?.nombre;
                const distName = DISTANCIA_NAMES[distId] || (p.distancia?.metros ? `${p.distancia.metros}m` : '');
                const sexName = SEXO_NAMES[sexId] || p.sexoNombre;
                
                if (catName) parts.push(catName);
                if (botName) parts.push(botName);
                if (distName) parts.push(distName);
                if (sexName) parts.push(sexName);
            }
            
            const pruebaInfo = parts.join(' - ');
            
            doc.text(`${timeStr} hs - ${fase.nombreFase} - ${pruebaInfo}`, 14, y);
            
            // Línea sutil debajo del título de la regata
            doc.setDrawColor(200, 200, 200);
            doc.line(14, y + 1, 196, y + 1);
            
            doc.setFont(undefined, 'normal');
            y += 6;

            // Tabla de inscriptos para esta regata
            y = buildFaseTable(doc, fase, y, false);
            y += 5; // Espacio entre regatas
        });

        doc.save(`${eventoNombre}_Cronograma_General.pdf`.replace(/\s+/g, '_'));
    },

    /**
     * Export the initial provisional program (mixed scheduled phases and unseeded proofs)
     */
    exportProgramaInicial: (items, eventoNombre) => {
        if (!items || items.length === 0) return;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        
        // Header inicial
        let y = addHeader(doc, 'Programa Provisorio de Regatas', eventoNombre, 'Cronograma Unificado');

        const rows = items.map((it, idx) => {
            const isF = it.tipo === 'fase';
            const raw = it.raw;
            const p = isF ? (raw.etapa?.eventoPrueba?.prueba || raw.prueba?.prueba || raw.prueba) : raw.prueba;
            
            const catId = p?.categoriaId || p?.categoria?.id;
            const botId = p?.boteId || p?.bote?.id;
            const distId = p?.distanciaId || p?.distancia?.id;
            const sexId = p?.sexoId || p?.sexo?.id;

            const catName = CATEGORIA_NAMES[catId] || p?.categoria?.nombre || '-';
            const botName = BOTE_NAMES[botId] || p?.bote?.nombre || '-';
            const distName = DISTANCIA_NAMES[distId] || (p?.distancia?.metros ? `${p.distancia.metros}m` : '-');
            const sexName = SEXO_NAMES[sexId] || p?.sexoNombre || '-';
            
            const inscritos = isF 
                ? (raw.resultados?.length || 0) 
                : (raw.inscripciones?.length || raw.inscriptosCount || 0);

            let timeStr = it.nuevaHora || '--:--';
            
            // Si el item tiene un offset de días, lo mostramos
            if (it.diaOffset > 0) {
                timeStr += ` (Día ${it.diaOffset + 1})`;
            }

            return [
                idx + 1,
                timeStr,
                catName,
                isF ? it.nombre : 'A Sortear',
                botName,
                distName,
                sexName,
                inscritos
            ];
        });

        autoTable(doc, {
            startY: y,
            head: [['#', 'Hora', 'Categoría', 'Fase', 'Bote', 'Dist.', 'Rama', 'Ins.']],
            body: rows,
            theme: 'grid',
            styles: { fontSize: 9, cellPadding: 3 },
            headStyles: { fillColor: [30, 50, 90], textColor: [255, 255, 255], fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [240, 244, 255] },
            columnStyles: {
                0: { halign: 'center', cellWidth: 10 },
                1: { halign: 'center', cellWidth: 25, font: 'courier', fontStyle: 'bold' },
                7: { halign: 'center', cellWidth: 15 },
            },
            margin: { left: 14, right: 14 },
        });

        doc.save(`${eventoNombre}_Programa_Provisorio.pdf`.replace(/\s+/g, '_'));
    },
};

export default PdfExportService;
