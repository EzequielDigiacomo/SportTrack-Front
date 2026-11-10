import React, { useEffect, useState } from 'react';
import AtletaService from '../../services/AtletaService';
import InscripcionService from '../../services/InscripcionService';
import { getUserFacingError } from '../../utils/userFacingError';
import './AdminSections.css';

const crewLabel = (insc) => {
    const titular = insc.participanteNombreCompleto || insc.ParticipanteNombreCompleto || '—';
    const extras = (insc.tripulantes || insc.Tripulantes || [])
        .map((t) => t.participanteNombreCompleto || t.ParticipanteNombreCompleto)
        .filter(Boolean);
    return extras.length ? `${titular} + ${extras.join(', ')}` : titular;
};

const seatsForBoat = (insc) => {
    const extras = insc.tripulantes || insc.Tripulantes || [];
    // titular + extras; mínimo 1
    return Math.max(1, 1 + extras.length);
};

const getInscCategoriaId = (insc) =>
    Number(insc?.categoriaId || insc?.CategoriaId || 0) || null;

const getInscSexoId = (insc) =>
    Number(insc?.sexoId || insc?.SexoId || 0) || null;

const getInscClubId = (insc) =>
    Number(insc?.clubId || insc?.ClubId || insc?.participanteClubId || insc?.ParticipanteClubId || 0) || null;

const getAtletaCategoriaId = (a) =>
    Number(a?.categoriaId || a?.CategoriaId || a?.categoria?.id || 0) || null;

const getAtletaSexoId = (a) =>
    Number(a?.sexoId || a?.SexoId || a?.sexo?.id || 0) || null;

const getAtletaClubId = (a) =>
    Number(a?.clubId || a?.ClubId || a?.idClub || 0) || null;

/** Mismo club + misma categoría + mismo sexo de la prueba (Mixto = sin filtro de sexo). */
const filterAtletasPorPrueba = (list, insc, clubIdProp = null) => {
    const club = clubIdProp ? Number(clubIdProp) : getInscClubId(insc);
    const cat = getInscCategoriaId(insc);
    const sex = getInscSexoId(insc);
    return (list || []).filter((a) => {
        const aClub = getAtletaClubId(a);
        // Si el atleta trae clubId, debe coincidir; si no trae, la lista ya viene scoped al club.
        if (club && aClub && aClub !== club) return false;
        if (cat && getAtletaCategoriaId(a) !== cat) return false;
        if (sex && sex !== 3 && getAtletaSexoId(a) !== sex) return false;
        return true;
    });
};

/** Evita filas repetidas (mismo id o mismo apellido+nombre en el club). */
const dedupeAtletas = (list) => {
    const byId = new Set();
    const byName = new Set();
    const out = [];
    for (const a of list || []) {
        const id = Number(a.id ?? a.Id ?? a.participanteId ?? a.ParticipanteId ?? 0);
        const label = `${a.apellido || a.Apellido || ''} ${a.nombre || a.Nombre || ''}`.trim().toLowerCase();
        if (id) {
            if (byId.has(id)) continue;
            byId.add(id);
        }
        if (label) {
            if (byName.has(label)) continue;
            byName.add(label);
        }
        out.push(a);
    }
    return out;
};

const mapAtletasOptions = (list) =>
    dedupeAtletas(list)
        .map((a) => ({
            id: a.id ?? a.Id ?? a.participanteId ?? a.ParticipanteId,
            label: `${a.apellido || a.Apellido || ''} ${a.nombre || a.Nombre || ''}`.trim(),
        }))
        .filter((a) => a.id)
        .sort((a, b) => a.label.localeCompare(b.label, 'es'));

/**
 * Panel reutilizable: club autenticado o acceso por token.
 * props:
 *  - eventoId, clubId
 *  - cambiosAbiertos (bool)
 *  - token (opcional) → usa endpoints públicos
 *  - titulo / subtitulo opcionales
 */
const CorregirTripulacionesPanel = ({
    eventoId,
    clubId,
    cambiosAbiertos = true,
    token = null,
    titulo = 'Corregir tripulaciones',
    subtitulo = 'Reemplazá remadores del mismo club sin borrar el bote.',
    initialInscripciones = null,
}) => {
    const [inscripciones, setInscripciones] = useState(initialInscripciones || []);
    const [atletas, setAtletas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState(null);
    const [msg, setMsg] = useState(null);
    const [editId, setEditId] = useState(null);
    const [draftSeats, setDraftSeats] = useState([]); // array of participanteId

    const load = async () => {
        setLoading(true);
        setMsg(null);
        try {
            if (token) {
                const resumen = await InscripcionService.getCambiosByToken(token);
                setInscripciones(resumen.inscripciones || []);
            } else if (eventoId && clubId) {
                const [insc, atl] = await Promise.all([
                    InscripcionService.getByEventoAndClub(eventoId, clubId),
                    AtletaService.getByClub(clubId),
                ]);
                setInscripciones(insc || []);
                setAtletas(atl || []);
            }
            if (token && clubId) {
                try {
                    const atl = await AtletaService.getByClub(clubId);
                    setAtletas(atl || []);
                } catch {
                    // En link público puede no haber auth para atletas; se listará vacío
                    setAtletas([]);
                }
            }
        } catch (e) {
            setMsg({ type: 'error', text: getUserFacingError(e) });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [eventoId, clubId, token]);

    // Para token sin auth: exponer atletas vía resumen no existe; pedimos lista del club
    // si el token page carga atletas con endpoint autenticado falla — usamos nombres del propio evento.
    // Solución: endpoint público no lista atletas; en token mode pedimos /participantes/club solo si hay JWT.
    // Fallback: permitir seleccionar solo por ID no sirve. Mejor: en modo token, cargar atletas del club
    // con un endpoint AllowAnonymous scoped? Por ahora si no hay atletas, mostramos selects vacíos
    // y el admin link asume club login OR we add public athletes list to resumen.

    const atletasOptionsFor = (insc) =>
        mapAtletasOptions(filterAtletasPorPrueba(atletas, insc, clubId));

    const startEdit = (insc) => {
        const seats = seatsForBoat(insc);
        const current = [];
        current.push(insc.participanteId || insc.ParticipanteId);
        const trip = [...(insc.tripulantes || insc.Tripulantes || [])].sort(
            (a, b) => (a.posicionEnBote || 0) - (b.posicionEnBote || 0)
        );
        trip.forEach((t) => current.push(t.participanteId || t.ParticipanteId));
        while (current.length < seats) current.push('');
        setDraftSeats(current.map(String));
        setEditId(insc.id || insc.Id);
    };

    const saveEdit = async (insc) => {
        const ids = draftSeats.map((x) => Number(x)).filter((n) => n > 0);
        if (ids.length < 1) {
            setMsg({ type: 'error', text: 'Seleccioná al menos el titular.' });
            return;
        }
        if (new Set(ids).size !== ids.length) {
            setMsg({ type: 'error', text: 'Hay atletas duplicados en el bote.' });
            return;
        }
        const payload = {
            participanteId: ids[0],
            tripulantes: ids.slice(1).map((pid, idx) => ({
                participanteId: pid,
                posicionEnBote: idx + 2,
            })),
        };
        setSavingId(insc.id || insc.Id);
        setMsg(null);
        try {
            if (token) {
                await InscripcionService.updateTripulacionByToken(token, insc.id || insc.Id, payload);
            } else {
                await InscripcionService.updateTripulacion(insc.id || insc.Id, payload);
            }
            setMsg({ type: 'ok', text: 'Tripulación actualizada.' });
            setEditId(null);
            await load();
        } catch (e) {
            setMsg({ type: 'error', text: getUserFacingError(e) });
        } finally {
            setSavingId(null);
        }
    };

    if (loading) {
        return <div className="loader-container"><div className="loader" /></div>;
    }

    return (
        <div className="section-container fade-in">
            <div className="section-header">
                <h2>{titulo}</h2>
                <p className="subtitle">{subtitulo}</p>
            </div>

            {!cambiosAbiertos && (
                <div className="glass-effect" style={{ padding: '1rem', marginBottom: '1rem', border: '1px solid rgba(239,68,68,0.4)' }}>
                    La ventana de cambios está cerrada. Solo lectura.
                </div>
            )}

            {msg && (
                <div style={{
                    marginBottom: '1rem',
                    padding: '0.75rem 1rem',
                    borderRadius: 8,
                    background: msg.type === 'ok' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                    color: msg.type === 'ok' ? '#34d399' : '#f87171',
                }}>
                    {msg.text}
                </div>
            )}

            {inscripciones.length === 0 ? (
                <div className="empty-activity">No hay botes inscritos para este club.</div>
            ) : (
                <div className="admin-table-container glass-effect">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Prueba</th>
                                <th>dorsal/id</th>
                                <th>Tripulación</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {inscripciones.map((insc) => {
                                const id = insc.id || insc.Id;
                                const editing = editId === id;
                                const opciones = editing ? atletasOptionsFor(insc) : [];
                                return (
                                    <tr key={id}>
                                        <td>{insc.pruebaNombre || insc.PruebaNombre || `EP ${insc.eventoPruebaId}`}</td>
                                        <td>{insc.participanteId || insc.ParticipanteId || '—'}</td>
                                        <td>
                                            {editing ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                    {draftSeats.map((val, idx) => (
                                                        <select
                                                            key={idx}
                                                            value={val}
                                                            disabled={!cambiosAbiertos}
                                                            onChange={(e) => {
                                                                const next = [...draftSeats];
                                                                next[idx] = e.target.value;
                                                                setDraftSeats(next);
                                                            }}
                                                        >
                                                            <option value="">—</option>
                                                            {opciones.map((a) => (
                                                                <option key={a.id} value={a.id}>{a.label}</option>
                                                            ))}
                                                        </select>
                                                    ))}
                                                    {opciones.length === 0 && (
                                                        <small style={{ color: '#fbbf24' }}>
                                                            No hay atletas del mismo club con la categoría y sexo de esta prueba.
                                                        </small>
                                                    )}
                                                </div>
                                            ) : (
                                                crewLabel(insc)
                                            )}
                                        </td>
                                        <td>
                                            {editing ? (
                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    <button
                                                        className="btn-admin-primary"
                                                        disabled={!cambiosAbiertos || savingId === id}
                                                        onClick={() => saveEdit(insc)}
                                                    >
                                                        Guardar
                                                    </button>
                                                    <button className="btn-admin-secondary" onClick={() => setEditId(null)}>
                                                        Cancelar
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    className="btn-admin-secondary"
                                                    disabled={!cambiosAbiertos}
                                                    onClick={() => startEdit(insc)}
                                                >
                                                    Reemplazar
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default CorregirTripulacionesPanel;
