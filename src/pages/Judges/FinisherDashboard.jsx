import React, { useState, useEffect, useRef } from 'react';
import { Flag, Trophy, RefreshCw, Save } from 'lucide-react';
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
    const { addToast } = useToast();
    
    const timerRef = useRef(null);

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
        const loadResultados = async () => {
            const data = await ResultadoService.getByFase(selectedFase.id);
            setResultados(data.sort((a,b) => (a.carril - b.carril)));
            
            if (selectedFase.estado === 'En Carrera' && selectedFase.fechaHoraInicioReal) {
                startLocalTimer(new Date(selectedFase.fechaHoraInicioReal));
            } else {
                stopLocalTimer();
            }
        };
        loadResultados();

        // SignalR connection
        timingSignalRService.connect(selectedFase.id);
        timingSignalRService.onRaceStarted((id, sTime) => {
            if (id.toString() === selectedFase.id.toString()) {
                startLocalTimer(new Date(sTime));
                addToast('info', '¡Carrera iniciada por el largador!');
            }
        });

        timingSignalRService.onRaceFinished(() => {
            stopLocalTimer();
            addToast('success', 'Carrera finalizada oficialmente.');
        });

        return () => timingSignalRService.disconnect();
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

    const formatTimer = (ms) => {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const milliseconds = Math.floor((ms % 1000) / 10);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
    };

    const handleRecordFinish = (resultadoId) => {
        if (!isRaceRunning) return;
        const finalTime = formatTimer(elapsedTime);
        setResultados(prev => prev.map(r => r.id === resultadoId ? { ...r, tiempoOficial: finalTime, status: 'finished' } : r));
    };

    const handleSaveResults = async () => {
        try {
            const dataToSave = resultados
                .filter(r => r.status === 'finished' || r.tiempoOficial)
                .map(r => ({
                    id: r.id,
                    tiempoOficial: r.tiempoOficial,
                    estado: 'Finalizado'
                }));
            
            await ResultadoService.batchUpdate(dataToSave);
            await FaseService.finalizar(selectedFase.id);
            addToast('success', 'Resultados guardados y serie cerrada.');
        } catch (err) {
            addToast('error', 'Error al guardar los resultados');
        }
    };

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
                </aside>

                <main className="finisher-main glass-effect">
                    <div className="athletes-finish-list">
                        {resultados.map((r, index) => (
                            <div key={r.id} className={`finish-row ${r.tiempoOficial ? 'done' : ''}`}>
                                <div className="lane-circle">{r.carril}</div>
                                <div className="athlete-details">
                                    <span className="a-name">{r.participanteNombre}</span>
                                    <span className="a-club">{r.clubNombre}</span>
                                </div>
                                <div className="finish-time">
                                    {r.tiempoOficial || '--:--.--'}
                                </div>
                                <button 
                                    className="btn-finish-action"
                                    onClick={() => handleRecordFinish(r.id)}
                                    disabled={!isRaceRunning || r.tiempoOficial}
                                >
                                    {r.tiempoOficial ? <Trophy size={20} /> : 'LLEGADA'}
                                </button>
                            </div>
                        ))}
                    </div>

                    <footer className="finisher-actions">
                        <button className="btn-reset" onClick={() => { setElapsedTime(0); stopLocalTimer(); }}>
                            <RefreshCw size={18} /> Reiniciar Reloj
                        </button>
                        <button className="btn-save-official" onClick={handleSaveResults} disabled={resultados.every(r => !r.tiempoOficial)}>
                            <Save size={18} /> Guardar y Cerrar Serie
                        </button>
                    </footer>
                </main>
            </div>
        </div>
    );
};

export default FinisherDashboard;
