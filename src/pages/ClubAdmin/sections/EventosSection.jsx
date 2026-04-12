import React, { useState, useEffect } from 'react';
import EventoService from '../../../services/EventoService';
import InscripcionAtletaModal from './InscripcionAtletaModal';
import './Sections.css';

const EventosSection = () => {
    const [eventos, setEventos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedEvento, setSelectedEvento] = useState(null);
    const [showInscripcionModal, setShowInscripcionModal] = useState(false);

    useEffect(() => {
        loadEventos();
    }, []);

    const loadEventos = async () => {
        try {
            const data = await EventoService.getProximos();
            setEventos(data);
        } catch (error) {
            console.error('Error cargando eventos:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenInscripcion = (evento) => {
        setSelectedEvento(evento);
        setShowInscripcionModal(true);
    };

    return (
        <div className="section-container fade-in">
            <div className="section-header">
                <h2>Próximos Eventos</h2>
                <p className="subtitle">Explora las próximas competencias e inscribe a tus atletas</p>
            </div>

            <div className="eventos-grid">
                {loading ? (
                    <div className="loader-container"><div className="loader"></div></div>
                ) : (
                    eventos.length > 0 ? eventos.map(evento => (
                        <div key={evento.id} className="evento-card glass-effect animate-card">
                            <div className="evento-badge">Abierto</div>
                            <h3>{evento.nombre}</h3>
                            <p className="evento-date">📅 {new Date(evento.fecha).toLocaleDateString()}</p>
                            <p className="evento-location">📍 {evento.ubicacion}</p>
                            <div className="evento-actions">
                                <button className="btn-secondary">Ver Pruebas</button>
                                <button
                                    className="btn-primary"
                                    onClick={() => handleOpenInscripcion(evento)}
                                >
                                    Inscribir Atletas
                                </button>
                            </div>
                        </div>
                    )) : (
                        <div className="empty-state">No hay eventos próximos programados</div>
                    )
                )}
            </div>

            {showInscripcionModal && (
                <InscripcionAtletaModal
                    evento={selectedEvento}
                    onClose={() => setShowInscripcionModal(false)}
                />
            )}
        </div>
    );
};

export default EventosSection;
