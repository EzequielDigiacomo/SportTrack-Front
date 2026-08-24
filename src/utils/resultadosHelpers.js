import { isMeaningfulRaceTime, timeToMs } from './raceTimeUtils';

const RANKING_EXCLUDED_STATES = ['DNS', 'DNF', 'DSQ', 'Descalificado'];

export { timeToMs };

export const isExcludedFromRanking = (estado) => {
    if (!estado) return false;
    const normalized = String(estado).trim();
    if (RANKING_EXCLUDED_STATES.some(s => normalized.toUpperCase().includes(s.toUpperCase()))) {
        return true;
    }
    return !['Pendiente', 'Preliminar', 'Oficial', 'Revisado'].includes(normalized);
};

export const mapEstadoCantoToBackend = (estadoCanto) => {
    if (!estadoCanto || estadoCanto === 'Pendiente') return 'Pendiente';
    if (estadoCanto === 'DSQ') return 'Descalificado';
    return estadoCanto;
};

export const normalizeEstadoCantoFromBackend = (estado) => {
    if (!estado || estado === 'Pendiente') return 'Pendiente';
    if (estado === 'Descalificado') return 'DSQ';
    return estado;
};

/** Calcula posiciones 1..N solo dentro de una fase/serie, ordenando por tiempo. */
export const computePositionsForPhase = (resultados, tiemposLocales = {}) => {
    const rankings = [];

    (resultados || []).forEach(r => {
        const local = tiemposLocales[r.id] || {};
        const estado = local.estadoCanto || r.estado;
        const time = local.tiempoOficial !== undefined ? local.tiempoOficial : r.tiempoOficial;

        if (isExcludedFromRanking(estado) || !isMeaningfulRaceTime(time)) return;

        const ms = timeToMs(time);
        if (ms === null) return;

        rankings.push({ id: r.id, ms });
    });

    rankings.sort((a, b) => a.ms - b.ms);

    const positionMap = {};
    rankings.forEach((item, idx) => {
        positionMap[item.id] = idx + 1;
    });

    return positionMap;
};

export const applyPositionsToTiemposLocales = (resultados, tiemposLocales, { preserveManualPositions = false } = {}) => {
    const positions = computePositionsForPhase(resultados, tiemposLocales);
    const updated = { ...tiemposLocales };

    (resultados || []).forEach(r => {
        const local = updated[r.id] || {};
        const estado = local.estadoCanto || r.estado;

        if (isExcludedFromRanking(estado)) {
            updated[r.id] = { ...local, posicion: '' };
        } else if (preserveManualPositions && local.posicion !== undefined && local.posicion !== null && local.posicion !== '') {
            // Conserva POS cargada a mano
            updated[r.id] = { ...local };
        } else if (positions[r.id]) {
            updated[r.id] = { ...local, posicion: positions[r.id] };
        } else if (!local.tiempoOficial && !r.tiempoOficial) {
            updated[r.id] = { ...local, posicion: '' };
        }
    });

    return updated;
};

const getLocalResult = (tiemposLocales, id) =>
    tiemposLocales[id] || tiemposLocales[String(id)] || {};

const getEffectiveTime = (resultado, tiemposLocales) => {
    const local = getLocalResult(tiemposLocales, resultado.id);
    return local.tiempoOficial !== undefined ? local.tiempoOficial : (resultado.tiempoOficial || '');
};

const getEffectiveName = (resultado, tiemposLocales) => {
    const local = getLocalResult(tiemposLocales, resultado.id);
    return local.participanteNombre !== undefined ? local.participanteNombre : (resultado.participanteNombre || '');
};

/** Opciones de puesto disponibles para traspasar (excluye DNS/DNF/DSQ). */
export const getTransferablePositions = (resultados, tiemposLocales = {}) => {
    const positions = computePositionsForPhase(resultados, tiemposLocales);
    return Object.entries(positions)
        .map(([id, posicion]) => {
            const res = (resultados || []).find(r => String(r.id) === String(id));
            if (!res) return null;
            return {
                id: res.id,
                posicion,
                carril: getLocalResult(tiemposLocales, res.id).carril ?? res.carril,
                nombre: getEffectiveName(res, tiemposLocales),
                tiempo: getEffectiveTime(res, tiemposLocales),
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.posicion - b.posicion);
};

/**
 * Traspaso entre puestos de ranking.
 * - keepTargetTime: el origen recibe el tiempo del destino (y viceversa) → el atleta “pasa” al otro puesto.
 * - customTimes: el juez define ambos tiempos manualmente tras elegir el traspaso.
 */
export const transferAthleteToPosition = (
    resultados,
    tiemposLocales,
    sourceId,
    targetPosition,
    { mode = 'keepTargetTime', sourceTime, targetTime } = {}
) => {
    const positions = computePositionsForPhase(resultados, tiemposLocales);
    const sourcePos = positions[sourceId] || positions[String(sourceId)];
    if (!sourcePos) return tiemposLocales;

    const targetEntry = Object.entries(positions).find(([, pos]) => pos === Number(targetPosition));
    if (!targetEntry) return tiemposLocales;

    const targetId = targetEntry[0];
    if (String(sourceId) === String(targetId)) return tiemposLocales;

    const sourceRes = (resultados || []).find(r => String(r.id) === String(sourceId));
    const targetRes = (resultados || []).find(r => String(r.id) === String(targetId));
    if (!sourceRes || !targetRes) return tiemposLocales;

    const currentSourceTime = getEffectiveTime(sourceRes, tiemposLocales);
    const currentTargetTime = getEffectiveTime(targetRes, tiemposLocales);

    const nextSourceTime = mode === 'customTimes'
        ? (sourceTime ?? currentTargetTime)
        : currentTargetTime;
    const nextTargetTime = mode === 'customTimes'
        ? (targetTime ?? currentSourceTime)
        : currentSourceTime;

    const next = {
        ...tiemposLocales,
        [sourceRes.id]: {
            ...getLocalResult(tiemposLocales, sourceRes.id),
            tiempoOficial: nextSourceTime,
        },
        [targetRes.id]: {
            ...getLocalResult(tiemposLocales, targetRes.id),
            tiempoOficial: nextTargetTime,
        },
    };

    return applyPositionsToTiemposLocales(resultados, next);
};
