import React, { useState, useEffect } from 'react';
import { formatTime } from '../../utils/dateUtils';
import { Play, CheckCircle, Clock, Users, Activity, Search, RefreshCw, LogOut, ArrowLeft, ArrowRight, Layout, Grid, Link2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import EventoService from '../../services/EventoService';
import FaseService from '../../services/FaseService';
import timingSignalRService from '../../services/TimingSignalRService';
import { useToast } from '../../context/ToastContext';
import ConfirmDialog from '../../components/Common/ConfirmDialog';
import './Judges.css';

const getSoloApellido = (nombreCompleto) => {
    if (!nombreCompleto) return "-";
    const parts = nombreCompleto.trim().split(' ');
    return parts[parts.length - 1];
};

const CATEGORIA_NAMES = {
    1: 'Pre-infantil (8-10 años)', 2: 'Infantil (11-12 años)', 3: 'Menor (13-14 años)', 4: 'Cadete (15-16 años)', 
    5: 'Junior (17-18 años)', 6: 'Sub-23 (19-23 años)', 7: 'Senior (24-39 años)', 8: 'Master A (40-49 años)', 
    9: 'Master B (50-59 años)', 10: 'Master C (60+ años)'
};
const BOTE_NAMES = { 1: 'K1', 2: 'K2', 3: 'K4', 4: 'C1', 5: 'C2', 6: 'C4' };
const DISTANCIA_NAMES = {
    1: '200m', 2: '350m', 3: '400m', 4: '450m', 5: '500m', 6: '1000m', 7: '1500m', 8: '2000m', 9: '3000m', 
    10: '5000m', 11: '10000m', 12: '12000m', 13: '15000m', 14: '18000m', 15: '22000m', 16: '30000m'
};

const StarterDashboard = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const roleStr = (user?.rol || user?.Rol || user?.role || '').toLowerCase();
    const isAdmin = roleStr.includes('admin');
    const [eventos, setEventos] = useState([]);
    const [selectedEvento, setSelectedEvento] = useState(null);
    const [fases, setFases] = useState([]);
    const [selectedFase, setSelectedFase] = useState(null);
    const [loading, setLoading] = useState(false);
    const { addToast } = useToast();
    const [isCompact, setIsCompact] = useState(window.innerWidth <= 768);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
    const [startingStatus, setStartingStatus] = useState(null); // 'connecting' | 'starting' | 'resetting' | 'fallback_http' | 'success' | 'success_reset' | 'error'
    const [connectionState, setConnectionState] = useState(timingSignalRService.getConnectionState());
    const [activeJudges, setActiveJudges] = useState([]);

    useEffect(() => {
        const unsubscribe = timingSignalRService.onStateChange((state) => {
            setConnectionState(state);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const loadEventos = async () => {
            const data = await EventoService.getAll();
            setEventos(data);
            
            // Solo seleccionar el primero si no hay nada guardado en localStorage
            const savedEventId = localStorage.getItem('starter_event_id');
            if (!savedEventId && data.length > 0) {
                setSelectedEvento(data[0]);
            }
        };
        loadEventos();
    }, []);

    useEffect(() => {
        if (!selectedEvento) return;
        const loadFases = async () => {
            try {
                const data = await FaseService.getByEvento(selectedEvento.id);
                // Mapear estado del backend a estadoCanto del frontend
                const mapped = data.map(f => ({
                    ...f,
                    resultados: f.resultados?.map(r => ({
                        ...r,
                        estadoCanto: r.estado === 'Descalificado' ? 'DSQ' : r.estado
                    }))
                }));
                const sorted = mapped.sort((a, b) => {
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
                timingSignalRService.onEventPresenceUpdated((presenceList) => {
                    setActiveJudges(presenceList);
                });

                await timingSignalRService.connect(
                    selectedEvento?.id,
                    selectedFase.id,
                    user?.nombreCompleto || user?.nombre || user?.username || "Largador",
                    "Largador"
                );
                if (!isMounted) return;

                timingSignalRService.onRaceReset((id) => {
                    setFases(prev => prev.map(f => 
                        String(f.id) === String(id) ? { ...f, estado: 'Programada' } : f
                    ));
                    if (String(id) === String(selectedFase.id)) {
                        setSelectedFase(prev => ({ ...prev, estado: 'Programada' }));
                    }
                });

                timingSignalRService.onRaceStarted((id) => {
                    if (String(id) === String(selectedFase.id)) {
                        setSelectedFase(prev => ({ ...prev, estado: 'En Carrera' }));
                    }
                });

                timingSignalRService.onGlobalRaceStarted(({ faseId, serverTime }) => {
                    setFases(prev => prev.map(f => 
                        String(f.id) === String(faseId) 
                            ? { ...f, estado: 'En Carrera', fechaHoraInicioReal: serverTime } 
                            : f
                    ));
                    if (selectedFase && String(selectedFase.id) === String(faseId)) {
                        setSelectedFase(prev => ({ ...prev, estado: 'En Carrera', fechaHoraInicioReal: serverTime }));
                    }
                });

                timingSignalRService.onRaceFinished((id) => {
                    const finishedId = id || selectedFase.id;
                    setFases(prev => prev.map(f => 
                        String(f.id) === String(finishedId) ? { ...f, estado: 'Finalizada' } : f
                    ));
                    if (selectedFase && String(selectedFase.id) === String(finishedId)) {
                        setSelectedFase(prev => ({ ...prev, estado: 'Finalizada' }));
                    }
                });

                timingSignalRService.onGlobalResultStatusUpdated((resId, status) => {
                    if (!isMounted) return;

                    // 1. Actualizar la fase seleccionada si el resultado le pertenece
                    setSelectedFase(prev => {
                        if (!prev || !prev.resultados) return prev;
                        return {
                            ...prev,
                            resultados: prev.resultados.map(r => 
                                String(r.id) === String(resId) ? { ...r, estadoCanto: status } : r
                            )
                        };
                    });

                    // 2. Actualizar también la lista de todas las fases (el cronograma)
                    setFases(prev => prev.map(f => ({
                        ...f,
                        resultados: f.resultados?.map(r => 
                            String(r.id) === String(resId) ? { ...r, estadoCanto: status } : r
                        )
                    })));
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
            const isConnected = timingSignalRService.getConnectionState() === 'Connected';
            
            if (!isConnected) {
                setStartingStatus('connecting');
                await timingSignalRService.connect(
                    selectedFase.id,
                    user?.nombreCompleto || user?.nombre || user?.username || "Largador",
                    "Largador"
                );
            }
            
            setStartingStatus('starting');
            await timingSignalRService.requestStartRace(selectedFase.id);
            addToast("Carrera iniciada con éxito (Vía WebSocket)", "success");
            setStartingStatus('success');
            setTimeout(() => setStartingStatus(null), 1500);
        } catch (err) {
            console.error("SignalR start error, trying HTTP fallback:", err);
            setStartingStatus('fallback_http');
            addToast("Fallo en red de tiempo real. Usando canal secundario...", "warning");
            try {
                await FaseService.iniciar(selectedFase.id);
                addToast("Carrera iniciada con éxito", "success");
                setStartingStatus('success');
                setTimeout(() => setStartingStatus(null), 1500);
            } catch (httpErr) {
                console.error("HTTP fallback error starting race:", httpErr);
                addToast("Error al iniciar la carrera. Verifique su conexión.", "error");
                setStartingStatus('error');
                setTimeout(() => setStartingStatus(null), 3000);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (resultadoId, status) => {
        if (!selectedFase) return;
        
        // Guardamos el estado anterior por si hay que revertir
        const previousResultados = selectedFase.resultados;
        
        try {
            // Actualización optimista
            setSelectedFase(prev => ({
                ...prev,
                resultados: prev.resultados.map(r => 
                    r.id === resultadoId ? { ...r, estadoCanto: status } : r
                )
            }));

            await timingSignalRService.updateResultStatus(selectedFase.id, resultadoId, status);
            addToast(`Estado actualizado a ${status}`, "success");
        } catch (err) {
            console.error("Error updating status:", err);
            addToast("Error de conexión: No se pudo guardar el cambio", "error");
            
            // Revertir en caso de error
            setSelectedFase(prev => ({
                ...prev,
                resultados: previousResultados
            }));
        }
    };

    const handleResetRace = async () => {
        if (!selectedFase) return;
        setConfirmDialog({
            isOpen: true,
            title: 'Partida en Falso',
            message: '⚠️ ¿Confirmar partida en falso? Esto reiniciará el estado de la carrera.',
            type: 'warning',
            onConfirm: async () => {
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                try {
                    setLoading(true);
                    const isConnected = timingSignalRService.getConnectionState() === 'Connected';
                    
                    if (!isConnected) {
                        setStartingStatus('connecting');
                        await timingSignalRService.connect(
                            selectedFase.id,
                            user?.nombreCompleto || user?.nombre || user?.username || "Largador",
                            "Largador"
                        );
                    }
                    
                    setStartingStatus('resetting');
                    await timingSignalRService.requestResetRace(selectedFase.id);
                    addToast("Carrera reiniciada con éxito (Vía WebSocket)", "success");
                    setStartingStatus('success_reset');
                    setTimeout(() => setStartingStatus(null), 1500);
                } catch (err) {
                    console.error("SignalR reset error, trying HTTP fallback:", err);
                    setStartingStatus('fallback_http');
                    addToast("Fallo en red de tiempo real. Usando canal secundario...", "warning");
                    try {
                        await FaseService.reiniciar(selectedFase.id);
                        addToast("Carrera reiniciada con éxito", "success");
                        setStartingStatus('success_reset');
                        setTimeout(() => setStartingStatus(null), 1500);
                    } catch (httpErr) {
                        console.error("HTTP fallback error resetting race:", httpErr);
                        addToast("Error al reiniciar la carrera. Verifique su conexión.", "error");
                        setStartingStatus('error');
                        setTimeout(() => setStartingStatus(null), 3000);
                    }
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    return (
        <>
        {/* BARRA DE SINCRONIZACIÓN GLOBAL (PORTAL AL NAVBAR) */}
        {document.getElementById('global-sync-bar-portal-target') && createPortal(
            <div className="global-sync-bar">
                {(() => {
                    const connectedTimekeeper = activeJudges.find(j => {
                        const role = (j.role || j.Role || '').toLowerCase();
                        return role === 'cronometrista';
                    });
                    const connectedControl = activeJudges.find(j => {
                        const role = (j.role || j.Role || '').toLowerCase();
                        return role === 'juez de control' || role === 'admin';
                    });
                    const tkName = connectedTimekeeper ? (connectedTimekeeper.userName || connectedTimekeeper.UserName || 'Cronometrista') : '';
                    const controlName = connectedControl ? (connectedControl.userName || connectedControl.UserName || 'Control') : '';
                    const myName = user?.nombreCompleto || user?.nombre || user?.username || "Largador";
                    
                    const isTkLinked = !!connectedTimekeeper;
                    const isControlLinked = !!connectedControl;
                    
                    return (
                        <div className="judges-sync-card" title="Estado de Enlace de Jueces">
                            <div className="sync-role-node">
                                <span className="sync-role-name">LARGADOR</span>
                                <span className={`sync-user-pill ${selectedEvento ? 'connected' : 'disconnected'}`}>{myName.toUpperCase()}</span>
                            </div>
                            <div className={`sync-connector-line ${isControlLinked ? 'active' : 'inactive'}`}>
                                {isControlLinked ? <Link2 size={16} /> : <Link2 size={16} style={{ strokeDasharray: '3,3' }} />}
                            </div>
                            <div className="sync-role-node">
                                <span className="sync-role-name">CONTROL</span>
                                {connectedControl ? (
                                    <span className="sync-user-pill connected">{controlName.toUpperCase()}</span>
                                ) : (
                                    <span className="sync-user-pill disconnected">DESCONECTADO</span>
                                )}
                            </div>
                            <div className={`sync-connector-line ${isTkLinked ? 'active' : 'inactive'}`}>
                                {isTkLinked ? <Link2 size={16} /> : <Link2 size={16} style={{ strokeDasharray: '3,3' }} />}
                            </div>
                            <div className="sync-role-node">
                                <span className="sync-role-name">MESA DE LLEGADA</span>
                                {connectedTimekeeper ? (
                                    <span className="sync-user-pill connected">{tkName.toUpperCase()}</span>
                                ) : (
                                    <span className="sync-user-pill disconnected">DESCONECTADO</span>
                                )}
                            </div>
                        </div>
                    );
                })()}
            </div>,
            document.getElementById('global-sync-bar-portal-target')
        )}

        <div className="starter-dashboard fade-in">
            {['Reconnecting', 'Connecting'].includes(connectionState) && (
                <div className="connection-state-alert-bar reconnecting">
                    <RefreshCw className="spin animate-spin" size={14} style={{ marginRight: '8px' }} />
                    <span>⚠️ Conexión inestable. El sistema se está auto-sincronizando... por favor, espere antes de largar.</span>
                </div>
            )}
            {connectionState === 'Disconnected' && (
                <div className="connection-state-alert-bar disconnected">
                    <span>⚠️ Sin conexión en tiempo real. Se usará el canal de respaldo HTTP al largar.</span>
                </div>
            )}
            <aside className={`starter-sidebar glass-effect ${isSidebarCollapsed ? 'collapsed' : ''}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '8px' }}>
                    <h3 style={{ margin: 0, flex: 1 }}><Clock size={18} /> Próximas Pruebas</h3>
                    <button 
                        className="btn-collapse"
                        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    >
                        {isSidebarCollapsed ? 'Mostrar' : 'Ocultar'}
                    </button>
                </div>
                {!isSidebarCollapsed && (
                    <div className="selection-stack">
                        <div className="mobile-event-selector">
                            <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px', display: 'block' }}>Evento:</label>
                            <select value={selectedEvento?.id || ''} onChange={(e) => setSelectedEvento(eventos.find(ev => ev.id === parseInt(e.target.value)))}>
                                <option value="">Seleccionar Evento...</option>
                                {eventos.map(ev => <option key={ev.id} value={ev.id}>{ev.nombre}</option>)}
                            </select>
                        </div>

                        <div className="sidebar-section-header">
                            <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Cronograma ({fases.length}):</label>
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
                            <div className="header-left-actions">
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '12px' }}>
                                    <div className="badge-live">MODO LARGADOR</div>
                                </div>
                                {(() => {
                                    const p = selectedFase?.prueba?.prueba || selectedFase?.etapa?.eventoPrueba?.prueba || selectedFase?.eventoPrueba?.prueba;
                                    const catName = p ? (CATEGORIA_NAMES[p.categoria?.id] || p.categoria?.nombre) : (selectedFase?.categoriaNombre || 'Sin Categoría');
                                    const boteName = p ? (BOTE_NAMES[p.bote?.id] || p.bote?.nombre) : (selectedFase?.boteTipo || selectedFase?.tipoBote || 'Sin Bote');
                                    const distName = p ? (DISTANCIA_NAMES[p.distancia?.id] || p.distancia?.metros + 'm') : (selectedFase?.distancia ? selectedFase.distancia + 'm' : '0m');
                                    const timeName = formatTime(selectedFase?.fechaHoraProgramada);
                                    
                                    return (
                                        <div className="race-header-info">
                                            <h2>
                                                <span className="race-id-prefix">
                                                    #{selectedFase?.nroPrueba || (fases.findIndex(x => x.id === selectedFase?.id) !== -1 ? fases.findIndex(x => x.id === selectedFase?.id) + 1 : '')}
                                                </span>
                                                {' '}{catName}
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
                                    className={`btn-start-big ${selectedFase.estado !== 'Programada' ? 'disabled' : ''} ${connectionState !== 'Connected' ? 'connection-lost' : ''}`}
                                    onClick={handleStartRace}
                                    disabled={selectedFase.estado !== 'Programada' || loading || connectionState !== 'Connected'}
                                >
                                    {selectedFase.estado === 'Programada' ? (
                                        connectionState === 'Connected' ? (
                                            <>
                                                <Play size={48} fill="currentColor" />
                                                <span>LARGAR CARRERA</span>
                                            </>
                                        ) : ['Reconnecting', 'Connecting'].includes(connectionState) ? (
                                            <>
                                                <RefreshCw size={48} className="spin animate-spin" />
                                                <span>ESPERE SEÑAL...</span>
                                            </>
                                        ) : (
                                            <>
                                                <RefreshCw size={48} />
                                                <span>SIN CONEXIÓN</span>
                                            </>
                                        )
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
                                    disabled={fases.findIndex(f => f.id === selectedFase?.id) <= 0}
                                    onClick={() => {
                                        const idx = fases.findIndex(f => f.id === selectedFase?.id);
                                        if (idx > 0) setSelectedFase(fases[idx - 1]);
                                    }}
                                >
                                    <ArrowLeft size={16} /> Anterior
                                </button>
                                <span className="nav-index">
                                    Prueba {fases.findIndex(f => f.id === selectedFase?.id) + 1} de {fases.length}
                                </span>
                                <button 
                                    className="btn-nav-step" 
                                    disabled={fases.findIndex(f => f.id === selectedFase?.id) >= fases.length - 1}
                                    onClick={() => {
                                        const idx = fases.findIndex(f => f.id === selectedFase?.id);
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
            {confirmDialog.isOpen && (
                <ConfirmDialog
                    isOpen={confirmDialog.isOpen}
                    onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                    onConfirm={confirmDialog.onConfirm}
                    title={confirmDialog.title}
                    message={confirmDialog.message}
                    type={confirmDialog.type || 'warning'}
                />
            )}
            {startingStatus && (
                <div className="starting-overlay">
                    <div className="starting-overlay-card glass-effect">
                        <div className="starting-spinner-wrapper">
                            {startingStatus === 'success' || startingStatus === 'success_reset' ? (
                                <div className="success-checkmark-animated">✓</div>
                            ) : startingStatus === 'error' ? (
                                <div className="error-cross-animated">✗</div>
                            ) : (
                                <div className="starting-spinner"></div>
                            )}
                        </div>
                        <h2>
                            {startingStatus === 'connecting' && "Estableciendo Conexión..."}
                            {startingStatus === 'starting' && "Iniciando Carrera..."}
                            {startingStatus === 'resetting' && "Reiniciando Carrera..."}
                            {startingStatus === 'fallback_http' && "Cambiando a Red de Respaldo..."}
                            {startingStatus === 'success' && "¡LARGADA COMPLETADA!"}
                            {startingStatus === 'success_reset' && "¡REINICIO COMPLETADO!"}
                            {startingStatus === 'error' && "¡ERROR DE CONEXIÓN!"}
                        </h2>
                        <p className="status-desc">
                            {startingStatus === 'connecting' && "Sincronizando reloj de alta precisión con los cronometristas..."}
                            {startingStatus === 'starting' && "Enviando señal de inicio a todos los dispositivos en el agua..."}
                            {startingStatus === 'resetting' && "Restableciendo el cronómetro en todas las terminales..."}
                            {startingStatus === 'fallback_http' && "Los WebSockets fallaron. Sincronizando por canal HTTP de respaldo..."}
                            {startingStatus === 'success' && "El sistema ha tomado el tiempo inicial de largada con precisión absoluta."}
                            {startingStatus === 'success_reset' && "La regata ha sido restablecida en todas las terminales del sistema."}
                            {startingStatus === 'error' && "No se pudo establecer comunicación con el servidor. Revisa tu cobertura móvil."}
                        </p>
                        {['connecting', 'starting', 'resetting', 'fallback_http'].includes(startingStatus) && (
                            <div className="overlay-critical-alert">
                                ⚠️ NO CERRAR NI ACTUALIZAR LA PÁGINA
                                <small>Esto evita desajustes de hora entre la largada y la llegada.</small>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
        </>
    );
};

export default StarterDashboard;
