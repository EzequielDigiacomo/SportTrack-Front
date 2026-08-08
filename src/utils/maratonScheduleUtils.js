import { pick } from './apiHelpers';
import {
    CATEGORIA_NAMES,
    BOTE_NAMES,
    DISTANCIA_NAMES,
    SEXO_NAMES,
} from './pruebaLabelUtils';

export const getISODatePart = (dateString) => (dateString ? String(dateString).substring(0, 10) : '');

export const getEpGrupoId = (ep) => pick(ep, 'grupoLargadaId', 'GrupoLargadaId') || null;

export const getPruebaIds = (ep) => {
    const p = ep?.prueba || ep?.Prueba;
    return {
        catId: pick(p, 'categoriaId') || pick(p?.categoria, 'id', 'Id'),
        botId: pick(p, 'boteId') || pick(p?.bote, 'id', 'Id'),
        distId: pick(p, 'distanciaId') || pick(p?.distancia, 'id', 'Id'),
        sexId: pick(p, 'sexoId') || pick(p?.sexo, 'id', 'Id'),
    };
};

export const toggleInList = (list, id) => {
    const s = String(id);
    return list.includes(s) ? list.filter(x => x !== s) : [...list, s];
};

export const joinUniqueLabels = (members, pickId, namesMap) => {
    const ids = [...new Set((members || []).map(m => pickId(getPruebaIds(m))).filter(Boolean))];
    return ids.map(id => namesMap[id] || String(id)).join(' · ');
};

const sumInscritos = (members) =>
    (members || []).reduce((sum, m) => sum + (m.cantidadInscritos || m.CantidadInscritos || 0), 0);

/**
 * Agrupa EventoPrueba de una misma largada (GrupoLargadaId o misma hora+distancia).
 * No aplica gaps ni pateo: el horario es el guardado por el usuario.
 */
export function collapseMaratonLargadas(pruebas) {
    const groups = new Map();
    const singles = [];

    for (const ep of pruebas || []) {
        const gid = getEpGrupoId(ep);
        if (!gid) {
            singles.push(ep);
            continue;
        }
        if (!groups.has(gid)) groups.set(gid, []);
        groups.get(gid).push(ep);
    }

    const collapsed = [];
    for (const [gid, members] of groups.entries()) {
        collapsed.push({
            ...members[0],
            _grupoMembers: members,
            _isGrupoLargada: true,
            grupoLargadaId: gid,
            cantidadInscritos: sumInscritos(members),
        });
    }

    const byTimeDist = new Map();
    for (const ep of singles) {
        const distId = getPruebaIds(ep).distId || '';
        const key = `${ep.fechaHora || ''}|${distId}`;
        if (!byTimeDist.has(key)) byTimeDist.set(key, []);
        byTimeDist.get(key).push(ep);
    }

    for (const [key, members] of byTimeDist.entries()) {
        if (members.length === 1) {
            collapsed.push(members[0]);
            continue;
        }
        collapsed.push({
            ...members[0],
            _grupoMembers: members,
            _isGrupoLargada: true,
            grupoLargadaId: `synth:${key}`,
            cantidadInscritos: sumInscritos(members),
        });
    }

    return collapsed.sort((a, b) => new Date(a.fechaHora) - new Date(b.fechaHora));
}

/** Filas del programa provisorio maratón: hora manual exacta, sin SchedulerService. */
export function buildMaratonProgramaRows(largadas, filtroDia = 'Todos') {
    return (largadas || [])
        .filter(ep => filtroDia === 'Todos' || getISODatePart(ep.fechaHora) === filtroDia)
        .map((ep, index) => {
            const members = ep._isGrupoLargada ? ep._grupoMembers : [ep];
            const ids = getPruebaIds(ep);
            const date = new Date(ep.fechaHora);
            const hora = !isNaN(date.getTime())
                ? date.toTimeString().substring(0, 5)
                : '—';

            return {
                key: ep._isGrupoLargada ? `g-${ep.grupoLargadaId}` : `p-${ep.id}`,
                orden: index + 1,
                raw: ep,
                isGrupo: !!ep._isGrupoLargada,
                catLabel: ep._isGrupoLargada
                    ? joinUniqueLabels(members, x => x.catId, CATEGORIA_NAMES)
                    : (CATEGORIA_NAMES[ids.catId] || 'Cat'),
                botLabel: ep._isGrupoLargada
                    ? joinUniqueLabels(members, x => x.botId, BOTE_NAMES)
                    : (BOTE_NAMES[ids.botId] || 'Bote'),
                distLabel: DISTANCIA_NAMES[ids.distId] || `${ids.distId || '?'}`,
                sexLabel: ep._isGrupoLargada
                    ? joinUniqueLabels(members, x => x.sexId, SEXO_NAMES)
                    : (SEXO_NAMES[ids.sexId] || '—'),
                hora,
                fechaHora: ep.fechaHora,
                inscritos: ep.cantidadInscritos || 0,
            };
        });
}

export function formatTimeFromFechaHora(fechaHora) {
    const date = new Date(fechaHora);
    if (isNaN(date.getTime())) return '';
    return date.toTimeString().substring(0, 5);
}

export function buildMaratonFechaHoraIso(fecha, hora) {
    if (!fecha || !hora) return null;
    return new Date(`${fecha}T${hora}:00`).toISOString();
}

export function findMaratonGrupoMembers(pruebasActuales, editingGrupoId, editingId) {
    if (editingGrupoId) {
        return (pruebasActuales || []).filter(p => {
            const gid = getEpGrupoId(p);
            if (gid && gid === editingGrupoId) return true;
            if (String(editingGrupoId).startsWith('synth:')) {
                const key = `${p.fechaHora || ''}|${getPruebaIds(p).distId || ''}`;
                return `synth:${key}` === editingGrupoId;
            }
            return false;
        });
    }
    if (editingId) return (pruebasActuales || []).filter(p => p.id === editingId);
    return [];
}

export { CATEGORIA_NAMES, BOTE_NAMES, DISTANCIA_NAMES, SEXO_NAMES };
