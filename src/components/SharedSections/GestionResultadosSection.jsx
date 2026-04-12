import React, { useState, useEffect, useRef } from 'react';
import EventoService from '../../services/EventoService';
import { PruebaService } from '../../services/ConfigService';
import InscripcionService from '../../services/InscripcionService';
import ResultadoService from '../../services/ResultadoService';
import './GestionResultados.css';

const GestionResultadosSection = ({ preselectedEventoId, defaultTab }) => {
    const [eventos, setEventos] = useState([]);
    const [selectedEvento, setSelectedEvento] = useState(preselectedEventoId || '');

    const [pruebas, setPruebas] = useState([]);
    const [selectedPrueba, setSelectedPrueba] = useState('');

    // UI State
    const [currentTab, setCurrentTab] = useState(defaultTab || 'startList'); // 'startList' | 'resultados'

    // Data State
    const [inscriptos, setInscriptos] = useState([]);

    // Data State
    const [resultados, setResultados] = useState({}); // { inscripcionId: { tiempoOficial, posicion } }
    const [startListData, setStartListData] = useState({}); // { inscripcionId: { carril, fase, numeroManga, esCabezaDeSerie } }

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    const inputsRefs = useRef({});

    useEffect(() => {
        loadEventos();
        if (preselectedEventoId) {
            setSelectedEvento(preselectedEventoId);
        }
        if (defaultTab) {
            setCurrentTab(defaultTab);
        }
    }, [preselectedEventoId, defaultTab]);

    useEffect(() => {
        if (selectedEvento) {
            loadPruebas(selectedEvento);
            setSelectedPrueba('');
            setInscriptos([]);
            setResultados({});
        } else {
            setPruebas([]);
            setSelectedPrueba('');
            setInscriptos([]);
            setResultados({});
        }
    }, [selectedEvento]);

    useEffect(() => {
        if (selectedPrueba) {
            loadInscriptos(selectedPrueba);
        } else {
            setInscriptos([]);
            setResultados({});
        }
    }, [selectedPrueba]);

    const loadEventos = async () => {
        try {
            const data = await EventoService.getAll();
            setEventos(data);
        } catch (error) {
            console.error("Error cargando eventos:", error);
            setMessage("Error al cargar eventos.");
        }
    };

    const loadPruebas = async (eventoId) => {
        try {
            const data = await PruebaService.getByEvento(eventoId);
            setPruebas(data);
        } catch (error) {
            console.error("Error cargando pruebas:", error);
            setMessage("Error al cargar las regatas.");
        }
    };

    const loadInscriptos = async (pruebaId) => {
        setLoading(true);
        setMessage('');
        try {
            const inscriptosData = await InscripcionService.getByEventoPrueba(pruebaId);
            setInscriptos(inscriptosData || []);

            // Poblar Start List temporal
            const slData = {};
            (inscriptosData || []).forEach(i => {
                const id = i.id || i.Id;
                slData[id] = {
                    carril: i.carril ?? i.Carril ?? '',
                    fase: i.fase || i.Fase || 'Serie',
                    numeroManga: i.numeroManga || i.NumeroManga || 1,
                    esCabezaDeSerie: i.esCabezaDeSerie || i.EsCabezaDeSerie || false,
                };
            });
            setStartListData(slData);

            // Si ya hay resultados guardados, cargarlos
            try {
                const resultadosGuardados = await ResultadoService.getByPrueba(pruebaId);
                const resMap = {};
                if (resultadosGuardados && resultadosGuardados.length > 0) {
                    resultadosGuardados.forEach(r => {
                        const inscId = r.inscripcionId || r.InscripcionId;
                        resMap[inscId] = {
                            id: r.id || r.Id,
                            tiempoOficial: r.tiempoOficial || r.TiempoOficial || '',
                            posicion: r.posicion || r.Posicion || ''
                        };
                    });
                }
                setResultados(resMap);
            } catch (err) {
                console.warn("No hay resultados previos para esta prueba o error al obtenerlos.");
            }

        } catch (error) {
            console.error("Error cargando inscriptos:", error);
            setMessage("Error al cargar los participantes.");
        } finally {
            setLoading(false);
        }
    };

    const timeToMs = (time) => {
        if (!time || !time.includes(':')) return Infinity;
        // Soportar mm:ss.ms o hh:mm:ss.ms
        const parts = time.split(':');
        if (parts.length === 3) {
            const [hh, mm, rest] = parts;
            const [ss, ms] = (rest || '').split('.');
            return (parseInt(hh) * 3600000) + (parseInt(mm) * 60000) + (parseInt(ss) * 1000) + (parseInt(ms || 0) * (ms?.length === 1 ? 100 : ms?.length === 2 ? 10 : 1));
        } else {
            const [mm, rest] = parts;
            const [ss, ms] = (rest || '').split('.');
            return (parseInt(mm) * 60000) + (parseInt(ss) * 1000) + (parseInt(ms || 0) * (ms?.length === 1 ? 100 : ms?.length === 2 ? 10 : 1));
        }
    };

    const handleResultChange = (inscripcionId, field, value) => {
        setResultados(prev => {
            const updated = {
                ...prev,
                [inscripcionId]: {
                    ...(prev[inscripcionId] || { tiempoOficial: '', posicion: '' }),
                    [field]: value
                }
            };

            // Si cambió el tiempo, recalculamos TODAS las posiciones
            if (field === 'tiempoOficial') {
                const sorted = Object.entries(updated)
                    .filter(([_, data]) => data.tiempoOficial && data.tiempoOficial !== '00:00.00' && data.tiempoOficial !== '00:00.0')
                    .map(([id, data]) => ({ id, ms: timeToMs(data.tiempoOficial) }))
                    .sort((a, b) => a.ms - b.ms);

                sorted.forEach((item, index) => {
                    updated[item.id].posicion = index + 1;
                });
            }

            return updated;
        });
    };

    const handleStartListChange = (id, field, value) => {
        setStartListData(prev => ({
            ...prev,
            [id]: {
                ...prev[id],
                [field]: value
            }
        }));
    };

    const MAX_ATLETAS_POR_HEAT = 9;

    const handleSortearCarriles = async () => {
        const ids = Object.keys(startListData);
        const total = ids.length;

        if (total === 0) {
            setMessage('No hay inscriptos para sortear.');
            return;
        }

        // 1. Calcular número de heats necesarios
        const numHeats = Math.ceil(total / MAX_ATLETAS_POR_HEAT);

        // 2. Mezclar todos los atletas aleatoriamente
        const shuffled = [...ids].sort(() => Math.random() - 0.5);

        // 3. Distribuir equitativamente: si hay 10 → Heat 1: 5, Heat 2: 5
        const heatSizes = Array(numHeats).fill(Math.floor(total / numHeats));
        for (let i = 0; i < total % numHeats; i++) {
            heatSizes[i]++;
        }

        // 4. Asignar heat y carril a cada atleta
        const newData = { ...startListData };
        let athleteIdx = 0;
        for (let heatNum = 1; heatNum <= numHeats; heatNum++) {
            const heatSize = heatSizes[heatNum - 1];
            const heatAthletes = shuffled.slice(athleteIdx, athleteIdx + heatSize);
            athleteIdx += heatSize;

            // Carriles: cabezas de serie van al carril 5, resto random desde [1,2,3,4,6,7,8,9]
            const seeded = heatAthletes.filter(id => newData[id]?.esCabezaDeSerie);
            const unseeded = heatAthletes.filter(id => !newData[id]?.esCabezaDeSerie).sort(() => Math.random() - 0.5);

            const availableLanes = [1, 2, 3, 4, 6, 7, 8, 9];

            seeded.forEach(id => {
                newData[id] = { ...newData[id], numeroManga: heatNum, carril: 5 };
            });

            unseeded.forEach((id, index) => {
                const lane = index < availableLanes.length
                    ? availableLanes[index]
                    : availableLanes.length + index + 1; // fallback si hay > 8 sin cabeza
                newData[id] = { ...newData[id], numeroManga: heatNum, carril: lane };
            });
        }

        setStartListData(newData);

        // 5. Si se necesitaron más de 1 heat, avisar y ofrecer ajustar el schedule
        if (numHeats > 1) {
            const extraHeats = numHeats - 1;
            const confirm = window.confirm(
                `Se generaron ${numHeats} heats (series) para ${total} atletas.\n\n` +
                `¿Querés ajustar automáticamente la hora de las pruebas siguientes (+10 min por cada heat extra)?`
            );
            if (confirm) {
                await adjustScheduleForExtraHeats(extraHeats);
            }
        }
    };

    const adjustScheduleForExtraHeats = async (extraHeats) => {
        // Obtener todas las pruebas del evento y desplazar las que vienen DESPUÉS de la seleccionada
        const pruebaActualId = parseInt(selectedPrueba);
        const pruebaActual = pruebas.find(p => p.id === pruebaActualId);
        if (!pruebaActual) return;

        const minutosADesplazar = extraHeats * 10;
        const pruebasToShift = pruebas.filter(p => p.fechaHora > pruebaActual.fechaHora);

        try {
            await Promise.all(pruebasToShift.map(p => {
                const nuevaFecha = new Date(new Date(p.fechaHora).getTime() + minutosADesplazar * 60000);
                return EventoService.updateEventoPrueba(p.id, {
                    categoriaId: p.prueba?.categoria?.id || p.prueba?.categoriaId,
                    boteId: p.prueba?.bote?.id || p.prueba?.boteId,
                    distanciaId: p.prueba?.distancia?.id || p.prueba?.distanciaId,
                    sexoId: p.prueba?.sexoId || 3,
                    fechaHora: nuevaFecha.toISOString()
                });
            }));
            setMessage(`✅ Schedule ajustado: ${pruebasToShift.length} prueba(s) desplazada(s) +${minutosADesplazar} minutos.`);
            loadPruebas(selectedEvento); // refrescar la lista
        } catch (err) {
            console.error('Error ajustando schedule:', err);
            setMessage('❌ Error al ajustar el schedule. Revisá manualmente los horarios.');
        }
    };

    const handleSaveStartList = async () => {
        setSaving(true);
        setMessage('');
        try {
            await Promise.all(
                Object.keys(startListData).map(id => {
                    const data = startListData[id];
                    return InscripcionService.update(parseInt(id), {
                        carril: data.carril ? parseInt(data.carril) : null,
                        fase: data.fase,
                        numeroManga: parseInt(data.numeroManga),
                        esCabezaDeSerie: data.esCabezaDeSerie
                    });
                })
            );
            setMessage("¡Start List guardada exitosamente!");
            loadInscriptos(selectedPrueba); // Refrescar los inscriptos de la DB
        } catch (error) {
            console.error("Error saving start list:", error);
            setMessage("Error al intentar guardar la Start List.");
        } finally {
            setSaving(false);
            setTimeout(() => setMessage(''), 5000);
        }
    };

    const handleKeyDown = (e, rowIndex, colType) => {
        // Navegación estilo Excel con flechas y Enter
        if (['ArrowDown', 'ArrowUp', 'Enter'].includes(e.key)) {
            e.preventDefault();
            let nextRow = rowIndex;

            if (e.key === 'ArrowDown' || e.key === 'Enter') {
                nextRow = Math.min(rowIndex + 1, inscriptos.length - 1);
            } else if (e.key === 'ArrowUp') {
                nextRow = Math.max(rowIndex - 1, 0);
            }

            const refKey = `${nextRow}-${colType}`;
            if (inputsRefs.current[refKey]) {
                inputsRefs.current[refKey].focus();
                inputsRefs.current[refKey].select();
            }
        }

        // Flechas laterales para cambiar entre tiempo y posición
        if (e.key === 'ArrowRight' && colType === 'tiempo') {
            e.preventDefault();
            const refKey = `${rowIndex}-posicion`;
            if (inputsRefs.current[refKey]) {
                inputsRefs.current[refKey].focus();
                inputsRefs.current[refKey].select();
            }
        }
        if (e.key === 'ArrowLeft' && colType === 'posicion') {
            e.preventDefault();
            const refKey = `${rowIndex}-tiempo`;
            if (inputsRefs.current[refKey]) {
                inputsRefs.current[refKey].focus();
                inputsRefs.current[refKey].select();
            }
        }
    };

    const handleSave = async () => {
        if (!selectedPrueba) return;
        setSaving(true);
        setMessage('');

        try {
            // Preparar el payload
            // Vamos a enviar aquellos que tengan al menos tiempo o posición modificados
            const payload = Object.entries(resultados).map(([inscripcionId, data]) => {
                const inscripto = inscriptos.find(i => (i.id || i.Id) === parseInt(inscripcionId));

                const nombreCompleto = inscripto?.participanteNombreCompleto || inscripto?.ParticipanteNombreCompleto || '';
                const clubSigla = inscripto?.clubSigla || inscripto?.ClubSigla || '';
                const clubNombre = inscripto?.clubNombre || inscripto?.ClubNombre || '';
                const carril = inscripto?.carril ?? inscripto?.Carril ?? 0;

                return {
                    id: data.id || 0,
                    eventoPruebaId: parseInt(selectedPrueba),
                    inscripcionId: parseInt(inscripcionId),
                    tiempoOficial: data.tiempoOficial || "00:00.00",
                    posicion: data.posicion ? parseInt(data.posicion) : null,
                    participanteNombre: nombreCompleto,
                    clubNombre: clubNombre,
                    clubSigla: clubSigla,
                    carril: carril
                };
            }).filter(item => item.tiempoOficial !== "00:00.00" || item.posicion !== null);

            if (payload.length === 0) {
                setMessage("No hay datos para guardar.");
                setSaving(false);
                return;
            }

            // Asumiendo que Upsert acepta un arreglo. 
            // NOTA: Si Upsert recibe un solo objeto en la API, necesitaremos hacer Promise.all
            // Verificamos ResultadoService: Upsert parece postear `resultadoData`. Si es una lista, ok.
            // Si la API no soporta listas, iteramos.
            await Promise.all(payload.map(data => ResultadoService.upsert(data)));

            setMessage("¡Resultados guardados y transmitidos en vivo exitosamente!");
        } catch (error) {
            console.error("Error guardando resultados:", error);
            setMessage("Error al guardar los resultados.");
        } finally {
            setSaving(false);
            // Hacer desaparecer el mensaje de éxito después de unos segundos
            setTimeout(() => setMessage(''), 5000);
        }
    };

    return (
        <div className="gestion-resultados fade-in">
            <div className="section-header">
                <h2>Panel de Carrera</h2>
                <p>Gestioná la <strong>Start List</strong> (series y carriles) o registrá los <strong>Resultados</strong> de la competencia.</p>
            </div>

            <div className="resultados-filters glass-effect">
                <div className="filter-group">
                    <label>Evento:</label>
                    <select
                        value={selectedEvento}
                        onChange={(e) => setSelectedEvento(e.target.value)}
                    >
                        <option value="">-- Seleccionar Evento --</option>
                        {eventos.map(e => (
                            <option key={e.id} value={e.id}>{e.nombre}</option>
                        ))}
                    </select>
                </div>

                <div className="filter-group" style={{ opacity: selectedEvento ? 1 : 0.5 }}>
                    <label>Regata (Prueba):</label>
                    <select
                        value={selectedPrueba}
                        onChange={(e) => setSelectedPrueba(e.target.value)}
                        disabled={!selectedEvento}
                    >
                        <option value="">-- Seleccionar Regata --</option>
                        {pruebas.map(p => (
                            <option key={p.id} value={p.id}>
                                {new Date(p.fechaHora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
                                {p.prueba?.categoria?.nombre} {p.prueba?.bote?.tipo} {p.prueba?.distancia?.descripcion}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {loading && <div className="loading-spinner">Cargando participantes...</div>}

            {message && (
                <div className={`resultados-message ${message.includes('Error') ? 'error' : 'success'}`}>
                    {message}
                </div>
            )}

            {!loading && selectedPrueba && (
                <div className="tabs-container">
                    <button
                        className={`tab-btn ${currentTab === 'startList' ? 'active' : ''}`}
                        onClick={() => setCurrentTab('startList')}
                    >
                        📋 Start List (Sorteo)
                    </button>
                    <button
                        className={`tab-btn ${currentTab === 'resultados' ? 'active' : ''}`}
                        onClick={() => setCurrentTab('resultados')}
                    >
                        ⏱️ Resultados / Tiempos
                    </button>
                </div>
            )}

            {!loading && selectedPrueba && inscriptos.length > 0 && currentTab === 'resultados' && (
                <div className="resultados-grid-container glass-effect fade-in">
                    <div className="grid-instructions">
                        💡 <strong>Tip:</strong> Usá las flechas del teclado y la tecla Enter para moverte rápidamente entre las celdas.
                    </div>
                    <table className="resultados-table">
                        <thead>
                            <tr>
                                <th style={{ width: '60px' }}>Carril</th>
                                <th>Atleta / Tripulación</th>
                                <th>Club</th>
                                <th style={{ width: '150px' }}>Tiempo (mm:ss.ms)</th>
                                <th style={{ width: '100px' }}>Posición</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Ordenamos por carril si existe, sino por id */}
                            {[...inscriptos].sort((a, b) => (a.carril ?? a.Carril ?? 99) - (b.carril ?? b.Carril ?? 99)).map((insc, rowIndex) => {
                                const id = insc.id || insc.Id;
                                const carril = insc.carril ?? insc.Carril;
                                const nombreCompleto = insc.participanteNombreCompleto || insc.ParticipanteNombreCompleto || 'Sin Asignar';
                                const clubSigla = insc.clubSigla || insc.ClubSigla || '-';

                                return (
                                    <tr key={id}>
                                        <td className="center-text">{carril ?? '-'}</td>
                                        <td>
                                            <div className="grid-athlete-name">{nombreCompleto}</div>
                                            {(insc.tripulantes || insc.Tripulantes) && (insc.tripulantes || insc.Tripulantes).length > 0 && (
                                                <div className="grid-tripulantes">
                                                    + {(insc.tripulantes || insc.Tripulantes).length} tripulantes
                                                </div>
                                            )}
                                        </td>
                                        <td><span className="club-badge">{clubSigla}</span></td>
                                        <td>
                                            <input
                                                type="text"
                                                className="resultado-input time-input"
                                                placeholder="00:00.00"
                                                value={resultados[id]?.tiempoOficial || '00:00.00'}
                                                onChange={(e) => handleResultChange(id, 'tiempoOficial', e.target.value)}
                                                onKeyDown={(e) => handleKeyDown(e, rowIndex, 'tiempo')}
                                                ref={el => inputsRefs.current[`${rowIndex}-tiempo`] = el}
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                className="resultado-input pos-input"
                                                min="1"
                                                placeholder="Pos"
                                                value={resultados[id]?.posicion || ''}
                                                onChange={(e) => handleResultChange(id, 'posicion', e.target.value)}
                                                onKeyDown={(e) => handleKeyDown(e, rowIndex, 'posicion')}
                                                ref={el => inputsRefs.current[`${rowIndex}-posicion`] = el}
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    <div className="resultados-actions">
                        <button
                            className="btn-primary"
                            onClick={handleSave}
                            disabled={saving}
                        >
                            {saving ? 'Guardando...' : 'Guardar y Publicar Resultados'}
                        </button>
                    </div>
                </div>
            )}

            {/* TAB: START LIST */}
            {!loading && selectedPrueba && inscriptos.length > 0 && currentTab === 'startList' && (
                <div className="start-list-container glass-effect fade-in">
                    <div className="start-list-header flex-between mb-md">
                        <div>
                            <h3>Armado de Series</h3>
                            <p className="text-muted">Marcá cabezas de serie y asigá el resto aleatoriamente.</p>
                        </div>
                        <button className="btn-secondary" onClick={handleSortearCarriles}>
                            🎲 Sortear Carriles Automáticamente
                        </button>
                    </div>

                    <table className="resultados-table">
                        <thead>
                            <tr>
                                <th style={{ width: '60px' }}>Fase</th>
                                <th style={{ width: '60px' }}>Manga</th>
                                <th style={{ width: '60px' }}>Carril</th>
                                <th>Cabeza de Serie</th>
                                <th>Atleta / Tripulación</th>
                                <th>Club</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[...inscriptos].map((insc, rowIndex) => {
                                const id = insc.id || insc.Id;
                                const nombreCompleto = insc.participanteNombreCompleto || insc.ParticipanteNombreCompleto || 'Sin Asignar';
                                const clubSigla = insc.clubSigla || insc.ClubSigla || '-';

                                const rowData = startListData[id] || {};

                                return (
                                    <tr key={id}>
                                        <td>
                                            <select
                                                className="resultado-input time-input"
                                                value={rowData.fase || 'Serie'}
                                                onChange={(e) => handleStartListChange(id, 'fase', e.target.value)}
                                            >
                                                <option value="Serie">Serie</option>
                                                <option value="Semifinal">Semifinal</option>
                                                <option value="Final A">Final A</option>
                                                <option value="Final B">Final B</option>
                                            </select>
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                className="resultado-input time-input"
                                                min="1"
                                                value={rowData.numeroManga || 1}
                                                onChange={(e) => handleStartListChange(id, 'numeroManga', e.target.value)}
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                className="resultado-input pos-input"
                                                min="1"
                                                max="9"
                                                placeholder="Cil"
                                                value={rowData.carril || ''}
                                                onChange={(e) => handleStartListChange(id, 'carril', e.target.value)}
                                            />
                                        </td>
                                        <td className="center-text">
                                            <input
                                                type="checkbox"
                                                checked={rowData.esCabezaDeSerie || false}
                                                onChange={(e) => handleStartListChange(id, 'esCabezaDeSerie', e.target.checked)}
                                                style={{ transform: "scale(1.3)" }}
                                            />
                                        </td>
                                        <td>{nombreCompleto}</td>
                                        <td><span className="club-badge">{clubSigla}</span></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    <div className="resultados-actions mt-md">
                        <button className="btn-primary" onClick={handleSaveStartList} disabled={saving}>
                            {saving ? 'Guardando...' : 'Guardar Start List'}
                        </button>
                    </div>
                </div>
            )}

            {!loading && selectedPrueba && inscriptos.length === 0 && (
                <div className="empty-state glass-effect">
                    <p>No hay una <strong>Start List</strong> (inscriptos) para esta regata aún.</p>
                </div>
            )}
        </div>
    );
};

export default GestionResultadosSection;
