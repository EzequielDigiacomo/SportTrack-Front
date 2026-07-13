import React, { useState, useEffect } from 'react';
import { formatTime } from '../../utils/dateUtils';
import { Play, CheckCircle, Clock, Users, Activity, Search, RefreshCw, LogOut, ArrowLeft, ArrowRight, Layout, Grid, Link2, RotateCcw } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import EventoService from '../../services/EventoService';
import FaseService from '../../services/FaseService';
import timingSignalRService from '../../services/TimingSignalRService';
import { getJudgeDisplayName, mapFasesFromApi, canStartFase, isFaseCerrada, normalizeFaseEstado } from '../../utils/judgeDashboardHelpers';
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
    // En mobile el cronograma arranca cerrado para priorizar la prueba activa
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(window.innerWidth <= 1000);
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
    const [startingStatus, setStartingStatus] = useState(null); // 'connecting' | 'starting' | 'resetting' | 'fallback_http' | 'success' | 'success_reset' | 'error' | 'queued'
    const [connectionState, setConnectionState] = useState(timingSignalRService.getConnectionState());
    const [activeJudges, setActiveJudges] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [clockSyncStale, setClockSyncStale] = useState(() => timingSignalRService.getClockSyncStatus().isStale);
    const [liveClock, setLiveClock] = useState(() => {
        const d = timingSignalRService.getSyncedNow();
        return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    });

    const isTimekeeperConnected = activeJudges.some(j => {
        const role = (j.role || j.Role || '').toLowerCase();
        return role === 'cronometrista';
    });

    useEffect(() => {
        const unsubscribe = timingSignalRService.onStateChange((state) => {
            setConnectionState(state);
            setClockSyncStale(timingSignalRService.getClockSyncStatus().isStale);
        });
        const syncPoll = setInterval(() => {
            setClockSyncStale(timingSignalRService.getClockSyncStatus().isStale);
        }, 15000);
        const clockTick = setInterval(() => {
            const d = timingSignalRService.getSyncedNow();
            setLiveClock(d.toLocaleTimeString('es-AR', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            }));
        }, 250);
        timingSignalRService.flushPendingRaceStart().then((ok) => {
            if (ok) addToast('Largada pendiente enviada al servidor', 'success');
        }).catch(() => {});
        return () => {
            unsubscribe();
            clearInterval(syncPoll);
            clearInterval(clockTick);
        };
    }, []);

    const handleResyncClock = async () => {
        try {
            if (timingSignalRService.getConnectionState() !== 'Connected') {
                await timingSignalRService.connect(
                    selectedEvento?.id,
                    selectedFase?.id,
                    getJudgeDisplayName(user, 'Largador'),
                    'Largador'
                );
            } else {
                await timingSignalRService.syncClock();
            }
            setClockSyncStale(timingSignalRService.getClockSyncStatus().isStale);
            addToast('Reloj re-sincronizado', 'success');
        } catch {
            addToast('No se pudo sincronizar el reloj', 'error');
        }
    };

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
                setFases(mapFasesFromApi(data));
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

                const markInReview = (faseId) => {
                    const id = typeof faseId === 'object' ? (faseId?.id ?? faseId?.Id) : faseId;
                    if (!id) return;
                    setFases(prev => prev.map(f =>
                        String(f.id) === String(id) ? { ...f, estado: 'Pendiente de Validación' } : f
                    ));
                    setSelectedFase(prev => {
                        if (!prev || String(prev.id) !== String(id)) return prev;
                        return { ...prev, estado: 'Pendiente de Validación' };
                    });
                };

                timingSignalRService.onRaceInReview(markInReview);
                timingSignalRService.onGlobalRaceInReview(markInReview);

                timingSignalRService.onGlobalRaceOfficialized((faseId) => {
                    setFases(prev => prev.map(f =>
                        String(f.id) === String(faseId) ? { ...f, estado: 'Finalizada' } : f
                    ));
                    setSelectedFase(prev => {
                        if (!prev || String(prev.id) !== String(faseId)) return prev;
                        return { ...prev, estado: 'Finalizada' };
                    });
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
    }, [selectedEvento?.id, selectedFase?.id]);

    const handleRefresh = async () => {
        if (!selectedEvento) {
            addToast('Seleccioná un evento primero', 'warning');
            return;
        }

        const currentFaseId = selectedFase?.id;
        setRefreshing(true);
        try {
            const data = await FaseService.getByEvento(selectedEvento.id);
            const sorted = mapFasesFromApi(data);
            setFases(sorted);

            if (currentFaseId) {
                const fresh = sorted.find(f => String(f.id) === String(currentFaseId));
                if (fresh) setSelectedFase(fresh);
            }

            await timingSignalRService.disconnect();
            if (currentFaseId) {
                await timingSignalRService.connect(
                    selectedEvento.id,
                    currentFaseId,
                    getJudgeDisplayName(user, 'Largador'),
                    'Largador'
                );
            } else {
                await timingSignalRService.connect(
                    selectedEvento.id,
                    null,
                    getJudgeDisplayName(user, 'Largador'),
                    'Largador'
                );
            }

            addToast('Datos y conexión actualizados', 'success');
        } catch (err) {
            console.error('Error al refrescar:', err);
            addToast('No se pudo refrescar. Reintentá.', 'error');
        } finally {
            setRefreshing(false);
        }
    };

    const handleStartRace = async () => {
        if (!selectedFase || !canStartFase(selectedFase)) return;

        // t0 sagrado: captura al click, antes de cualquier red.
        const startStamp = timingSignalRService.getSyncedNow();
        const t0Iso = startStamp.toISOString();

        // Feedback inmediato (no espera ACK)
        try {
            if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(40);
        } catch { /* ignore */ }
        setStartingStatus('starting');
        setLoading(true);
        setFases(prev => prev.map(f =>
            String(f.id) === String(selectedFase.id)
                ? { ...f, estado: 'En Carrera', fechaHoraInicioReal: t0Iso }
                : f
        ));
        setSelectedFase(prev => prev
            ? { ...prev, estado: 'En Carrera', fechaHoraInicioReal: t0Iso }
            : prev
        );

        try {
            const result = await timingSignalRService.deliverRaceStart(selectedFase.id, startStamp);
            if (result.ok) {
                if (result.channel === 'http') {
                    const updated = result.updated;
                    const nextEstado = normalizeFaseEstado(updated?.estado || updated?.Estado || 'En Carrera');
                    setFases(prev => prev.map(f =>
                        String(f.id) === String(selectedFase.id)
                            ? { ...f, ...updated, estado: nextEstado, fechaHoraInicioReal: updated?.fechaHoraInicioReal || t0Iso }
                            : f
                    ));
                    setSelectedFase(prev => prev
                        ? { ...prev, ...updated, estado: nextEstado, fechaHoraInicioReal: updated?.fechaHoraInicioReal || t0Iso }
                        : prev
                    );
                    addToast('Carrera iniciada (HTTP, mismo instante del click)', 'success');
                } else {
                    addToast('Carrera iniciada (tiempo real)', 'success');
                }
                setStartingStatus('success');
                setTimeout(() => setStartingStatus(null), 1500);
            } else {
                addToast('Sin red: la largada quedó en cola con el instante del click. Se reenvía al reconectar.', 'warning');
                setStartingStatus('queued');
                setTimeout(() => setStartingStatus(null), 2500);
            }
        } catch (err) {
            console.error('Error delivering race start:', err);
            addToast('Largada local marcada; reintentando envío en segundo plano.', 'warning');
            setStartingStatus('queued');
            setTimeout(() => setStartingStatus(null), 2500);
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

    const handleResetAllStatuses = async () => {
        if (!selectedFase || !selectedFase.resultados) return;

        setConfirmDialog({
            isOpen: true,
            title: 'Restablecer Lista',
            message: '⚠️ ¿Estás seguro de que deseas restablecer el estado de todos los carriles a su estado original (Pendiente)? Esto eliminará los DNS/DNF/DSQ cargados.',
            type: 'warning',
            onConfirm: async () => {
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                const previousResultados = selectedFase.resultados;
                
                try {
                    // Actualización optimista en cascada
                    setSelectedFase(prev => ({
                        ...prev,
                        resultados: prev.resultados.map(r => ({ ...r, estadoCanto: 'Pendiente' }))
                    }));

                    // Filtrar los que realmente cambiaron para enviar las peticiones
                    const changedResults = previousResultados.filter(
                        r => r.estadoCanto && r.estadoCanto !== 'Pendiente'
                    );

                    if (changedResults.length > 0) {
                        setLoading(true);
                        // Enviar actualizaciones concurrentes
                        await Promise.all(
                            changedResults.map(r => 
                                timingSignalRService.updateResultStatus(selectedFase.id, r.id, 'Pendiente')
                            )
                        );
                        addToast("Estados restablecidos con éxito", "success");
                    } else {
                        addToast("La lista ya se encuentra en su estado original", "info");
                    }
                } catch (err) {
                    console.error("Error resetting status of all results:", err);
                    addToast("Error al restablecer los estados en el servidor", "error");
                    // Revertir
                    setSelectedFase(prev => ({
                        ...prev,
                        resultados: previousResultados
                    }));
                } finally {
                    setLoading(false);
                }
            }
        });
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
                    const isSelfLinked = !!selectedEvento;
                    
                    return (
                        <div className="judges-sync-card" title="Estado de Enlace de Jueces">
                            {/* Vista desktop: nombres completos */}
                            <div className="sync-desktop-row">
                                <div className="sync-role-node">
                                    <span className="sync-role-name">LARGADOR</span>
                                    <span className={`sync-user-pill ${isSelfLinked ? 'connected' : 'disconnected'}`}>{myName.toUpperCase()}</span>
                                </div>
                                <div className={`sync-connector-line ${isControlLinked ? 'active' : 'inactive'}`}>
                                    <Link2 size={16} style={isControlLinked ? undefined : { strokeDasharray: '3,3' }} />
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
                                    <Link2 size={16} style={isTkLinked ? undefined : { strokeDasharray: '3,3' }} />
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
                            {/* Vista mobile: solo indicadores */}
                            <div className="sync-mobile-dots" aria-label="Estado de enlace">
                                <div className={`sync-dot-item ${isSelfLinked ? 'on' : 'off'}`}>
                                    <span className="sync-dot" />
                                    <span className="sync-dot-label">Larg.</span>
                                </div>
                                <div className={`sync-dot-item ${isControlLinked ? 'on' : 'off'}`}>
                                    <span className="sync-dot" />
                                    <span className="sync-dot-label">Ctrl</span>
                                </div>
                                <div className={`sync-dot-item ${isTkLinked ? 'on' : 'off'}`}>
                                    <span className="sync-dot" />
                                    <span className="sync-dot-label">Lleg.</span>
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </div>,
            document.getElementById('global-sync-bar-portal-target')
        )}

        {canStartFase(selectedFase) && ['Reconnecting', 'Connecting'].includes(connectionState) && (
            <div className="connection-state-alert-bar reconnecting">
                <RefreshCw className="spin animate-spin" size={14} />
                <span className="alert-text-full">Conexión inestable. Espere antes de largar.</span>
                <span className="alert-text-short">Reconectando…</span>
            </div>
        )}
        {canStartFase(selectedFase) && connectionState === 'Disconnected' && (
            <div className="connection-state-alert-bar disconnected">
                <span className="alert-text-full">Sin tiempo real — se usará HTTP al largar (mismo instante del click).</span>
                <span className="alert-text-short">Sin señal · HTTP</span>
                <button
                    type="button"
                    className="btn-refresh-sync"
                    onClick={handleRefresh}
                    disabled={refreshing || loading || !selectedEvento}
                >
                    <RefreshCw size={14} className={refreshing ? 'spin animate-spin' : ''} />
                    <span className="btn-refresh-label">{refreshing ? '…' : 'Reconectar'}</span>
                </button>
            </div>
        )}
        {canStartFase(selectedFase) && connectionState === 'Connected' && clockSyncStale && (
            <div className="connection-state-alert-bar reconnecting">
                <span className="alert-text-full">Reloj sin sync reciente. Recomendado sincronizar antes de largar.</span>
                <span className="alert-text-short">Sync reloj</span>
                <button type="button" className="btn-refresh-sync" onClick={handleResyncClock}>
                    <RefreshCw size={14} />
                    <span className="btn-refresh-label">Re-sincronizar</span>
                </button>
            </div>
        )}
        {selectedFase && isFaseCerrada(selectedFase) && (
            <div className="connection-state-alert-bar fase-cerrada-banner">
                <span className="alert-text-full">
                    Esta prueba ya fue largada
                    {normalizeFaseEstado(selectedFase.estado) === 'Pendiente de Validación' && ' y está en revisión'}
                    {normalizeFaseEstado(selectedFase.estado) === 'Finalizada' && ' y tiene resultados guardados'}
                    {(selectedFase.resultados || []).some(r => r.tiempoOficial) && normalizeFaseEstado(selectedFase.estado) === 'Programada' && ' (hay tiempos cargados)'}
                    . No se puede volver a largar.
                </span>
                <span className="alert-text-short">
                    {normalizeFaseEstado(selectedFase.estado) === 'Programada' ? 'Con tiempos · cerrada' : normalizeFaseEstado(selectedFase.estado)}
                </span>
            </div>
        )}

        <div className="starter-dashboard fade-in starter-mobile-ready">
            <aside className={`starter-sidebar glass-effect ${isSidebarCollapsed ? 'collapsed' : 'expanded'}`}>
                <button
                    type="button"
                    className="cronograma-toggle-bar"
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                >
                    <span className="cronograma-toggle-left">
                        <Clock size={16} />
                        <span>Cronograma</span>
                        <span className="cronograma-count">{fases.length}</span>
                    </span>
                    <span className="cronograma-toggle-right">
                        {selectedFase && (
                            <span className="cronograma-current-chip">
                                #{selectedFase.nroPrueba || (fases.findIndex(x => x.id === selectedFase.id) + 1)}
                            </span>
                        )}
                        <span className="btn-collapse">{isSidebarCollapsed ? 'Abrir' : 'Cerrar'}</span>
                    </span>
                </button>

                {!isSidebarCollapsed && (
                    <div className="selection-stack cronograma-panel">
                        <div className="mobile-event-selector">
                            <label>Evento</label>
                            <select value={selectedEvento?.id || ''} onChange={(e) => setSelectedEvento(eventos.find(ev => ev.id === parseInt(e.target.value)))}>
                                <option value="">Seleccionar Evento...</option>
                                {eventos.map(ev => <option key={ev.id} value={ev.id}>{ev.nombre}</option>)}
                            </select>
                        </div>

                        <div className="sidebar-section-header desktop-only-toggle">
                            <label>Lista ({fases.length})</label>
                            <button type="button" className="btn-view-toggle" onClick={() => setIsCompact(!isCompact)}>
                                {isCompact ? <Layout size={14} /> : <Grid size={14} />}
                            </button>
                        </div>

                        <div className={`pruebas-list ${isCompact ? 'compact-grid' : ''}`}>
                            {fases.map((f, index) => (
                                <div 
                                    key={f.id} 
                                    className={`prueba-item-mini ${selectedFase?.id === f.id ? 'active' : ''} ${isFaseCerrada(f) ? 'finished' : ''}`}
                                    onClick={() => {
                                        setSelectedFase(f);
                                        if (window.innerWidth <= 1000) setIsSidebarCollapsed(true);
                                    }}
                                >
                                    {isFaseCerrada(f) && <span className="status-dot finished"></span>}
                                    <span className="race-num">#{f.nroPrueba || (index + 1)}</span>
                                    {!isCompact && (() => {
                                        const p = f.prueba?.prueba || f.etapa?.eventoPrueba?.prueba || f.eventoPrueba?.prueba;
                                        const catName = p ? (CATEGORIA_NAMES[p.categoria?.id] || p.categoria?.nombre) : (f.categoriaNombre || 'Sin Categoría');
                                        return (
                                            <div className="prueba-item-detail">
                                                <span className="prueba-item-cat">{catName}</span>
                                                <span className="prueba-item-fase">{f.nombreFase}</span>
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
                                <div className="race-header-toolbar">
                                    <div className="badge-live">LARGADOR</div>
                                    <button
                                        type="button"
                                        className="btn-refresh-sync"
                                        onClick={handleRefresh}
                                        disabled={refreshing || loading || !selectedEvento}
                                        title="Recargar datos y reconectar"
                                    >
                                        <RefreshCw size={14} className={refreshing ? 'spin animate-spin' : ''} />
                                        <span className="btn-refresh-label">{refreshing ? '…' : 'Refrescar'}</span>
                                    </button>
                                </div>
                                {(() => {
                                    const p = selectedFase?.prueba?.prueba || selectedFase?.etapa?.eventoPrueba?.prueba || selectedFase?.eventoPrueba?.prueba;
                                    const catName = p ? (CATEGORIA_NAMES[p.categoria?.id] || p.categoria?.nombre) : (selectedFase?.categoriaNombre || 'Sin Categoría');
                                    const boteName = p ? (BOTE_NAMES[p.bote?.id] || p.bote?.nombre) : (selectedFase?.boteTipo || selectedFase?.tipoBote || 'Sin Bote');
                                    const distName = p ? (DISTANCIA_NAMES[p.distancia?.id] || p.distancia?.metros + 'm') : (selectedFase?.distancia ? selectedFase.distancia + 'm' : '0m');
                                    const timeName = formatTime(selectedFase?.fechaHoraProgramada);
                                    const raceNum = selectedFase?.nroPrueba || (fases.findIndex(x => x.id === selectedFase?.id) !== -1 ? fases.findIndex(x => x.id === selectedFase?.id) + 1 : '');
                                    
                                    return (
                                        <div className="race-header-info">
                                            <h2>
                                                <span className="race-id-prefix">#{raceNum}</span>
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

                            <div className="quick-nav-footer race-nav-top">
                                <button 
                                    type="button"
                                    className="btn-nav-step" 
                                    disabled={fases.findIndex(f => f.id === selectedFase?.id) <= 0}
                                    onClick={() => {
                                        const idx = fases.findIndex(f => f.id === selectedFase?.id);
                                        if (idx > 0) setSelectedFase(fases[idx - 1]);
                                    }}
                                >
                                    <ArrowLeft size={16} /> <span className="nav-label">Ant.</span>
                                </button>
                                <span className="nav-index">
                                    {fases.findIndex(f => f.id === selectedFase?.id) + 1}/{fases.length}
                                </span>
                                <button 
                                    type="button"
                                    className="btn-nav-step" 
                                    disabled={fases.findIndex(f => f.id === selectedFase?.id) >= fases.length - 1}
                                    onClick={() => {
                                        const idx = fases.findIndex(f => f.id === selectedFase?.id);
                                        if (idx < fases.length - 1) setSelectedFase(fases[idx + 1]);
                                    }}
                                >
                                    <span className="nav-label">Sig.</span> <ArrowRight size={16} />
                                </button>
                            </div>
                        </header>

                        <div className="fase-details">
                            <div className="athletes-checkin">
                                <div className="checkin-header">
                                    <div className="checkin-header-left">
                                        <h3><Users size={18} /> Carriles</h3>
                                        <div
                                            className="starter-live-clock"
                                            title="Hora del sistema (sincronizada). Usala para largar a horario."
                                        >
                                            <Clock size={16} className="starter-live-clock-icon" aria-hidden />
                                            <time className="starter-live-clock-time" dateTime={liveClock}>{liveClock}</time>
                                        </div>
                                    </div>
                                    <div className="checkin-header-actions">
                                        <button 
                                            type="button" 
                                            className="btn-reset-list"
                                            onClick={handleResetAllStatuses}
                                            title="Vuelve todos los carriles a Pendiente (borra DNS/DNF/DSQ)"
                                            disabled={loading || !canStartFase(selectedFase)}
                                        >
                                            <RotateCcw size={14} />
                                            <span>Restablecer</span>
                                        </button>
                                    </div>
                                </div>
                                <div className="checkin-grid">
                                    {(selectedFase.resultados || []).sort((a,b) => a.carril - b.carril).map(r => (
                                        <div key={r.id} className={`checkin-row ${!canStartFase(selectedFase) || (r.estadoCanto && r.estadoCanto !== 'Pendiente') ? 'row-disabled' : ''}`}>
                                            <span className="lane-badge">{r.carril}</span>
                                            <div className="athlete-info-block">
                                                <span className="athlete-name">
                                                    {r.tripulantes && r.tripulantes.length > 0 
                                                        ? [r.participanteNombre, ...r.tripulantes.map(t => t.participanteNombreCompleto || t.participanteNombre)].filter(Boolean).join(' - ')
                                                        : (r.participanteNombre || 'Sin atleta')
                                                    }
                                                </span>
                                                {(r.clubSigla || r.clubNombre) && (
                                                    <span className="club-tag-full">{r.clubSigla || r.clubNombre}</span>
                                                )}
                                            </div>
                                            <div className="status-quick-actions">
                                                <button type="button" disabled={!canStartFase(selectedFase)} className={`btn-status-toggle dns ${r.estadoCanto === 'DNS' ? 'active' : ''}`} onClick={() => handleStatusChange(r.id, r.estadoCanto === 'DNS' ? 'Pendiente' : 'DNS')}>DNS</button>
                                                <button type="button" disabled={!canStartFase(selectedFase)} className={`btn-status-toggle dnf ${r.estadoCanto === 'DNF' ? 'active' : ''}`} onClick={() => handleStatusChange(r.id, r.estadoCanto === 'DNF' ? 'Pendiente' : 'DNF')}>DNF</button>
                                                <button type="button" disabled={!canStartFase(selectedFase)} className={`btn-status-toggle dsq ${r.estadoCanto === 'DSQ' ? 'active' : ''}`} onClick={() => handleStatusChange(r.id, r.estadoCanto === 'DSQ' ? 'Pendiente' : 'DSQ')}>DSQ</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="control-actions starter-sticky-actions">
                                <button 
                                    type="button"
                                    className={`btn-start-big ${!canStartFase(selectedFase) ? 'disabled' : ''} ${canStartFase(selectedFase) && connectionState !== 'Connected' ? 'connection-lost' : ''} ${canStartFase(selectedFase) && connectionState === 'Connected' && !isTimekeeperConnected ? 'no-timekeeper' : ''}`}
                                    onClick={handleStartRace}
                                    disabled={!canStartFase(selectedFase) || loading || connectionState !== 'Connected' || !isTimekeeperConnected}
                                >
                                    {canStartFase(selectedFase) ? (
                                        connectionState === 'Connected' ? (
                                            !isTimekeeperConnected ? (
                                                <>
                                                    <Users size={32} className="start-icon" />
                                                    <span>ESPERANDO LLEGADA</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Play size={32} fill="currentColor" className="start-icon" />
                                                    <span>LARGAR</span>
                                                </>
                                            )
                                        ) : ['Reconnecting', 'Connecting'].includes(connectionState) ? (
                                            <>
                                                <RefreshCw size={32} className="spin animate-spin start-icon" />
                                                <span>ESPERE SEÑAL…</span>
                                            </>
                                        ) : (
                                            <>
                                                <RefreshCw size={32} className="start-icon" />
                                                <span>SIN CONEXIÓN</span>
                                            </>
                                        )
                                    ) : (
                                        <>
                                            <Activity size={32} className={`start-icon ${normalizeFaseEstado(selectedFase.estado) === 'En Carrera' ? 'pulse' : ''}`} />
                                            <span>
                                                {normalizeFaseEstado(selectedFase.estado) === 'Programada' && (selectedFase.resultados || []).some(r => r.tiempoOficial)
                                                    ? 'CON TIEMPOS'
                                                    : normalizeFaseEstado(selectedFase.estado).toUpperCase()}
                                            </span>
                                        </>
                                    )}
                                </button>
                                {(normalizeFaseEstado(selectedFase.estado) === 'En Carrera' || normalizeFaseEstado(selectedFase.estado) === 'Pendiente de Validación') && (
                                    <button type="button" className="btn-reset-starter" onClick={handleResetRace} disabled={loading}>
                                        <RefreshCw size={18} /> <span>REINICIAR</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="empty-msg">
                        <p>Abrí el cronograma y elegí una prueba</p>
                        {isSidebarCollapsed && (
                            <button type="button" className="btn-collapse empty-open-cronograma" onClick={() => setIsSidebarCollapsed(false)}>
                                Abrir cronograma
                            </button>
                        )}
                    </div>
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
                            {startingStatus === 'success' || startingStatus === 'success_reset' || startingStatus === 'queued' ? (
                                <div className="success-checkmark-animated">✓</div>
                            ) : startingStatus === 'error' ? (
                                <div className="error-cross-animated">✗</div>
                            ) : (
                                <div className="starting-spinner"></div>
                            )}
                        </div>
                        <h2>
                            {startingStatus === 'connecting' && "Estableciendo Conexión..."}
                            {startingStatus === 'starting' && "Registrando largada..."}
                            {startingStatus === 'resetting' && "Reiniciando Carrera..."}
                            {startingStatus === 'fallback_http' && "Cambiando a Red de Respaldo..."}
                            {startingStatus === 'success' && "¡LARGADA COMPLETADA!"}
                            {startingStatus === 'success_reset' && "¡REINICIO COMPLETADO!"}
                            {startingStatus === 'queued' && "LARGADA EN COLA"}
                            {startingStatus === 'error' && "¡ERROR DE CONEXIÓN!"}
                        </h2>
                        <p className="status-desc">
                            {startingStatus === 'connecting' && "Sincronizando reloj con el servidor..."}
                            {startingStatus === 'starting' && "Enviando el instante del click (t0) al servidor..."}
                            {startingStatus === 'resetting' && "Restableciendo el cronómetro en todas las terminales..."}
                            {startingStatus === 'fallback_http' && "Los WebSockets fallaron. Enviando el mismo t0 por HTTP..."}
                            {startingStatus === 'success' && "Confirmado. El cronómetro usa el instante del botón, no de este aviso."}
                            {startingStatus === 'success_reset' && "La regata ha sido restablecida en todas las terminales del sistema."}
                            {startingStatus === 'queued' && "Sin red ahora. Se guardó el instante del click y se reenviará al reconectar."}
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
