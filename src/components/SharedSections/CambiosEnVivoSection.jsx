import React, { useEffect, useMemo, useState } from 'react';
import { Copy, Link2, Plus, Trash2, RefreshCw } from 'lucide-react';
import EventoService from '../../services/EventoService';
import FaseService from '../../services/FaseService';
import AtletaService from '../../services/AtletaService';
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
    const [addForm, setAddForm] = useState({ participanteId: '', numeroCompetidor: '', carril: '' });
    const [editCrew, setEditCrew] = useState(null); // { resultado, seats[] }

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
    }, [eventoId]);

    const fase = useMemo(
        () => fases.find((f) => String(f.id) === String(faseId)),
        [fases, faseId]
    );

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

    const saveNumero = async (resultado) => {
        const inscId = resultado.inscripcionId || resultado.InscripcionId;
        const nuevo = window.prompt('Nuevo Nº de bote', resultado.numeroCompetidor || '');
        if (nuevo == null) return;
        try {
            await InscripcionService.liveUpdateNumero(inscId, nuevo);
            flash('ok', 'Número actualizado.');
            await refreshFase();
        } catch (e) {
            flash('error', getUserFacingError(e));
        }
    };

    const saveNombre = async (resultado) => {
        const pid = resultado.participanteId || resultado.ParticipanteId;
        if (!pid) return;
        const nombre = window.prompt('Nombre', (resultado.participanteNombre || '').split(' ')[0] || '');
        if (nombre == null) return;
        const apellido = window.prompt('Apellido', (resultado.participanteNombre || '').split(' ').slice(1).join(' ') || '');
        if (apellido == null) return;
        try {
            await InscripcionService.livePatchNombre(pid, { nombre, apellido });
            flash('ok', 'Nombre actualizado.');
            await refreshFase();
        } catch (e) {
            flash('error', getUserFacingError(e));
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
            let clubAtletas = atletas;
            if (clubId) {
                clubAtletas = (atletas || []).filter(
                    (a) => Number(a.clubId || a.ClubId || a.idClub) === Number(clubId)
                );
                if (clubAtletas.length === 0) {
                    try {
                        clubAtletas = await AtletaService.getByClub(clubId);
                    } catch {
                        clubAtletas = atletas;
                    }
                }
            } else if (clubNombre) {
                clubAtletas = (atletas || []).filter(
                    (a) => (a.clubNombre || a.ClubNombre || '') === clubNombre
                );
                if (clubAtletas.length === 0) clubAtletas = atletas;
            }
            const seats = [resultado.participanteId || resultado.ParticipanteId || ''];
            const trip = [...(resultado.tripulantes || resultado.Tripulantes || [])].sort(
                (a, b) => (a.posicionEnBote || 0) - (b.posicionEnBote || 0)
            );
            trip.forEach((t) => seats.push(t.participanteId || t.ParticipanteId));
            setEditCrew({
                resultado,
                inscId,
                seats: seats.map(String),
                atletas: clubAtletas || [],
                clubNombre,
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

    const agregarBote = async () => {
        if (!fase || !addForm.participanteId) {
            flash('error', 'Seleccioná atleta titular.');
            return;
        }
        try {
            await InscripcionService.liveAgregar({
                eventoPruebaId: fase.eventoPruebaId || fase.EventoPruebaId,
                faseId: Number(faseId),
                carril: addForm.carril ? Number(addForm.carril) : null,
                numeroCompetidor: addForm.numeroCompetidor || String(addForm.participanteId),
                participanteId: Number(addForm.participanteId),
                tripulantes: [],
            });
            flash('ok', 'Bote agregado a la fase (sin rearmar cronograma).');
            setAddForm({ participanteId: '', numeroCompetidor: '', carril: '' });
            await refreshFase();
        } catch (e) {
            flash('error', getUserFacingError(e));
        }
    };

    // Precargar atletas al cambiar evento (todos — admin)
    useEffect(() => {
        if (!eventoId) return;
        (async () => {
            try {
                const all = await AtletaService.getAll();
                setAtletas(all || []);
            } catch {
                setAtletas([]);
            }
        })();
    }, [eventoId]);

    if (loading) return <div className="loader-container"><div className="loader" /></div>;

    return (
        <div className="section-container fade-in">
            <div className="section-header">
                <h2>Cambios en vivo</h2>
                <p className="subtitle">
                    Admin: carriles, tripulación, Nº, altas/bajas. No mueve horarios de otras pruebas.
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
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', alignItems: 'center' }}>
                    <h3 style={{ margin: 0 }}>Start list / carriles</h3>
                    <button className="btn-admin-primary" disabled={saving || !faseId} onClick={saveLanes}>
                        Guardar carriles
                    </button>
                </div>
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Carril</th>
                            <th>Nº</th>
                            <th>Atleta / Club</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {resultados.map((r) => (
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
                                <td>{r.numeroCompetidor || '—'}</td>
                                <td>
                                    {r.participanteNombre || '—'}
                                    {r.clubSigla || r.clubNombre ? (
                                        <span style={{ opacity: 0.65 }}> · {r.clubSigla || r.clubNombre}</span>
                                    ) : null}
                                </td>
                                <td style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    <button className="btn-admin-secondary" onClick={() => saveNumero(r)}>Nº</button>
                                    <button className="btn-admin-secondary" onClick={() => saveNombre(r)}>Nombre</button>
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
                        ))}
                        {resultados.length === 0 && (
                            <tr><td colSpan={4}>Sin botes en esta fase. Podés agregar abajo.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Alta rápida */}
            <div className="glass-effect" style={{ padding: '1rem', marginTop: '1.25rem' }}>
                <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Plus size={18} /> Agregar bote a esta fase</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
                    <div className="form-group" style={{ minWidth: 260, flex: 1 }}>
                        <label>Titular</label>
                        <select
                            value={addForm.participanteId}
                            onChange={(e) => setAddForm((p) => ({ ...p, participanteId: e.target.value }))}
                        >
                            <option value="">Seleccionar…</option>
                            {atletas.map((a) => (
                                <option key={a.id} value={a.id}>
                                    {a.apellido} {a.nombre}{a.clubNombre ? ` (${a.clubNombre})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Nº</label>
                        <input
                            value={addForm.numeroCompetidor}
                            onChange={(e) => setAddForm((p) => ({ ...p, numeroCompetidor: e.target.value }))}
                            style={{ width: 80 }}
                        />
                    </div>
                    <div className="form-group">
                        <label>Carril</label>
                        <input
                            type="number"
                            min={1}
                            value={addForm.carril}
                            onChange={(e) => setAddForm((p) => ({ ...p, carril: e.target.value }))}
                            style={{ width: 80 }}
                        />
                    </div>
                    <button className="btn-admin-primary" onClick={agregarBote}>Agregar</button>
                </div>
            </div>

            {/* Modal tripulación simple */}
            {editCrew && (
                <div className="modal-overlay" style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                }}>
                    <div className="glass-effect" style={{ padding: '1.25rem', minWidth: 320, maxWidth: 480 }}>
                        <h3>Editar tripulación</h3>
                        <p style={{ opacity: 0.75 }}>{editCrew.clubNombre || 'Mismo club'}</p>
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
                                    {(editCrew.atletas || atletas).map((a) => (
                                        <option key={a.id} value={a.id}>{a.apellido} {a.nombre}</option>
                                    ))}
                                </select>
                            </div>
                        ))}
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
