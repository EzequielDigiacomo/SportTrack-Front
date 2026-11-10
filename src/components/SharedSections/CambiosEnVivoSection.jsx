import React, { useEffect, useMemo, useState } from 'react';
import { Copy, Link2, Plus, Trash2, RefreshCw } from 'lucide-react';
import EventoService from '../../services/EventoService';
import FaseService from '../../services/FaseService';
import AtletaService from '../../services/AtletaService';
import ClubService from '../../services/ClubService';
import InscripcionService from '../../services/InscripcionService';
import { PUBLIC_APP_URL } from '../../utils/constants';
import { getUserFacingError } from '../../utils/userFacingError';
import { formatPruebaName } from '../../utils/pruebaLabelUtils';
import ConfirmDialog from '../Common/ConfirmDialog';
import './AdminSections.css';

const labelFaseCambios = (f) => {
    const pruebaLabel = formatPruebaName(f.prueba || f.Prueba, { forceBuild: true });
    const faseNombre = f.nombreFase || f.NombreFase || f.nombre || f.Nombre || '';
    return faseNombre ? `${pruebaLabel} — ${faseNombre}` : pruebaLabel;
};

const getAtletaClubId = (a) => Number(a?.clubId || a?.ClubId || a?.idClub || 0) || null;
const getAtletaCategoriaId = (a) =>
    Number(a?.categoriaId || a?.CategoriaId || a?.categoria?.id || a?.Categoria?.id || 0) || null;

const getFasePruebaInner = (faseObj) => {
    const ep = faseObj?.prueba || faseObj?.Prueba;
    return ep?.prueba || ep?.Prueba || ep;
};

const getFaseCategoriaId = (faseObj) => {
    const inner = getFasePruebaInner(faseObj);
    return Number(
        inner?.categoria?.id
        || inner?.categoriaId
        || inner?.CategoriaId
        || inner?.Categoria?.id
        || 0
    ) || null;
};

const getFaseSexoId = (faseObj) => {
    const inner = getFasePruebaInner(faseObj);
    return Number(
        inner?.sexoId
        || inner?.SexoId
        || inner?.sexo?.id
        || inner?.Sexo?.id
        || 0
    ) || null;
};

const getAtletaSexoId = (a) =>
    Number(a?.sexoId || a?.SexoId || a?.sexo?.id || a?.Sexo?.id || 0) || null;

const getMaxTripulantes = (boteNombre) => {
    if (!boteNombre) return 1;
    const n = String(boteNombre).toLowerCase();
    if (n.includes('k2') || n.includes('c2') || n.includes('doble')) return 2;
    if (n.includes('k4') || n.includes('c4') || n.includes('cuadruple') || n.includes('cuádruple')) return 4;
    return 1;
};

const getFaseBoteTipo = (faseObj) => {
    const inner = getFasePruebaInner(faseObj);
    return inner?.bote?.tipo || inner?.bote?.nombre || inner?.Bote?.Tipo || '';
};

const sortAtletasByName = (list) =>
    [...(list || [])].sort((a, b) => {
        const ap = `${a.apellido || a.Apellido || ''} ${a.nombre || a.Nombre || ''}`.trim();
        const bp = `${b.apellido || b.Apellido || ''} ${b.nombre || b.Nombre || ''}`.trim();
        return ap.localeCompare(bp, 'es');
    });

/** Formato club: Apellido Nombre */
const formatClubAthleteName = (a, fallback = '—') => {
    if (!a) return fallback;
    const label = `${a.apellido || a.Apellido || ''} ${a.nombre || a.Nombre || ''}`.trim();
    return label || fallback;
};

/** Asientos 1..N con id y etiqueta según inscripción del club. */
const crewSeatsFromResultado = (r, atletasById) => {
    const seats = [];
    const titularId = Number(r.participanteId || r.ParticipanteId || 0) || null;
    if (titularId) {
        seats.push({
            pos: 1,
            id: titularId,
            label: formatClubAthleteName(
                atletasById.get(titularId),
                r.participanteNombre || r.ParticipanteNombre || '—'
            ),
        });
    }
    const trip = [...(r.tripulantes || r.Tripulantes || [])].sort(
        (a, b) => (a.posicionEnBote || a.PosicionEnBote || 0) - (b.posicionEnBote || b.PosicionEnBote || 0)
    );
    trip.forEach((t, idx) => {
        const pid = Number(t.participanteId || t.ParticipanteId || 0) || null;
        if (!pid) return;
        seats.push({
            pos: idx + 2,
            id: pid,
            label: formatClubAthleteName(
                atletasById.get(pid),
                t.participanteNombreCompleto || t.ParticipanteNombreCompleto || '—'
            ),
        });
    });
    return seats;
};

const toDateInput = (value) => {
    if (!value) return '';
    const s = String(value);
    return s.length >= 10 ? s.substring(0, 10) : s;
};

/** Mismo club + misma categoría + mismo sexo (si la prueba no es Mixto). */
const filterAtletasElegibles = (list, { clubId, clubNombre, categoriaId, sexoId }) => {
    const club = clubId ? Number(clubId) : null;
    const cat = categoriaId ? Number(categoriaId) : null;
    const sex = sexoId ? Number(sexoId) : null;
    return (list || []).filter((a) => {
        const aClub = getAtletaClubId(a);
        const aCat = getAtletaCategoriaId(a);
        const aSex = getAtletaSexoId(a);
        const sameClub = club
            ? aClub === club
            : clubNombre
                ? String(a.clubNombre || a.ClubNombre || '') === String(clubNombre)
                : false;
        if (!sameClub) return false;
        if (cat && aCat !== cat) return false;
        // 3 = Mixto → no filtrar por sexo
        if (sex && sex !== 3 && aSex !== sex) return false;
        return true;
    });
};

const CambiosEnVivoSection = () => {
    const [eventos, setEventos] = useState([]);
    const [eventoId, setEventoId] = useState('');
    const [fases, setFases] = useState([]);
    const [faseId, setFaseId] = useState('');
    const [msg, setMsg] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [laneDraft, setLaneDraft] = useState({});
    const [tokens, setTokens] = useState([]);
    const [atletas, setAtletas] = useState([]);
    const [confirmBaja, setConfirmBaja] = useState({ show: false, resultado: null, force: false });
    const [addBoteOpen, setAddBoteOpen] = useState(false);
    const [addForm, setAddForm] = useState({ clubId: '', seats: [''], carril: '' });
    const [addBoteError, setAddBoteError] = useState(null);
    const [clubes, setClubes] = useState([]);
    const [editCrew, setEditCrew] = useState(null); // { resultado, seats[] }
    const [selectedSeatKey, setSelectedSeatKey] = useState(null); // `${resultadoId}:${participanteId}`
    const [editAthlete, setEditAthlete] = useState(null); // { id, form, loading, saving }

    useEffect(() => {
        (async () => {
            try {
                const data = await EventoService.getAll();
                setEventos(data || []);
                if (data?.length) setEventoId(String(data[0].id));
            } catch (e) {
                setMsg({ type: 'error', text: getUserFacingError(e) });
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const loadFases = async (evId) => {
        if (!evId) return;
        try {
            const data = await FaseService.getByEvento(evId);
            const list = Array.isArray(data) ? data : [];
            setFases(list);
            setFaseId(list[0] ? String(list[0].id) : '');
        } catch (e) {
            setMsg({ type: 'error', text: getUserFacingError(e) });
        }
    };

    const loadTokens = async (evId) => {
        if (!evId) return;
        try {
            const data = await InscripcionService.listTokensCambios(evId);
            setTokens(data || []);
        } catch {
            setTokens([]);
        }
    };

    useEffect(() => {
        if (!eventoId) return;
        loadFases(eventoId);
        loadTokens(eventoId);
        setSelectedSeatKey(null);
        setEditAthlete(null);
        setAddBoteOpen(false);
    }, [eventoId]);

    useEffect(() => {
        setSelectedSeatKey(null);
        setEditAthlete(null);
        setAddBoteOpen(false);
    }, [faseId]);

    const fase = useMemo(
        () => fases.find((f) => String(f.id) === String(faseId)),
        [fases, faseId]
    );

    const faseCategoriaId = useMemo(() => getFaseCategoriaId(fase), [fase]);
    const faseSexoId = useMemo(() => getFaseSexoId(fase), [fase]);
    const seatsNeeded = useMemo(() => getMaxTripulantes(getFaseBoteTipo(fase)), [fase]);

    const atletasById = useMemo(() => {
        const map = new Map();
        (atletas || []).forEach((a) => {
            const id = Number(a.id || a.Id || a.participanteId || a.ParticipanteId);
            if (id) map.set(id, a);
        });
        return map;
    }, [atletas]);

    const clubesOrdenados = useMemo(
        () => [...(clubes || [])].sort((a, b) =>
            String(a.nombre || a.Nombre || '').localeCompare(String(b.nombre || b.Nombre || ''), 'es')
        ),
        [clubes]
    );

    const atletasAddBote = useMemo(() => {
        if (!addForm.clubId) return [];
        return sortAtletasByName(
            filterAtletasElegibles(atletas, {
                clubId: addForm.clubId,
                categoriaId: faseCategoriaId,
                sexoId: faseSexoId,
            })
        );
    }, [atletas, addForm.clubId, faseCategoriaId, faseSexoId]);

    const resultados = useMemo(() => {
        const list = fase?.resultados || fase?.Resultados || [];
        return [...list].sort((a, b) => (a.carril || 0) - (b.carril || 0));
    }, [fase]);

    useEffect(() => {
        const draft = {};
        resultados.forEach((r) => {
            draft[r.id] = r.carril ?? '';
        });
        setLaneDraft(draft);
    }, [faseId, resultados.length]);

    const flash = (type, text) => setMsg({ type, text });

    const refreshFase = async () => {
        await loadFases(eventoId);
    };

    const saveLanes = async () => {
        if (!faseId) return;
        setSaving(true);
        try {
            const asignaciones = Object.entries(laneDraft)
                .filter(([, c]) => Number(c) > 0)
                .map(([resultadoId, carril]) => ({
                    resultadoId: Number(resultadoId),
                    carril: Number(carril),
                }));
            await InscripcionService.liveReasignarCarriles(Number(faseId), asignaciones);
            flash('ok', 'Carriles actualizados (sin mover horarios).');
            await refreshFase();
        } catch (e) {
            flash('error', getUserFacingError(e));
        } finally {
            setSaving(false);
        }
    };

    const openAthleteQuickEdit = async (participanteId) => {
        if (!participanteId) return;
        setEditAthlete({ id: participanteId, form: null, loading: true, saving: false });
        try {
            const data = await AtletaService.getById(participanteId);
            setEditAthlete({
                id: participanteId,
                loading: false,
                saving: false,
                form: {
                    nombre: data.nombre || data.Nombre || '',
                    apellido: data.apellido || data.Apellido || '',
                    dni: data.dni || data.Dni || data.documento || data.Documento || '',
                    fechaNacimiento: toDateInput(data.fechaNacimiento || data.FechaNacimiento),
                    sexoId: data.sexoId || data.SexoId || 1,
                    clubId: data.clubId || data.ClubId || null,
                    categoriaId: data.categoriaId || data.CategoriaId || null,
                    email: data.email || data.Email || '',
                    pais: data.pais || data.Pais || '',
                    pagoAfiliacionAlDia: data.pagoAfiliacionAlDia ?? data.PagoAfiliacionAlDia ?? true,
                },
            });
        } catch (e) {
            setEditAthlete(null);
            flash('error', getUserFacingError(e));
        }
    };

    const handleAthleteSeatClick = (resultadoId, participanteId) => {
        const key = `${resultadoId}:${participanteId}`;
        if (selectedSeatKey === key) {
            openAthleteQuickEdit(participanteId);
            return;
        }
        setSelectedSeatKey(key);
    };

    const saveAthleteQuickEdit = async () => {
        if (!editAthlete?.id || !editAthlete.form) return;
        setEditAthlete((prev) => (prev ? { ...prev, saving: true } : prev));
        try {
            const f = editAthlete.form;
            await AtletaService.update(editAthlete.id, {
                nombre: f.nombre,
                apellido: f.apellido,
                dni: f.dni,
                fechaNacimiento: f.fechaNacimiento,
                sexoId: f.sexoId,
                clubId: f.clubId,
                categoriaId: f.categoriaId,
                email: f.email,
                pais: f.pais,
                pagoAfiliacionAlDia: f.pagoAfiliacionAlDia,
            });
            flash('ok', 'Atleta actualizado.');
            setEditAthlete(null);
            // Refrescar caché local + fase para reflejar nombres
            try {
                const all = await AtletaService.getAll();
                setAtletas(all || []);
            } catch {
                /* ignore */
            }
            await refreshFase();
        } catch (e) {
            flash('error', getUserFacingError(e));
            setEditAthlete((prev) => (prev ? { ...prev, saving: false } : prev));
        }
    };

    const doBaja = async () => {
        const r = confirmBaja.resultado;
        if (!r) return;
        const inscId = r.inscripcionId || r.InscripcionId;
        try {
            await InscripcionService.liveBaja(inscId, confirmBaja.force);
            flash('ok', 'Bote dado de baja. Horarios de otras pruebas intactos.');
            setConfirmBaja({ show: false, resultado: null, force: false });
            await refreshFase();
        } catch (e) {
            flash('error', getUserFacingError(e));
        }
    };

    const generarLinks = async () => {
        try {
            const data = await InscripcionService.generarTokensCambios(Number(eventoId), {});
            setTokens(data || []);
            flash('ok', `Generados ${(data || []).length} links de cambios.`);
        } catch (e) {
            flash('error', getUserFacingError(e));
        }
    };

    const revocarToken = async (tokenId) => {
        try {
            await InscripcionService.revocarTokenCambios(Number(eventoId), tokenId);
            await loadTokens(eventoId);
            flash('ok', 'Link revocado.');
        } catch (e) {
            flash('error', getUserFacingError(e));
        }
    };

    const copyLink = async (token) => {
        const url = `${PUBLIC_APP_URL}/cambios/${token}`;
        try {
            await navigator.clipboard.writeText(url);
            flash('ok', 'Link copiado.');
        } catch {
            window.prompt('Copiá el link', url);
        }
    };

    const openCrewEdit = async (resultado) => {
        const inscId = resultado.inscripcionId || resultado.InscripcionId;
        try {
            const clubNombre = resultado.clubNombre || resultado.ClubNombre;
            const clubId = resultado.clubId || resultado.ClubId;
            const categoriaId = getFaseCategoriaId(fase);
            const sexoId = getFaseSexoId(fase);
            let pool = atletas || [];

            if (clubId) {
                const byClub = pool.filter((a) => getAtletaClubId(a) === Number(clubId));
                if (byClub.length === 0) {
                    try {
                        pool = await AtletaService.getByClub(clubId);
                    } catch {
                        pool = [];
                    }
                } else {
                    pool = byClub;
                }
            }

            let clubAtletas = sortAtletasByName(
                filterAtletasElegibles(pool, { clubId, clubNombre, categoriaId, sexoId })
            );

            // Mantener en el listado a quienes ya están en el bote (aunque el filtro falle por datos incompletos).
            const seats = [resultado.participanteId || resultado.ParticipanteId || ''];
            const trip = [...(resultado.tripulantes || resultado.Tripulantes || [])].sort(
                (a, b) => (a.posicionEnBote || a.PosicionEnBote || 0) - (b.posicionEnBote || b.PosicionEnBote || 0)
            );
            trip.forEach((t) => seats.push(t.participanteId || t.ParticipanteId));
            const seatIds = new Set(seats.map(String).filter(Boolean));
            const missing = (atletas || []).filter((a) => seatIds.has(String(a.id)) && !clubAtletas.some((x) => String(x.id) === String(a.id)));
            if (missing.length) clubAtletas = sortAtletasByName([...clubAtletas, ...missing]);

            setEditCrew({
                resultado,
                inscId,
                seats: seats.map(String),
                atletas: clubAtletas,
                clubNombre,
                categoriaId,
                sexoId,
            });
        } catch (e) {
            flash('error', getUserFacingError(e));
        }
    };

    const saveCrew = async () => {
        if (!editCrew) return;
        const ids = editCrew.seats.map(Number).filter((n) => n > 0);
        if (!ids.length) return;
        try {
            await InscripcionService.liveUpdateTripulacion(editCrew.inscId, {
                participanteId: ids[0],
                tripulantes: ids.slice(1).map((pid, idx) => ({ participanteId: pid, posicionEnBote: idx + 2 })),
            });
            flash('ok', 'Tripulación actualizada.');
            setEditCrew(null);
            await refreshFase();
        } catch (e) {
            flash('error', getUserFacingError(e));
        }
    };

    const openAddBote = () => {
        if (!faseId) {
            flash('error', 'Seleccioná una fase primero.');
            return;
        }
        setAddForm({
            clubId: '',
            seats: Array.from({ length: seatsNeeded }, () => ''),
            carril: '',
        });
        setAddBoteError(null);
        setAddBoteOpen(true);
    };

    const agregarBote = async () => {
        if (!fase) return;
        const ids = (addForm.seats || []).map(Number).filter((n) => n > 0);
        if (!addForm.clubId) {
            setAddBoteError('Seleccioná un club.');
            return;
        }
        if (ids.length < seatsNeeded) {
            setAddBoteError(`Esta prueba requiere ${seatsNeeded} atleta(s).`);
            return;
        }
        if (new Set(ids).size !== ids.length) {
            setAddBoteError('Hay atletas duplicados en el bote.');
            return;
        }
        setAddBoteError(null);
        try {
            await InscripcionService.liveAgregar({
                eventoPruebaId: fase.eventoPruebaId || fase.EventoPruebaId,
                faseId: Number(faseId),
                carril: addForm.carril ? Number(addForm.carril) : null,
                numeroCompetidor: String(ids[0]),
                participanteId: ids[0],
                tripulantes: ids.slice(1).map((pid, idx) => ({
                    participanteId: pid,
                    posicionEnBote: idx + 2,
                })),
            });
            flash('ok', 'Bote agregado a la fase (sin rearmar cronograma).');
            setAddBoteOpen(false);
            setAddBoteError(null);
            setAddForm({ clubId: '', seats: [''], carril: '' });
            await refreshFase();
        } catch (e) {
            setAddBoteError(getUserFacingError(e));
        }
    };

    // Precargar atletas y clubes al cambiar evento (admin)
    useEffect(() => {
        if (!eventoId) return;
        (async () => {
            try {
                const [all, clubs] = await Promise.all([
                    AtletaService.getAll(),
                    ClubService.getAll(),
                ]);
                setAtletas(all || []);
                setClubes(clubs || []);
            } catch {
                setAtletas([]);
                setClubes([]);
            }
        })();
    }, [eventoId]);

    if (loading) return <div className="loader-container"><div className="loader" /></div>;

    return (
        <div className="section-container fade-in">
            <div className="section-header">
                <h2>Cambios en vivo</h2>
                <p className="subtitle">
                    Admin: carriles, tripulación, altas/bajas. No mueve horarios de otras pruebas.
                </p>
            </div>

            {msg && (
                <div style={{
                    marginBottom: '1rem', padding: '0.75rem 1rem', borderRadius: 8,
                    background: msg.type === 'ok' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                    color: msg.type === 'ok' ? '#34d399' : '#f87171',
                }}>{msg.text}</div>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                <div className="form-group" style={{ minWidth: 220 }}>
                    <label>Evento</label>
                    <select value={eventoId} onChange={(e) => setEventoId(e.target.value)}>
                        {eventos.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                    </select>
                </div>
                <div className="form-group" style={{ minWidth: 320, flex: 1 }}>
                    <label>Fase / serie</label>
                    <select value={faseId} onChange={(e) => setFaseId(e.target.value)}>
                        {fases.length === 0 && (
                            <option value="">Sin fases generadas en este evento</option>
                        )}
                        {fases.map((f) => (
                            <option key={f.id} value={f.id}>
                                {labelFaseCambios(f)}
                            </option>
                        ))}
                    </select>
                </div>
                <button className="btn-admin-secondary" style={{ alignSelf: 'flex-end' }} onClick={refreshFase}>
                    <RefreshCw size={16} /> Refrescar
                </button>
            </div>

            {/* Links mágicos */}
            <div className="glass-effect" style={{ padding: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Link2 size={18} /> Links de cambios (pre-delegados)
                    </h3>
                    <button className="btn-admin-primary" onClick={generarLinks}>Generar / renovar links</button>
                </div>
                {tokens.length === 0 ? (
                    <p style={{ opacity: 0.7, marginTop: 8 }}>Sin links generados.</p>
                ) : (
                    <div className="admin-table-container" style={{ marginTop: 12 }}>
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Club</th>
                                    <th>Expira</th>
                                    <th>Estado</th>
                                    <th>Usos</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {tokens.map((t) => (
                                    <tr key={t.id}>
                                        <td>{t.clubNombre}</td>
                                        <td>{t.expiraEn ? new Date(t.expiraEn).toLocaleString('es-AR') : '—'}</td>
                                        <td>{t.revocado ? 'Revocado' : 'Activo'}</td>
                                        <td>{t.usos}</td>
                                        <td style={{ display: 'flex', gap: 8 }}>
                                            {!t.revocado && (
                                                <>
                                                    <button className="btn-admin-secondary" onClick={() => copyLink(t.token)} title="Copiar">
                                                        <Copy size={14} />
                                                    </button>
                                                    <button className="btn-admin-secondary" onClick={() => revocarToken(t.id)}>Revocar</button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Grilla de carriles */}
            <div className="admin-table-container glass-effect">
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0 }}>Start list / carriles</h3>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn-admin-secondary" disabled={!faseId} onClick={openAddBote} title="Agregar bote">
                            <Plus size={16} /> Agregar bote
                        </button>
                        <button className="btn-admin-primary" disabled={saving || !faseId} onClick={saveLanes}>
                            Guardar carriles
                        </button>
                    </div>
                </div>
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Carril</th>
                            <th>Atletas / Club</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {resultados.map((r) => {
                            const seats = crewSeatsFromResultado(r, atletasById);
                            const clubLabel = r.clubSigla || r.ClubSigla || r.clubNombre || r.ClubNombre || '';
                            return (
                                <tr key={r.id}>
                                    <td>
                                        <input
                                            type="number"
                                            min={1}
                                            style={{ width: 64 }}
                                            value={laneDraft[r.id] ?? ''}
                                            onChange={(e) => setLaneDraft((prev) => ({ ...prev, [r.id]: e.target.value }))}
                                        />
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            {seats.length === 0 && <span>—</span>}
                                            {seats.map((seat) => {
                                                const key = `${r.id}:${seat.id}`;
                                                const selected = selectedSeatKey === key;
                                                return (
                                                    <button
                                                        key={key}
                                                        type="button"
                                                        onClick={() => handleAthleteSeatClick(r.id, seat.id)}
                                                        title={selected ? 'Click de nuevo para editar' : 'Click para seleccionar'}
                                                        style={{
                                                            all: 'unset',
                                                            cursor: 'pointer',
                                                            padding: '2px 6px',
                                                            borderRadius: 4,
                                                            lineHeight: 1.35,
                                                            background: selected ? 'rgba(59,130,246,0.28)' : 'transparent',
                                                            outline: selected ? '1px solid rgba(96,165,250,0.7)' : 'none',
                                                        }}
                                                    >
                                                        <span style={{ opacity: 0.7, marginRight: 6 }}>{seat.pos}-</span>
                                                        {seat.label}
                                                    </button>
                                                );
                                            })}
                                            {clubLabel ? (
                                                <span style={{ opacity: 0.65, fontSize: '0.9em', paddingLeft: 6 }}>{clubLabel}</span>
                                            ) : null}
                                        </div>
                                    </td>
                                    <td style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                        <button className="btn-admin-secondary" onClick={() => openCrewEdit(r)}>Tripulación</button>
                                        <button
                                            className="btn-admin-secondary"
                                            style={{ color: '#f87171' }}
                                            onClick={() => setConfirmBaja({ show: true, resultado: r, force: false })}
                                        >
                                            <Trash2 size={14} /> Baja
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        {resultados.length === 0 && (
                            <tr><td colSpan={3}>Sin botes en esta fase. Usá “Agregar bote”.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal agregar bote */}
            {addBoteOpen && (
                <div className="modal-overlay" style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                }}>
                    <div className="glass-effect" style={{ padding: '1.25rem', minWidth: 320, maxWidth: 480, width: '100%' }}>
                        <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Plus size={18} /> Agregar bote
                        </h3>
                        <p style={{ opacity: 0.75, marginTop: 0 }}>
                            Elegí el club; se listan atletas de la categoría
                            {faseSexoId && faseSexoId !== 3 ? ' y sexo' : ''} de esta fase
                            {seatsNeeded > 1 ? ` (${seatsNeeded} plazas)` : ''}.
                        </p>
                        {addBoteError && (
                            <div style={{
                                marginBottom: '0.85rem',
                                padding: '0.65rem 0.85rem',
                                borderRadius: 8,
                                background: 'rgba(239,68,68,0.15)',
                                color: '#f87171',
                            }}>
                                {addBoteError}
                            </div>
                        )}
                        <div className="form-group">
                            <label>Club</label>
                            <select
                                value={addForm.clubId}
                                onChange={(e) => {
                                    setAddBoteError(null);
                                    setAddForm((p) => ({
                                        ...p,
                                        clubId: e.target.value,
                                        seats: Array.from({ length: seatsNeeded }, () => ''),
                                    }));
                                }}
                            >
                                <option value="">Seleccionar club…</option>
                                {clubesOrdenados.map((c) => (
                                    <option key={c.id || c.Id} value={c.id || c.Id}>
                                        {c.nombre || c.Nombre}
                                        {(c.siglas || c.Siglas) ? ` (${c.siglas || c.Siglas})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {addForm.clubId ? (
                            <>
                                {(addForm.seats || []).map((val, idx) => (
                                    <div className="form-group" key={idx}>
                                        <label>Atleta {idx + 1}</label>
                                        <select
                                            value={val}
                                            onChange={(e) => {
                                                setAddBoteError(null);
                                                const next = [...addForm.seats];
                                                next[idx] = e.target.value;
                                                setAddForm((p) => ({ ...p, seats: next }));
                                            }}
                                        >
                                            <option value="">—</option>
                                            {atletasAddBote.map((a) => (
                                                <option key={a.id} value={a.id}>
                                                    {a.apellido} {a.nombre}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                                {atletasAddBote.length === 0 && (
                                    <p style={{ opacity: 0.7, fontSize: '0.9rem' }}>
                                        No hay atletas elegibles en este club para la categoría/sexo de la prueba.
                                    </p>
                                )}
                            </>
                        ) : (
                            <p style={{ opacity: 0.65, fontSize: '0.9rem' }}>Seleccioná un club para cargar atletas.</p>
                        )}
                        <div className="form-group">
                            <label>Carril (opcional)</label>
                            <input
                                type="number"
                                min={1}
                                value={addForm.carril}
                                onChange={(e) => setAddForm((p) => ({ ...p, carril: e.target.value }))}
                                style={{ width: 100 }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                            <button className="btn-admin-primary" onClick={agregarBote}>Agregar</button>
                            <button
                                className="btn-admin-secondary"
                                onClick={() => {
                                    setAddBoteOpen(false);
                                    setAddBoteError(null);
                                }}
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal tripulación simple */}
            {editCrew && (
                <div className="modal-overlay" style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                }}>
                    <div className="glass-effect" style={{ padding: '1.25rem', minWidth: 320, maxWidth: 480 }}>
                        <h3>Editar tripulación</h3>
                        <p style={{ opacity: 0.75 }}>
                            Solo atletas del mismo club
                            {editCrew.clubNombre ? ` (${editCrew.clubNombre})` : ''}
                            {editCrew.categoriaId ? ', misma categoría' : ''}
                            {editCrew.sexoId && editCrew.sexoId !== 3 ? ' y mismo sexo' : ''}
                            {' '}de la prueba.
                        </p>
                        {editCrew.seats.map((val, idx) => (
                            <div className="form-group" key={idx}>
                                <label>Posición {idx + 1}</label>
                                <select
                                    value={val}
                                    onChange={(e) => {
                                        const next = [...editCrew.seats];
                                        next[idx] = e.target.value;
                                        setEditCrew({ ...editCrew, seats: next });
                                    }}
                                >
                                    <option value="">—</option>
                                    {(editCrew.atletas || []).map((a) => (
                                        <option key={a.id} value={a.id}>{a.apellido} {a.nombre}</option>
                                    ))}
                                </select>
                            </div>
                        ))}
                        {(editCrew.atletas || []).length === 0 && (
                            <p style={{ opacity: 0.7, fontSize: '0.9rem' }}>
                                No hay atletas elegibles (mismo club, categoría y sexo).
                            </p>
                        )}
                        <button
                            className="btn-admin-secondary"
                            style={{ marginBottom: 12 }}
                            onClick={() => setEditCrew({ ...editCrew, seats: [...editCrew.seats, ''] })}
                        >
                            + Remero
                        </button>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn-admin-primary" onClick={saveCrew}>Guardar</button>
                            <button className="btn-admin-secondary" onClick={() => setEditCrew(null)}>Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal edición rápida de atleta */}
            {editAthlete && (
                <div className="modal-overlay" style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                }}>
                    <div className="glass-effect" style={{ padding: '1.25rem', minWidth: 320, maxWidth: 440, width: '100%' }}>
                        <h3 style={{ marginTop: 0 }}>Edición rápida</h3>
                        {editAthlete.loading || !editAthlete.form ? (
                            <p style={{ opacity: 0.75 }}>Cargando datos del atleta…</p>
                        ) : (
                            <>
                                <div className="form-group">
                                    <label>Apellido</label>
                                    <input
                                        value={editAthlete.form.apellido}
                                        onChange={(e) => setEditAthlete((prev) => ({
                                            ...prev,
                                            form: { ...prev.form, apellido: e.target.value },
                                        }))}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Nombre</label>
                                    <input
                                        value={editAthlete.form.nombre}
                                        onChange={(e) => setEditAthlete((prev) => ({
                                            ...prev,
                                            form: { ...prev.form, nombre: e.target.value },
                                        }))}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Nº documento</label>
                                    <input
                                        value={editAthlete.form.dni}
                                        onChange={(e) => setEditAthlete((prev) => ({
                                            ...prev,
                                            form: { ...prev.form, dni: e.target.value },
                                        }))}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Fecha de nacimiento</label>
                                    <input
                                        type="date"
                                        value={editAthlete.form.fechaNacimiento}
                                        onChange={(e) => setEditAthlete((prev) => ({
                                            ...prev,
                                            form: { ...prev.form, fechaNacimiento: e.target.value },
                                        }))}
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                    <button
                                        className="btn-admin-primary"
                                        disabled={editAthlete.saving}
                                        onClick={saveAthleteQuickEdit}
                                    >
                                        {editAthlete.saving ? 'Guardando…' : 'Guardar'}
                                    </button>
                                    <button
                                        className="btn-admin-secondary"
                                        disabled={editAthlete.saving}
                                        onClick={() => setEditAthlete(null)}
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            <ConfirmDialog
                isOpen={confirmBaja.show}
                title="Dar de baja bote"
                message="Se elimina la inscripción y su lugar en la serie. No se mueven horarios de otras pruebas."
                confirmText="Dar de baja"
                type="danger"
                onConfirm={doBaja}
                onClose={() => setConfirmBaja({ show: false, resultado: null, force: false })}
            />
        </div>
    );
};

export default CambiosEnVivoSection;
