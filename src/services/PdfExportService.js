import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Lookup tables ────────────────────────────────────────────────────────────
const CATEGORIA_NAMES = {
    1: 'Pre-infantil (8-10 años)', 2: 'Infantil (11-12 años)', 3: 'Menor (13-14 años)',
    4: 'Cadete (14-15 años)', 5: 'Junior (16-17 años)', 6: 'Sub-23 (18-22 años)',
    7: 'Senior (18-35 años)', 8: 'Master A (40-45 años)', 9: 'Master B (46-50 años)',
    10: 'Master C (50+ años)'
};
const BOTE_NAMES     = { 1: 'K1', 2: 'K2', 3: 'K4', 4: 'C1', 5: 'C2', 6: 'C4' };
const DISTANCIA_NAMES = {
    1: '200m', 2: '350m', 3: '400m', 4: '450m', 5: '500m',
    6: '1000m', 7: '1500m', 8: '2000m', 9: '3000m', 10: '5000m',
    11: '10000m', 12: '12000m', 13: '15000m', 14: '18000m', 15: '22000m', 16: '30000m'
};
const SEXO_NAMES = { 1: 'Masculino', 2: 'Femenino', 3: 'Mixto' };

// ─── Formatters ───────────────────────────────────────────────────────────────
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

const getPruebaInfo = (faseOrPrueba) => {
    // Works with a fase object (from cronograma) or a plain prueba object
    const p = faseOrPrueba?.prueba?.prueba || faseOrPrueba?.prueba || faseOrPrueba;
    if (!p) return '';
    const cat  = CATEGORIA_NAMES[p.categoria?.id]   || p.categoria?.nombre  || '';
    const bot  = BOTE_NAMES[p.bote?.id]             || p.bote?.nombre       || '';
    const dist = DISTANCIA_NAMES[p.distancia?.id]   || (p.distancia?.metros ? `${p.distancia.metros}m` : '');
    const sex  = SEXO_NAMES[p.sexoId || p.sexo?.id] || p.sexoNombre         || '';
    return [cat, bot, dist, sex].filter(Boolean).join('  ·  ');
};

const getTimeStr = (fase) => {
    if (fase?.fechaHoraProgramada?.includes('T'))
        return fase.fechaHoraProgramada.split('T')[1].substring(0, 5);
    return '--:--';
};

const getCrew = (r) => {
    if (r.tripulantes?.length > 0)
        return [r.participanteNombre, ...r.tripulantes.map(t => t.participanteNombreCompleto || t.participanteNombre)].join(' / ');
    return r.participanteNombre || '-';
};

// ─── Shared layout constants ──────────────────────────────────────────────────
const PW       = 210;   // A4 portrait width mm
const PH       = 297;   // A4 portrait height mm
const MARGIN   = 10;    // left/right page margin
const BAND_H   = 12;    // top header band height
const FOOTER_H = 5;     // bottom footer area
const GRID_W   = PW - MARGIN * 2;  // 190mm usable width

// ─── Shared drawing helpers ───────────────────────────────────────────────────

/** Dark header band across the top of each page */
const drawBand = (doc, title, subtitle, pageNum, totalPages) => {
    doc.setFillColor(35, 35, 35);
    doc.rect(0, 0, PW, BAND_H, 'F');
    doc.setFontSize(10); doc.setFont(undefined, 'bold'); doc.setTextColor(255, 255, 255);
    doc.text('SportTrack', MARGIN, BAND_H - 3.5);
    doc.setFontSize(7.5); doc.setFont(undefined, 'normal'); doc.setTextColor(210, 210, 210);
    doc.text(`${title}${subtitle ? '  —  ' + subtitle : ''}`, MARGIN + 28, BAND_H - 3.5);
    doc.setFontSize(6.5); doc.setTextColor(170, 170, 170);
    doc.text(
        `${new Date().toLocaleString('es-AR')}   ·   Pág. ${pageNum}/${totalPages}`,
        PW - MARGIN, BAND_H - 3.5, { align: 'right' }
    );
};

/** Small footer text */
const drawFooter = (doc, eventoNombre) => {
    doc.setFontSize(6); doc.setTextColor(150, 150, 150); doc.setFont(undefined, 'normal');
    doc.text(`SportTrack · ${eventoNombre}`, PW / 2, PH - 2, { align: 'center' });
};

/** Dashed horizontal rule between stacked grids */
const drawSeparator = (doc, y) => {
    doc.setDrawColor(190, 190, 190); doc.setLineWidth(0.15);
    doc.setLineDashPattern([1.5, 1.5], 0);
    doc.line(MARGIN, y, PW - MARGIN, y);
    doc.setLineDashPattern([], 0);
};

/** Two-line grid title block (bold line + gray sub-line + thin rule) */
const drawGridTitle = (doc, line1, line2, y) => {
    doc.setFontSize(8.5); doc.setFont(undefined, 'bold'); doc.setTextColor(0, 0, 0);
    doc.text(line1, MARGIN, y + 4.5);
    doc.setFontSize(6.5); doc.setFont(undefined, 'normal'); doc.setTextColor(80, 80, 80);
    if (line2) doc.text(line2, MARGIN, y + 9);
    doc.setDrawColor(80, 80, 80); doc.setLineWidth(0.25);
    doc.line(MARGIN, y + 10.5, PW - MARGIN, y + 10.5);
};

/** Shared autoTable styles for B&W printing */
const tableStyles = (isResults = false) => ({
    theme: 'plain',
    styles: {
        fontSize: 8,
        cellPadding: { top: 1, bottom: 1, left: 2, right: 1 },
        overflow: 'ellipsize',
        textColor: [10, 10, 10],
        lineColor: [170, 170, 170],
        lineWidth: 0.15,
    },
    headStyles: {
        fillColor: [220, 220, 220],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 7,
        cellPadding: { top: 1.2, bottom: 1.2, left: 2, right: 1 },
        lineColor: [110, 110, 110],
        lineWidth: 0.2,
    },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    columnStyles: isResults
        ? {
            0: { halign: 'center', cellWidth: 12, fontStyle: 'bold' }, // Pos
            1: { halign: 'center', cellWidth: 14 },                     // Carril
            4: { halign: 'center', cellWidth: 28, fontStyle: 'bold' },  // Tiempo
          }
        : {
            0: { halign: 'center', cellWidth: 12, fontStyle: 'bold' }, // Carril
            2: { cellWidth: 50 },                                        // Club
          },
    tableWidth: GRID_W,
    margin: { left: MARGIN, right: MARGIN },
});

// ─── Build rows ───────────────────────────────────────────────────────────────

/** Start list rows: [carril, atleta, club] sorted by carril */
const buildStartRows = (fase) => {
    if (!fase.resultados?.length) return [['-', 'A definir', '-']];
    return [...fase.resultados]
        .sort((a, b) => (a.carril || 99) - (b.carril || 99))
        .map(r => [r.carril ?? '-', getCrew(r), r.clubNombre || r.clubSigla || '-']);
};

/** Result rows: [pos, carril, atleta, club, tiempo] sorted by position */
const buildResultRows = (fase) => {
    if (!fase.resultados?.length) return [['-', '-', 'Sin resultados', '-', '-']];
    return [...fase.resultados]
        .sort((a, b) => (a.posicion || 99) - (b.posicion || 99))
        .map(r => [
            r.posicion || '-',
            r.carril   || '-',
            getCrew(r),
            r.clubNombre || r.clubSigla || '-',
            formatTime(r.tiempoOficial),
        ]);
};

// ─── Dynamic flow renderer ────────────────────────────────────────────────────
/**
 * Estimates the height a grid will occupy (title + thead + rows).
 * Used to decide if a grid fits before rendering it.
 */
const estimateGridH = (fase, isResults) => {
    const nRows  = Math.max(fase.resultados?.length || 1, 1);
    const titleH = 12;   // 2 title lines + rule
    const headH  = 6;    // table header row
    const rowH   = 5;    // each data row (fontSize 8 + padding 2mm)
    return titleH + headH + nRows * rowH;
};

/**
 * Renders fases stacked vertically, flowing across as many pages as needed.
 * A grid is NEVER split — if it doesn't fit on the remaining space, a new page
 * is started.  mode: 'startList' | 'results'
 */
const renderStackedPages = (doc, fases, eventoNombre, docTitle, docSubtitle, mode = 'startList') => {
    const GRID_GAP   = 6;    // vertical gap between grids
    const CONTENT_TOP = BAND_H + MARGIN;
    const BOTTOM_LIMIT = PH - FOOTER_H - 4;
    const isResults  = mode === 'results';

    // ── First pass: count total pages (dry run, no drawing) ──────────────────
    let dryPage = 1, dryY = CONTENT_TOP;
    fases.forEach((fase) => {
        const h = estimateGridH(fase, isResults);
        if (dryY + h > BOTTOM_LIMIT && dryY > CONTENT_TOP) {
            dryPage++;
            dryY = CONTENT_TOP;
        }
        dryY += h + GRID_GAP;
    });
    const totalPages = dryPage;

    // ── Second pass: actually render ──────────────────────────────────────────
    let currentPage = 1;
    let currentY    = CONTENT_TOP;
    let globalIdx   = 0;    // sequential grid number across all pages
    let firstOnPage = true;

    const startNewPage = () => {
        drawFooter(doc, eventoNombre);
        doc.addPage();
        currentPage++;
        currentY   = CONTENT_TOP;
        firstOnPage = true;
        drawBand(doc, eventoNombre, `${docTitle}${docSubtitle ? ' · ' + docSubtitle : ''}`, currentPage, totalPages);
    };

    // Draw band for page 1
    drawBand(doc, eventoNombre, `${docTitle}${docSubtitle ? ' · ' + docSubtitle : ''}`, 1, totalPages);

    fases.forEach((fase) => {
        globalIdx++;
        const h = estimateGridH(fase, isResults);

        // If this grid doesn't fit, move to a new page
        if (!firstOnPage && currentY + h > BOTTOM_LIMIT) {
            startNewPage();
        }

        // Dashed separator between grids on the same page
        if (!firstOnPage) {
            drawSeparator(doc, currentY - GRID_GAP / 2);
        }
        firstOnPage = false;

        // Title block
        const timeStr    = getTimeStr(fase);
        const pruebaInfo = getPruebaInfo(fase);
        const line1      = `#${globalIdx}  ${timeStr} hs  —  ${fase.nombreFase}`;
        drawGridTitle(doc, line1, pruebaInfo, currentY);

        // Table
        const rows = isResults ? buildResultRows(fase) : buildStartRows(fase);
        const head = isResults
            ? [['Pos.', 'Carril', 'Atleta / Tripulación', 'Club', 'Tiempo']]
            : [['#', 'Atleta / Tripulación', 'Club']];

        autoTable(doc, {
            startY: currentY + 11,
            head,
            body: rows,
            ...tableStyles(isResults),
        });

        // Advance Y by the real table bottom (not the estimate)
        currentY = doc.lastAutoTable.finalY + GRID_GAP;
    });

    drawFooter(doc, eventoNombre);
};


// ─── Service ─────────────────────────────────────────────────────────────────
const PdfExportService = {

    /** Single fase — results format */
    exportFase: (fase, eventoNombre, pruebaNombre) => {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        renderStackedPages(doc, [fase], eventoNombre, pruebaNombre, fase.nombreFase, 'results', 4);
        doc.save(`${eventoNombre}_${fase.nombreFase}_Resultados.pdf`.replace(/\s+/g, '_'));
    },

    /** Group of fases (e.g. all heats) — results format */
    exportGrupo: (fases, eventoNombre, pruebaNombre, grupoLabel) => {
        if (!fases?.length) return;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        renderStackedPages(doc, fases, eventoNombre, pruebaNombre, grupoLabel, 'results', 4);
        doc.save(`${eventoNombre}_${grupoLabel}_Resultados.pdf`.replace(/\s+/g, '_'));
    },

    /** All fases of a prueba — results format */
    exportPrueba: (fases, eventoNombre, pruebaNombre) => {
        if (!fases?.length) return;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        renderStackedPages(doc, fases, eventoNombre, pruebaNombre, 'Resultados Completos', 'results', 4);
        doc.save(`${eventoNombre}_${pruebaNombre}_Completo.pdf`.replace(/\s+/g, '_'));
    },

    /** Full event start list — 4 grids per page, 1 column */
    exportCronogramaCompleto: (cronograma, eventoNombre) => {
        if (!cronograma?.length) return;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        renderStackedPages(doc, cronograma, eventoNombre, 'Start List', '', 'startList', 4);
        doc.save(`${eventoNombre}_StartList.pdf`.replace(/\s+/g, '_'));
    },

    /** Provisional program table (schedule overview — stays as a summary table) */
    exportProgramaInicial: (items, eventoNombre) => {
        if (!items?.length) return;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const totalPages = 1;
        drawBand(doc, eventoNombre, 'Programa Provisorio', 1, totalPages);

        const rows = items.map((it, idx) => {
            const isF = it.tipo === 'fase';
            const raw = it.raw;
            const p   = isF ? (raw.etapa?.eventoPrueba?.prueba || raw.prueba?.prueba || raw.prueba) : raw.prueba;

            const catId  = p?.categoriaId || p?.categoria?.id;
            const botId  = p?.boteId      || p?.bote?.id;
            const distId = p?.distanciaId || p?.distancia?.id;
            const sexId  = p?.sexoId      || p?.sexo?.id;

            const catName  = CATEGORIA_NAMES[catId]  || p?.categoria?.nombre || '-';
            const botName  = BOTE_NAMES[botId]        || p?.bote?.nombre     || '-';
            const distName = DISTANCIA_NAMES[distId]  || (p?.distancia?.metros ? `${p.distancia.metros}m` : '-');
            const sexName  = SEXO_NAMES[sexId]        || p?.sexoNombre       || '-';

            const inscritos = isF
                ? (raw.resultados?.length || 0)
                : (raw.inscripciones?.length || raw.inscriptosCount || 0);

            let timeStr = it.nuevaHora || '--:--';
            if (it.diaOffset > 0) timeStr += ` (Día ${it.diaOffset + 1})`;

            return [idx + 1, timeStr, catName, isF ? it.nombre : 'A Sortear', botName, distName, sexName, inscritos];
        });

        autoTable(doc, {
            startY: BAND_H + MARGIN,
            head: [['#', 'Hora', 'Categoría', 'Fase', 'Bote', 'Dist.', 'Rama', 'Ins.']],
            body: rows,
            ...tableStyles(false),
            columnStyles: {
                0: { halign: 'center', cellWidth: 10 },
                1: { halign: 'center', cellWidth: 22, fontStyle: 'bold' },
                7: { halign: 'center', cellWidth: 12 },
            },
            tableWidth: GRID_W,
            margin: { left: MARGIN, right: MARGIN },
        });

        drawFooter(doc, eventoNombre);
        doc.save(`${eventoNombre}_Programa_Provisorio.pdf`.replace(/\s+/g, '_'));
    },
};

export default PdfExportService;
