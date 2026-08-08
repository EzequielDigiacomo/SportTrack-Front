import { collapseMaratonLargadas, getPruebaIds } from '../../../utils/maratonScheduleUtils';
import {
    BOTE_NAMES,
    CATEGORIA_NAMES,
    DISTANCIA_NAMES,
    SEXO_NAMES,
} from '../../../utils/pruebaLabelUtils';
import InscripcionService from '../../../services/InscripcionService';

/** Agrupa EventoPrueba en opciones de selector de largada. */
export function buildMaratonLargadaOptions(pruebas = []) {
    return collapseMaratonLargadas(pruebas).map(ep => {
        const members = ep._grupoMembers || [ep];
        const ids = members.map(getPruebaIds);
        const cats = [...new Set(ids.map(i => CATEGORIA_NAMES[i.catId] || i.catId).filter(Boolean))];
        const bots = [...new Set(ids.map(i => BOTE_NAMES[i.botId] || i.botId).filter(Boolean))];
        const sexes = [...new Set(ids.map(i => SEXO_NAMES[i.sexId] || i.sexId).filter(Boolean))];
        const distId = ids[0]?.distId;
        const dist = DISTANCIA_NAMES[distId] || distId || '';
        const hora = ep.fechaHora
            ? new Date(ep.fechaHora).toTimeString().substring(0, 5)
            : '';

        const memberIds = members.map(m => m.id);
        return {
            key: ep._isGrupoLargada ? `largada-${ep.grupoLargadaId}` : `ep-${ep.id}`,
            label: `${hora ? `${hora} · ` : ''}${cats.join(' + ')} · ${bots.join('/')} · ${dist}${sexes.length ? ` · ${sexes.join('/')}` : ''}`,
            memberIds,
            representativeId: memberIds[0],
            fechaHora: ep.fechaHora,
            members,
        };
    });
}

/** Dado un EventoPrueba id seleccionado, resuelve todos los ids del mismo grupo de largada. */
export function resolveMaratonLargadaMemberIds(pruebas, selectedPruebaId) {
    if (!selectedPruebaId) return [];
    const options = buildMaratonLargadaOptions(pruebas);
    const opt = options.find(o =>
        o.memberIds.some(id => String(id) === String(selectedPruebaId))
        || String(o.representativeId) === String(selectedPruebaId)
    );
    return opt ? opt.memberIds : [Number(selectedPruebaId) || selectedPruebaId];
}

export function getBoteLabelFromEventoPrueba(ep) {
    const ids = getPruebaIds(ep);
    return BOTE_NAMES[ids.botId] || ep?.prueba?.bote?.tipo || ep?.prueba?.bote?.nombre || '—';
}

export function getCategoriaLabelFromEventoPrueba(ep) {
    const ids = getPruebaIds(ep);
    return CATEGORIA_NAMES[ids.catId] || ep?.prueba?.categoria?.nombre || '—';
}

/** Agrupa inscritos duplicados de tripulación (mismo criterio que pista). */
export function uniqueBoatsFromIncripciones(rawInscs = []) {
    const uniqueBoats = [];
    const seenKeys = new Set();

    rawInscs.forEach(ins => {
        const allMemberIds = [
            ins.participanteId,
            ...(ins.tripulantes || []).map(t => t.participanteId)
        ].filter(id => id != null);

        const boatKey = `${ins.eventoPruebaId || ''}-${allMemberIds.sort((a, b) => a - b).join('-')}`;
        if (!seenKeys.has(boatKey)) {
            seenKeys.add(boatKey);
            uniqueBoats.push(ins);
        }
    });

    return uniqueBoats;
}

/**
 * Carga inscritos de todas las EventoPrueba de una largada y enriquece con bote/categoría.
 */
export async function loadMaratonLargadaInscriptos(pruebas, selectedPruebaId) {
    const memberIds = resolveMaratonLargadaMemberIds(pruebas, selectedPruebaId);
    const epById = new Map((pruebas || []).map(p => [String(p.id), p]));

    const batches = await Promise.all(
        memberIds.map(id => InscripcionService.getByEventoPrueba(id).catch(() => []))
    );

    const enriched = batches.flat().map(ins => {
        const ep = epById.get(String(ins.eventoPruebaId));
        return {
            ...ins,
            boteLabel: getBoteLabelFromEventoPrueba(ep),
            categoriaLabel: getCategoriaLabelFromEventoPrueba(ep),
            eventoPrueba: ep,
        };
    });

    return uniqueBoatsFromIncripciones(enriched);
}

/** Fisher–Yates: números 1..N permutados. */
export function shuffleMaratonNumbers(count) {
    const nums = Array.from({ length: count }, (_, i) => i + 1);
    for (let i = nums.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [nums[i], nums[j]] = [nums[j], nums[i]];
    }
    return nums;
}

/**
 * Asigna NumeroCompetidor 1..N al azar (sin carriles / heats).
 * Usa PUT /inscripciones/{id} que ya existe en la API.
 */
export async function sortearNumerosMaraton(inscriptos = []) {
    const list = [...inscriptos];
    const numbers = shuffleMaratonNumbers(list.length);

    await Promise.all(
        list.map((ins, idx) =>
            InscripcionService.update(ins.id, { numeroCompetidor: String(numbers[idx]) })
        )
    );

    return list.map((ins, idx) => ({
        ...ins,
        numeroCompetidor: String(numbers[idx]),
    }));
}

export function sortInscriptosByNumero(inscriptos = []) {
    return [...inscriptos].sort((a, b) => {
        const na = parseInt(a.numeroCompetidor, 10);
        const nb = parseInt(b.numeroCompetidor, 10);
        const aOk = Number.isFinite(na);
        const bOk = Number.isFinite(nb);
        if (aOk && bOk) return na - nb;
        if (aOk) return -1;
        if (bOk) return 1;
        return String(a.participanteNombreCompleto || '').localeCompare(String(b.participanteNombreCompleto || ''));
    });
}
