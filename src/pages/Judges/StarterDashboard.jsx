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
                alert("⚠️ La regata fue re-sorteada. Se ha actualizado la lista.");
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
                        <button className="btn-view-toggle" onClick={() => setIsCompact(!isCompact)}>
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
                                            <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{f.eventoPrueba?.prueba?.categoria?.nombre}</span>
                                            <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>{f.nombreFase} - {f.eventoPrueba?.prueba?.bote?.tipo}</span>
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
                            <div className="header-left-actions">
                                <div className="badge-live">MODO LARGADOR</div>
                                <h2>
                                    <span style={{ color: 'var(--color-primary)', marginRight: '10px' }}>#{selectedFase.nroPrueba}</span>
                                    {selectedFase.eventoPrueba?.prueba?.categoria?.nombre} - {selectedFase.nombreFase}
                                </h2>
                                <p style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
                                    {selectedFase.eventoPrueba?.prueba?.bote?.tipo} | {selectedFase.eventoPrueba?.prueba?.distancia}m
                                </p>
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
                                                    ? [r.participanteNombre, ...r.tripulantes.map(t => t.participanteNombreCompleto || t.participanteNombre)].map(n => getSoloApellido(n)).join(' - ')
                                                    : getSoloApellido(r.participanteNombre)
                                                }
                                            </span>
                                            <span className="club-tag">{r.clubSigla}</span>
                                            <div className="status-quick-actions">
                                                <button className={`btn-status-toggle dns ${r.estadoCanto === 'DNS' ? 'active' : ''}`} onClick={() => handleStatusChange(r.id, r.estadoCanto === 'DNS' ? 'Pendiente' : 'DNS')}>DNS</button>
                                                <button className={`btn-status-toggle dnf ${r.estadoCanto === 'DNF' ? 'active' : ''}`} onClick={() => handleStatusChange(r.id, r.estadoCanto === 'DNF' ? 'Pendiente' : 'DNF')}>DNF</button>
                                                <button className={`btn-status-toggle dsq ${r.estadoCanto === 'DSQ' ? 'active' : ''}`} onClick={() => handleStatusChange(r.id, r.estadoCanto === 'DSQ' ? 'Pendiente' : 'DSQ')}>DSQ</button>
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
