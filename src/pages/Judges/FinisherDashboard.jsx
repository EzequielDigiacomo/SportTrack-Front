import React, { useState, useEffect, useRef } from 'react';
import { 
    Timer, CheckCircle, Clock, Users, XCircle, RefreshCw, Save, 
    Play, Activity, Search, LogOut, ArrowLeft, Layout, Grid
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import EventoService from '../../services/EventoService';
import FaseService from '../../services/FaseService';
import ResultadoService from '../../services/ResultadoService';
import { useAlert } from '../../hooks/useAlert';
import timingSignalRService from '../../services/TimingSignalRService';

const CATEGORIA_NAMES = {
    1: 'Pre-infantil (8-10 años)', 2: 'Infantil (11-12 años)', 3: 'Menor (13-14 años)', 4: 'Cadete (14-15 años)', 
    5: 'Junior (16-17 años)', 6: 'Sub-23 (18-22 años)', 7: 'Senior (18-35 años)', 8: 'Master A (40-45 años)', 
    9: 'Master B (46-50 años)', 10: 'Master C (50+ años)'
};
const BOTE_NAMES = { 1: 'K1', 2: 'K2', 3: 'K4', 4: 'C1', 5: 'C2', 6: 'C4' };
const DISTANCIA_NAMES = {
    1: '200m', 2: '350m', 3: '400m', 4: '450m', 5: '500m', 6: '1000m', 7: '1500m', 8: '2000m', 9: '3000m', 
    10: '5000m', 11: '10000m', 12: '12000m', 13: '15000m', 14: '18000m', 15: '22000m', 16: '30000m'
};
import { useToast } from '../../context/ToastContext';
import './Judges.css';

const getSoloApellido = (nombreCompleto) => {
    if (!nombreCompleto) return "-";
    const parts = nombreCompleto.trim().split(' ');
    return parts[parts.length - 1];
};

const FinisherDashboard = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const isAdmin = user?.rol === 'Admin';
    const [eventos, setEventos] = useState([]);
    const [selectedEvento, setSelectedEvento] = useState(null);
    const [fases, setFases] = useState([]);
    const [selectedFase, setSelectedFase] = useState(null);
    const [resultados, setResultados] = useState([]);
    const [rawTimes, setRawTimes] = useState([]);
    const [isRaceRunning, setIsRaceRunning] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [startTime, setStartTime] = useState(null);
    const timerRef = useRef(null);
    const [loading, setLoading] = useState(false);
    const [isCompact, setIsCompact] = useState(window.innerWidth <= 768);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const { addToast } = useToast();

    useEffect(() => {
        const loadEventos = async () => {
            const data = await EventoService.getProximos();
            setEventos(data);
            if (data.length > 0) setSelectedEvento(data[0]);
        };
        loadEventos();
    }, []);

    useEffect(() => {
        if (!selectedEvento) return;
        const loadFases = async () => {
            const data = await FaseService.getByEvento(selectedEvento.id);
            const sorted = data.sort((a, b) => {
                const dateA = a.fechaHoraProgramada || '2000-01-01T00:00:00';
                const dateB = b.fechaHoraProgramada || '2000-01-01T00:00:00';
                return dateA.localeCompare(dateB);
            });
            setFases(sorted);
        };
        loadFases();
    }, [selectedEvento]);

    useEffect(() => {
        if (!selectedFase) {
            setResultados([]);
            setIsRaceRunning(false);
            setStartTime(null);
            setElapsedTime(0);
            return;
        }
        
        const setupSignalR = async () => {
            try {
                const data = await ResultadoService.getByFase(selectedFase.id);
                const formattedData = data.map(r => ({
                    ...r,
                    tiempoOficial: r.tiempoOficial,
                    msLlegada: r.tiempoOficial ? parseTimeToMs(r.tiempoOficial) : null,
                    status: r.tiempoOficial ? 'finished' : 'pending'
                }));
                
                setResultados(formattedData.sort((a,b) => a.carril - b.carril));
                
                if (selectedFase.estado === 'En Carrera' && selectedFase.fechaHoraInicioReal) {
                    const parsed = new Date(selectedFase.fechaHoraInicioReal).getTime();
                    if (!isNaN(parsed)) startLocalTimer(parsed);
                } else {
                    stopLocalTimer();
                }

                await timingSignalRService.connect(selectedFase.id);

                timingSignalRService.onRaceStarted((id, sTime) => {
                    if (id.toString() === selectedFase.id.toString()) {
                        const parsed = new Date(sTime).getTime();
                        if (!isNaN(parsed)) startLocalTimer(parsed);
                    }
                });

                timingSignalRService.onRaceFinished(() => {
                    stopLocalTimer();
                });

                timingSignalRService.onRaceReset((id) => {
                    if (id.toString() === selectedFase.id.toString()) {
                        stopLocalTimer();
                        setElapsedTime(0);
                        setStartTime(null);
                        setResultados(prev => prev.map(r => ({ ...r, tiempoOficial: null, msLlegada: null, status: 'pending', estadoCanto: 'Pendiente' })));
                    }
                });

                timingSignalRService.onResultStatusUpdated((resId, status) => {
                    setResultados(prev => prev.map(r => 
                        String(r.id) === String(resId) ? { ...r, estadoCanto: status } : r
                    ));
                });
            } catch (err) {
                console.error("SignalR Error:", err);
            }
        };

        setupSignalR();

        return () => {
            timingSignalRService.disconnect();
            stopLocalTimer();
        };
    }, [selectedFase]);

    // Detener timer automáticamente cuando todos han llegado, tienen estado (DSQ, DNF, etc)
    // o están cubiertos por una duda capturada en rawTimes
    useEffect(() => {
        if (isRaceRunning && resultados.length > 0) {
            // Cuántos atletas siguen sin tiempo Y sin estado especial
            const stillPending = resultados.filter(r =>
                !r.tiempoOficial && (!r.estadoCanto || r.estadoCanto === 'Pendiente')
            ).length;

            // Si la cantidad de tiempos crudos (dudas) cubre a todos los pendientes → parar
            if (stillPending <= rawTimes.length) {
                console.log(`Auto-stop: ${stillPending} pendiente(s), ${rawTimes.length} duda(s) capturada(s).`);
                stopLocalTimer();
            }
        }
    }, [resultados, rawTimes, isRaceRunning]);

    const parseTimeToTimeSpan = (timeStr) => {
        if (!timeStr || timeStr.trim() === '') return null;
        try {
            const parts = timeStr.trim().split(':');
            if (parts.length === 2) {
                const [min, secStr] = parts;
                const [sec, ms] = (secStr || '0').split('.');
                const msFormatted = (ms || '0').substring(0, 3).padEnd(7, '0');
                return `00:${String(parseInt(min)).padStart(2,'0')}:${String(parseInt(sec)).padStart(2,'0')}.${msFormatted}`;
            } else if (parts.length === 3) {
                const [hr, min, secStr] = parts;
                const [sec, ms] = (secStr || '0').split('.');
                const msFormatted = (ms || '0').substring(0, 3).padEnd(7, '0');
                return `${String(parseInt(hr)).padStart(2,'0')}:${String(parseInt(min)).padStart(2,'0')}:${String(parseInt(sec)).padStart(2,'0')}.${msFormatted}`;
            }
        } catch (e) {}
        return null;
    };

    const parseTimeToMs = (timeStr) => {
        if (!timeStr) return 0;
        const [hms, msPart] = timeStr.split('.');
        const [h, m, s] = hms.split(':').map(Number);
        const ms = Number((msPart || '0').padEnd(3, '0'));
        return (h * 3600000) + (m * 60000) + (s * 1000) + ms;
    };

    const formatTimer = (ms) => {
        const m = Math.floor((ms % 3600000) / 60000);
        const s = Math.floor((ms % 60000) / 1000);
        const mil = ms % 1000;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(mil).padStart(3, '0')}`;
    };

    const startLocalTimer = (sTime) => {
        setIsRaceRunning(true);
        setStartTime(sTime);
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            // Usar el reloj sincronizado con el servidor para máxima precisión
            setElapsedTime(timingSignalRService.getSyncedNow().getTime() - sTime);
        }, 37);
    };

    const stopLocalTimer = () => {
        setIsRaceRunning(false);
        if (timerRef.current) clearInterval(timerRef.current);
    };

    const handleLaneFinish = (laneNum) => {
        const res = resultados.find(r => r.carril === laneNum);
        if (!res) return;
        handleRecordFinish(res.id);
    };

    const handleRecordFinish = async (resultadoId) => {
        if (!isRaceRunning) return;
        // getSyncedNow() aplica el offset calculado con el servidor para precisión máxima
        const now = timingSignalRService.getSyncedNow().getTime();
        const diff = now - startTime;
        const formatted = formatTimer(diff);

        setResultados(prev => prev.map(r => 
            r.id === resultadoId ? { ...r, tiempoOficial: formatted, msLlegada: diff, status: 'finished' } : r
        ));

        try {
            await timingSignalRService.sendTime(selectedFase.id, resultadoId, formatted, diff);
        } catch (err) {
            console.error("Error sending time:", err);
        }
    };

    const recordDoubt = () => {
        if (!isRaceRunning) return;
        const now = timingSignalRService.getSyncedNow().getTime();
        const diff = now - startTime;
        const time = formatTimer(diff);
        setRawTimes(prev => [...prev, { id: now, time, ms: diff, type: 'duda' }]);
    };

    const removeRawTime = (id) => {
        setRawTimes(prev => prev.filter(t => t.id !== id));
    };

    const assignRawTime = async (raw, resId) => {
        setResultados(prev => prev.map(r => 
            r.id === resId ? { ...r, tiempoOficial: raw.time, msLlegada: raw.ms, status: 'finished' } : r
        ));
        setRawTimes(prev => prev.filter(t => t.id !== raw.id));
        try {
            await timingSignalRService.sendTime(selectedFase.id, resId, raw.time, raw.ms);
        } catch (err) {
            addToast("Error al asignar tiempo", "error");
        }
    };

    const handleSaveResults = async () => {
        if (!selectedFase) return;
        setLoading(true);
        try {
            const dataToSave = resultados
                .filter(r => r.tiempoOficial || (r.estadoCanto && r.estadoCanto !== 'Pendiente'))
                .map(r => ({
                    id: r.id,
                    tiempoOficial: parseTimeToTimeSpan(r.tiempoOficial),
                    estadoCanto: r.estadoCanto || 'Pendiente'
                }));

            await ResultadoService.batchUpdate(dataToSave);
            addToast("Resultados enviados con éxito", "success");
        } catch (err) {
            addToast("Error al guardar resultados", "error");
        } finally {
            setLoading(false);
        }
    };

    const arribosOrdenados = [...resultados.filter(r => r.tiempoOficial).map(r => ({
        id: r.id,
        time: r.tiempoOficial,
        ms: r.msLlegada,
        label: `Carril ${r.carril}`,
        type: 'atleta',
        participante: r.participanteNombre
    })), ...rawTimes].sort((a, b) => a.ms - b.ms);

    const pendientes = resultados.filter(r => !r.tiempoOficial && (!r.estadoCanto || r.estadoCanto === 'Pendiente'));

    return (
        <div className="finisher-dashboard fade-in">
            <header className="finisher-header glass-effect">
                <div className="header-info">
                    {!isAdmin && (
                        <div className="header-actions-left" style={{ display: 'flex', gap: '0.5rem', marginRight: '1rem' }}>
                            <button className="btn-admin-secondary" onClick={() => navigate('/jueces')} style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)' }}>
                                <ArrowLeft size={20} />
                            </button>
                            <button className="btn-admin-danger" onClick={logout} style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                <LogOut size={20} />
                            </button>
                        </div>
                    )}
                    <div className="badge-live blue">MODO CRONOMETRISTA</div>
                    {(() => {
                        const p = selectedFase?.prueba?.prueba || selectedFase?.etapa?.eventoPrueba?.prueba || selectedFase?.eventoPrueba?.prueba;
                        const catName = p ? (CATEGORIA_NAMES[p.categoria?.id] || p.categoria?.nombre) : (selectedFase?.categoriaNombre || 'Sin Categoría');
                        const boteName = p ? (BOTE_NAMES[p.bote?.id] || p.bote?.nombre) : (selectedFase?.boteTipo || selectedFase?.tipoBote || 'Sin Bote');
                        const distName = p ? (DISTANCIA_NAMES[p.distancia?.id] || p.distancia?.metros + 'm') : (selectedFase?.distancia ? selectedFase.distancia + 'm' : '0m');
                        const timeName = selectedFase?.fechaHoraProgramada && selectedFase?.fechaHoraProgramada.includes('T') 
                            ? selectedFase.fechaHoraProgramada.split('T')[1].substring(0, 5) 
                            : (selectedFase?.horaProgramada || '--:--');
                        
                        return (
                            <>
                        <div className="race-header-info">
                            <h2>
                                <span className="race-id-prefix">
                                    #{selectedFase?.nroPrueba || (fases.findIndex(x => x.id === selectedFase?.id) !== -1 ? fases.findIndex(x => x.id === selectedFase?.id) + 1 : '')}
                                </span>
                                {catName}
                            </h2>
                            <div className="race-meta">
                                <span className="meta-item"><Clock size={14} /> {timeName}</span>
                                <span className="meta-item">{selectedFase?.nombreFase}</span>
                                <span className="meta-item">{boteName}</span>
                                <span className="meta-item">{distName}</span>
                            </div>
                        </div>
                            </>
                        );
                    })()}
                </div>
                <div className={`main-timer ${isRaceRunning ? 'running' : ''}`}>
                    {formatTimer(elapsedTime)}
                </div>
            </header>

            <div className="finisher-layout">
                <aside className={`finisher-sidebar glass-effect ${isSidebarCollapsed ? 'collapsed' : ''}`}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ margin: 0 }}><Clock size={18} /> Cronograma</h3>
                        <button className="btn-collapse" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>
                            {isSidebarCollapsed ? 'Mostrar' : 'Ocultar'}
                        </button>
                    </div>
                    {!isSidebarCollapsed && (
                        <div className="selection-stack">
                            <label style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px', display: 'block' }}>Evento:</label>
                            <select value={selectedEvento?.id || ''} onChange={(e) => setSelectedEvento(eventos.find(ev => ev.id === parseInt(e.target.value)))}>
                                <option value="">Seleccionar Evento...</option>
                                {eventos.map(ev => <option key={ev.id} value={ev.id}>{ev.nombre}</option>)}
                            </select>

                            <div className="sidebar-section-header">
                                <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Pruebas ({fases.length}):</label>
                                <button className="btn-view-toggle" onClick={() => setIsCompact(!isCompact)}>
                                    {isCompact ? <Layout size={14} /> : <Grid size={14} />}
                                </button>
                            </div>

                            <div className={`pruebas-list ${isCompact ? 'compact-grid' : ''}`}>
                                {fases.map((f, index) => (
                                    <div 
                                        key={f.id} 
                                        className={`prueba-item-mini ${selectedFase?.id === f.id ? 'active' : ''} ${['Finalizada', 'Finalizado', 'Pendiente de Validación', 'PendienteValidacion'].includes(f.estado) ? 'finished' : ''}`} 
                                        onClick={() => { setSelectedFase(f); if (window.innerWidth <= 1000) setIsSidebarCollapsed(true); }}
                                    >
                                        {['Finalizada', 'Finalizado', 'Pendiente de Validación', 'PendienteValidacion'].includes(f.estado) && <span className="status-dot finished"></span>}
                                        <span className="race-num">#{f.nroPrueba || (index + 1)}</span>
                                        {!isCompact && (() => {
                                            const p = f.prueba?.prueba || f.etapa?.eventoPrueba?.prueba || f.eventoPrueba?.prueba;
                                            const catName = p ? (CATEGORIA_NAMES[p.categoria?.id] || p.categoria?.nombre) : (f.categoriaNombre || 'Sin Categoría');
                                            return (
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{catName}</span>
                                                    <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>{f.nombreFase}</span>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </aside>

                <main className="finisher-main glass-effect">
                    <div className="quick-controls-panel">
                        <div className="lane-buttons-grid">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => {
                                const res = resultados.find(r => r.carril === num);
                                const isOccupied = !!res;
                                const isFinished = res?.tiempoOficial;
                                const hasStatus = res?.estadoCanto && res?.estadoCanto !== 'Pendiente';
                                return (
                                    <button key={num} className={`lane-btn ${!isOccupied ? 'empty' : ''} ${isFinished ? 'finished' : ''} ${hasStatus ? 'has-status' : ''}`} onClick={() => handleLaneFinish(num)} disabled={!isRaceRunning || !isOccupied || isFinished || hasStatus}>
                                        <span className="num">{num}</span>
                                        <span className="label">{isOccupied ? (hasStatus ? res.estadoCanto : (isFinished ? 'LLEGÓ' : 'LLEGADA')) : '-'}</span>
                                    </button>
                                );
                            })}
                        </div>
                        <button 
                            className="btn-doubt" 
                            onClick={recordDoubt} 
                            disabled={!isRaceRunning}
                            style={{
                                width: '100%',
                                padding: '15px',
                                marginTop: '15px',
                                background: isRaceRunning ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'rgba(255,255,255,0.05)',
                                color: isRaceRunning ? 'white' : 'var(--color-text-muted)',
                                border: isRaceRunning ? 'none' : '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                fontSize: '1.1rem',
                                fontWeight: 'bold',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px',
                                cursor: isRaceRunning ? 'pointer' : 'not-allowed',
                                boxShadow: isRaceRunning ? '0 4px 15px rgba(245, 158, 11, 0.3)' : 'none',
                                transition: 'all 0.2s',
                                textTransform: 'uppercase',
                                letterSpacing: '1px'
                            }}
                        >
                            <Activity size={24} /> <span>DUDA (?) [Espacio]</span>
                        </button>

                        <div className="arribos-list">
                            <h3><Timer size={18} /> Arribos</h3>
                            <div className="arribos-grid">
                                {arribosOrdenados.map((arrival, idx) => (
                                    <div key={arrival.id} className={`arrival-card ${arrival.type}`}>
                                        <div className="a-rank">{idx + 1}°</div>
                                        <div className="a-body">
                                            <span className="a-label">
                                                {arrival.type === 'duda' ? '⚠ DUDA' : (arrival.label || `Carril ${arrival.carril || '—'}`)}
                                            </span>
                                            <span className="a-name">{arrival.participante ? getSoloApellido(arrival.participante) : '—'}</span>
                                        </div>
                                        <div className="a-time">{arrival.time}</div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                                            {arrival.type === 'duda' && <button className="btn-cancel-doubt" onClick={() => removeRawTime(arrival.id)}><XCircle size={16} /></button>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {pendientes.length > 0 && (isRaceRunning || rawTimes.length > 0) && (
                            <div className="pendientes-panel glass-effect fade-in" style={{ marginTop: '2rem', borderTop: '2px solid rgba(251, 191, 36, 0.3)', paddingTop: '1.5rem' }}>
                                <h3 style={{ color: '#fbbf24', fontSize: '1rem', marginBottom: '1rem' }}>Atletas por Clasificar</h3>
                                <div className="pendientes-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {pendientes.map(p => (
                                        <div key={p.id} className="pendiente-item">
                                            <span className="p-lane">{p.carril}</span>
                                            <div className="p-info">
                                                <span className="p-name">{p.participanteNombre}</span>
                                                <button className="btn-assign-quick" onClick={() => rawTimes.length > 0 ? assignRawTime(rawTimes[0], p.id) : handleRecordFinish(p.id)}>{rawTimes.length > 0 ? 'ASIGNAR ?' : 'LLEGADA'}</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            </div>
                        )}

                        {/* Navegación Rápida */}
                        <div className="quick-nav-footer">
                            <button 
                                className="btn-nav-step" 
                                disabled={fases.findIndex(f => f.id === selectedFase.id) <= 0}
                                onClick={() => {
                                    const idx = fases.findIndex(f => f.id === selectedFase.id);
                                    if (idx > 0) setSelectedFase(fases[idx - 1]);
                                }}
                            >
                                <ArrowLeft size={16} /> Anterior
                            </button>
                            <span className="nav-index">
                                Prueba {fases.findIndex(f => f.id === selectedFase.id) + 1} de {fases.length}
                            </span>
                            <button 
                                className="btn-nav-step" 
                                disabled={fases.findIndex(f => f.id === selectedFase.id) >= fases.length - 1}
                                onClick={() => {
                                    const idx = fases.findIndex(f => f.id === selectedFase.id);
                                    if (idx < fases.length - 1) setSelectedFase(fases[idx + 1]);
                                }}
                            >
                                Siguiente <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>

                    <footer className="finisher-actions">
                        <button className="btn-reset" onClick={() => { if(window.confirm('¿Reiniciar reloj?')) { setElapsedTime(0); stopLocalTimer(); setRawTimes([]); setResultados(prev => prev.map(r => ({ ...r, tiempoOficial: null, msLlegada: null }))); } }}>
                            <RefreshCw size={18} /> Reiniciar
                        </button>
                        <button className="btn-save-official" onClick={handleSaveResults} disabled={arribosOrdenados.length === 0 || arribosOrdenados.some(a => a.type === 'duda')}>
                            <Save size={18} /> Enviar
                        </button>
                    </footer>
                </main>
            </div>
        </div>
    );
};

export default FinisherDashboard;
