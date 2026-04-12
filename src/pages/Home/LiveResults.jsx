import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import EventoService from '../../services/EventoService';
import { PruebaService } from '../../services/ConfigService';
import ResultadoService from '../../services/ResultadoService';
import signalRServiceInstance from '../../services/SignalRService';
import './LiveResults.css';

// Convierte "mm:ss.ms" o "hh:mm:ss.ms" a milisegundos
const timeToMs = (time) => {
    if (!time) return null;
    const clean = time.split('.')[0]; // quitar milisegundos decimales para simplificar
    const parts = time.split(':');
    try {
        if (parts.length === 3) {
            const [hh, mm, rest] = parts;
            const [ss, ms = '0'] = rest.split('.');
            return (parseInt(hh) * 3600000) + (parseInt(mm) * 60000) + (parseInt(ss) * 1000) + parseInt(ms.padEnd(3, '0').slice(0, 3));
        } else if (parts.length === 2) {
            const [mm, rest] = parts;
            const [ss, ms = '0'] = rest.split('.');
            return (parseInt(mm) * 60000) + (parseInt(ss) * 1000) + parseInt(ms.padEnd(3, '0').slice(0, 3));
        }
    } catch { return null; }
    return null;
};

// Formatea una diferencia en ms como "+Xs" o "+m:ss"
const formatDiff = (diffMs) => {
    if (diffMs === null || diffMs <= 0) return '-';
    const totalSec = diffMs / 1000;
    if (totalSec < 60) return `+${totalSec.toFixed(2)}s`;
    const m = Math.floor(totalSec / 60);
    const s = (totalSec % 60).toFixed(2).padStart(5, '0');
    return `+${m}:${s}`;
};

const LiveResults = () => {
    const { id } = useParams();
    const [evento, setEvento] = useState(null);
    const [pruebas, setPruebas] = useState([]);
    const [selectedPrueba, setSelectedPrueba] = useState(null);
    const [resultados, setResultados] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadInitial = async () => {
            try {
                const ev = await EventoService.getById(id);
                setEvento(ev);
                const prs = await PruebaService.getByEvento(id);
                setPruebas(prs);
                if (prs.length > 0) setSelectedPrueba(prs[0]);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        loadInitial();
    }, [id]);

    useEffect(() => {
        if (!selectedPrueba) return;
        
        const loadResults = async () => {
            try {
                const res = await ResultadoService.getByPrueba(selectedPrueba.id);
                // Ordenar por posición
                const sorted = res.sort((a, b) => (a.posicion || 99) - (b.posicion || 99));
                setResultados(sorted);
            } catch (e) {
                console.error(e);
            }
        };

        loadResults();
        
        // SignalR para "Real Time"
        const setupSignalR = async () => {
            try {
                await signalRServiceInstance.joinEventGroup(selectedPrueba.id);
                signalRServiceInstance.onResultUpdated((updatedData) => {
                    // Normalizar a camelCase si viene en PascalCase desde SignalR
                    const normalized = {
                        id: updatedData.id || updatedData.Id,
                        inscripcionId: updatedData.inscripcionId || updatedData.InscripcionId,
                        posicion: updatedData.posicion || updatedData.Posicion,
                        tiempoOficial: updatedData.tiempoOficial || updatedData.TiempoOficial,
                        participanteNombre: updatedData.participanteNombre || updatedData.ParticipanteNombre,
                        clubSigla: updatedData.clubSigla || updatedData.ClubSigla,
                        clubNombre: updatedData.clubNombre || updatedData.ClubNombre,
                        carril: updatedData.carril || updatedData.Carril
                    };

                    setResultados(prev => {
                        const exists = prev.find(r => (r.id || r.Id) === normalized.id || (r.inscripcionId || r.InscripcionId) === normalized.inscripcionId);
                        let newArr;
                        if (exists) {
                            newArr = prev.map(r => ((r.id || r.Id) === normalized.id || (r.inscripcionId || r.InscripcionId) === normalized.inscripcionId) ? { ...r, ...normalized } : r);
                        } else {
                            newArr = [...prev, normalized];
                        }
                        return [...newArr].sort((a, b) => (a.posicion || a.Posicion || 99) - (b.posicion || b.Posicion || 99));
                    });
                });
            } catch (err) {
                console.error("Failed to setup SignalR in LiveResults:", err);
            }
        };
        setupSignalR();

        return () => {
            // SignalRService gestiona la desconexión del grupo al cambiar seleccion,
            // pero podríamos hacer limpieza aquí si es necesario.
        };
    }, [selectedPrueba]);

    if (loading) return <div className="results-loading">Cargando resultados oficiales...</div>;
    if (!evento) return <div className="results-error">Evento no encontrado</div>;

    return (
        <div className="live-results-page fade-in">
            <header className="results-header container">
                <Link to="/" className="back-link">← Volver al inicio</Link>
                <div className="header-main">
                    <div>
                        <span className="live-indicator">● EN VIVO</span>
                        <h1>{evento.nombre}</h1>
                        <p className="event-subtitle">{evento.ubicacion} · {new Date(evento.fecha).toLocaleDateString()}</p>
                    </div>
                </div>
            </header>

            <main className="results-container container">
                {/* Selector de Pruebas */}
                <aside className="pruebas-sidebar glass-effect">
                    <h3>Regatas</h3>
                    <div className="pruebas-v-list">
                        {pruebas.map(p => (
                            <button 
                                key={p.id} 
                                className={`prueba-v-item ${selectedPrueba?.id === p.id ? 'active' : ''}`}
                                onClick={() => setSelectedPrueba(p)}
                            >
                                <span className="p-time">{new Date(p.fechaHora).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                <span className="p-name">
                                    {p.prueba?.categoria?.nombre || 'Categoría'} {p.prueba?.bote?.tipo || 'Bote'} {p.prueba?.distancia?.descripcion || ''}
                                </span>
                            </button>
                        ))}
                    </div>
                </aside>

                {/* Tabla de Resultados */}
                <section className="results-main">
                    {selectedPrueba ? (
                        <div className="results-content glass-effect">
                            <div className="results-content-header">
                                <h2>
                                    {selectedPrueba.prueba?.categoria?.nombre} {selectedPrueba.prueba?.bote?.tipo} {selectedPrueba.prueba?.distancia?.descripcion}
                                </h2>
                                <span className="prueba-status-tag">Resultados Oficiales</span>
                            </div>

                            <table className="results-table">
                                <thead>
                                    <tr>
                                        <th>Pos</th>
                                        <th>Carril</th>
                                        <th>Atleta</th>
                                        <th>Club</th>
                                        <th>Tiempo</th>
                                        <th>Diferencia</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {resultados.length > 0 ? (() => {
                                        // Calcular el tiempo del líder (posición 1) para las diferencias
                                        const lider = resultados.find(r => (r.posicion || r.Posicion) === 1);
                                        const liderMs = lider ? timeToMs(lider.tiempoOficial || lider.TiempoOficial) : null;

                                        return resultados.map((r, i) => {
                                            const pos = r.posicion || r.Posicion;
                                            const carril = r.carril || r.Carril;
                                            const nombreAtleta = r.participanteNombre || r.ParticipanteNombre;
                                            const siglaClub = r.clubSigla || r.ClubSigla;
                                            const nombreClub = r.clubNombre || r.ClubNombre;
                                            const tiempo = r.tiempoOficial || r.TiempoOficial;
                                            const tiempoMs = timeToMs(tiempo);
                                            const diff = (pos === 1 || !liderMs || !tiempoMs)
                                                ? null
                                                : tiempoMs - liderMs;

                                            return (
                                                <tr key={r.id || r.Id || i} className={`pos-${pos}`}>
                                                    <td className="pos-cell">{pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : pos}</td>
                                                    <td>{carril || '-'}</td>
                                                    <td>
                                                        <div className="athlete-name">
                                                            {nombreAtleta || 'Atleta'}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className="club-tag">{siglaClub || nombreClub || '-'}</span>
                                                    </td>
                                                    <td className="time-cell">{tiempo?.split('.')[0] || '--:--'}</td>
                                                    <td className="diff-cell">
                                                        {pos === 1 ? <span className="diff-leader">- -</span> : formatDiff(diff)}
                                                    </td>
                                                </tr>
                                            );
                                        });
                                    })() : (
                                        <tr>
                                            <td colSpan="6" className="empty-results">
                                                Esperando el inicio de la regata...
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="no-prueba-selected">Seleccioná una regata para ver los resultados</div>
                    )}
                </section>
            </main>
        </div>
    );
};

export default LiveResults;
