import { collapseMaratonLargadas, getPruebaIds } from '../../../utils/maratonScheduleUtils';
import {
    BOTE_NAMES,
    CATEGORIA_NAMES,
    DISTANCIA_NAMES,
    SEXO_NAMES,
} from '../../../utils/pruebaLabelUtils';
import InscripcionService from '../../../services/InscripcionService';
import FaseService from '../../../services/FaseService';

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

export function getSexoLabelFromEventoPrueba(ep) {
    const ids = getPruebaIds(ep);
    return SEXO_NAMES[ids.sexId] || ep?.prueba?.sexo?.nombre || ep?.prueba?.sexoNombre || '—';
}

export function getSexoIdFromEventoPrueba(ep) {
    return getPruebaIds(ep).sexId || null;
}

export function getClasificacionKeyFromEventoPrueba(ep) {
    const ids = getPruebaIds(ep);
    return `${ids.catId || 0}|${ids.sexId || 0}|${ids.botId || 0}`;
}

export function getClasificacionTitleFromEventoPrueba(ep) {
    const cat = getCategoriaLabelFromEventoPrueba(ep);
    const sex = getSexoLabelFromEventoPrueba(ep);
    const bot = getBoteLabelFromEventoPrueba(ep);
    return [cat, sex, bot].filter(x => x && x !== '—').join(' · ');
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
 * Carga inscritos de todas las EventoPrueba de una largada y enriquece con bote/categoría/sexo.
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
            sexoLabel: getSexoLabelFromEventoPrueba(ep),
            sexoId: getSexoIdFromEventoPrueba(ep),
            clasificacionKey: getClasificacionKeyFromEventoPrueba(ep),
            clasificacionTitle: getClasificacionTitleFromEventoPrueba(ep),
            eventoPrueba: ep,
        };
    });

    return uniqueBoatsFromIncripciones(enriched);
}

/**
 * Agrupa resultados de una fase Maratón por Categoría · Sexo · Bote
 * (vía EventoPrueba de cada inscripción).
 */
export function groupMaratonResultadosByClasificacion(fase, pruebas = []) {
    if (!fase?.resultados?.length) return [];

    const epById = new Map((pruebas || []).map(p => [String(p.id), p]));
    const groups = new Map();

    for (const res of fase.resultados) {
        const epId = res.eventoPruebaId || res.EventoPruebaId || res.inscripcionEventoPruebaId;
        const ep = epById.get(String(epId))
            || (pruebas || []).find(p =>
                String(p.id) === String(fase.eventoPruebaId)
            );

        const key = ep
            ? getClasificacionKeyFromEventoPrueba(ep)
            : `unknown|${res.inscripcionId || res.id}`;
        const title = ep
            ? getClasificacionTitleFromEventoPrueba(ep)
            : 'Clasificación';

        if (!groups.has(key)) {
            groups.set(key, {
                key,
                title,
                categoriaLabel: ep ? getCategoriaLabelFromEventoPrueba(ep) : '—',
                sexoLabel: ep ? getSexoLabelFromEventoPrueba(ep) : '—',
                boteLabel: ep ? getBoteLabelFromEventoPrueba(ep) : '—',
                resultados: [],
            });
        }
        groups.get(key).resultados.push(res);
    }

    return [...groups.values()]
        .sort((a, b) => a.title.localeCompare(b.title, 'es'))
        .map(g => ({
            ...g,
            faseVirtual: {
                ...fase,
                nombreFase: g.title,
                resultados: g.resultados,
            },
        }));
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

/**
 * Crea la fase de cronometraje para la largada (solo Maratón).
 * Preferencia: POST GenerarLargadaMaraton.
 * Fallback si 404: GenerarManual en el EP representante + limpia fases huérfanas del resto.
 */
export async function generarFaseLargadaMaraton(pruebas, selectedPruebaId, inscriptosConNumero = []) {
    const memberIds = resolveMaratonLargadaMemberIds(pruebas, selectedPruebaId)
        .map(id => Number(id))
        .filter(id => Number.isFinite(id) && id > 0);

    if (!memberIds.length) {
        throw new Error('No se pudo resolver el grupo de largada.');
    }

    try {
        return await FaseService.generarLargadaMaraton(memberIds);
    } catch (err) {
        const status = err?.response?.status;
        if (status !== 404) throw err;
        console.warn('[Maratón] GenerarLargadaMaraton no disponible; fallback GenerarManual.');
        return generarFaseLargadaMaratonFallback(memberIds, inscriptosConNumero);
    }
}

async function generarFaseLargadaMaratonFallback(memberIds, inscriptosConNumero) {
    const representativeId = memberIds[0];
    const others = memberIds.slice(1);

    await Promise.all(
        others.map(async (epId) => {
            try {
                const fases = await FaseService.getByEventoPrueba(epId);
                await Promise.all((fases || []).map(f => FaseService.delete(f.id).catch(() => {})));
            } catch {
                // ignore
            }
        })
    );

    const placements = (inscriptosConNumero || []).map(ins => {
        const n = parseInt(ins.numeroCompetidor, 10);
        return {
            inscripcionId: ins.id,
            serie: 1,
            carril: Number.isFinite(n) && n > 0 ? n : 1,
        };
    });

    const used = new Set();
    let next = 1;
    for (const p of placements) {
        if (used.has(p.carril)) {
            while (used.has(next)) next += 1;
            p.carril = next;
        }
        used.add(p.carril);
        next = Math.max(next, p.carril + 1);
    }

    if (!placements.length) {
        throw new Error('No hay inscritos para armar la fase de largada.');
    }

    return FaseService.generarManual(representativeId, placements);
}

/**
 * Sortea números y genera la fase de cronometraje (flujo completo Maratón).
 */
export async function sortearYArmarLargadaMaraton(pruebas, selectedPruebaId, inscriptos = []) {
    const conNumeros = await sortearNumerosMaraton(inscriptos);
    const fases = await generarFaseLargadaMaraton(pruebas, selectedPruebaId, conNumeros);
    return { inscriptos: conNumeros, fases };
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
