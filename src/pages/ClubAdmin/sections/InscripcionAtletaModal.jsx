import React, { useState, useEffect } from 'react';
import { PruebaService } from '../../../services/ConfigService';
import AtletaService from '../../../services/AtletaService';
import InscripcionService from '../../../services/InscripcionService';
import { useAuth } from '../../../context/AuthContext';
import ConfirmDialog from '../../../components/Common/ConfirmDialog';
import './InscripcionModal.css';

const InscripcionAtletaModal = ({ evento, onClose }) => {
    const { user } = useAuth();
    const [pruebasHabilitadas, setPruebasHabilitadas] = useState([]);
    const [atletasClub, setAtletasClub] = useState([]);
    const [loading, setLoading] = useState(true);

    const [selectedPrueba, setSelectedPrueba] = useState(null);
    // selectionsMap guardará { [pruebaId]: [atleta1, atleta2... ] }
    const [selectionsMap, setSelectionsMap] = useState({});
    const [inscripcionesActuales, setInscripcionesActuales] = useState([]);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState({ show: false, id: null });

    const CATEGORIA_COLORS = {
        1: { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444' },
        2: { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e' },
        3: { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6' },
        4: { bg: 'rgba(6, 182, 212, 0.15)', text: '#06b6d4' },
        5: { bg: 'rgba(99, 102, 241, 0.15)', text: '#6366f1' },
        6: { bg: 'rgba(168, 85, 247, 0.15)', text: '#a855f7' },
        7: { bg: 'rgba(236, 72, 153, 0.15)', text: '#ec4899' },
        8: { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b' },
        9: { bg: 'rgba(132, 204, 22, 0.15)', text: '#84cc16' },
        10: { bg: 'rgba(107, 114, 128, 0.15)', text: '#9ca3af' }
    };

    const BOTE_COLORS = {
        1: { bg: 'rgba(99, 102, 241, 0.15)', text: '#6366f1' },
        2: { bg: 'rgba(139, 92, 246, 0.15)', text: '#8b5cf6' },
        3: { bg: 'rgba(168, 85, 247, 0.15)', text: '#a855f7' },
        4: { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b' },
        5: { bg: 'rgba(249, 115, 22, 0.15)', text: '#f97316' },
        6: { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444' }
    };

    // Derivamos los atletas seleccionados para la prueba actual del mapa
    const selectedAtletas = selectedPrueba ? (selectionsMap[selectedPrueba.id] || []) : [];

    // Verificar si las inscripciones están abiertas
    const ahora = new Date();
    const fechaCierre = evento.fechaFinInscripciones ? new Date(evento.fechaFinInscripciones) : null;
    const inscripcionesCerradas = fechaCierre && ahora > fechaCierre;

    const loadInscripcionesClub = async () => {
        try {
            const data = await InscripcionService.getByEventoAndClub(evento.id, user.clubId);
            setInscripcionesActuales(data);
        } catch (e) {
            console.error("Error loading club inscriptions", e);
        }
    };

    useEffect(() => {
        const loadInitial = async () => {
            try {
                const [pruebas, atletas] = await Promise.all([
                    PruebaService.getByEvento(evento.id),
                    AtletaService.getByClub(user.clubId) 
                ]);
                setPruebasHabilitadas(pruebas);
                setAtletasClub(atletas);
                await loadInscripcionesClub();
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
        const n = boteNombre.toLowerCase();
        if (n.includes('k2') || n.includes('c2') || n.includes('doble')) return 2;
        if (n.includes('k4') || n.includes('c4') || n.includes('cuadruple') || n.includes('cuádruple')) return 4;
        return 1;
    };

    const handleSelectPrueba = (ep) => {
        setSelectedPrueba(ep);
        setMsg(null);
    };

    const toggleAtleta = (atleta) => {
        if (!selectedPrueba) return;

        const currentSelections = selectionsMap[selectedPrueba.id] || [];
        let newSelections;

        if (currentSelections.find(a => a.id === atleta.id)) {
            newSelections = currentSelections.filter(a => a.id !== atleta.id);
        } else {
            newSelections = [...currentSelections, atleta];
        }

        setSelectionsMap({
            ...selectionsMap,
            [selectedPrueba.id]: newSelections
        });
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
                    numeroCompetidor: `BOTE-${Math.floor(Math.random() * 10000)}`,
                    participanteId: tripulacion[0].id
                };

                if (maxRequired > 1) {
                    payload.tripulantes = tripulacion.slice(1).map((a, idx) => ({
                        participanteId: a.id,
                        posicionEnBote: idx + 2
                    }));
                }

                await InscripcionService.create(payload);
            }

            setMsg({ type: 'success', text: `¡${botes.length} inscripción(es) realizada(s) con éxito en ${selectedPrueba.prueba.categoria.nombre}!` });
            await loadInscripcionesClub();
            
            // Limpiar solo las selecciones de ESTA prueba en el mapa
            setSelectionsMap({
                ...selectionsMap,
                [selectedPrueba.id]: []
            });

            // Mantenemos el modal abierto para que siga inscribiendo
            setTimeout(() => setMsg(null), 3000);
        } catch (err) {
            setMsg({ type: 'error', text: 'Error al inscribir: ' + err.message });
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteInscripcion = (id) => {
        if (inscripcionesCerradas) return;
        setDeleteConfirm({ show: true, id });
    };

    const confirmDeleteInscripcion = async () => {
        const { id } = deleteConfirm;
        if (!id) return;

        setSaving(true);
        try {
            await InscripcionService.delete(id);
            setMsg({ type: 'success', text: 'Inscripción eliminada correctamente.' });
            setDeleteConfirm({ show: false, id: null });
            await loadInscripcionesClub();
            setTimeout(() => setMsg(null), 3000);
        } catch (err) {
            setMsg({ type: 'error', text: 'Error al eliminar: ' + err.message });
        } finally {
            setSaving(false);
        }
    };


    const getInscripcionesPruebaActual = () => {
        if (!selectedPrueba) return [];
        return inscripcionesActuales.filter(i => (i.eventoPruebaId || i.EventoPruebaId) === selectedPrueba.id);
    };

    const maxRequired = selectedPrueba ? getMaxTripulantes(selectedPrueba.prueba?.bote?.tipo) : 1;
    const inscripcionesActualesCount = getInscripcionesPruebaActual().length;
    
    // Cálculo de plazas
    const botesMaximosPosibles = evento.limitacionBotesAB ? 2 : 999;
    const botesDisponibles = Math.max(0, botesMaximosPosibles - inscripcionesActualesCount);
    const maxAtletasPermitidos = botesDisponibles * maxRequired;

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
                                            {(selectionsMap[ep.id]?.length > 0) && (
                                                <div className="selection-count-badge">
                                                    {selectionsMap[ep.id].length}
                                                </div>
                                            )}
                                            <div className="p-cat" style={{ 
                                                background: CATEGORIA_COLORS[ep.prueba?.categoria?.id || ep.prueba?.categoriaId]?.bg,
                                                color: CATEGORIA_COLORS[ep.prueba?.categoria?.id || ep.prueba?.categoriaId]?.text,
                                                padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold'
                                            }}>
                                                {ep.prueba.categoria?.nombre}
                                            </div>
                                            <div className="p-bote" style={{ 
                                                color: BOTE_COLORS[ep.prueba?.bote?.id || ep.prueba?.boteId]?.text,
                                                fontWeight: 'bold'
                                            }}>
                                                {ep.prueba.bote?.tipo}
                                            </div>
                                            <div className="p-dist">
                                                {ep.prueba.distancia?.descripcion}
                                                <div className="p-dist-sex" style={{ 
                                                    color: (ep.prueba.sexoId === 1 || (ep.prueba.sexo?.id === 1)) ? '#3b82f6' : (ep.prueba.sexoId === 2 || (ep.prueba.sexo?.id === 2)) ? '#ec4899' : '#14b8a6',
                                                    fontWeight: 'bold'
                                                }}>
                                                    {ep.prueba.sexoNombre || ep.prueba.sexo?.nombre || 'Mixto'}
                                                </div>
                                            </div>
                                        </div>
                                )) : <p>No hay pruebas habilitadas para inscribirse.</p>
                            )}
                        </div>
                    </div>

                    <div className="atletas-selector">
                        <div className="flex-between mb-sm">
                            <h4>2. Seleccionar Atletas {selectedPrueba && `(Máx: ${maxAtletasPermitidos})`}</h4>
                            <div className="flex-gap-sm">
                                {evento.limitacionBotesAB && botesDisponibles === 0 && <span className="badge-deadline danger">⚠️ límite A y B alcanzado</span>}
                                {inscripcionesCerradas && <span className="badge-deadline">Inscripciones Cerradas</span>}
                            </div>
                        </div>

                        {selectedPrueba && (
                            <div className="existing-inscriptions mb-md">
                                <h5>Botes Conformados ({inscripcionesActualesCount})</h5>
                                <div className="existing-list">
                                    {inscripcionesActualesCount === 0 ? (
                                        <p className="hint-text">No hay inscripciones previas en esta regata.</p>
                                    ) : (
                                        getInscripcionesPruebaActual().map((insc, index) => {
                                            const boatLabel = String.fromCharCode(65 + index); // A, B, C...
                                            const tripName = insc.participanteNombreCompleto || insc.ParticipanteNombreCompleto;
                                            const trips = insc.tripulantes || insc.Tripulantes || [];
                                            const allCrew = [];
                                            if (tripName) {
                                                allCrew.push(tripName.replace('(Extra)', '').trim());
                                            }
                                            if (trips && trips.length > 0) {
                                                trips.forEach(t => {
                                                    const n = t.participanteNombreCompleto || t.ParticipanteNombreCompleto || '';
                                                    allCrew.push(n.replace('(Extra)', '').trim());
                                                });
                                            }

                                            return (
                                                <div key={insc.id || insc.Id} className="existing-item glass-effect">
                                                    <div className="existing-info flex-column">
                                                        <div className="boat-header">
                                                            <span className="badge-refuerzo">Bote {boatLabel}</span>
                                                        </div>
                                                        <div className="crew-list">
                                                            {allCrew.map((n, tid) => (
                                                                <div key={tid} className="crew-member">{tid + 1}- {n}</div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    {!inscripcionesCerradas && (
                                                        <button 
                                                            className="btn-delete-icon" 
                                                            onClick={() => handleDeleteInscripcion(insc.id || insc.Id)}
                                                            title="Eliminar bote"
                                                        >
                                                            🗑️
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="atletas-list-scroll">
                            {!selectedPrueba ? (
                                <p className="hint-text">Primero selecciona una prueba a la izquierda.</p>
                            ) : (
                                atletasClub.map(atleta => {
                                    const isAlreadyRegistered = getInscripcionesPruebaActual().some(insc => 
                                        (insc.participanteId === atleta.id) || 
                                        (insc.tripulantes?.some(t => t.participanteId === atleta.id))
                                    );

                                    // LÓGICA DE ELEGIBILIDAD SEGÚN REGLAS DEL EVENTO
                                    const catPrueba = selectedPrueba.prueba.categoria;
                                    const edadAtleta = atleta.edad;
                                    const esK4 = getMaxTripulantes(selectedPrueba.prueba.bote?.tipo) === 4;
                                    
                                    let esElegible = true;
                                    let razonNoElegible = "";
                                    let esRefuerzoK4 = false;

                                    // 1. Regla: Categoría Única
                                    if (evento.restringirSoloCategoriaPropia) {
                                        if (atleta.categoriaId !== catPrueba.id) {
                                            esElegible = false;
                                            razonNoElegible = "Regla de Categoría Única";
                                        }
                                    } else {
                                        // 2. Validación estándar por rango de edad
                                        const cumpleRango = (edadAtleta >= (catPrueba.edadMin || 0)) && (edadAtleta <= (catPrueba.edadMax || 99));
                                        
                                        // 3. Reglas Especiales de Excepción
                                        const esSub23EnSenior = evento.permitirSub23EnSenior && (catPrueba.id === 7) && (atleta.categoriaId === 6 || (edadAtleta >= 18 && edadAtleta <= 22));
                                        const esMasterEnSenior = evento.permitirMasterBajarASenior && (catPrueba.id === 7) && (atleta.categoriaId === 8 || (edadAtleta >= 40 && edadAtleta <= 49));

                                        if (!cumpleRango && !esSub23EnSenior && !esMasterEnSenior) {
                                            esElegible = false;
                                            razonNoElegible = "Fuera de rango de edad";

                                            // 4. Regla Extra: Refuerzo K4 (Solo si no califica por edad normal)
                                            if (evento.permitirCompletarK4 && esK4) {
                                                const catRefuerzoId = (catPrueba.id === 7 || catPrueba.id === 6) ? 5 : (catPrueba.id === 5 ? 4 : null);
                                                
                                                if (atleta.categoriaId === catRefuerzoId) {
                                                    // Es de la categoría inferior permitida
                                                    const baseAthletes = selectedAtletas.filter(a => {
                                                        const ageA = a.edad;
                                                        const isOriginal = (ageA >= (catPrueba.edadMin || 0)) && (ageA <= (catPrueba.edadMax || 99));
                                                        const isS23S = evento.permitirSub23EnSenior && catPrueba.id === 7 && (a.categoriaId === 6 || (ageA >= 18 && ageA <= 22));
                                                        return isOriginal || isS23S;
                                                    });
                                                    const currentRefuerzos = selectedAtletas.filter(a => a.categoriaId === catRefuerzoId);

                                                    // Solo permitimos si hay exactamente 3 base y 0 refuerzos (o si este ya está seleccionado)
                                                    const yaSeleccionado = selectedAtletas.find(a => a.id === atleta.id);
                                                    if ((baseAthletes.length === 3 && currentRefuerzos.length === 0) || yaSeleccionado) {
                                                        esElegible = true;
                                                        esRefuerzoK4 = true;
                                                        razonNoElegible = "";
                                                    } else if (baseAthletes.length < 3) {
                                                        razonNoElegible = "Faltan 3 de la cat. base";
                                                    } else {
                                                        razonNoElegible = "Ya hay un refuerzo";
                                                    }
                                                }
                                            }
                                        }
                                    }

                                    // 5. Validación de Sexo estricta según la Prueba (No por categoría)
                                    const sexoPruebaId = selectedPrueba.prueba.sexoId || selectedPrueba.prueba.sexo?.id;
                                    // 3 es "Mixto" asumiendo que 1 es Masc, 2 es Fem. Si es distinto de 3, debe coincidir exacto.
                                    if (sexoPruebaId && sexoPruebaId !== 3 && atleta.sexoId !== sexoPruebaId) {
                                        esElegible = false;
                                        razonNoElegible = "Sexo no admitido";
                                    }
                                    const yaSeleccionado = selectedAtletas.find(a => a.id === atleta.id);
                                    
                                    // Límite alcanzado dinámicamente si los seleccionados ya llenan el cupo disponible
                                    const limiteAlcanzado = botesDisponibles === 0 || (!yaSeleccionado && selectedAtletas.length >= maxAtletasPermitidos);

                                    // Para mantener la lista limpia según lo solicitado, ocultamos a los no elegibles por completo 
                                    // (excepto si ya estaban inscriptos por alguna razón y necesitamos visualizarlos).
                                    if (!esElegible && !isAlreadyRegistered) {
                                        return null;
                                    }

                                    return (
                                        <div
                                            key={atleta.id}
                                            className={`atleta-selectable-row 
                                                ${yaSeleccionado ? 'selected' : ''} 
                                                ${isAlreadyRegistered ? 'already-registered' : ''} 
                                                ${(!esElegible || inscripcionesCerradas || limiteAlcanzado) ? 'disabled' : ''}
                                                ${esRefuerzoK4 ? 'refuerzo-k4-row' : ''}`}
                                            onClick={() => !inscripcionesCerradas && !isAlreadyRegistered && esElegible && !limiteAlcanzado && toggleAtleta(atleta)}
                                        >
                                            <div className="atleta-check">
                                                {isAlreadyRegistered ? '🔒' : (!esElegible ? '🚫' : (yaSeleccionado ? '✅' : '☐'))}
                                            </div>
                                            <div className="atleta-name">
                                                {atleta.nombre} {atleta.apellido}
                                                {!esElegible && <span className="no-eligible-reason">({razonNoElegible})</span>}
                                                {limiteAlcanzado && !yaSeleccionado && !isAlreadyRegistered && <span className="no-eligible-reason">(Cupos llenos)</span>}
                                                {esRefuerzoK4 && <span className="badge-refuerzo">Refuerzo K4</span>}
                                            </div>
                                            <div className="atleta-meta">
                                                {atleta.sexo?.nombre} · {atleta.categoria?.nombre} ({atleta.edad} años)
                                                {isAlreadyRegistered && <span className="status-label">Ya inscripto</span>}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                <div className="modal-footer">
                    <div className="selection-summary flex-column">
                        {selectedAtletas.length > 0 && selectedPrueba && (
                            <div className="boat-selection-preview">
                                {Array.from({ length: Math.ceil(selectedAtletas.length / maxRequired) }).map((_, bIdx) => {
                                    const chunk = selectedAtletas.slice(bIdx * maxRequired, (bIdx + 1) * maxRequired);
                                    const upcomingLabel = String.fromCharCode(65 + inscripcionesActualesCount + bIdx);
                                    return (
                                        <div key={bIdx} className="preview-boat-card">
                                            <span className="badge-refuerzo">Nuevo Bote {upcomingLabel}</span>
                                            <span className="preview-crew">{chunk.map(a => a.nombre).join(', ')}</span>
                                            {chunk.length < maxRequired && <span className="hint-text ml-sm">(Faltan {maxRequired - chunk.length})</span>}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.8rem' }}>
                        <button className="btn-admin-secondary" onClick={onClose}>Cerrar</button>
                        
                        {/* Botón de Confirmar Todo (Solo si hay múltiples pruebas con selecciones) */}
                        {Object.keys(selectionsMap).filter(k => selectionsMap[k]?.length > 0).length > 1 && (
                            <button 
                                className="btn-admin-primary"
                                style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: 'none' }}
                                onClick={async () => {
                                    setSaving(true);
                                    const pruebasConSeleccion = Object.keys(selectionsMap).filter(k => selectionsMap[k]?.length > 0);
                                    let exitos = 0;
                                    
                                    for (const pId of pruebasConSeleccion) {
                                        const ep = pruebasHabilitadas.find(ph => String(ph.id) === String(pId));
                                        if (!ep) continue;
                                        
                                        const atletas = selectionsMap[pId];
                                        const maxReq = getMaxTripulantes(ep.prueba.bote?.tipo);
                                        
                                        if (atletas.length % maxReq === 0) {
                                            // Lógica de guardado simplificada para el loop
                                            for (let i = 0; i < atletas.length; i += maxReq) {
                                                const trip = atletas.slice(i, i + maxReq);
                                                const payload = {
                                                    eventoPruebaId: parseInt(pId),
                                                    numeroCompetidor: `BOTE-${Math.floor(Math.random() * 10000)}`,
                                                    participanteId: trip[0].id
                                                };
                                                if (maxReq > 1) {
                                                    payload.tripulantes = trip.slice(1).map((a, idx) => ({
                                                        participanteId: a.id,
                                                        posicionEnBote: idx + 2
                                                    }));
                                                }
                                                await InscripcionService.create(payload);
                                            }
                                            exitos++;
                                        }
                                    }
                                    
                                    setMsg({ type: 'success', text: `¡Se confirmaron inscripciones para ${exitos} pruebas correctamente!` });
                                    setSelectionsMap({});
                                    await loadInscripcionesClub();
                                    setSaving(false);
                                    
                                    // Cerramos el modal automáticamente después de un breve delay
                                    setTimeout(() => {
                                        onClose();
                                    }, 1500);
                                }}
                                disabled={saving}
                            >
                                ✅ Confirmar TODAS las Pendientes
                            </button>
                        )}

                        <button
                            className={`btn-admin-primary ${(botesDisponibles === 0 && selectedAtletas.length === 0) ? 'disabled' : ''}`}
                            disabled={!selectedPrueba || selectedAtletas.length === 0 || saving || inscripcionesCerradas || botesDisponibles === 0}
                            onClick={handleConfirmInscripcion}
                        >
                            {inscripcionesCerradas ? "Inscripciones Cerradas" : (saving ? "Procesando..." : `Confirmar ${selectedPrueba?.prueba?.categoria?.nombre || ''}`)}
                        </button>
                    </div>
                </div>
            </div>

            <ConfirmDialog 
                isOpen={deleteConfirm.show}
                onClose={() => setDeleteConfirm({ show: false, id: null })}
                onConfirm={confirmDeleteInscripcion}
                title="Eliminar Inscripción"
                message="¿Estás seguro de que deseas eliminar esta inscripción?"
                type="danger"
                confirmText="Sí, Eliminar"
                loading={saving}
            />
        </div>
    );
};


export default InscripcionAtletaModal;
