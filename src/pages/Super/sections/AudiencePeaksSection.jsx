import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, RefreshCw, Users, Eye, Shield, Trophy, Settings2 } from 'lucide-react';
import AudienceService from '../../../services/AudienceService';
import { useToast } from '../../../context/ToastContext';
import { getUserFacingError } from '../../../utils/userFacingError';
import './AudiencePeaksSection.css';

const PEAKS_PAGE_SIZE = 12;

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
    const [capacity, setCapacity] = useState(null);
    const [customValue, setCustomValue] = useState(200);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [peaksPage, setPeaksPage] = useState(1);

    const sortedPeaks = useMemo(() => (
        [...peaks].sort((a, b) => {
            const timeA = new Date(a.capturedAtUtc || 0).getTime();
            const timeB = new Date(b.capturedAtUtc || 0).getTime();
            return timeB - timeA;
        })
    ), [peaks]);

    const peaksTotalPages = Math.max(1, Math.ceil(sortedPeaks.length / PEAKS_PAGE_SIZE));
    const safePeaksPage = Math.min(peaksPage, peaksTotalPages);
    const pagedPeaks = sortedPeaks.slice(
        (safePeaksPage - 1) * PEAKS_PAGE_SIZE,
        safePeaksPage * PEAKS_PAGE_SIZE
    );

    const load = useCallback(async () => {
        try {
            const [liveData, peaksData, capacityData] = await Promise.all([
                AudienceService.getLive(),
                AudienceService.getPeaks(150),
                AudienceService.getCapacity(),
            ]);
            setLive(liveData || null);
            setPeaks(Array.isArray(peaksData) ? peaksData : []);
            setCapacity(capacityData || null);
            if (capacityData?.softCapacity) {
                setCustomValue(capacityData.softCapacity);
            }
        } catch (err) {
            console.error(err);
            addToast(getUserFacingError(err, 'No se pudo cargar la audiencia'), 'error');
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        load();
        const id = setInterval(load, 10000);
        return () => clearInterval(id);
    }, [load]);

    const applyPreset = async (preset) => {
        setSaving(true);
        try {
            const payload = preset.isCustom
                ? { presetId: 'custom', softCapacity: Number(customValue) || 1 }
                : { presetId: preset.id };
            const updated = await AudienceService.updateCapacity(payload);
            setCapacity(updated);
            addToast(`Techo de control: ${updated.softCapacity} (${updated.planLabel})`, 'success');
            const liveData = await AudienceService.getLive();
            setLive(liveData);
        } catch (err) {
            console.error(err);
            addToast(getUserFacingError(err, 'No se pudo guardar la configuración'), 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading && !live) {
        return <div className="loader-container"><div className="loader" /></div>;
    }

    const pct = live?.saturationPercent ?? 0;
    const activePreset = capacity?.presetId || live?.presetId || 'starter';

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

            <div className="audience-config-card glass-effect">
                <div className="audience-config-title">
                    <Settings2 size={18} />
                    <div>
                        <h3>Techo de control (manual)</h3>
                        <p>
                            Solo referencia para el %. <strong>No limita ni corta conexiones</strong>.
                            Si tenés plan básico y llegan 800, el evento sigue; después ajustás infraestructura.
                        </p>
                    </div>
                </div>

                <div className="audience-preset-grid">
                    {(capacity?.presets || []).map((preset) => {
                        const selected = activePreset === preset.id;
                        return (
                            <button
                                key={preset.id}
                                type="button"
                                className={`audience-preset-card ${selected ? 'selected' : ''}`}
                                disabled={saving || (preset.isCustom && false)}
                                onClick={() => {
                                    if (preset.isCustom) return;
                                    applyPreset(preset);
                                }}
                            >
                                <div className="audience-preset-cap">
                                    {preset.isCustom ? 'Custom' : preset.softCapacity}
                                </div>
                                <div className="audience-preset-label">{preset.label}</div>
                                <div className="audience-preset-hint">{preset.hint}</div>
                            </button>
                        );
                    })}
                </div>

                <div className="audience-custom-row">
                    <label htmlFor="audience-custom-cap">Personalizado</label>
                    <input
                        id="audience-custom-cap"
                        type="number"
                        min={1}
                        max={50000}
                        value={customValue}
                        onChange={(e) => setCustomValue(e.target.value)}
                    />
                    <button
                        type="button"
                        className="audience-refresh-btn"
                        disabled={saving}
                        onClick={() => applyPreset({ id: 'custom', isCustom: true })}
                    >
                        Aplicar techo
                    </button>
                    <span className="audience-active-plan">
                        Activo: <strong>{capacity?.planLabel || live?.planLabel || '—'}</strong>
                        {' · '}
                        {capacity?.softCapacity || live?.softCapacity || '—'} conexiones
                    </span>
                </div>
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
                <div className="audience-peaks-card-header">
                    <h3>Historial de picos / muestras</h3>
                    {sortedPeaks.length > 0 && (
                        <span className="audience-peaks-count">
                            {sortedPeaks.length} muestra{sortedPeaks.length === 1 ? '' : 's'}
                        </span>
                    )}
                </div>
                <div className="audience-peaks-table-wrap">
                    <table className="audience-peaks-table">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Total</th>
                                <th>Live</th>
                                <th>Operadores</th>
                                <th>Techo</th>
                                <th>Saturación</th>
                                <th>Evento top</th>
                                <th>Pico</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedPeaks.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="audience-empty">
                                        Todavía no hay muestras. Se registran cuando hay conexiones activas.
                                    </td>
                                </tr>
                            ) : (
                                pagedPeaks.map((p) => (
                                    <tr key={p.id} className={p.isPeakRecord ? 'is-peak' : ''}>
                                        <td>{formatFecha(p.capturedAtUtc)}</td>
                                        <td>{p.totalConnections}</td>
                                        <td>{p.liveConnections}</td>
                                        <td>{p.operatorConnections}</td>
                                        <td>{p.softCapacity}</td>
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

                {sortedPeaks.length > PEAKS_PAGE_SIZE && (
                    <div className="audience-peaks-pagination">
                        <button
                            type="button"
                            className="audience-peaks-page-btn"
                            disabled={safePeaksPage === 1}
                            onClick={() => setPeaksPage((page) => Math.max(1, page - 1))}
                        >
                            Anterior
                        </button>
                        <span className="audience-peaks-page-info">
                            Página <strong>{safePeaksPage}</strong> de {peaksTotalPages}
                            <span className="audience-peaks-page-count">
                                {' · '}{sortedPeaks.length} muestras
                            </span>
                        </span>
                        <button
                            type="button"
                            className="audience-peaks-page-btn"
                            disabled={safePeaksPage === peaksTotalPages}
                            onClick={() => setPeaksPage((page) => Math.min(peaksTotalPages, page + 1))}
                        >
                            Siguiente
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AudiencePeaksSection;
