import React, { useState, useEffect } from 'react';
import { PruebaService } from '../../../services/ConfigService';
import AtletaService from '../../../services/AtletaService';
import InscripcionService from '../../../services/InscripcionService';
import { useAuth } from '../../../context/AuthContext';
import './InscripcionModal.css';

const InscripcionAtletaModal = ({ evento, onClose }) => {
    const { user } = useAuth();
    const [pruebasHabilitadas, setPruebasHabilitadas] = useState([]);
    const [atletasClub, setAtletasClub] = useState([]);
    const [loading, setLoading] = useState(true);

    const [selectedPrueba, setSelectedPrueba] = useState(null);
    const [selectedAtletas, setSelectedAtletas] = useState([]);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState(null);

    useEffect(() => {
        const loadInitial = async () => {
            try {
                const [pruebas, atletas] = await Promise.all([
                    PruebaService.getByEvento(evento.id),
                    AtletaService.getByClub(user.clubId) // Usar el ID del club del usuario
                ]);
                setPruebasHabilitadas(pruebas);
                setAtletasClub(atletas);
            } catch (e) {
                console.error("Error loading inscripcion data", e);
            } finally {
                setLoading(false);
            }
        };
        loadInitial();
    }, [evento.id, user.clubId]);

    const getMaxTripulantes = (boteNombre) => {
        if (!boteNombre) return 1;
        if (boteNombre.includes('K2') || boteNombre.includes('C2')) return 2;
        if (boteNombre.includes('K4') || boteNombre.includes('C4')) return 4;
        return 1;
    };

    const handleSelectPrueba = (ep) => {
        setSelectedPrueba(ep);
        setSelectedAtletas([]);
        setMsg(null);
    };

    const toggleAtleta = (atleta) => {
        if (selectedAtletas.find(a => a.id === atleta.id)) {
            setSelectedAtletas(selectedAtletas.filter(a => a.id !== atleta.id));
        } else {
            setSelectedAtletas([...selectedAtletas, atleta]);
        }
    };

    const handleConfirmInscripcion = async () => {
        const maxRequired = getMaxTripulantes(selectedPrueba.prueba.bote?.tipo);

        if (selectedAtletas.length === 0 || selectedAtletas.length % maxRequired !== 0) {
            setMsg({ type: 'error', text: `Debes seleccionar atletas en múltiplos de ${maxRequired} para cada bote de esta prueba.` });
            return;
        }

        setSaving(true);
        try {
            // Dividir los atletas seleccionados en grupos (botes)
            const botes = [];
            for (let i = 0; i < selectedAtletas.length; i += maxRequired) {
                botes.push(selectedAtletas.slice(i, i + maxRequired));
            }

            // Enviar una inscripción por cada bote
            for (const tripulacion of botes) {
                const payload = {
                    eventoPruebaId: selectedPrueba.id,
                    numeroCompetidor: `BOTE-${Math.floor(Math.random() * 10000)}`
                };

                if (maxRequired === 1) {
                    payload.participanteId = tripulacion[0].id;
                } else {
                    payload.tripulantes = tripulacion.map((a, idx) => ({
                        participanteId: a.id,
                        posicionEnBote: idx + 1
                    }));
                }

                await InscripcionService.create(payload);
            }

            setMsg({ type: 'success', text: `¡${botes.length} inscripción(es) realizada(s) con éxito!` });

            setTimeout(() => {
                onClose();
            }, 2000);
        } catch (err) {
            setMsg({ type: 'error', text: 'Error al inscribir: ' + err.message });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="admin-modal-overlay">
            <div className="inscripcion-modal glass-effect fade-in">
                <div className="modal-header">
                    <h2>Inscripción Atletas: {evento.nombre}</h2>
                    <button className="btn-close" onClick={onClose}>&times;</button>
                </div>

                {msg && <div className={`alert-msg ${msg.type}`}>{msg.text}</div>}

                <div className="modal-body inscripcion-body">
                    <div className="pruebas-selector">
                        <h4>1. Elegir Prueba</h4>
                        <div className="pruebas-habilitadas-grid">
                            {loading ? <div className="loader"></div> : (
                                pruebasHabilitadas.length > 0 ? pruebasHabilitadas.map(ep => (
                                    <div
                                        key={ep.id}
                                        className={`prueba-selector-card glass-effect ${selectedPrueba?.id === ep.id ? 'active' : ''}`}
                                        onClick={() => handleSelectPrueba(ep)}
                                    >
                                        <div className="p-cat">{ep.prueba.categoria?.nombre}</div>
                                        <div className="p-bote">{ep.prueba.bote?.tipo}</div>
                                        <div className="p-dist">{ep.prueba.distancia?.descripcion}</div>
                                    </div>
                                )) : <p>No hay pruebas habilitadas para inscribirse.</p>
                            )}
                        </div>
                    </div>

                    <div className="atletas-selector">
                        <h4>2. Seleccionar Atletas {selectedPrueba && `(Máx: ${getMaxTripulantes(selectedPrueba.prueba.bote?.tipo)})`}</h4>
                        <div className="atletas-list-scroll">
                            {!selectedPrueba ? (
                                <p className="hint-text">Primero selecciona una prueba a la izquierda.</p>
                            ) : (
                                atletasClub.map(atleta => (
                                    <div
                                        key={atleta.id}
                                        className={`atleta-selectable-row ${selectedAtletas.find(a => a.id === atleta.id) ? 'selected' : ''}`}
                                        onClick={() => toggleAtleta(atleta)}
                                    >
                                        <div className="atleta-check">
                                            {selectedAtletas.find(a => a.id === atleta.id) ? '✅' : '☐'}
                                        </div>
                                        <div className="atleta-name">{atleta.nombre} {atleta.apellido}</div>
                                        <div className="atleta-meta">{atleta.sexo?.nombre} · {atleta.categoria?.nombre}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <div className="modal-footer">
                    <div className="selection-summary">
                        {selectedAtletas.length > 0 && (
                            <p>Inscribiendo a: <strong>{selectedAtletas.map(a => a.nombre).join(', ')}</strong></p>
                        )}
                    </div>
                    <button className="btn-admin-secondary" onClick={onClose}>Cancelar</button>
                    <button
                        className="btn-admin-primary"
                        disabled={!selectedPrueba || selectedAtletas.length === 0 || saving}
                        onClick={handleConfirmInscripcion}
                    >
                        {saving ? "Procesando..." : "Confirmar Inscripción"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InscripcionAtletaModal;
