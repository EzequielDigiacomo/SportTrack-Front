import React, { useState, useEffect } from 'react';
import { Play, CheckCircle, Clock, Users, Activity, Search, RefreshCw, LogOut, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import EventoService from '../../services/EventoService';
import FaseService from '../../services/FaseService';
import { PruebaService } from '../../services/ConfigService';
import timingSignalRService from '../../services/TimingSignalRService';
import { useToast } from '../../context/ToastContext';
import InscripcionService from '../../services/InscripcionService';
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
    const [pruebas, setPruebas] = useState([]);
    const [selectedPrueba, setSelectedPrueba] = useState(null);
    const [fases, setFases] = useState([]);
    const [selectedFase, setSelectedFase] = useState(null);
    const [loading, setLoading] = useState(false);
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
        const loadPruebas = async () => {
            const data = await PruebaService.getByEvento(selectedEvento.id);
            setPruebas(data);
        };
        loadPruebas();
    }, [selectedEvento]);

    useEffect(() => {
        if (!selectedPrueba) return;
        const loadFases = async () => {
            const [fs, inscs] = await Promise.all([
                FaseService.getByEventoPrueba(selectedPrueba.id),
                InscripcionService.getByEventoPrueba(selectedPrueba.id)
            ]);

            setFases(fs);
        };
        loadFases();
    }, [selectedPrueba]);

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
        // Eliminado confirm para largada instantánea

        try {
            setLoading(true);
            await timingSignalRService.connect(selectedFase.id);
            await timingSignalRService.requestStartRace(selectedFase.id);
            // Eliminado addToast para evitar distracciones
        } catch (err) {
            console.error(err);
            if (err.message === 'Fase no encontrada') {
                // Si la fase no existe, refrescamos la lista automáticamente
                const data = await FaseService.getByEventoPrueba(selectedPrueba.id);
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
            // Primero intentamos enviar la señal
            await timingSignalRService.updateResultStatus(selectedFase.id, resultadoId, status);
            
            // Si el envío fue exitoso, actualizamos localmente para feedback instantáneo
            setSelectedFase(prev => ({
                ...prev,
                resultados: prev.resultados.map(r => 
                    r.id === resultadoId ? { ...r, estadoCanto: status } : r
                )
            }));
        } catch (err) {
            console.error("Error updating status:", err);
            if (addToast) addToast("Error de conexión. Reintentando...", "error");
            // Intentar reconectar automáticamente
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

                    <label style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '1rem', marginBottom: '4px', display: 'block' }}>Pruebas del Cronograma:</label>

                    <div className="pruebas-list">
                        {pruebas.map(p => (
                            <div 
                                key={p.id} 
                                className={`prueba-item-mini ${selectedPrueba?.id === p.id ? 'active' : ''}`}
                                onClick={() => setSelectedPrueba(p)}
                            >
                                {p.prueba?.categoria?.nombre} {p.prueba?.bote?.tipo}
                            </div>
                        ))}
                    </div>

                    <div className="fases-list">
                        {fases.map(f => (
                            <button 
                                key={f.id} 
                                className={`fase-btn-mini ${selectedFase?.id === f.id ? 'active' : ''}`}
                                onClick={() => setSelectedFase(f)}
                            >
                                {f.nombreFase}
                            </button>
                        ))}
                        {fases.length > 0 && (
                            <button 
                                className="btn-refresh-fases"
                                onClick={async () => {
                                    const data = await FaseService.getByEventoPrueba(selectedPrueba.id);
                                    setFases(data);
                                    if (selectedFase) {
                                        const updated = data.find(x => x.id === selectedFase.id);
                                        if (updated) setSelectedFase(updated);
                                    }
                                }}
                                style={{ marginTop: '1rem', width: '100%', fontSize: '0.75rem', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.2)', color: '#94a3b8', borderRadius: '4px' }}
                            >
                                🔄 Actualizar estados
                            </button>
                        )}
                    </div>
                </div>
            </aside>

            <main className="starter-main">
                {selectedPrueba ? (
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
                                <h2>{selectedPrueba.prueba?.categoria?.nombre} {selectedPrueba.prueba?.bote?.tipo}</h2>
                            </div>
                            <div className="fase-selector">
                                {fases.map(f => (
                                    <button 
                                        key={f.id} 
                                        className={`fase-btn ${selectedFase?.id === f.id ? 'active' : ''}`}
                                        onClick={() => setSelectedFase(f)}
                                    >
                                        {f.nombreFase}
                                    </button>
                                ))}
                            </div>
                        </header>

                        {selectedFase ? (
                            <div className="fase-details">
                                <div className="athletes-checkin">
                                    <h3><Users size={20} /> Atletas en Carriles</h3>
                                    <div className="checkin-grid">
                                        {selectedFase.resultados?.sort((a,b) => (a.carril - b.carril)).map(r => (
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
