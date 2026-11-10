import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import InscripcionService from '../../services/InscripcionService';
import { getUserFacingError } from '../../utils/userFacingError';
import '../../components/SharedSections/AdminSections.css';

const CambiosPublicosPage = () => {
    const { token } = useParams();
    const [resumen, setResumen] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const data = await InscripcionService.getCambiosByToken(token);
                setResumen(data);
            } catch (e) {
                setError(getUserFacingError(e));
            } finally {
                setLoading(false);
            }
        })();
    }, [token]);

    if (loading) {
        return (
            <div style={{ maxWidth: 960, margin: '2rem auto', padding: '0 1rem' }}>
                <div className="loader-container"><div className="loader" /></div>
            </div>
        );
    }

    if (error || !resumen) {
        return (
            <div style={{ maxWidth: 640, margin: '3rem auto', padding: '1.5rem' }} className="glass-effect">
                <h2>Link no disponible</h2>
                <p>{error || 'No se pudo cargar el acceso de cambios.'}</p>
            </div>
        );
    }

    // Adaptar panel para usar atletas del resumen en modo token
    return (
        <div style={{ maxWidth: 1100, margin: '1.5rem auto', padding: '0 1rem' }}>
            <CorregirTripulacionesPanelToken
                token={token}
                resumen={resumen}
            />
        </div>
    );
};

/** Wrapper que inyecta atletas del resumen en el panel. */
const CorregirTripulacionesPanelToken = ({ token, resumen }) => {
    const [inscripciones, setInscripciones] = useState(resumen.inscripciones || []);
    const [msg, setMsg] = useState(null);
    const [editId, setEditId] = useState(null);
    const [draftSeats, setDraftSeats] = useState([]);
    const [savingId, setSavingId] = useState(null);

    const atletas = (resumen.atletasClub || resumen.AtletasClub || []).map((a) => ({
        id: a.id ?? a.Id,
        label: `${a.apellido || a.Apellido || ''} ${a.nombre || a.Nombre || ''}`.trim(),
    })).sort((a, b) => a.label.localeCompare(b.label));

    const cambiosAbiertos = resumen.cambiosAbiertos ?? resumen.CambiosAbiertos;

    const reload = async () => {
        const data = await InscripcionService.getCambiosByToken(token);
        setInscripciones(data.inscripciones || []);
    };

    const startEdit = (insc) => {
        const extras = insc.tripulantes || insc.Tripulantes || [];
        const current = [insc.participanteId || insc.ParticipanteId];
        [...extras]
            .sort((a, b) => (a.posicionEnBote || 0) - (b.posicionEnBote || 0))
            .forEach((t) => current.push(t.participanteId || t.ParticipanteId));
        setDraftSeats(current.map(String));
        setEditId(insc.id || insc.Id);
    };

    const saveEdit = async (insc) => {
        const ids = draftSeats.map((x) => Number(x)).filter((n) => n > 0);
        if (new Set(ids).size !== ids.length) {
            setMsg({ type: 'error', text: 'Hay atletas duplicados.' });
            return;
        }
        setSavingId(insc.id || insc.Id);
        try {
            await InscripcionService.updateTripulacionByToken(token, insc.id || insc.Id, {
                participanteId: ids[0],
                tripulantes: ids.slice(1).map((pid, idx) => ({ participanteId: pid, posicionEnBote: idx + 2 })),
            });
            setMsg({ type: 'ok', text: 'Tripulación actualizada.' });
            setEditId(null);
            await reload();
        } catch (e) {
            setMsg({ type: 'error', text: getUserFacingError(e) });
        } finally {
            setSavingId(null);
        }
    };

    const crewLabel = (insc) => {
        const titular = insc.participanteNombreCompleto || '—';
        const extras = (insc.tripulantes || []).map((t) => t.participanteNombreCompleto).filter(Boolean);
        return extras.length ? `${titular} + ${extras.join(', ')}` : titular;
    };

    return (
        <div className="section-container fade-in">
            <div className="section-header">
                <h2>Cambios de tripulación</h2>
                <p className="subtitle">
                    {resumen.eventoNombre} — {resumen.clubNombre}
                    {resumen.expiraEn && (
                        <> · válido hasta {new Date(resumen.expiraEn).toLocaleString('es-AR')}</>
                    )}
                </p>
            </div>

            {!cambiosAbiertos && (
                <div className="glass-effect" style={{ padding: '1rem', marginBottom: '1rem', border: '1px solid rgba(239,68,68,0.4)' }}>
                    La ventana de cambios está cerrada.
                </div>
            )}

            {msg && (
                <div style={{
                    marginBottom: '1rem', padding: '0.75rem 1rem', borderRadius: 8,
                    background: msg.type === 'ok' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                    color: msg.type === 'ok' ? '#34d399' : '#f87171',
                }}>{msg.text}</div>
            )}

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
                            return (
                                <tr key={id}>
                                    <td>{insc.pruebaNombre || `EP ${insc.eventoPruebaId}`}</td>
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
                                                        <option value="">Posición {idx + 1}</option>
                                                        {atletas.map((a) => (
                                                            <option key={a.id} value={a.id}>{a.label}</option>
                                                        ))}
                                                    </select>
                                                ))}
                                            </div>
                                        ) : crewLabel(insc)}
                                    </td>
                                    <td>
                                        {editing ? (
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <button className="btn-admin-primary" disabled={!cambiosAbiertos || savingId === id} onClick={() => saveEdit(insc)}>
                                                    Guardar
                                                </button>
                                                <button className="btn-admin-secondary" onClick={() => setEditId(null)}>Cancelar</button>
                                            </div>
                                        ) : (
                                            <button className="btn-admin-secondary" disabled={!cambiosAbiertos} onClick={() => startEdit(insc)}>
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
        </div>
    );
};

export default CambiosPublicosPage;
