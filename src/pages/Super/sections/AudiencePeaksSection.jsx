import React, { useCallback, useEffect, useState } from 'react';
import { Activity, RefreshCw, Users, Eye, Shield, Trophy } from 'lucide-react';
import AudienceService from '../../../services/AudienceService';
import { useToast } from '../../../context/ToastContext';
import './AudiencePeaksSection.css';

const formatFecha = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleString('es-AR');
};

const levelClass = (level) => {
    if (level === 'critical') return 'audience-level-critical';
    if (level === 'warning') return 'audience-level-warning';
    return 'audience-level-ok';
};

const AudiencePeaksSection = () => {
    const { addToast } = useToast();
    const [live, setLive] = useState(null);
    const [peaks, setPeaks] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        try {
            const [liveData, peaksData] = await Promise.all([
                AudienceService.getLive(),
                AudienceService.getPeaks(150),
            ]);
            setLive(liveData || null);
            setPeaks(Array.isArray(peaksData) ? peaksData : []);
        } catch (err) {
            console.error(err);
            addToast(err?.message || 'No se pudo cargar la audiencia', 'error');
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        load();
        const id = setInterval(load, 10000);
        return () => clearInterval(id);
    }, [load]);

    if (loading && !live) {
        return <div className="loader-container"><div className="loader" /></div>;
    }

    const pct = live?.saturationPercent ?? 0;

    return (
        <div className="audience-peaks-section fade-in">
            <div className="audience-peaks-header">
                <div>
                    <h1 className="gradient-text">Audiencia en vivo</h1>
                    <p>Conexiones SignalR concurrentes y registro de picos</p>
                </div>
                <button type="button" className="audience-refresh-btn glass-effect" onClick={load} title="Actualizar">
                    <RefreshCw size={16} /> Actualizar
                </button>
            </div>

            {live && (
                <div className={`audience-live-card glass-effect ${levelClass(live.saturationLevel)}`}>
                    <div className="audience-live-top">
                        <div className="audience-live-title">
                            <Activity size={20} />
                            <span>Saturación actual</span>
                        </div>
                        <strong>{pct}%</strong>
                    </div>
                    <div className="audience-bar-track">
                        <div
                            className="audience-bar-fill"
                            style={{ width: `${Math.min(100, pct)}%` }}
                        />
                    </div>
                    <div className="audience-live-stats">
                        <div><Users size={14} /> <span>{live.totalConnections} / {live.softCapacity} total</span></div>
                        <div><Eye size={14} /> <span>{live.liveConnections} live</span></div>
                        <div><Shield size={14} /> <span>{live.operatorConnections} operadores</span></div>
                        <div><Trophy size={14} /> <span>Pico sesión: {live.sessionPeakTotal}</span></div>
                    </div>
                    {live.byEvento?.length > 0 && (
                        <div className="audience-by-event">
                            <h4>Por evento</h4>
                            <ul>
                                {live.byEvento.slice(0, 8).map((e) => (
                                    <li key={e.eventoId}>
                                        <span>Evento #{e.eventoId}</span>
                                        <span>{e.total} (live {e.live} · ops {e.operators})</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            <div className="audience-peaks-card glass-effect">
                <h3>Historial de picos / muestras</h3>
                <div className="audience-peaks-table-wrap">
                    <table className="audience-peaks-table">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Total</th>
                                <th>Live</th>
                                <th>Operadores</th>
                                <th>Saturación</th>
                                <th>Evento top</th>
                                <th>Pico</th>
                            </tr>
                        </thead>
                        <tbody>
                            {peaks.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="audience-empty">
                                        Todavía no hay muestras. Se registran cuando hay conexiones activas.
                                    </td>
                                </tr>
                            ) : (
                                peaks.map((p) => (
                                    <tr key={p.id} className={p.isPeakRecord ? 'is-peak' : ''}>
                                        <td>{formatFecha(p.capturedAtUtc)}</td>
                                        <td>{p.totalConnections}</td>
                                        <td>{p.liveConnections}</td>
                                        <td>{p.operatorConnections}</td>
                                        <td>{p.saturationPercent}%</td>
                                        <td>
                                            {p.topEventoNombre
                                                ? `${p.topEventoNombre} (${p.topEventoConnections})`
                                                : p.topEventoId
                                                    ? `#${p.topEventoId} (${p.topEventoConnections})`
                                                    : '—'}
                                        </td>
                                        <td>{p.isPeakRecord ? 'Sí' : '—'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AudiencePeaksSection;
