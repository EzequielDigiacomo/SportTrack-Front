import React, { useState, useEffect } from 'react';
import { Play, CheckCircle, Clock, Users, Activity, Search, RefreshCw, LogOut, ArrowLeft, Layout, Grid } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import EventoService from '../../services/EventoService';
import FaseService from '../../services/FaseService';
import timingSignalRService from '../../services/TimingSignalRService';
import { useToast } from '../../context/ToastContext';
import './Judges.css';

const getSoloApellido = (nombreCompleto) => {
    if (!nombreCompleto) return "-";
    const parts = nombreCompleto.trim().split(' ');
    return parts[parts.length - 1];
};

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

const StarterDashboard = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const isAdmin = user?.rol === 'Admin';
    const [eventos, setEventos] = useState([]);
    const [selectedEvento, setSelectedEvento] = useState(null);
    const [fases, setFases] = useState([]);
    const [selectedFase, setSelectedFase] = useState(null);
    const [loading, setLoading] = useState(false);
    const { addToast } = useToast();
    const [isCompact, setIsCompact] = useState(window.innerWidth <= 768);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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
            try {
                const data = await FaseService.getByEvento(selectedEvento.id);
                const sorted = data.sort((a, b) => {
                    const dateA = a.fechaHoraProgramada || '2000-01-01T00:00:00';
                    const dateB = b.fechaHoraProgramada || '2000-01-01T00:00:00';
                    return dateA.localeCompare(dateB);
                });
                setFases(sorted);
            } catch (err) {
                console.error("Error loading fases:", err);
            }
        };
        if (selectedEvento) {
            loadFases();
            localStorage.setItem('starter_event_id', selectedEvento.id);
        } else {
            localStorage.removeItem('starter_event_id');
            localStorage.removeItem('starter_fase_id');
        }
    }, [selectedEvento]);

    useEffect(() => {
        if (selectedFase) {
            localStorage.setItem('starter_fase_id', selectedFase.id);
        }
    }, [selectedFase]);

    // Recuperar estado al cargar
    useEffect(() => {
        const savedEventId = localStorage.getItem('starter_event_id');
        if (savedEventId && eventos.length > 0) {
            const ev = eventos.find(e => e.id === parseInt(savedEventId));
            if (ev) setSelectedEvento(ev);
        }
    }, [eventos]);

    useEffect(() => {
        const savedFaseId = localStorage.getItem('starter_fase_id');
        if (savedFaseId && fases.length > 0) {
            const f = fases.find(x => x.id === parseInt(savedFaseId));
            if (f) setSelectedFase(f);
        }
    }, [fases]);

    useEffect(() => {
        if (!selectedFase) return;

        let isMounted = true;

        const connectSignalR = async () => {
            try {
                await timingSignalRService.connect(selectedFase.id);
                if (!isMounted) return;

                timingSignalRService.onRaceReset((id) => {
                    if (id.toString() === selectedFase.id.toString()) {
                        setSelectedFase(prev => ({ ...prev, estado: 'Programada' }));
                    }
                });

                timingSignalRService.onRaceStarted((id) => {
                    if (id.toString() === selectedFase.id.toString()) {
                        setSelectedFase(prev => ({ ...prev, estado: 'En Carrera' }));
                    }
                });

                timingSignalRService.onRaceFinished(() => {
                    setSelectedFase(prev => ({ ...prev, estado: 'Finalizada' }));
                });

                timingSignalRService.onResultStatusUpdated((resId, status) => {
                    if (isMounted) {
                        setSelectedFase(prev => {
                            if (!prev || !prev.resultados) return prev;
                            return {
                                ...prev,
                                resultados: prev.resultados.map(r => 
                                    r.id.toString() === resId.toString() ? { ...r, estadoCanto: status } : r
                                )
                            };
                        });
                    }
                });
            } catch (err) {
                if (isMounted) console.error("SignalR Connection Error:", err);
            }
        };

        connectSignalR();

        return () => {
            isMounted = false;
            timingSignalRService.disconnect();
        };
    }, [selectedFase]);

    const handleStartRace = async () => {
        if (!selectedFase) return;
        try {
            setLoading(true);
            await timingSignalRService.connect(selectedFase.id);
            await timingSignalRService.requestStartRace(selectedFase.id);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (resultadoId, status) => {
        if (!selectedFase) return;
        try {
            await timingSignalRService.updateResultStatus(selectedFase.id, resultadoId, status);
            setSelectedFase(prev => ({
                ...prev,
                resultados: prev.resultados.map(r => 
                    r.id === resultadoId ? { ...r, estadoCanto: status } : r
                )
            }));
        } catch (err) {
            console.error("Error updating status:", err);
        }
    };

    const handleResetRace = async () => {
        if (!selectedFase) return;
        if (!window.confirm("⚠️ ¿Confirmar partida en falso?")) return;
        try {
            setLoading(true);
            await timingSignalRService.requestResetRace(selectedFase.id);
        } catch (err) {
            console.error("Error resetting race:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="starter-dashboard fade-in">
            <aside className={`starter-sidebar glass-effect ${isSidebarCollapsed ? 'collapsed' : ''}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0 }}><Clock size={18} /> Próximas Pruebas</h3>
                    <button 
                        className="btn-collapse"
                        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem' }}
                    >
                        {isSidebarCollapsed ? 'Mostrar' : 'Ocultar'}
                    </button>
                </div>
                {!isSidebarCollapsed && (
                    <div className="selection-stack">
                        <div className="mobile-event-selector">
                            <label style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px', display: 'block' }}>Evento:</label>
                            <select value={selectedEvento?.id || ''} onChange={(e) => setSelectedEvento(eventos.find(ev => ev.id === parseInt(e.target.value)))}>
                                <option value="">Seleccionar Evento...</option>
                                {eventos.map(ev => <option key={ev.id} value={ev.id}>{ev.nombre}</option>)}
                            </select>
                        </div>

                        <div className="sidebar-section-header">
                            <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Cronograma ({fases.length}):</label>
                            <button className="btn-view-toggle" onClick={() => setIsCompact(!isCompact)}>
                                {isCompact ? <Layout size={14} /> : <Grid size={14} />}
                            </button>
                        </div>

                        <div className={`pruebas-list ${isCompact ? 'compact-grid' : ''}`}>
                            {fases.map((f, index) => (
                                <div 
                                    key={f.id} 
                                    className={`prueba-item-mini ${selectedFase?.id === f.id ? 'active' : ''} ${['Finalizada', 'Finalizado', 'Pendiente de Validación', 'PendienteValidacion'].includes(f.estado) ? 'finished' : ''}`}
                                    onClick={() => {
                                        setSelectedFase(f);
                                        // Auto-collapse on mobile selection
                                        if (window.innerWidth <= 1000) setIsSidebarCollapsed(true);
                                    }}
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

            <main className="starter-main">
                {selectedFase ? (
                    <div className="race-control glass-effect">
                        <header className="race-header">
                            {!isAdmin && (
                                <div className="header-actions-left" style={{ display: 'flex', gap: '0.5rem', marginRight: '1rem' }}>
                                    <button className="btn-admin-secondary" onClick={() => navigate('/jueces')} style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer' }}>
                                        <ArrowLeft size={20} />
                                    </button>
                                    <button className="btn-admin-danger" onClick={logout} style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', cursor: 'pointer' }}>
                                        <LogOut size={20} />
                                    </button>
                                </div>
                            )}
                            <div className="header-left-actions">
                                <div className="badge-live">MODO LARGADOR</div>
                                {(() => {
                                    const p = selectedFase?.prueba?.prueba || selectedFase?.etapa?.eventoPrueba?.prueba || selectedFase?.eventoPrueba?.prueba;
                                    const catName = p ? (CATEGORIA_NAMES[p.categoria?.id] || p.categoria?.nombre) : (selectedFase?.categoriaNombre || 'Sin Categoría');
                                    const boteName = p ? (BOTE_NAMES[p.bote?.id] || p.bote?.nombre) : (selectedFase?.boteTipo || selectedFase?.tipoBote || 'Sin Bote');
                                    const distName = p ? (DISTANCIA_NAMES[p.distancia?.id] || p.distancia?.metros + 'm') : (selectedFase?.distancia ? selectedFase.distancia + 'm' : '0m');
                                    const timeName = selectedFase?.fechaHoraProgramada && selectedFase?.fechaHoraProgramada.includes('T') 
                                        ? selectedFase.fechaHoraProgramada.split('T')[1].substring(0, 5) 
                                        : (selectedFase?.horaProgramada || '--:--');
                                    
                                    return (
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
                                    );
                                })()}
                            </div>
                        </header>

                        <div className="fase-details">
                            <div className="athletes-checkin">
                                <h3><Users size={20} /> Atletas en Carriles</h3>
                                <div className="checkin-grid">
                                    {(selectedFase.resultados || []).sort((a,b) => a.carril - b.carril).map(r => (
                                        <div key={r.id} className={`checkin-row ${r.estadoCanto && r.estadoCanto !== 'Pendiente' ? 'row-disabled' : ''}`}>
                                            <span className="lane-badge">{r.carril}</span>
                                            <span className="athlete-name">
                                                {r.tripulantes && r.tripulantes.length > 0 
                                                    ? [r.participanteNombre, ...r.tripulantes.map(t => t.participanteNombreCompleto || t.participanteNombre)].join(' - ')
                                                    : r.participanteNombre
                                                }
                                            </span>
                                            <span className="club-tag-full">{r.clubNombre}</span>
                                            <div className="status-quick-actions">
                                                <button className={`btn-status-toggle dns ${r.estadoCanto === 'DNS' ? 'active' : ''}`} onClick={() => handleStatusChange(r.id, r.estadoCanto === 'DNS' ? 'Pendiente' : 'DNS')}>DNS</button>
                                                <button className={`btn-status-toggle dnf ${r.estadoCanto === 'DNF' ? 'active' : ''}`} onClick={() => handleStatusChange(r.id, r.estadoCanto === 'DNF' ? 'Pendiente' : 'DNF')}>DNF</button>
                                                <button className={`btn-status-toggle dsq ${r.estadoCanto === 'DSQ' ? 'active' : ''}`} onClick={() => handleStatusChange(r.id, r.estadoCanto === 'DSQ' ? 'Pendiente' : 'DSQ')}>DSQ</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="control-actions">
                                <button 
                                    className={`btn-start-big ${selectedFase.estado !== 'Programada' ? 'disabled' : ''}`}
                                    onClick={handleStartRace}
                                    disabled={selectedFase.estado !== 'Programada' || loading}
                                >
                                    {selectedFase.estado === 'Programada' ? (
                                        <>
                                            <Play size={48} fill="currentColor" />
                                            <span>LARGAR CARRERA</span>
                                        </>
                                    ) : (
                                        <>
                                            <Activity size={48} className={selectedFase.estado === 'En Carrera' ? 'pulse' : ''} />
                                            <span>{selectedFase.estado.toUpperCase()}</span>
                                        </>
                                    )}
                                </button>
                                {(selectedFase.estado === 'En Carrera' || selectedFase.estado === 'Pendiente de Validación') && (
                                    <button className="btn-reset-starter" onClick={handleResetRace} disabled={loading}>
                                        <RefreshCw size={20} /> <span>REINICIAR</span>
                                    </button>
                                )}
                            </div>

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
                    </div>
                ) : (
                    <div className="empty-msg">Seleccione una carrera del cronograma</div>
                )}
            </main>
        </div>
    );
};

export default StarterDashboard;
