import { collapseMaratonLargadas, getPruebaIds } from '../../../utils/maratonScheduleUtils';
import {
    BOTE_NAMES,
    CATEGORIA_NAMES,
    DISTANCIA_NAMES,
    SEXO_NAMES,
} from '../../../utils/pruebaLabelUtils';
import InscripcionService from '../../../services/InscripcionService';
import FaseService from '../../../services/FaseService';
import ResultadoService from '../../../services/ResultadoService';
import ParticipanteService from '../../../services/ParticipanteService';
import { computePositionsForPhase } from '../../../utils/resultadosHelpers';

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

/** Resuelve categoría y bote de un resultado Maratón vía EventoPrueba / inscripción. */
export function resolveMaratonEventoPruebaForResultado(res, pruebas = [], inscripcionEpMap = null) {
    if (!res) return null;

    const epById = new Map((pruebas || []).map(p => [String(p.id), p]));
    let epId = res.eventoPruebaId || res.EventoPruebaId;
    if (!epId && inscripcionEpMap) {
        const inscId = String(res.inscripcionId || res.InscripcionId || '');
        epId = inscripcionEpMap?.get?.(inscId) ?? inscripcionEpMap?.[inscId];
    }

    return epById.get(String(epId)) || null;
}

export function resolveMaratonClasificacionKeyForResultado(res, pruebas = [], inscripcionEpMap = null) {
    const ep = resolveMaratonEventoPruebaForResultado(res, pruebas, inscripcionEpMap);
    return ep ? getClasificacionKeyFromEventoPrueba(ep) : null;
}

export function resolveMaratonClasificacionTitleForResultado(res, pruebas = [], inscripcionEpMap = null) {
    const ep = resolveMaratonEventoPruebaForResultado(res, pruebas, inscripcionEpMap);
    return ep ? getClasificacionTitleFromEventoPrueba(ep) : null;
}

/** Limita resultados a la misma clasificación (Categoría · Sexo · Bote) que el origen. */
export function filterMaratonResultadosByClasificacion(resultados = [], sourceRes, pruebas = [], inscripcionEpMap = null) {
    const sourceKey = resolveMaratonClasificacionKeyForResultado(sourceRes, pruebas, inscripcionEpMap);
    if (!sourceKey) return resultados;

    return resultados.filter((r) =>
        resolveMaratonClasificacionKeyForResultado(r, pruebas, inscripcionEpMap) === sourceKey
    );
}

export function resolveMaratonLabelsForResultado(res, pruebas = [], inscripcionEpMap = null) {
    if (!res) return { categoriaLabel: null, boteLabel: null };

    const ep = resolveMaratonEventoPruebaForResultado(res, pruebas, inscripcionEpMap);
    if (!ep) return { categoriaLabel: null, boteLabel: null };

    return {
        categoriaLabel: getCategoriaLabelFromEventoPrueba(ep),
        boteLabel: getBoteLabelFromEventoPrueba(ep),
    };
}

/** Enriquece opciones de traspaso con categoría/bote en eventos Maratón. */
export function enrichTransferOptionsForMaraton(options = [], resultados = [], pruebas = [], inscripcionEpMap = null) {
    const byId = new Map((resultados || []).map(r => [String(r.id), r]));
    return options.map(o => {
        const res = byId.get(String(o.id));
        const labels = resolveMaratonLabelsForResultado(res, pruebas, inscripcionEpMap);
        return { ...o, ...labels };
    });
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
                eventoPrueba: ep || null,
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
                prueba: g.eventoPrueba || fase.prueba,
                resultados: g.resultados,
            },
        }));
}

/**
 * Expande fases Maratón a una grilla PDF por Categoría · Sexo · Bote
 * (mismo criterio que Live / MaratonResultadosGrids), recalculando posiciones por grupo.
 */
export function expandFasesMaratonByClasificacion(fases = [], pruebas = [], inscripcionEpMap = null) {
    const out = [];

    for (const fase of fases || []) {
        const enrichedResultados = (fase.resultados || []).map(r => {
            if (r.eventoPruebaId || r.EventoPruebaId) return r;
            const inscId = String(r.inscripcionId || r.InscripcionId || '');
            const epId = inscId
                ? (inscripcionEpMap?.get?.(inscId) ?? inscripcionEpMap?.[inscId])
                : null;
            return epId ? { ...r, eventoPruebaId: epId } : r;
        });

        const groups = groupMaratonResultadosByClasificacion(
            { ...fase, resultados: enrichedResultados },
            pruebas
        );

        if (!groups.length) {
            out.push(fase);
            continue;
        }

        const originalNombre = fase.nombreFase || fase.NombreFase || '';
        const distLabel = (() => {
            const p = fase?.prueba?.prueba || fase?.prueba || groups[0]?.eventoPrueba?.prueba;
            if (!p) return '';
            return DISTANCIA_NAMES[p.distancia?.id || p.distanciaId]
                || (p.distancia?.metros ? `${p.distancia.metros}m` : '')
                || p.distancia?.descripcion
                || '';
        })();

        for (const g of groups) {
            const posMap = computePositionsForPhase(g.resultados);
            const resultados = g.resultados.map(r => {
                const pos = posMap[r.id] ?? posMap[String(r.id)];
                return pos != null ? { ...r, posicion: pos } : r;
            });

            out.push({
                ...g.faseVirtual,
                resultados,
                nombreFase: g.title,
                _clasificacionKey: g.key,
                _pdfSubtitleOverride: [originalNombre, distLabel].filter(Boolean).join('  ·  '),
            });
        }
    }

    return out;
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

/** Nombre/apellido desde "Nombre Apellido..." */
export function splitNombreApellido(nombreCompleto = '') {
    const parts = String(nombreCompleto).trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return { nombre: '', apellido: '' };
    if (parts.length === 1) return { nombre: parts[0], apellido: '' };
    return { nombre: parts[0], apellido: parts.slice(1).join(' ') };
}

/**
 * Tripulación completa para el modal: titular + tripulantes (K2/K4).
 * Orden: participante principal, luego tripulantes por posición.
 */
export function buildCrewFromInscripcion(inscripcion) {
    if (!inscripcion) return [];

    const trips = [...(inscripcion.tripulantes || [])].sort((a, b) =>
        (a.posicionEnBote ?? a.PosicionEnBote ?? 99) - (b.posicionEnBote ?? b.PosicionEnBote ?? 99)
    );

    const titularId = inscripcion.participanteId || inscripcion.ParticipanteId;
    const crew = [];

    if (titularId) {
        const { nombre, apellido } = splitNombreApellido(inscripcion.participanteNombreCompleto);
        crew.push({
            key: `titular-${titularId}`,
            participanteId: titularId,
            nombre,
            apellido,
            clubId: inscripcion.participanteClubId || inscripcion.clubId || '',
            rol: trips.length ? 'Titular' : 'Atleta',
            isTitular: true,
        });
    }

    trips.forEach((t, idx) => {
        const pid = t.participanteId || t.ParticipanteId;
        if (!pid || (titularId && String(pid) === String(titularId))) return;
        const { nombre, apellido } = splitNombreApellido(
            t.participanteNombreCompleto || t.ParticipanteNombreCompleto || ''
        );
        crew.push({
            key: `trip-${pid}-${idx}`,
            participanteId: pid,
            nombre,
            apellido,
            clubId: '',
            rol: `Tripulante ${idx + 1}`,
            isTitular: false,
        });
    });

    return crew;
}

async function updateParticipantePatch(participanteId, { nombre, apellido, clubId }, fallbackNombreCompleto = '') {
    if (!participanteId) return;
    const current = await ParticipanteService.getById(participanteId);
    const { nombre: fbN, apellido: fbA } = splitNombreApellido(fallbackNombreCompleto);

    const payload = {
        nombre: nombre != null ? String(nombre).trim() : (current.nombre || fbN),
        apellido: apellido != null ? String(apellido).trim() : (current.apellido || fbA),
        fechaNacimiento: current.fechaNacimiento || current.FechaNacimiento || '2000-01-01',
        sexoId: current.sexoId ?? current.SexoId ?? 1,
        categoriaId: current.categoriaId ?? current.CategoriaId ?? null,
        clubId: current.clubId ?? current.ClubId ?? null,
        federacionId: current.federacionId ?? current.FederacionId ?? null,
        pais: current.pais ?? current.Pais ?? null,
        dni: current.dni ?? current.Dni ?? current.documento ?? null,
        email: current.email ?? current.Email ?? null,
        pagoAfiliacionAlDia: current.pagoAfiliacionAlDia ?? current.PagoAfiliacionAlDia ?? true,
    };

    if (clubId !== undefined) {
        payload.clubId = clubId === '' || clubId === 0 || clubId == null
            ? null
            : Number(clubId);
    }

    await ParticipanteService.update(participanteId, payload);
}

/** Opciones de clasificación permitidas en la largada (EventoPrueba del grupo). */
export function buildMaratonClasificacionOptions(pruebas, selectedPruebaId) {
    const memberIds = resolveMaratonLargadaMemberIds(pruebas, selectedPruebaId);
    const epById = new Map((pruebas || []).map(p => [String(p.id), p]));

    return memberIds
        .map(id => {
            const ep = epById.get(String(id));
            if (!ep) return null;
            return {
                id: Number(id) || id,
                label: getClasificacionTitleFromEventoPrueba(ep),
                categoriaLabel: getCategoriaLabelFromEventoPrueba(ep),
                sexoLabel: getSexoLabelFromEventoPrueba(ep),
                boteLabel: getBoteLabelFromEventoPrueba(ep),
            };
        })
        .filter(Boolean);
}

/**
 * Sincroniza Carril del resultado de la fase de largada con el Nº de competidor.
 * Impacta cronometrista / live (carril = dorsal).
 */
export async function syncMaratonResultadoCarril(pruebas, selectedPruebaId, inscripcionId, numero) {
    const n = parseInt(numero, 10);
    if (!Number.isFinite(n) || n <= 0 || !inscripcionId) return false;

    const memberIds = resolveMaratonLargadaMemberIds(pruebas, selectedPruebaId);
    for (const epId of memberIds) {
        let fases = [];
        try {
            fases = await FaseService.getByEventoPrueba(epId);
        } catch {
            continue;
        }
        for (const f of fases || []) {
            let rows = f.resultados;
            if (!rows?.length) {
                try {
                    rows = await ResultadoService.getByFase(f.id);
                } catch {
                    rows = [];
                }
            }
            const res = (rows || []).find(r =>
                String(r.inscripcionId || r.InscripcionId) === String(inscripcionId)
            );
            if (res) {
                // BatchUpdate con Carril activa "full update" en API: hay que reenviar tiempo/posición
                // para no borrarlos.
                await ResultadoService.batchUpdate([{
                    id: res.id || res.Id,
                    carril: n,
                    tiempoOficial: res.tiempoOficial ?? res.TiempoOficial ?? null,
                    posicion: res.posicion ?? res.Posicion ?? null,
                    estado: res.estado || res.Estado || undefined,
                }]);
                return true;
            }
        }
    }
    return false;
}

/**
 * Edita una fila de la nómina Maratón:
 * - Nº + EventoPrueba (cat/sexo/bote) vía inscripción
 * - Nombre/apellido (+ club del titular) vía participantes (titular + tripulación)
 * - Carril en fase de largada si ya existe
 */
export async function updateMaratonNominaRow({
    pruebas,
    selectedPruebaId,
    inscripcion,
    patch = {},
}) {
    if (!inscripcion?.id) throw new Error('Inscripción inválida');

    const nextNumero = patch.numeroCompetidor != null
        ? String(patch.numeroCompetidor).trim()
        : inscripcion.numeroCompetidor;
    const nextEpId = patch.eventoPruebaId != null
        ? Number(patch.eventoPruebaId)
        : Number(inscripcion.eventoPruebaId);

    const crew = Array.isArray(patch.crew) ? patch.crew : null;

    if (crew?.length) {
        await Promise.all(crew.map(async (member) => {
            if (!member?.participanteId) return;
            await updateParticipantePatch(
                member.participanteId,
                {
                    nombre: member.nombre,
                    apellido: member.apellido,
                    clubId: member.isTitular ? (member.clubId ?? patch.clubId) : undefined,
                },
                `${member.nombre || ''} ${member.apellido || ''}`.trim()
            );
        }));
    } else {
        const participanteId = inscripcion.participanteId || inscripcion.ParticipanteId;
        if (participanteId && (patch.nombre != null || patch.apellido != null || patch.clubId != null)) {
            await updateParticipantePatch(
                participanteId,
                {
                    nombre: patch.nombre,
                    apellido: patch.apellido,
                    clubId: patch.clubId,
                },
                inscripcion.participanteNombreCompleto
            );
        }
    }

    const insPatch = {};
    if (nextNumero !== undefined && nextNumero !== null && String(nextNumero) !== String(inscripcion.numeroCompetidor || '')) {
        insPatch.numeroCompetidor = String(nextNumero);
    }
    if (Number.isFinite(nextEpId) && nextEpId > 0 && nextEpId !== Number(inscripcion.eventoPruebaId)) {
        insPatch.eventoPruebaId = nextEpId;
    }
    if (Object.keys(insPatch).length) {
        await InscripcionService.update(inscripcion.id, insPatch);
    }

    if (insPatch.numeroCompetidor) {
        await syncMaratonResultadoCarril(
            pruebas,
            selectedPruebaId,
            inscripcion.id,
            insPatch.numeroCompetidor
        );
    }

    return true;
}

/** Elimina la inscripción de la nómina (cascade quita resultado de la fase si existía). */
export async function removeMaratonNominaRow(inscripcionId) {
    if (!inscripcionId) throw new Error('Inscripción inválida');
    await InscripcionService.delete(inscripcionId);
    return true;
}
