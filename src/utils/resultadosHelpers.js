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

export const applyPositionsToTiemposLocales = (resultados, tiemposLocales) => {
    const positions = computePositionsForPhase(resultados, tiemposLocales);
    const updated = { ...tiemposLocales };

    (resultados || []).forEach(r => {
        const local = updated[r.id] || {};
        const estado = local.estadoCanto || r.estado;

        if (isExcludedFromRanking(estado)) {
            updated[r.id] = { ...local, posicion: '' };
        } else if (positions[r.id]) {
            updated[r.id] = { ...local, posicion: positions[r.id] };
        } else if (!local.tiempoOficial && !r.tiempoOficial) {
            updated[r.id] = { ...local, posicion: '' };
        }
    });

    return updated;
};
