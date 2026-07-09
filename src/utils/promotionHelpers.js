/** Una fase tiene resultados oficiales guardados */
import { isExcludedFromRanking } from './resultadosHelpers';

function isOccupiedResultado(r) {
    return r.inscripcionId != null && r.inscripcionId !== 0;
}

function isResultadoResolved(r) {
    if (!isOccupiedResultado(r)) return true;
    if (r.tiempoOficial || r.posicion) return true;
    if (isExcludedFromRanking(r.estado)) return true;
    return false;
}

export function isFaseComplete(fase) {
    const occupied = (fase?.resultados || []).filter(isOccupiedResultado);
    if (occupied.length === 0) return false;
    return occupied.every(isResultadoResolved);
}

function normalizeEtapaTipo(nombre) {
    const n = (nombre || '').toLowerCase();
    if (n.includes('eliminator')) return 'eliminatoria';
    if (n.includes('semifinal')) return 'semifinal';
    if (n.includes('final')) return 'final';
    return 'otro';
}

/** Agrupa fases por etapa (Eliminatorias, Semifinales, Finales) */
export function groupFasesByEtapa(fases) {
    const map = new Map();
    (fases || []).forEach(f => {
        const key = f.etapaId ?? f.etapaNombre ?? 'default';
        if (!map.has(key)) {
            map.set(key, {
                etapaId: f.etapaId,
                nombre: f.etapaNombre || f.EtapaNombre || 'Competencia',
                orden: f.etapaOrden ?? f.EtapaOrden ?? 99,
                fases: [],
            });
        }
        map.get(key).fases.push(f);
    });
    return [...map.values()]
        .map(e => ({
            ...e,
            fases: [...e.fases].sort((a, b) => (a.numeroFase ?? 0) - (b.numeroFase ?? 0)),
        }))
        .sort((a, b) => a.orden - b.orden);
}

/** Etapa con al menos un resultado asignado (post-promoción) */
function isEtapaPopulated(etapa) {
    if (!etapa) return false;
    return etapa.fases.some(f =>
        (f.resultados || []).some(r => r.inscripcionId != null && r.inscripcionId !== 0)
    );
}

/** Última fase de una etapa (ej. Serie 3, Semifinal 2) */
export function getLastFaseNombreOfEtapa(etapa) {
    if (!etapa?.fases?.length) return null;
    return etapa.fases[etapa.fases.length - 1].nombreFase;
}

function countOccupiedResultados(fase) {
    return (fase?.resultados || []).filter(isOccupiedResultado).length;
}

function findFaseByNombre(etapa, pattern) {
    return (etapa?.fases || []).find(f => pattern.test((f.nombreFase || '').trim()));
}

/** Ya se ejecutó la promoción desde semifinales (ambas finales con 9 carriles en planes A/B/C). */
function isSemifinalPromotionApplied(semifinales, finales) {
    if (!semifinales?.fases?.length || !finales?.fases?.length) return false;
    if (!semifinales.fases.every(isFaseComplete)) return false;

    const finalA = findFaseByNombre(finales, /^final\s*a$/i);
    const finalB = findFaseByNombre(finales, /^final\s*b$/i);
    const countA = countOccupiedResultados(finalA);
    const countB = countOccupiedResultados(finalB);
    const expectedLanes = 9;

    if (finalB) {
        if (countB > 0 && countA < expectedLanes) return false;
        return countA >= expectedLanes && countB >= expectedLanes;
    }
    return countA >= expectedLanes;
}

function isViewingFinalPhase(selectedFaseNombre) {
    return /^final\s+[abc]$/i.test((selectedFaseNombre || '').trim());
}

/** El usuario está viendo la última serie/semifinal de la etapa promotable */
function isViewingLastFaseOfEtapa(selectedFaseNombre, etapa) {
    if (!selectedFaseNombre || !etapa?.fases?.length) return false;
    const belongsToEtapa = etapa.fases.some(f => f.nombreFase === selectedFaseNombre);
    const lastNombre = getLastFaseNombreOfEtapa(etapa);
    return belongsToEtapa && selectedFaseNombre === lastNombre;
}

function applyViewGate(status, selectedFaseNombre, etapaObjetivo) {
    const onLastFase = isViewingLastFaseOfEtapa(selectedFaseNombre, etapaObjetivo);
    const lastFaseNombre = getLastFaseNombreOfEtapa(etapaObjetivo);

    return {
        ...status,
        showButton: status.showButton && onLastFase,
        showBanner: status.showBanner !== false && status.showButton && onLastFase,
        lastFaseNombre,
        onLastFaseOfEtapa: onLastFase,
        hintWhenHidden: !onLastFase && status.showButton && lastFaseNombre
            ? `Promover disponible en ${lastFaseNombre} (última de ${etapaObjetivo?.nombre || 'la etapa'}).`
            : '',
    };
}

/**
 * Estado para el botón Promover Etapa.
 * selectedFaseNombre: fase del dropdown (ej. "Serie 3"). El botón solo se muestra en la última fase de la etapa activa.
 */
export function getPromotionStatus(fases, inscriptosCount = 0, selectedFaseNombre = null) {
    const etapas = groupFasesByEtapa(fases);
    const expectedHeats = inscriptosCount > 0 ? Math.ceil(inscriptosCount / 9) : null;

    if (!etapas.length) {
        return { showButton: false, showBanner: false, canPromote: false, message: '' };
    }

    const eliminatoria = etapas.find(e => normalizeEtapaTipo(e.nombre) === 'eliminatoria');
    const semifinales = etapas.find(e => normalizeEtapaTipo(e.nombre) === 'semifinal');
    const finales = etapas.find(e => normalizeEtapaTipo(e.nombre) === 'final');

    if (!eliminatoria && finales) {
        return {
            showButton: false,
            showBanner: false,
            canPromote: false,
            expectedHeats: 1,
            message: 'Con 9 o menos inscritos la prueba es directa a final; no hay etapa que promover.',
        };
    }

    if (!eliminatoria) {
        return { showButton: false, showBanner: false, canPromote: false, message: '' };
    }

    let etapaObjetivo = eliminatoria;
    if (isEtapaPopulated(semifinales)) {
        etapaObjetivo = semifinales;
    }

    if (!etapaObjetivo || normalizeEtapaTipo(etapaObjetivo.nombre) === 'final') {
        return {
            showButton: false,
            showBanner: false,
            canPromote: false,
            message: 'La competencia ya está en la etapa final.',
        };
    }

    const fasesEtapa = etapaObjetivo.fases;
    const completas = fasesEtapa.filter(isFaseComplete);
    const incompletas = fasesEtapa.filter(f => !isFaseComplete(f)).map(f => f.nombreFase);
    const totalSeries = fasesEtapa.length;
    const allComplete = incompletas.length === 0;
    const tipo = normalizeEtapaTipo(etapaObjetivo.nombre);
    const siguienteEtapa = tipo === 'eliminatoria' ? 'semifinales/final' : 'final';

    if (!allComplete) {
        const heatsHint = expectedHeats && tipo === 'eliminatoria' && totalSeries === expectedHeats
            ? ` (${expectedHeats} series por ${inscriptosCount} inscritos)`
            : '';

        return applyViewGate({
            showButton: true,
            showBanner: true,
            canPromote: false,
            etapaNombre: etapaObjetivo.nombre,
            completas: completas.length,
            totalSeries,
            expectedHeats,
            incompletas,
            message: `Completá y guardá todas las series de ${etapaObjetivo.nombre}${heatsHint}: ${completas.length}/${totalSeries}.${incompletas.length ? ` Faltan: ${incompletas.join(', ')}.` : ''}`,
        }, selectedFaseNombre, etapaObjetivo);
    }

    if (tipo === 'eliminatoria' && (!semifinales || !isEtapaPopulated(semifinales))) {
        return applyViewGate({
            showButton: true,
            showBanner: true,
            canPromote: true,
            etapaNombre: etapaObjetivo.nombre,
            completas: completas.length,
            totalSeries,
            expectedHeats,
            incompletas: [],
            message: `Todas las series de ${etapaObjetivo.nombre} están guardadas. Promové para crear ${siguienteEtapa}.`,
        }, selectedFaseNombre, etapaObjetivo);
    }

    if (tipo === 'semifinal' && allComplete) {
        if (isSemifinalPromotionApplied(semifinales, finales)) {
            return {
                showButton: false,
                showBanner: false,
                canPromote: false,
                message: 'Las finales ya fueron armadas desde semifinales.',
            };
        }

        const finalA = findFaseByNombre(finales, /^final\s*a$/i);
        const countA = countOccupiedResultados(finalA);
        const necesitaRepararFa = countA > 0 && countA < 9 && findFaseByNombre(finales, /^final\s*b$/i);

        if (isViewingFinalPhase(selectedFaseNombre)) {
            return {
                showButton: false,
                showBanner: false,
                canPromote: false,
                message: '',
            };
        }

        const finalCompleta = finales && finales.fases.length > 0 && finales.fases.every(isFaseComplete);
        if (finalCompleta) {
            return {
                showButton: false,
                showBanner: false,
                canPromote: false,
                message: 'Las finales ya tienen todos los resultados oficiales.',
            };
        }

        const finalYaIniciada = finales && isEtapaPopulated(finales);
        const tieneFinalB = finales && findFaseByNombre(finales, /^final\s*b$/i);
        return applyViewGate({
            showButton: true,
            showBanner: true,
            canPromote: true,
            etapaNombre: etapaObjetivo.nombre,
            completas: completas.length,
            totalSeries,
            incompletas: [],
            message: necesitaRepararFa
                ? `Final A tiene solo ${countA}/9 carriles. Promové de nuevo desde Semifinal 2 para completar los pases directos de serie.`
                : finalYaIniciada
                ? (tieneFinalB
                    ? 'Todas las semifinales están guardadas. Promové para completar Final A y armar Final B (puestos 4°-7° de cada semi, según plan ICF B).'
                    : 'Todas las semifinales están guardadas. Promové para completar la final con los pases de semifinal.')
                : (tieneFinalB
                    ? 'Todas las semifinales están guardadas. Promové para armar Final A (1°-3° de cada semi) y Final B (4°-7° + mejor 8°, plan ICF B).'
                    : 'Todas las semifinales están guardadas. Promové para armar la final.'),
        }, selectedFaseNombre, etapaObjetivo);
    }

    return applyViewGate({
        showButton: true,
        showBanner: true,
        canPromote: false,
        etapaNombre: etapaObjetivo.nombre,
        completas: completas.length,
        totalSeries,
        incompletas,
        message: `Guardá los tiempos pendientes en ${etapaObjetivo.nombre} antes de promover.`,
    }, selectedFaseNombre, etapaObjetivo);
}
