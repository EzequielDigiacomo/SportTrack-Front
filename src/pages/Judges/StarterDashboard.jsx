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

const StarterDashboard = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const isAdmin = user?.rol === 'Admin';
    const [eventos, setEventos] = useState([]);
    const [selectedEvento, setSelectedEvento] = useState(null);
    const [fases, setFases] = useState([]); // Todas las fases del evento (Cronograma 61 pruebas)
    const [selectedFase, setSelectedFase] = useState(null);
    const [loading, setLoading] = useState(false);
    const { addToast } = useToast();
    const [isCompact, setIsCompact] = useState(window.innerWidth <= 768);

    useEffect(() => {
        // Al seleccionar un evento, podemos autoseleccionar la primera fase si no hay ninguna
        if (fases.length > 0 && !selectedFase) {
            // setSelectedFase(fases[0]); // Opcional
        }
    }, [fases]);

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
                // Ordenar por nroPrueba o por id si no tiene nro
                const sorted = data.sort((a, b) => (a.nroPrueba || a.id) - (b.nroPrueba || b.id));
                setFases(sorted);
            } catch (err) {
                console.error("Error loading fases:", err);
            }
        };
        loadFases();
    }, [selectedEvento]);

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
            if (err.message === 'Fase no encontrada') {
                const data = await FaseService.getByEvento(selectedEvento.id);
                setFases(data);
                setSelectedFase(null);
                alert("⚠️ La regata fue re-sorteada. Se ha actualizado la lista, por favor selecciona la serie nuevamente.");
            }
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
            if (addToast) addToast("Error de conexión. Reintentando...", "error");
            try { await timingSignalRService.connect(selectedFase.id); } catch(e) {}
        }
    };

    const handleResetRace = async () => {
        if (!selectedFase) return;
        if (!window.confirm("⚠️ ¿Confirmar partida en falso? Esto reseteará el cronómetro y los resultados para TODOS los jueces.")) return;

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
            <aside className="starter-sidebar glass-effect">
                <h3><Clock size={18} /> Próximas Pruebas</h3>
                <div className="selection-stack">
                    <label style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px', display: 'block' }}>Evento:</label>
                    <select value={selectedEvento?.id || ''} onChange={(e) => setSelectedEvento(eventos.find(ev => ev.id === parseInt(e.target.value)))}>
                        <option value="">Seleccionar Evento...</option>
                        {eventos.map(ev => <option key={ev.id} value={ev.id}>{ev.nombre}</option>)}
                    </select>

                    <div className="sidebar-section-header">
                        <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Cronograma de Pruebas ({fases.length}):</label>
                        <button 
                            className="btn-view-toggle"
                            onClick={() => setIsCompact(!isCompact)}
                            title={isCompact ? "Ver detalles" : "Ver cuadrícula"}
                        >
                            {isCompact ? <Layout size={14} /> : <Grid size={14} />}
                        </button>
                    </div>

                    <div className={`pruebas-list ${isCompact ? 'compact-grid' : ''}`}>
                        {fases.map((f) => (
                            <div 
                                key={f.id} 
                                className={`prueba-item-mini ${selectedFase?.id === f.id ? 'active' : ''}`}
                                onClick={() => setSelectedFase(f)}
                            >
                                {isCompact ? (
                                    <span className="race-num">#{f.nroPrueba || f.id}</span>
                                ) : (
                                    <>
                                        <span className="race-num-prefix">#{f.nroPrueba || f.id}</span>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>
                                                {f.eventoPrueba?.prueba?.categoria?.nombre}
                                            </span>
                                            <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                                                {f.nombreFase} - {f.eventoPrueba?.prueba?.bote?.tipo}
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </aside>

            <main className="starter-main">
                {selectedFase ? (
                    <div className="race-control glass-effect">
                        <header className="race-header">
                            <div className="header-left-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                {!isAdmin && (
                                    <div style={{ display: 'flex', gap: '0.5rem', marginRight: '0.5rem' }}>
                                        <button 
                                            className="btn-admin-secondary" 
                                            onClick={() => navigate('/jueces')} 
                                            title="Volver al Menú"
                                            style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)' }}
                                        >
                                            <ArrowLeft size={18} />
                                        </button>
                                        <button 
                                            className="btn-admin-danger" 
                                            onClick={logout} 
                                            title="Cerrar Sesión"
                                            style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                                        >
                                            <LogOut size={18} />
                                        </button>
                                    </div>
                                )}
                                <div className="badge-live">MODO LARGADOR</div>
                                <h2>
                                    <span style={{ color: 'var(--color-primary)', marginRight: '10px' }}>#{selectedFase.nroPrueba}</span>
                                    {selectedFase.eventoPrueba?.prueba?.categoria?.nombre} - {selectedFase.nombreFase}
                                </h2>
                                <p style={{ fontSize: '0.9rem', color: '#94a3b8' }}>{selectedFase.eventoPrueba?.prueba?.bote?.tipo} | {selectedFase.eventoPrueba?.prueba?.distancia}m</p>
                            </div>
                        </header>

                                        {([...(selectedFase.resultados || [])]).sort((a,b) => (a.carril - b.carril)).map(r => (
                                            <div key={r.id} className={`checkin-row ${r.estadoCanto && r.estadoCanto !== 'Pendiente' ? 'row-disabled' : ''}`}>
                                                <span className="lane-badge">{r.carril}</span>
                                                <span className="athlete-name">
                                                    {r.tripulantes && r.tripulantes.length > 0 
                                                        ? [r.participanteNombre, ...r.tripulantes.map(t => t.participanteNombreCompleto || t.participanteNombre)].map(n => getSoloApellido(n)).join(' - ')
                                                        : getSoloApellido(r.participanteNombre)
                                                    }
                                                </span>
                                                <span className="club-tag">{r.clubSigla}</span>
                                                
                                                <div className="status-quick-actions">
                                                    <button 
                                                        className={`btn-status-toggle dns ${r.estadoCanto === 'DNS' ? 'active' : ''}`}
                                                        onClick={() => handleStatusChange(r.id, r.estadoCanto === 'DNS' ? 'Pendiente' : 'DNS')}
                                                    >DNS</button>
                                                    <button 
                                                        className={`btn-status-toggle dnf ${r.estadoCanto === 'DNF' ? 'active' : ''}`}
                                                        onClick={() => handleStatusChange(r.id, r.estadoCanto === 'DNF' ? 'Pendiente' : 'DNF')}
                                                    >DNF</button>
                                                    <button 
                                                        className={`btn-status-toggle dsq ${r.estadoCanto === 'DSQ' ? 'active' : ''}`}
                                                        onClick={() => handleStatusChange(r.id, r.estadoCanto === 'DSQ' ? 'Pendiente' : 'DSQ')}
                                                    >DSQ</button>
                                                </div>

                                                <CheckCircle size={18} className={`icon-ready ${r.estadoCanto && r.estadoCanto !== 'Pendiente' ? 'hidden' : ''}`} />
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
                                        ) : selectedFase.estado === 'En Carrera' ? (
                                            <>
                                                <Activity size={48} className="pulse" />
                                                <span>EN CARRERA</span>
                                            </>
                                        ) : selectedFase.estado === 'Pendiente de Validación' ? (
                                            <>
                                                <Search size={48} />
                                                <span>EN REVISIÓN</span>
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle size={48} />
                                                <span>FINALIZADA</span>
                                            </>
                                        )}
                                    </button>
                                    
                                    {(selectedFase.estado === 'En Carrera' || selectedFase.estado === 'Pendiente de Validación') && (
                                        <button 
                                            className="btn-reset-starter fade-in"
                                            onClick={handleResetRace}
                                            disabled={loading}
                                        >
                                            <RefreshCw size={20} />
                                            <span>PARTIDA EN FALSO / REINICIAR</span>
                                        </button>
                                    )}
                                    
                                    <p className="hint">Este botón sincroniza el tiempo 0 para todos los jueces.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="empty-msg">Seleccione una serie o final</div>
                        )}
                    </div>
                ) : (
                    <div className="empty-msg">Seleccione una prueba del cronograma</div>
                )}
            </main>
        </div>
    );
};

export default StarterDashboard;
