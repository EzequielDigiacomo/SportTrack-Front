import React, { useState, useEffect, useRef } from 'react';
import { Flag, Trophy, RefreshCw, Save, HelpCircle, XCircle } from 'lucide-react';
import EventoService from '../../services/EventoService';
import FaseService from '../../services/FaseService';
import ResultadoService from '../../services/ResultadoService';
import { PruebaService } from '../../services/ConfigService';
import timingSignalRService from '../../services/TimingSignalRService';
import { useToast } from '../../context/ToastContext';
import './Judges.css';

const FinisherDashboard = () => {
    const [eventos, setEventos] = useState([]);
    const [selectedEvento, setSelectedEvento] = useState(null);
    const [pruebas, setPruebas] = useState([]);
    const [selectedPrueba, setSelectedPrueba] = useState(null);
    const [fases, setFases] = useState([]);
    const [selectedFase, setSelectedFase] = useState(null);
    const [resultados, setResultados] = useState([]);
    const [startTime, setStartTime] = useState(null);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [isRaceRunning, setIsRaceRunning] = useState(false);
    const [rawTimes, setRawTimes] = useState([]); // Tiempos capturados sin asignar (Photo-finish)
    const { addToast } = useToast();
    
    const timerRef = useRef(null);

    // Manejo de teclado para cronometraje rápido
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isRaceRunning) return;

            // Barra espaciadora: Captura rápida (Photo-finish)
            if (e.code === 'Space') {
                e.preventDefault();
                handleGenericFinish();
            }

            // Números 1-9: Carriles directos
            const num = parseInt(e.key);
            if (num >= 1 && num <= 9) {
                handleLaneFinish(num);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isRaceRunning, elapsedTime, resultados]);

    const handleLaneFinish = (laneNumber) => {
        const resultado = resultados.find(r => r.carril === laneNumber);
        if (resultado && !resultado.tiempoOficial) {
            handleRecordFinish(resultado.id);
        }
    };

    const handleGenericFinish = () => {
        const newTime = {
            id: Date.now(),
            time: formatTimer(elapsedTime),
            ms: elapsedTime
        };
        
        const newRawTimes = [...rawTimes, newTime];
        setRawTimes(newRawTimes);

        // Verificar si la suma de asignados + dudas completa la serie
        const asignadosCount = resultados.filter(r => r.tiempoOficial).length;
        if (asignadosCount + newRawTimes.length >= resultados.length) {
            stopLocalTimer();
        }
    };

    const assignRawTime = (rawTimeObj, resultadoId) => {
        setResultados(prev => {
            const updated = prev.map(r => 
                r.id === resultadoId ? { ...r, tiempoOficial: rawTimeObj.time, msLlegada: rawTimeObj.ms, status: 'finished' } : r
            );

            const todosTerminaron = updated.every(r => r.tiempoOficial);
            if (todosTerminaron) {
                stopLocalTimer();
            }

            return updated;
        });
        
        // Emitir vía SignalR para monitoreo en vivo
        timingSignalRService.sendTime(selectedFase.id, resultadoId, rawTimeObj.time, rawTimeObj.ms);
        
        setRawTimes(prev => prev.filter(t => t.id !== rawTimeObj.id));
    };

    const removeRawTime = (timeId) => {
        setRawTimes(prev => prev.filter(t => t.id !== timeId));
    };

    useEffect(() => {
        const loadEventos = async () => {
            const data = await EventoService.getProximos();
            setEventos(data);
            if (data.length > 0) setSelectedEvento(data[0]);
        };
        loadEventos();
        return () => clearInterval(timerRef.current);
    }, []);

    useEffect(() => {
        if (!selectedEvento) return;
        const loadPruebas = async () => {
            const data = await PruebaService.getByEvento(selectedEvento.id);
            setPruebas(data);
        };
        loadPruebas();
    }, [selectedEvento]);

    const parseDate = (dateStr) => {
        if (!dateStr) return null;
        if (dateStr.includes('Z') || dateStr.includes('+')) return new Date(dateStr);
        return new Date(dateStr + 'Z');
    };

    useEffect(() => {
        if (!selectedPrueba) return;
        const loadFases = async () => {
            const data = await FaseService.getByEventoPrueba(selectedPrueba.id);
            setFases(data);
        };
        loadFases();
    }, [selectedPrueba]);

    useEffect(() => {
        if (!selectedFase) return;
        
        let isMounted = true;

        const setupSignalR = async () => {
            try {
                // Primero cargamos resultados
                const data = await ResultadoService.getByFase(selectedFase.id);
                if (!isMounted) return;
                
                // Formateamos los tiempos que ya vienen del servidor
                const formattedData = data.map(r => {
                    const tiempoLimpio = r.tiempoOficial ? parseBackendTime(r.tiempoOficial) : null;
                    return {
                        ...r,
                        tiempoOficial: tiempoLimpio,
                        msLlegada: r.tiempoOficial ? parseTimeToMs(r.tiempoOficial) : null,
                        status: r.tiempoOficial ? 'finished' : 'pending'
                    };
                });
                
                setResultados(formattedData.sort((a,b) => (a.carril - b.carril)));
                
                if (selectedFase.estado === 'En Carrera' && selectedFase.fechaHoraInicioReal) {
                    const parsed = parseDate(selectedFase.fechaHoraInicioReal);
                    if (!isNaN(parsed)) startLocalTimer(parsed);
                } else {
                    stopLocalTimer();
                }

                // AHORA SÍ conectamos y esperamos
                await timingSignalRService.connect(selectedFase.id);
                if (!isMounted) return;

                // Y RECIÉN AHÍ registramos los eventos
                timingSignalRService.onRaceStarted((id, sTime) => {
                    if (id.toString() === selectedFase.id.toString()) {
                        const parsed = parseDate(sTime);
                        if (!isNaN(parsed)) startLocalTimer(parsed);
                    }
                });

                timingSignalRService.onRaceFinished(() => {
                    if (isMounted) stopLocalTimer();
                });

                timingSignalRService.onRaceReset((id) => {
                    if (isMounted && id.toString() === selectedFase.id.toString()) {
                        stopLocalTimer();
                        setElapsedTime(0);
                        setStartTime(null);
                        setResultados(prev => prev.map(r => ({ ...r, tiempoOficial: null, msLlegada: null, status: 'pending', estadoCanto: 'Pendiente' })));
                    }
                });

                timingSignalRService.onResultStatusUpdated((resId, status) => {
                    if (isMounted) {
                        setResultados(prev => prev.map(r => 
                            r.id.toString() === resId.toString() ? { ...r, estadoCanto: status } : r
                        ));
                    }
                });
            } catch (err) {
                if (isMounted) console.error("Error setting up SignalR:", err);
            }
        };

        setupSignalR();

        return () => {
            isMounted = false;
            timingSignalRService.disconnect();
        };
    }, [selectedFase]);

    const startLocalTimer = (sTime) => {
        setStartTime(sTime);
        setIsRaceRunning(true);
        clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            const now = new Date();
            setElapsedTime(now - sTime);
        }, 10);
    };

    const stopLocalTimer = () => {
        setIsRaceRunning(false);
        clearInterval(timerRef.current);
    };

    const parseBackendTime = (timeStr) => {
        if (!timeStr || timeStr === '') return '';
        try {
            const parts = timeStr.split(':');
            if (parts.length === 3) {
                const [h, m, sFull] = parts;
                const [s, ms] = (sFull || '00.000').split('.');
                const msShort = (ms || '0').substring(0, 3).padEnd(3, '0');
                const totalMin = (parseInt(h) * 60) + parseInt(m);
                return `${String(totalMin).padStart(2, '0')}:${s.padStart(2, '0')}.${msShort}`;
            }
            return timeStr;
        } catch { return timeStr; }
    };

    const formatTimer = (ms) => {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const milliseconds = Math.floor(ms % 1000);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
    };

    const parseTimeToMs = (timeStr) => {
        if (!timeStr) return 0;
        try {
            const parts = timeStr.split(':');
            if (parts.length === 2) {
                const [m, sFull] = parts;
                const [s, ms] = sFull.split('.');
                return (parseInt(m) * 60000) + (parseInt(s) * 1000) + parseInt((ms || '0').substring(0, 3).padEnd(3, '0'));
            }
            if (parts.length === 3) {
                const [h, m, sFull] = parts;
                const [s, ms] = sFull.split('.');
                return (parseInt(h) * 3600000) + (parseInt(m) * 60000) + (parseInt(s) * 1000) + parseInt((ms || '0').substring(0, 3).padEnd(3, '0'));
            }
        } catch { return 0; }
        return 0;
    };

    const handleRecordFinish = (resultadoId) => {
        if (!isRaceRunning) return;
        const finalTime = formatTimer(elapsedTime);
        const currentMs = elapsedTime;
        
        setResultados(prev => {
            const updated = prev.map(r => r.id === resultadoId ? { ...r, tiempoOficial: finalTime, msLlegada: currentMs, status: 'finished' } : r);
            
            const asignadosCount = updated.filter(r => r.tiempoOficial).length;
            if (asignadosCount + rawTimes.length >= updated.length) {
                stopLocalTimer();
            }
            
            return updated;
        });

        // Emitir vía SignalR para monitoreo en vivo
        timingSignalRService.sendTime(selectedFase.id, resultadoId, finalTime, currentMs);
    };

    const parseTimeToTimeSpan = (timeStr) => {
        if (!timeStr || timeStr.trim() === '') return null;
        try {
            const parts = timeStr.trim().split(':');
            if (parts.length === 2) {
                const [min, secStr] = parts;
                const [sec, ms] = (secStr || '0').split('.');
                const msFormatted = (ms || '0').substring(0, 3).padEnd(7, '0');
                return `00:${String(parseInt(min)).padStart(2,'0')}:${String(parseInt(sec)).padStart(2,'0')}.${msFormatted}`;
            }
        } catch (e) {}
        return timeStr;
    };

    const handleSaveResults = async () => {
        try {
            const dataToSave = resultados
                .filter(r => r.tiempoOficial || (r.estadoCanto && r.estadoCanto !== 'Pendiente'))
                .map(r => ({
                    id: r.id,
                    tiempoOficial: r.tiempoOficial ? parseTimeToTimeSpan(r.tiempoOficial) : null,
                    estado: (r.estadoCanto && r.estadoCanto !== 'Pendiente') 
                        ? (r.estadoCanto === 'DSQ' ? 'Descalificado' : r.estadoCanto) 
                        : "Preliminar"
                }));
            
            await ResultadoService.batchUpdate(dataToSave);
            await FaseService.enviarARevision(selectedFase.id);
            // Redirigir o limpiar estado
            window.location.reload(); 
        } catch (err) {
            console.error("Error saving results:", err);
        }
    };

    // Combinar atletas con tiempo y dudas para la grilla de llegada
    const arrivals = [
        ...resultados
            .filter(r => r.tiempoOficial || (r.estadoCanto && r.estadoCanto !== 'Pendiente'))
            .map(r => ({ 
                type: 'atleta', 
                ...r, 
                sortMs: r.estadoCanto && r.estadoCanto !== 'Pendiente' && !r.tiempoOficial ? 999999999 : r.msLlegada 
            })),
        ...rawTimes.map(rt => ({ type: 'duda', ...rt, sortMs: rt.ms }))
    ].sort((a, b) => a.sortMs - b.sortMs);

    const pendientes = resultados.filter(r => !r.tiempoOficial && (!r.estadoCanto || r.estadoCanto === 'Pendiente'));

    return (
        <div className="finisher-dashboard fade-in">
            <header className="finisher-header glass-effect">
                <div className="header-left">
                    <div className="badge-live blue">MODO CRONOMETRISTA</div>
                    <h2>{selectedPrueba?.prueba?.categoria?.nombre} - {selectedFase?.nombreFase}</h2>
                </div>
                <div className={`main-timer ${isRaceRunning ? 'running' : ''}`}>
                    {formatTimer(elapsedTime)}
                </div>
            </header>

            <div className="finisher-layout">
                <aside className="finisher-sidebar glass-effect">
                    <div className="selection-group">
                        <label style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px', display: 'block' }}>Evento:</label>
                        <select 
                            value={selectedEvento?.id || ''} 
                            onChange={(e) => {
                                const ev = eventos.find(x => x.id === parseInt(e.target.value));
                                setSelectedEvento(ev);
                                setSelectedPrueba(null); // Reset proof when event changes
                                setSelectedFase(null);
                            }}
                            className="mb-sm"
                        >
                            <option value="">Seleccionar Evento...</option>
                            {eventos.map(ev => <option key={ev.id} value={ev.id}>{ev.nombre}</option>)}
                        </select>

                        <label style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px', display: 'block' }}>Prueba:</label>
                        <select value={selectedPrueba?.id || ''} onChange={(e) => setSelectedPrueba(pruebas.find(p => p.id === parseInt(e.target.value)))}>
                            <option value="">Seleccionar Prueba...</option>
                            {pruebas.map(p => <option key={p.id} value={p.id}>{p.prueba?.categoria?.nombre} {p.prueba?.bote?.tipo}</option>)}
                        </select>

                        <div className="fase-mini-list">
                            {fases.map(f => (
                                <button 
                                    key={f.id} 
                                    className={`fase-mini-btn ${selectedFase?.id === f.id ? 'active' : ''}`}
                                    onClick={() => setSelectedFase(f)}
                                >
                                    {f.nombreFase} {f.estado === 'Finalizada' && '✅'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {pendientes.length > 0 && (isRaceRunning || rawTimes.length > 0) && (
                        <div className="pendientes-panel glass-effect fade-in">
                            <h3 style={{ color: '#fbbf24' }}>Atletas por Clasificar</h3>
                            <div className="pendientes-list">
                                {pendientes.map(p => (
                                    <div key={p.id} className="pendiente-item">
                                        <span className="p-lane">{p.carril}</span>
                                        <div className="p-info">
                                            <span className="p-name">{p.participanteNombre}</span>
                                            <button 
                                                className="btn-assign-quick"
                                                onClick={() => {
                                                    if (rawTimes.length > 0) {
                                                        assignRawTime(rawTimes[0], p.id);
                                                    } else {
                                                        handleRecordFinish(p.id);
                                                    }
                                                }}
                                            >
                                                {rawTimes.length > 0 ? 'ASIGNAR ?' : 'LLEGADA'}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {rawTimes.length > 0 && (
                                <p style={{ fontSize: '0.7rem', marginTop: '10px', color: '#fbbf24' }}>
                                    Haga clic en el atleta para asignarle el tiempo #{1} de la grilla.
                                </p>
                            )}
                        </div>
                    )}
                </aside>

                <main className="finisher-main glass-effect">
                    {/* Controles Rápidos */}
                    <div className="quick-controls-panel mb-lg">
                        <div className="lane-buttons-grid">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => {
                                const res = resultados.find(r => r.carril === num);
                                const isOccupied = !!res;
                                const isFinished = res?.tiempoOficial;
                                const hasStatus = res?.estadoCanto && res?.estadoCanto !== 'Pendiente';
                                
                                return (
                                    <button 
                                        key={num}
                                        className={`lane-btn ${!isOccupied ? 'empty' : ''} ${isFinished ? 'finished' : ''} ${hasStatus ? 'has-status' : ''}`}
                                        onClick={() => handleLaneFinish(num)}
                                        disabled={!isRaceRunning || !isOccupied || isFinished || hasStatus}
                                    >
                                        <span className="num">{num}</span>
                                        <span className="label">
                                            {isOccupied ? (hasStatus ? res.estadoCanto : (isFinished ? 'LLEGÓ' : 'LLEGADA')) : '-'}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        
                        <button 
                            className={`btn-photo-finish ${isRaceRunning ? 'active' : ''}`}
                            onClick={handleGenericFinish}
                            disabled={!isRaceRunning}
                            style={{ background: '#fbbf24', color: '#000' }}
                        >
                            <HelpCircle size={24} />
                            <span>REGISTRAR DUDA (?) [Espacio]</span>
                        </button>
                    </div>

                    {/* Grilla Dinámica de Orden de Llegada */}
                    <div className="arrivals-board">
                        <div className="board-header">
                            <span className="bh-pos">POS</span>
                            <span className="bh-lane">CARRIL</span>
                            <span className="bh-name">COMPETIDOR / ESTADO</span>
                            <span className="bh-time">TIEMPO</span>
                        </div>
                        
                        {arrivals.length === 0 ? (
                            <div className="empty-board">
                                <Flag size={48} />
                                <p>{isRaceRunning ? 'Esperando llegadas...' : 'Seleccione una fase para comenzar'}</p>
                            </div>
                        ) : (
                            <div className="arrivals-list">
                                {arrivals.map((arrival, index) => (
                                    <div key={arrival.id} className={`arrival-row pos-${index + 1} ${arrival.type}`}>
                                        <div className="arrival-pos">{index + 1}º</div>
                                        <div className="arrival-lane">{arrival.type === 'atleta' ? arrival.carril : '?'}</div>
                                        <div className="arrival-details">
                                            {arrival.type === 'atleta' ? (
                                                <>
                                                    <span className="arr-name">{arrival.participanteNombre}</span>
                                                    <span className="arr-club">{arrival.clubNombre}</span>
                                                </>
                                            ) : (
                                                <div className="doubt-indicator">
                                                    <HelpCircle size={14} />
                                                    <span>REVISIÓN PHOTOFINISH PENDIENTE</span>
                                                    <div className="assign-hint">Asigna este tiempo a un atleta de la lista lateral</div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="arrival-time">
                                            {arrival.type === 'atleta' 
                                                ? (arrival.estadoCanto && arrival.estadoCanto !== 'Pendiente' && !arrival.tiempoOficial 
                                                    ? arrival.estadoCanto 
                                                    : arrival.tiempoOficial) 
                                                : arrival.time}
                                        </div>
                                        {arrival.type === 'duda' && (
                                            <button className="btn-cancel-doubt" onClick={() => removeRawTime(arrival.id)}>
                                                <XCircle size={18} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <footer className="finisher-actions">
                        <button className="btn-reset" onClick={() => { 
                            if(window.confirm('¿Reiniciar reloj local?')) {
                                setElapsedTime(0); stopLocalTimer(); setRawTimes([]);
                                setResultados(prev => prev.map(r => ({ ...r, tiempoOficial: null, msLlegada: null })));
                            }
                        }}>
                            <RefreshCw size={18} /> Reiniciar Reloj
                        </button>
                        <button className="btn-save-official" onClick={handleSaveResults} disabled={arrivals.length === 0 || arrivals.some(a => a.type === 'duda')}>
                            <Save size={18} /> Enviar para Revisión
                        </button>
                    </footer>
                </main>
            </div>
        </div>
    );
};

export default FinisherDashboard;
