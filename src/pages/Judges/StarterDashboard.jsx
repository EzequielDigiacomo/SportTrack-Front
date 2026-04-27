import React, { useState, useEffect } from 'react';
import { Play, CheckCircle, Clock, Users } from 'lucide-react';
import EventoService from '../../services/EventoService';
import FaseService from '../../services/FaseService';
import { PruebaService } from '../../services/ConfigService';
import timingSignalRService from '../../services/TimingSignalRService';
import { useToast } from '../../context/ToastContext';
import './Judges.css';

const StarterDashboard = () => {
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
            const data = await FaseService.getByEventoPrueba(selectedPrueba.id);
            setFases(data);
        };
        loadFases();
    }, [selectedPrueba]);

    useEffect(() => {
        if (!selectedFase) return;

        timingSignalRService.connect(selectedFase.id);

        timingSignalRService.onRaceReset((id) => {
            if (id.toString() === selectedFase.id.toString()) {
                setSelectedFase(prev => ({ ...prev, estado: 'Programada' }));
                addToast('info', 'La fase ha sido reiniciada. El botón de largada está habilitado.');
            }
        });

        return () => timingSignalRService.disconnect();
    }, [selectedFase]);

    const handleStartRace = async () => {
        if (!selectedFase) return;
        // Eliminado confirm para largada instantánea

        try {
            setLoading(true);
            await timingSignalRService.connect(selectedFase.id);
            await FaseService.iniciar(selectedFase.id);
            // Eliminado addToast para evitar distracciones
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="starter-dashboard fade-in">
            <aside className="starter-sidebar glass-effect">
                <h3><Clock size={18} /> Próximas Pruebas</h3>
                <div className="selection-stack">
                    <select value={selectedEvento?.id || ''} onChange={(e) => setSelectedEvento(eventos.find(ev => ev.id === parseInt(e.target.value)))}>
                        <option value="">Seleccionar Evento...</option>
                        {eventos.map(ev => <option key={ev.id} value={ev.id}>{ev.nombre}</option>)}
                    </select>

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
                </div>
            </aside>

            <main className="starter-main">
                {selectedPrueba ? (
                    <div className="race-control glass-effect">
                        <header className="race-header">
                            <div className="badge-live">MODO LARGADOR</div>
                            <h2>{selectedPrueba.prueba?.categoria?.nombre} {selectedPrueba.prueba?.bote?.tipo}</h2>
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
                                            <div key={r.id} className="checkin-row">
                                                <span className="lane-badge">{r.carril}</span>
                                                <span className="athlete-name">{r.participanteNombre}</span>
                                                <span className="club-tag">{r.clubSigla}</span>
                                                <CheckCircle size={18} className="icon-ready" />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="control-actions">
                                    <button 
                                        className={`btn-start-big ${loading ? 'loading' : ''}`}
                                        onClick={handleStartRace}
                                        disabled={loading || selectedFase.estado === 'En Carrera'}
                                    >
                                        <Play size={40} fill="currentColor" />
                                        <span>{selectedFase.estado === 'En Carrera' ? 'EN CARRERA' : 'LARGAR CARRERA'}</span>
                                    </button>
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
