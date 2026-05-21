import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Search, ListFilter, ClipboardList, Lock, Unlock } from 'lucide-react';
import EventoService from '../../../services/EventoService';
import InscripcionAtletaModal from './InscripcionAtletaModal';
import { useAuth } from '../../../context/AuthContext';
import '../../../components/SharedSections/AdminSections.css';
import './Sections.css';

const EventosSection = ({ pagoAfiliacionAlDia = true }) => {
    const { user } = useAuth();
    const [eventos, setEventos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedEvento, setSelectedEvento] = useState(null);
    const [showInscripcionModal, setShowInscripcionModal] = useState(false);

    useEffect(() => {
        loadEventos();
    }, []);

    useEffect(() => {
        const handlePopState = () => {
            if (showInscripcionModal) {
                setShowInscripcionModal(false);
            }
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [showInscripcionModal]);

    const loadEventos = async () => {
        try {
            const queryParams = new URLSearchParams(window.location.search);
            const fedId = queryParams.get('fedId');
            
            const data = await EventoService.getAll(fedId);
            const filtered = user?.rol === 'SuperAdmin' ? data : data.filter(e => !e.nombre.toLowerCase().includes('control'));
            setEventos(filtered);
        } catch (error) {
            console.error('Error cargando eventos:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenInscripcion = (evento) => {
        window.history.pushState({ panel: 'inscripcion' }, '');
        setSelectedEvento(evento);
        setShowInscripcionModal(true);
    };

    const estadoBadge = (estado) => {
        const map = {
            'Programado': { color: '#60a5fa', label: 'Programado' },
            'EnCurso': { color: '#34d399', label: 'En Curso' },
            'Finalizado': { color: '#9ca3af', label: 'Finalizado' },
            'Cancelado': { color: '#f87171', label: 'Cancelado' },
        };
        const s = map[estado] || { color: '#9ca3af', label: estado };
        return <span className="estado-badge" style={{ background: s.color + '22', color: s.color, border: `1px solid ${s.color}55` }}>{s.label}</span>;
    };

    return (
        <div className="section-container fade-in">
            <div className="section-header">
                <h2>Eventos de la Federación</h2>
                <p className="subtitle">Explora las competencias e inscribe a tus atletas</p>
            </div>

            {loading ? (
                <div className="loader-container"><div className="loader"></div></div>
            ) : eventos.length > 0 ? (
                <>
                    {/* VISTA MOBILE: Lista estilo app nativa */}
                    <div className="eventos-mobile-list">
                        {eventos.map(ev => {
                            const estadoConf = {
                                'Programado': { color: '#60a5fa', dot: '🔵' },
                                'EnCurso':    { color: '#34d399', dot: '🟢' },
                                'Finalizado': { color: '#9ca3af', dot: '⚫' },
                                'Cancelado':  { color: '#f87171', dot: '🔴' },
                            }[ev.estado] || { color: '#9ca3af', dot: '⚫' };
                            return (
                                <div key={ev.id} className="evento-native-row glass-effect">
                                    <div className="evento-native-status-bar" style={{ background: estadoConf.color }} />
                                    <div className="evento-native-info" onClick={() => handleOpenInscripcion(ev)}>
                                        <span className="evento-native-name">{ev.nombre}</span>
                                        <span className="evento-native-meta">
                                            <Calendar size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> {new Date(ev.fecha).toLocaleDateString('es-AR')}
                                            {ev.ubicacion && <> · <MapPin size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> {ev.ubicacion}</>}
                                        </span>
                                        <span className="evento-native-badges">
                                            {estadoBadge(ev.estado)}
                                            <span className={`inscripciones-tag ${ev.inscripcionesAbiertas ? 'open' : 'closed'}`}>
                                                {ev.inscripcionesAbiertas ? <><Unlock size={12} /> Abiertas</> : <><Lock size={12} /> Cerradas</>}
                                            </span>
                                        </span>
                                    </div>
                                    <div className="evento-native-actions">
                                        <button 
                                            className="btn-admin-primary" 
                                            onClick={pagoAfiliacionAlDia ? () => handleOpenInscripcion(ev) : undefined}
                                            disabled={!pagoAfiliacionAlDia}
                                            title={!pagoAfiliacionAlDia ? "Inscripción bloqueada por afiliación anual vencida" : "Inscribir"}
                                            style={{ 
                                                fontSize: '0.85rem', 
                                                padding: '0.5rem 0.8rem',
                                                ...(!pagoAfiliacionAlDia ? {
                                                    opacity: 0.5, 
                                                    cursor: 'not-allowed', 
                                                    background: 'rgba(239, 68, 68, 0.2)',
                                                    color: '#EF4444',
                                                    borderColor: 'rgba(239, 68, 68, 0.4)',
                                                    boxShadow: 'none'
                                                } : {})
                                            }}
                                        >
                                            Inscribir
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* VISTA DESKTOP: Grilla original */}
                    <div className="eventos-grid eventos-desktop-table">
                        {eventos.map(evento => (
                            <div key={evento.id} className="evento-card glass-effect animate-card">
                                <div className="evento-badge">Abierto</div>
                                <h3>{evento.nombre}</h3>
                                <p className="evento-date"><Calendar size={14} style={{marginRight: '6px'}} /> {new Date(evento.fecha).toLocaleDateString()}</p>
                                <p className="evento-location"><MapPin size={14} style={{marginRight: '6px'}} /> {evento.ubicacion}</p>
                                <div className="evento-actions">
                                    <button
                                        className="btn-primary"
                                        disabled={!pagoAfiliacionAlDia}
                                        onClick={pagoAfiliacionAlDia ? () => handleOpenInscripcion(evento) : undefined}
                                        title={!pagoAfiliacionAlDia ? "Inscripción bloqueada por afiliación anual vencida" : "Inscribir Atletas"}
                                        style={{ 
                                            width: '100%',
                                            ...(!pagoAfiliacionAlDia ? {
                                                opacity: 0.5, 
                                                cursor: 'not-allowed', 
                                                background: 'rgba(239, 68, 68, 0.2)',
                                                color: '#EF4444',
                                                borderColor: 'rgba(239, 68, 68, 0.4)',
                                                boxShadow: 'none'
                                            } : {})
                                        }}
                                    >
                                        Inscribir Atletas
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <div className="empty-state">No hay eventos próximos programados</div>
            )}

            {showInscripcionModal && (
                <InscripcionAtletaModal
                    evento={selectedEvento}
                    pagoAfiliacionAlDia={pagoAfiliacionAlDia}
                    onClose={() => window.history.back()}
                />
            )}
        </div>
    );
};

export default EventosSection;
