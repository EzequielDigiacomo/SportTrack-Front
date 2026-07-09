import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatRaceTime, isMeaningfulRaceTime } from '../utils/raceTimeUtils';
import { getPdfLogo, fitLogoDimensions } from '../utils/pdfLogoLoader';

// ─── Lookup tables ────────────────────────────────────────────────────────────
const CATEGORIA_NAMES = {
    1: 'Pre-infantil (8-10 años)', 2: 'Infantil (11-12 años)', 3: 'Menor (13-14 años)',
    4: 'Cadete (15-16 años)', 5: 'Junior (17-18 años)', 6: 'Sub-23 (19-23 años)',
    7: 'Senior (24-39 años)', 8: 'Master A (40-49 años)', 9: 'Master B (50-59 años)',
    10: 'Master C (60+ años)'
};
const BOTE_NAMES     = { 1: 'K1', 2: 'K2', 3: 'K4', 4: 'C1', 5: 'C2', 6: 'C4' };
const DISTANCIA_NAMES = {
    1: '200m', 2: '350m', 3: '400m', 4: '450m', 5: '500m',
    6: '1000m', 7: '1500m', 8: '2000m', 9: '3000m', 10: '5000m',
    11: '10000m', 12: '12000m', 13: '15000m', 14: '18000m', 15: '22000m', 16: '30000m'
};
const SEXO_NAMES = { 1: 'Masculino', 2: 'Femenino', 3: 'Mixto' };

// ─── Formatters ───────────────────────────────────────────────────────────────

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
    const val = fase?.fechaHoraProgramada;
    if (!val) return '--:--';
    const date = new Date(val);
    if (isNaN(date.getTime())) return '--:--';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const getSoloApellido = (nombreCompleto) => {
    if (!nombreCompleto) return "-";
    const parts = nombreCompleto.trim().split(' ');
    return parts[parts.length - 1];
};

const isBoteK4 = (fase) => {
    const p = fase?.prueba?.prueba || fase?.prueba || fase;
    if (!p) return false;
    const bote = p.bote;
    if (!bote) return false;
    if (bote.id === 3 || bote.id === 6) return true; // K4 or C4
    const name = bote.nombre || '';
    return name.toUpperCase().includes('4');
};

const getCrew = (r, fase) => {
    const mainName = r.participanteNombre;
    const trips = r.tripulantes || [];
    const names = trips.length > 0
        ? [mainName, ...trips.map(t => t.participanteNombreCompleto || t.participanteNombre)]
        : [mainName];

    if (isBoteK4(fase)) {
        return names.map(n => getSoloApellido(n)).join(' - ');
    } else {
        return names.join(' - ');
    }
};

// ─── Shared layout constants ──────────────────────────────────────────────────
const PW       = 210;   // A4 portrait width mm
const PH       = 297;   // A4 portrait height mm
const MARGIN   = 10;    // margen mínimo lateral
const BAND_H   = 24;    // top header band height (más alto)
const FOOTER_H = 5;     // bottom footer area
const TABLE_W  = 186;   // ancho de grilla (más grande, centrada)
const TABLE_MARGIN = (PW - TABLE_W) / 2;
const GRID_W   = TABLE_W;
const LOGO_MAX_H = 17;
const LOGO_MAX_W = 22;

const formatEventoFecha = (fecha, fechaFin) => {
    if (!fecha) return '';
    const opts = { day: '2-digit', month: '2-digit', year: 'numeric' };
    const d1 = new Date(fecha);
    if (Number.isNaN(d1.getTime())) return '';
    const s1 = d1.toLocaleDateString('es-AR', opts);
    if (fechaFin) {
        const d2 = new Date(fechaFin);
        if (!Number.isNaN(d2.getTime()) && d2.toDateString() !== d1.toDateString()) {
            return `${s1} — ${d2.toLocaleDateString('es-AR', opts)}`;
        }
    }
    return s1;
};

const normalizeEventoInfo = (eventoOrName) => {
    if (!eventoOrName || typeof eventoOrName === 'string') {
        return { nombre: eventoOrName || 'Evento', fechaLabel: '', organizador: '' };
    }
    const nombre = eventoOrName.nombre || eventoOrName.Nombre || 'Evento';
    const fecha = eventoOrName.fecha || eventoOrName.Fecha;
    const fechaFin = eventoOrName.fechaFin || eventoOrName.FechaFin;
    const organizador = eventoOrName.federacionNombre || eventoOrName.FederacionNombre
        || eventoOrName.clubNombre || eventoOrName.ClubNombre || '';
    return {
        nombre,
        fechaLabel: formatEventoFecha(fecha, fechaFin),
        organizador,
    };
};

// ─── Shared drawing helpers ───────────────────────────────────────────────────

/** Encabezado con logo, evento, fecha, organizador y paginación */
const drawBand = (doc, eventoInfo, subtitle, pageNum, totalPages, logo) => {
    doc.setFillColor(148, 148, 153);
    doc.rect(0, 0, PW, BAND_H, 'F');

    let textLeft = MARGIN + 4;

    if (logo?.dataUrl) {
        const { width: logoW, height: logoH } = fitLogoDimensions(logo, LOGO_MAX_H, LOGO_MAX_W);
        const logoX = MARGIN;
        const logoY = (BAND_H - logoH) / 2;
        doc.addImage(logo.dataUrl, 'PNG', logoX, logoY, logoW, logoH);
        textLeft = logoX + logoW + 5;
    }

    doc.setFontSize(10.5);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(28, 28, 32);
    doc.text(
        `${eventoInfo.nombre}${subtitle ? '  —  ' + subtitle : ''}`,
        textLeft,
        9.5,
        { maxWidth: PW - textLeft - MARGIN - 42 }
    );

    const metaParts = [];
    if (eventoInfo.fechaLabel) metaParts.push(`Fecha: ${eventoInfo.fechaLabel}`);
    if (eventoInfo.organizador) metaParts.push(`Organiza: ${eventoInfo.organizador}`);

    if (metaParts.length) {
        doc.setFontSize(7.2);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(52, 52, 58);
        doc.text(metaParts.join('   ·   '), textLeft, 16, { maxWidth: PW - textLeft - MARGIN - 42 });
    }

    doc.setFontSize(6.5);
    doc.setTextColor(72, 72, 78);
    doc.text(
        `${new Date().toLocaleString('es-AR')}   ·   Pág. ${pageNum}/${totalPages}`,
        PW - MARGIN,
        10,
        { align: 'right' }
    );
};

/** Small footer text */
const drawFooter = (doc, eventoInfo) => {
    doc.setFontSize(6); doc.setTextColor(120, 120, 120); doc.setFont(undefined, 'normal');
    const org = eventoInfo.organizador ? `${eventoInfo.organizador} · ` : '';
    doc.text(`${org}${eventoInfo.nombre}`, PW / 2, PH - 2, { align: 'center' });
};

/** Dashed horizontal rule between stacked grids */
const drawSeparator = (doc, y) => {
    doc.setDrawColor(190, 190, 190); doc.setLineWidth(0.15);
    doc.setLineDashPattern([1.5, 1.5], 0);
    doc.line(TABLE_MARGIN, y, PW - TABLE_MARGIN, y);
    doc.setLineDashPattern([], 0);
};

/** Two-line grid title block (bold line + gray sub-line + thin rule) */
const drawGridTitle = (doc, line1, line2, y) => {
    doc.setFontSize(8.5); doc.setFont(undefined, 'bold'); doc.setTextColor(0, 0, 0);
    doc.text(line1, TABLE_MARGIN, y + 4.5);
    doc.setFontSize(6.5); doc.setFont(undefined, 'normal'); doc.setTextColor(80, 80, 80);
    if (line2) doc.text(line2, TABLE_MARGIN, y + 9);
    doc.setDrawColor(80, 80, 80); doc.setLineWidth(0.25);
    doc.line(TABLE_MARGIN, y + 10.5, PW - TABLE_MARGIN, y + 10.5);
};

/** Shared autoTable styles for B&W printing */
const tableLayout = () => ({
    tableWidth: TABLE_W,
    margin: { left: TABLE_MARGIN, right: TABLE_MARGIN },
});

const tableStyles = (isResults = false) => ({
    theme: 'plain',
    styles: {
        fontSize: 8.5,
        cellPadding: { top: 1.4, bottom: 1.4, left: 2.5, right: 2 },
        overflow: 'ellipsize',
        textColor: [10, 10, 10],
        lineColor: [170, 170, 170],
        lineWidth: 0.15,
        halign: 'left',
    },
    headStyles: {
        fillColor: [220, 220, 220],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 7.5,
        cellPadding: { top: 1.5, bottom: 1.5, left: 2.5, right: 2 },
        lineColor: [110, 110, 110],
        lineWidth: 0.2,
        halign: 'center',
    },
    alternateRowStyles: { fillColor: [215, 215, 218] },
    columnStyles: isResults
        ? {
            0: { halign: 'center', cellWidth: 12, fontStyle: 'bold' },
            1: { halign: 'center', cellWidth: 14 },
            4: { halign: 'center', cellWidth: 28, fontStyle: 'bold' },
          }
        : {
            0: { halign: 'center', cellWidth: 12, fontStyle: 'bold' },
            2: { cellWidth: 50 },
          },
    ...tableLayout(),
});

// ─── Build rows ───────────────────────────────────────────────────────────────

const sortByCarril = (a, b) => (Number(a.carril) || 99) - (Number(b.carril) || 99);

const sortResultadosForExport = (resultados) => {
    const list = resultados || [];
    const hasMeaningfulTimes = list.some(r => isMeaningfulRaceTime(r.tiempoOficial));

    if (!hasMeaningfulTimes) {
        return [...list].sort(sortByCarril);
    }

    return [...list].sort((a, b) => {
        const pA = a.posicion || 99;
        const pB = b.posicion || 99;
        if (pA !== pB) return pA - pB;
        return sortByCarril(a, b);
    });
};

/** Start list rows: [carril, atleta, club] sorted by carril */
const buildStartRows = (fase) => {
    if (!fase.resultados?.length) return [['-', 'A definir', '-']];
    return sortResultadosForExport(fase.resultados)
        .map(r => [r.carril ?? '-', getCrew(r, fase), r.clubNombre || r.clubSigla || '-']);
};

/** Result rows: [pos, carril, atleta, club, tiempo] — por carril pre-largada, por posición post-carrera */
const buildResultRows = (fase) => {
    if (!fase.resultados?.length) return [['-', '-', 'Sin resultados', '-', '-']];
    const hasMeaningfulTimes = fase.resultados.some(r => isMeaningfulRaceTime(r.tiempoOficial));
    return sortResultadosForExport(fase.resultados)
        .map(r => [
            hasMeaningfulTimes && r.posicion ? r.posicion : '-',
            r.carril   || '-',
            getCrew(r, fase),
            r.clubNombre || r.clubSigla || '-',
            formatRaceTime(r.tiempoOficial) || '-',
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
const renderStackedPages = (doc, fases, eventoInfo, docTitle, docSubtitle, mode = 'startList', logo) => {
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
        drawFooter(doc, eventoInfo);
        doc.addPage();
        currentPage++;
        currentY   = CONTENT_TOP;
        firstOnPage = true;
        drawBand(doc, eventoInfo, `${docTitle}${docSubtitle ? ' · ' + docSubtitle : ''}`, currentPage, totalPages, logo);
    };

    drawBand(doc, eventoInfo, `${docTitle}${docSubtitle ? ' · ' + docSubtitle : ''}`, 1, totalPages, logo);

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

    drawFooter(doc, eventoInfo);
};


// ─── Service ─────────────────────────────────────────────────────────────────
const PdfExportService = {

    /** Single fase — results format */
    exportFase: async (fase, eventoOrName, pruebaNombre) => {
        const logo = await getPdfLogo();
        const eventoInfo = normalizeEventoInfo(eventoOrName);
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        renderStackedPages(doc, [fase], eventoInfo, pruebaNombre, fase.nombreFase, 'results', logo);
        doc.save(`${eventoInfo.nombre}_${fase.nombreFase}_Resultados.pdf`.replace(/\s+/g, '_'));
    },

    /** Group of fases (e.g. all heats) — results format */
    exportGrupo: async (fases, eventoOrName, pruebaNombre, grupoLabel) => {
        if (!fases?.length) return;
        const logo = await getPdfLogo();
        const eventoInfo = normalizeEventoInfo(eventoOrName);
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        renderStackedPages(doc, fases, eventoInfo, pruebaNombre, grupoLabel, 'results', logo);
        doc.save(`${eventoInfo.nombre}_${grupoLabel}_Resultados.pdf`.replace(/\s+/g, '_'));
    },

    /** All fases of a prueba — results format */
    exportPrueba: async (fases, eventoOrName, pruebaNombre) => {
        if (!fases?.length) return;
        const logo = await getPdfLogo();
        const eventoInfo = normalizeEventoInfo(eventoOrName);
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        renderStackedPages(doc, fases, eventoInfo, pruebaNombre, 'Resultados Completos', 'results', logo);
        doc.save(`${eventoInfo.nombre}_${pruebaNombre}_Completo.pdf`.replace(/\s+/g, '_'));
    },

    /** Full event start list — 4 grids per page, 1 column */
    exportCronogramaCompleto: async (cronograma, eventoOrName) => {
        if (!cronograma?.length) return;
        const logo = await getPdfLogo();
        const eventoInfo = normalizeEventoInfo(eventoOrName);
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        renderStackedPages(doc, cronograma, eventoInfo, 'Start List', '', 'startList', logo);
        doc.save(`${eventoInfo.nombre}_StartList.pdf`.replace(/\s+/g, '_'));
    },

    /** Provisional program table (schedule overview — stays as a summary table) */
    exportProgramaInicial: async (items, eventoOrName) => {
        if (!items?.length) return;
        const logo = await getPdfLogo();
        const eventoInfo = normalizeEventoInfo(eventoOrName);
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const totalPages = 1;
        drawBand(doc, eventoInfo, 'Programa Provisorio', 1, totalPages, logo);

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
            head: [['#', 'Hora', 'Categoría', 'Fase', 'Bote', 'Dist.', 'Sexo', 'Ins.']],
            body: rows,
            ...tableStyles(false),
            columnStyles: {
                0: { halign: 'center', cellWidth: 11 },
                1: { halign: 'center', cellWidth: 24, fontStyle: 'bold' },
                2: { cellWidth: 42 },
                3: { cellWidth: 28 },
                4: { halign: 'center', cellWidth: 16 },
                5: { halign: 'center', cellWidth: 18 },
                6: { halign: 'center', cellWidth: 22 },
                7: { halign: 'center', cellWidth: 25 },
            },
            ...tableLayout(),
        });

        drawFooter(doc, eventoInfo);
        doc.save(`${eventoInfo.nombre}_Programa_Provisorio.pdf`.replace(/\s+/g, '_'));
    },

    /** General Event Schedule overview (without start lists/competitors) */
    exportRegattaSchedule: async (cronograma, eventoOrName) => {
        if (!cronograma?.length) return;
        const logo = await getPdfLogo();
        const eventoInfo = normalizeEventoInfo(eventoOrName);
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        
        const rows = [...cronograma]
            .sort((a, b) => new Date(a.fechaHoraProgramada) - new Date(b.fechaHoraProgramada))
            .map((fase, idx) => {
                const p = fase.prueba?.prueba || fase.prueba || fase;
                const catId  = p?.categoriaId || p?.categoria?.id;
                const botId  = p?.boteId      || p?.bote?.id;
                const distId = p?.distanciaId || p?.distancia?.id;
                const sexId  = p?.sexoId      || p?.sexo?.id;

                const catName  = CATEGORIA_NAMES[catId]  || p?.categoria?.nombre || '-';
                const botName  = BOTE_NAMES[botId]        || p?.bote?.nombre     || '-';
                const distName = DISTANCIA_NAMES[distId]  || (p?.distancia?.metros ? `${p.distancia.metros}m` : '-');
                const sexName  = SEXO_NAMES[sexId]        || p?.sexoNombre       || '-';
                
                const timeStr = getTimeStr(fase);
                const faseName = fase.nombreFase || '-';

                return [idx + 1, faseName, catName, botName, distName, sexName, timeStr];
            });

        autoTable(doc, {
            startY: BAND_H + MARGIN,
            head: [['#', 'Etapa / Fase', 'Categoría', 'Bote', 'Dist.', 'Sexo', 'Horario']],
            body: rows,
            ...tableStyles(false),
            columnStyles: {
                0: { halign: 'center', cellWidth: 11 },
                1: { cellWidth: 38 },
                2: { cellWidth: 52 },
                3: { halign: 'center', cellWidth: 16 },
                4: { halign: 'center', cellWidth: 22 },
                5: { halign: 'center', cellWidth: 22 },
                6: { halign: 'center', cellWidth: 25, fontStyle: 'bold' },
            },
            ...tableLayout(),
        });

        const totalPages = doc.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            drawBand(doc, eventoInfo, 'Regatta Schedule', i, totalPages, logo);
            drawFooter(doc, eventoInfo);
        }

        doc.save(`${eventoInfo.nombre}_Regatta_Schedule.pdf`.replace(/\s+/g, '_'));
    },
};

export default PdfExportService;
