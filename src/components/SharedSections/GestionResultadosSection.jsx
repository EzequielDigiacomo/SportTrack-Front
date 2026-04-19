import React, { useState, useEffect, useRef } from 'react';
import EventoService from '../../services/EventoService';
import { PruebaService } from '../../services/ConfigService';
import InscripcionService from '../../services/InscripcionService';
import ResultadoService from '../../services/ResultadoService';
import FaseService from '../../services/FaseService';
import './GestionResultados.css';

const GestionResultadosSection = ({ preselectedEventoId, defaultTab }) => {
    const [eventos, setEventos] = useState([]);
    const [selectedEvento, setSelectedEvento] = useState(preselectedEventoId || '');

    const [pruebas, setPruebas] = useState([]);
    const [selectedPrueba, setSelectedPrueba] = useState('');

    const [currentTab, setCurrentTab] = useState(defaultTab || 'startList');

    const [inscriptos, setInscriptos] = useState([]);
    const [fases, setFases] = useState([]); // [{id, nombreFase, numeroFase, resultados: []}]

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isLocked, setIsLocked] = useState(false);
    const [message, setMessage] = useState('');
    
    const [filtroVisualFase, setFiltroVisualFase] = useState('Todas');
    
    // Almacena edición local de tiempos y posiciones
    // map key es resultado.Id (faseResultadoId)
    const [tiemposLocales, setTiemposLocales] = useState({});

    useEffect(() => {
        loadEventos();
        if (preselectedEventoId) setSelectedEvento(preselectedEventoId);
        if (defaultTab) setCurrentTab(defaultTab);
    }, [preselectedEventoId, defaultTab]);

    useEffect(() => {
        if (selectedEvento) {
            loadPruebas(selectedEvento);
            setSelectedPrueba('');
            setInscriptos([]);
            setFases([]);
            setFiltroVisualFase('Todas');
        }
    }, [selectedEvento]);

    useEffect(() => {
        if (selectedPrueba) {
            const lockedPruebas = JSON.parse(localStorage.getItem('locked_pruebas') || '[]');
            setIsLocked(lockedPruebas.includes(selectedPrueba));
            loadDatosPrueba(selectedPrueba);
        } else {
            setInscriptos([]);
            setFases([]);
            setTiemposLocales({});
            setIsLocked(false);
            setFiltroVisualFase('Todas');
        }
    }, [selectedPrueba]);

    const handleLockPrueba = () => {
        if (window.confirm("¿Seguro que deseas FINALIZAR esta competencia? Se bloqueará la edición de tiempos y resultados de forma definitiva.")) {
            const lockedPruebas = JSON.parse(localStorage.getItem('locked_pruebas') || '[]');
            if (!lockedPruebas.includes(selectedPrueba)) {
                lockedPruebas.push(selectedPrueba);
                localStorage.setItem('locked_pruebas', JSON.stringify(lockedPruebas));
            }
            setIsLocked(true);
            setMessage("🔒 Competencia finalizada y bloqueada.");
            setTimeout(() => setMessage(''), 3000);
        }
    };

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
            const sorted = (data || []).sort((a,b) => new Date(a.fechaHora) - new Date(b.fechaHora));
            setPruebas(sorted);
        } catch (error) {
            console.error("Error cargando pruebas:", error);
        }
    };

    const loadDatosPrueba = async (pruebaId) => {
        setLoading(true);
        setMessage('');
        try {
            const [inscs, fs] = await Promise.all([
                InscripcionService.getByEventoPrueba(pruebaId),
                FaseService.getByEventoPrueba(pruebaId)
            ]);
            setInscriptos(inscs || []);
            setFases(fs || []);
            
            // Poblar tiempos locales
            const tls = {};
            (fs || []).forEach(f => {
                f.resultados.forEach(r => {
                    tls[r.id] = {
                        tiempoOficial: r.tiempoOficial || '',
                        posicion: r.posicion || ''
                    };
                });
            });
            setTiemposLocales(tls);

        } catch (error) {
            console.error("Error cargando prueba:", error);
            setMessage("Error al cargar los datos.");
        } finally {
            setLoading(false);
        }
    };

    const handleSortearCarriles = async () => {
        if (!selectedPrueba) return;
        setSaving(true);
        setMessage('');
        try {
            const newFases = await FaseService.generar(selectedPrueba);
            setFases(newFases || []);
            
            const tls = {};
            (newFases || []).forEach(f => {
                f.resultados.forEach(r => {
                    tls[r.id] = {
                        tiempoOficial: r.tiempoOficial || '',
                        posicion: r.posicion || ''
                    };
                });
            });
            setTiemposLocales(tls);

            setMessage("✅ Heats generados y carriles asignados.");
        } catch (error) {
            console.error(error);
            setMessage("❌ Error al generar las Fases.");
        } finally {
            setSaving(false);
            setTimeout(() => setMessage(''), 5000);
        }
    };

    const handleResultChange = (resultadoId, field, value) => {
        setTiemposLocales(prev => ({
            ...prev,
            [resultadoId]: {
                ...prev[resultadoId],
                [field]: value
            }
        }));
    };

    const handleSaveTiempos = async () => {
        if (!selectedPrueba || saving) return;
        setSaving(true);
        setMessage('');

        try {
            // Recolectar lo que cambió
            const dto = Object.keys(tiemposLocales).map(id => {
                const data = tiemposLocales[id];
                let validTimeSpan = null;
                if (data.tiempoOficial && data.tiempoOficial !== '00:00.00' && data.tiempoOficial !== '00:00.0') {
                    const raw = data.tiempoOficial; 
                    const parts = raw.split(':');
                    let hh = '00', mm = '00', ssFrac = '00.0000000';
                    if (parts.length === 1) ssFrac = parts[0];
                    else if (parts.length === 2) { mm = parts[0].padStart(2, '0'); ssFrac = parts[1]; }
                    else if (parts.length === 3) { hh = parts[0].padStart(2, '0'); mm = parts[1].padStart(2, '0'); ssFrac = parts[2]; }
                    let [ss, frac = '0'] = ssFrac.split('.');
                    if (!ss) ss = '00';
                    const fracPadded = frac.padEnd(7, '0').substring(0, 7);
                    validTimeSpan = `${hh}:${mm}:${ss.padStart(2,'0')}.${fracPadded}`;
                }
                return { id: parseInt(id), tiempoOficial: validTimeSpan, posicion: data.posicion ? parseInt(data.posicion) : null };
            }).filter(i => i.tiempoOficial || i.posicion);

            if (dto.length > 0) {
                await ResultadoService.batchUpdate(dto);
                await loadDatosPrueba(selectedPrueba);
                setMessage("✅ Tiempos guardados localmente.");
            } else {
                setMessage("⚠️ No hay cambios pendientes.");
            }
        } catch (err) {
            console.error(err);
            setMessage("❌ Error al guardar.");
        } finally {
            setSaving(false);
            setTimeout(() => setMessage(''), 3000);
        }
    };

    const handlePromoverEtapa = async (etapaNombre) => {
        if (!selectedPrueba || saving) return;
        if (!window.confirm(`¿Confirmas que la etapa ${etapaNombre} terminó y deseas promover a los atletas a la siguiente fase?`)) return;

        setSaving(true);
        try {
            const promotedFases = await FaseService.promover(selectedPrueba);
            if (promotedFases) {
                setFases(promotedFases);
                setMessage("🚀 Etapa promovida con éxito.");
            } else {
                await loadDatosPrueba(selectedPrueba);
            }
        } catch (err) {
            console.error(err);
            setMessage("❌ Error al promover la etapa.");
        } finally {
            setSaving(false);
            setTimeout(() => setMessage(''), 3000);
        }
    };

    const handleSimulateResults = (targetFase) => {
        if (!targetFase) return;
        const newTiempos = { ...tiemposLocales };
        
        // Simular solo la fase seleccionada
        const resultadosConTiempo = targetFase.resultados.map(res => {
            const totalSeconds = 100 + Math.random() * 30; // 1:40 a 2:10
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = Math.floor(totalSeconds % 60);
            const millis = Math.floor((totalSeconds % 1) * 100);
            
            const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${millis.toString().padStart(2, '0')}`;
            
            return {
                id: res.id,
                time: totalSeconds,
                timeString: timeString
            };
        });

        // Ordenar por tiempo para asignar posiciones
        resultadosConTiempo.sort((a, b) => a.time - b.time);

        resultadosConTiempo.forEach((res, index) => {
            newTiempos[res.id] = {
                tiempoOficial: res.timeString,
                posicion: index + 1
            };
        });

        setTiemposLocales(newTiempos);
        setMessage(`✅ Simulación completada para ${targetFase.nombreFase}.`);
        setTimeout(() => setMessage(''), 3000);
    };

    const handleToggleSeeding = async (inscripcionId) => {
        try {
            await InscripcionService.toggleSeeding(inscripcionId);
            // Recargar solo inscriptos para ver el cambio
            const freshIncs = await InscripcionService.getByEventoPrueba(selectedPrueba);
            setInscriptos(freshIncs);
        } catch (err) {
            console.error(err);
            setMessage("❌ Error al cambiar cabeza de serie.");
            setTimeout(() => setMessage(''), 3000);
        }
    };

    const handleDeleteFase = async (faseId) => {
        if (!window.confirm("¿Estás seguro de eliminar esta fase? Se perderán los resultados asociados.")) return;
        
        try {
            await FaseService.delete(faseId);
            setMessage("✅ Fase eliminada correctamente.");
            // Recargar datos de la prueba para refrescar la UI
            if (selectedPrueba) {
                await loadDatosPrueba(selectedPrueba);
            }
        } catch (err) {
            console.error(err);
            setMessage("❌ Error al eliminar la fase.");
        } finally {
            setTimeout(() => setMessage(''), 3000);
        }
    };

    return (
        <div className="gestion-resultados fade-in">
            <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                    <h2>Panel de Carrera</h2>
                    <p>Gestioná Fases, Carriles y Tiempos Oficiales.</p>
                </div>
                <div className="tabs-container" style={{ marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex' }}>
                <button 
                    className={`tab-btn ${currentTab === 'inscriptos' ? 'active' : ''}`}
                    onClick={() => setCurrentTab('inscriptos')}
                >
                    📋 1. Inscriptos / Sembrado
                </button>
                <button 
                    className={`tab-btn ${currentTab === 'startList' ? 'active' : ''}`}
                    onClick={() => setCurrentTab('startList')}
                >
                    🎲 2. Start List / Sorteo
                </button>
                <button 
                    className={`tab-btn ${currentTab === 'resultados' ? 'active' : ''}`}
                    onClick={() => setCurrentTab('resultados')}
                >
                    ⏱️ 3. Carga de Tiempos
                </button>
            </div>
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
                                {new Date(p.fechaHora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {p.prueba?.categoria?.nombre} {p.prueba?.bote?.tipo} {p.prueba?.distancia?.descripcion}
                            </option>
                        ))}
                    </select>
                </div>

                {fases.length > 0 && (
                    <div className="filter-group">
                        <label>Filtro de Fase:</label>
                        <select value={filtroVisualFase} onChange={(e) => setFiltroVisualFase(e.target.value)}>
                            <option value="Todas">-- Mostrar Todas --</option>
                            {fases.map(f => (
                                <option key={f.id} value={f.nombreFase}>
                                    {f.fechaHoraProgramada ? `[${new Date(f.fechaHoraProgramada).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}] ` : ''}
                                    {f.nombreFase}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {message && <div className="alert-message">{message}</div>}

            {/* TAB: INSCRIPTOS / SEMBRADO */}
            {!loading && selectedPrueba && currentTab === 'inscriptos' && (
                <div className="inscriptos-container glass-effect fade-in">
                    <div className="grid-instructions flex-between">
                        <div>💡 Marca las <b>Cabezas de Serie</b> (Sembrado) antes de generar las series.</div>
                        <span className="badge-info">{inscriptos.length} Inscritos</span>
                    </div>

                    <table className="resultados-table">
                        <thead>
                            <tr>
                                <th style={{ width: '80px' }}>Seeding</th>
                                <th>Atleta / Tripulación</th>
                                <th>Club</th>
                                <th>Nro</th>
                            </tr>
                        </thead>
                        <tbody>
                            {inscriptos.map(ins => (
                                <tr key={ins.id} className={ins.esCabezaDeSerie ? 'row-highlight' : ''}>
                                    <td className="center-text">
                                        <button 
                                            className={`seed-btn ${ins.esCabezaDeSerie ? 'active' : ''}`}
                                            onClick={() => handleToggleSeeding(ins.id)}
                                            title="Marcar como Cabeza de Serie"
                                            style={{
                                                background: ins.esCabezaDeSerie ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)',
                                                border: 'none',
                                                borderRadius: '50%',
                                                width: '32px',
                                                height: '32px',
                                                cursor: 'pointer',
                                                fontSize: '1rem',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {ins.esCabezaDeSerie ? '★' : '☆'}
                                        </button>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 'bold' }}>{ins.participanteNombreCompleto}</div>
                                        {ins.tripulantes?.length > 0 && (
                                            <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                                                {ins.tripulantes.map(t => t.participanteNombreCompleto).join(', ')}
                                            </div>
                                        )}
                                    </td>
                                    <td>{ins.clubSigla || ins.clubNombre}</td>
                                    <td className="center-text">{ins.numeroCompetidor}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    
                    <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center' }}>
                        <button className="btn-primary" onClick={() => setCurrentTab('startList')}>
                            Siguiente: Generar Start List ➡️
                        </button>
                    </div>
                </div>
            )}

            {/* TAB: START LIST (ARMADO DE FASES) */}
            {!loading && selectedPrueba && currentTab === 'startList' && (
                <div className="start-list-container glass-effect fade-in">
                    <div className="start-list-header flex-between mb-md">
                        <div>
                            <h3>Gestión de Competencia</h3>
                            <p className="text-muted">Inscriptos totales: {inscriptos.length}. Al generar, el sistema creará las etapas (Eliminatorias/Final) y distribuirá los atletas.</p>
                        </div>
                        <div className="flex-row gap-sm">
                            <button className="btn-secondary" onClick={handleSimulateResults} style={{ background: 'rgba(255,255,255,0.05)' }}>
                                ⚡ Simular
                            </button>
                            <button className="btn-primary" onClick={handleSortearCarriles} disabled={saving} style={{ padding: '10px 25px' }}>
                                🎲 Generar Estructura y Sortear
                            </button>
                        </div>
                    </div>

                    {Object.keys(fases.reduce((acc, f) => {
                        const etapa = f.etapaNombre || 'Sin Etapa';
                        if (!acc[etapa]) acc[etapa] = [];
                        acc[etapa].push(f);
                        return acc;
                    }, {})).length > 0 ? (
                        Object.entries(fases.reduce((acc, f) => {
                            const etapa = f.etapaNombre || 'Sin Etapa';
                            if (!acc[etapa]) acc[etapa] = [];
                            acc[etapa].push(f);
                            return acc;
                        }, {})).map(([etapaNombre, fasesDeEtapa]) => (
                            <div key={etapaNombre} className="etapa-section" style={{ marginBottom: '40px' }}>
                                <div className="etapa-header" style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '2px solid rgba(var(--color-primary-rgb), 0.2)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
                                    <h3 style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '1.2rem', color: 'var(--color-primary)' }}>{etapaNombre}</h3>
                                    <span style={{ fontSize: '0.7rem', background: 'rgba(var(--color-primary-rgb), 0.1)', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>{fasesDeEtapa.length} FASE(S)</span>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))', gap: '20px' }}>
                                    {fasesDeEtapa.filter(f => filtroVisualFase === 'Todas' || f.nombreFase === filtroVisualFase).map(fase => (
                                        <div key={fase.id} className="fase-card glass-effect" style={{ padding: '15px' }}>
                                            <h4 style={{ marginBottom: '10px', color: 'var(--color-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <span>{fase.nombreFase}</span>
                                                    <span style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}>
                                                        🕒 {fase.fechaHoraProgramada ? new Date(fase.fechaHoraProgramada).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                    </span>
                                                </div>
                                                <button 
                                                    onClick={() => handleDeleteFase(fase.id)}
                                                    style={{ background: 'rgba(255,0,0,0.1)', color: '#ff4757', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                                                    title="Eliminar esta fase"
                                                >
                                                    🗑️ Borrar
                                                </button>
                                            </h4>
                                            <table className="resultados-table" style={{ margin: 0 }}>
                                                <thead>
                                                    <tr>
                                                        <th style={{ width: '60px' }}>Carril</th>
                                                        <th>Atleta / Tripulación</th>
                                                        <th>Club</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {fase.resultados.sort((a, b) => {
                                                        const posA = a.posicion ? parseInt(a.posicion) : (tiemposLocales[a.id]?.posicion ? parseInt(tiemposLocales[a.id].posicion) : 999);
                                                        const posB = b.posicion ? parseInt(b.posicion) : (tiemposLocales[b.id]?.posicion ? parseInt(tiemposLocales[b.id].posicion) : 999);
                                                        if (posA !== posB) return posA - posB;
                                                        return (a.carril || 99) - (b.carril || 99);
                                                    }).map(res => (
                                                        <tr key={res.id}>
                                                            <td className="center-text">{res.carril || '-'}</td>
                                                            <td>{res.participanteNombre} {res.numeroCompetidor ? `(#${res.numeroCompetidor})` : ''}</td>
                                                            <td><span className="club-badge">{res.clubSigla || res.clubNombre}</span></td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="empty-state">No hay etapas programadas aún. Presiona Generar y Sortear.</div>
                    )}
                </div>
            )}

            {/* TAB: CARGA DE TIEMPOS */}
            {!loading && selectedPrueba && currentTab === 'resultados' && (
                <div className="resultados-grid-container glass-effect fade-in">
                    <div className="grid-instructions flex-between">
                        <div>💡 Seleccioná una fase para cargar resultados oficiales.</div>
                        <div className="flex-row gap-sm">
                            <button 
                                className="btn-primary" 
                                onClick={handleLockPrueba} 
                                disabled={isLocked || fases.length === 0}
                                style={{ background: isLocked ? '#4CAF50' : 'var(--color-danger)', border: 'none', cursor: isLocked ? 'default' : 'pointer' }}
                            >
                                {isLocked ? '🔒 Finalizada' : '🔒 Finalizar Competencia'}
                            </button>
                        </div>
                    </div>

                    {/* Selector de Fases Estilo Tabs (Mismo que Live) */}
                    {fases.length > 0 && (
                        <div className="admin-phase-selector" style={{ marginBottom: '2.5rem', padding: '1.2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            {Object.entries(
                                fases.reduce((acc, f) => {
                                    const key = f.etapaNombre || f.EtapaNombre || 'Etapa';
                                    if (!acc[key]) acc[key] = [];
                                    acc[key].push(f);
                                    return acc;
                                }, {})
                            ).map(([etapaNombre, etapaFases]) => (
                                <div key={etapaNombre} className="etapa-group" style={{ marginBottom: '1.2rem' }}>
                                    <div className="etapa-label" style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', marginBottom: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                        {etapaNombre}
                                    </div>
                                    <div className="phase-tabs" style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
                                        {etapaFases.map(f => {
                                            const isActive = filtroVisualFase === f.nombreFase || (filtroVisualFase === 'Todas' && f === fases[0]);
                                            return (
                                                <button 
                                                    key={f.id}
                                                    className={`phase-tab ${isActive ? 'active' : ''}`}
                                                    style={{ 
                                                        padding: '0.8rem 1.5rem',
                                                        borderRadius: '10px',
                                                        border: '1px solid rgba(255,255,255,0.1)',
                                                        background: isActive ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)',
                                                        color: 'white',
                                                        cursor: 'pointer',
                                                        fontWeight: '600',
                                                        fontSize: '0.9rem',
                                                        transition: 'all 0.3s ease',
                                                        boxShadow: isActive ? '0 4px 15px rgba(var(--color-primary-rgb), 0.3)' : 'none'
                                                    }}
                                                    onClick={() => setFiltroVisualFase(f.nombreFase)}
                                                >
                                                    {f.nombreFase}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Renderizado de la Fase Seleccionada */}
                    {(() => {
                        const faseAMostrar = (filtroVisualFase === 'Todas' || !fases.find(f => f.nombreFase === filtroVisualFase))
                            ? fases[0] 
                            : fases.find(f => f.nombreFase === filtroVisualFase);

                        if (!faseAMostrar) return <div className="empty-state">Seleccioná una fase arriba</div>;

                        return (
                            <div key={faseAMostrar.id} className="fase-admin-card active-fase" style={{ animation: 'fadeIn 0.4s ease' }}>
                                <div className="fase-header-admin" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
                                    <h3 style={{ margin: 0, color: 'var(--color-primary)', fontSize: '1.4rem' }}>
                                        {faseAMostrar.nombreFase} 
                                        <span style={{ fontSize: '0.9rem', color: 'var(--color-text-dim)', marginLeft: '10px', fontWeight: 'normal' }}>
                                            ({faseAMostrar.etapaNombre})
                                        </span>
                                    </h3>
                                    {!isLocked && (
                                        <button 
                                            className="btn-secondary" 
                                            onClick={() => handleSimulateResults(faseAMostrar)}
                                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                                        >
                                            ⚡ Simular esta Fase
                                        </button>
                                    )}
                                </div>

                                <table className="resultados-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '60px' }}>Carril</th>
                                            <th>Atleta / Tripulación</th>
                                            <th>Club</th>
                                            <th style={{ width: '150px' }}>Tiempo</th>
                                            <th style={{ width: '100px' }}>Posición</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {faseAMostrar.resultados.sort((a, b) => {
                                            const posA = tiemposLocales[a.id]?.posicion ? parseInt(tiemposLocales[a.id].posicion) : 999;
                                            const posB = tiemposLocales[b.id]?.posicion ? parseInt(tiemposLocales[b.id].posicion) : 999;
                                            if (posA !== posB) return posA - posB;
                                            return (a.carril || 99) - (b.carril || 99);
                                        }).map(res => {
                                            const isResultSaved = res.tiempoOficial && res.posicion;
                                            return (
                                                <tr key={res.id} className={isResultSaved ? 'row-official' : ''}>
                                                    <td className="center-text">{res.carril || '-'}</td>
                                                    <td style={{ opacity: isResultSaved ? 0.6 : 1 }}>{res.participanteNombre}</td>
                                                    <td style={{ opacity: isResultSaved ? 0.6 : 1 }}>{res.clubSigla}</td>
                                                    <td>
                                                        <input
                                                            type="text"
                                                            className={`resultado-input time-input ${isResultSaved ? 'input-official' : ''}`}
                                                            placeholder="00:00.00"
                                                            value={tiemposLocales[res.id]?.tiempoOficial || ''}
                                                            onChange={(e) => handleResultChange(res.id, 'tiempoOficial', e.target.value)}
                                                            disabled={isLocked}
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            className={`resultado-input pos-input ${isResultSaved ? 'input-official' : ''}`}
                                                            min="1"
                                                            placeholder="Pos"
                                                            value={tiemposLocales[res.id]?.posicion || ''}
                                                            onChange={(e) => handleResultChange(res.id, 'posicion', e.target.value)}
                                                            disabled={isLocked}
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>

                                {!isLocked && (
                                    <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '15px', background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '0 0 12px 12px' }}>
                                        <button 
                                            className="btn-danger" 
                                            onClick={() => handleDeleteFase(faseAMostrar.id)}
                                            style={{ padding: '10px 20px', fontSize: '0.9rem', opacity: 0.7 }}
                                        >
                                            🗑️ Fase
                                        </button>
                                        <button 
                                            className="btn-danger" 
                                            onClick={handleSortearCarriles}
                                            style={{ padding: '10px 20px', fontSize: '0.9rem', opacity: 0.7, background: '#FF5722' }}
                                        >
                                            🔄 Reset
                                        </button>
                                        
                                        <button 
                                            className="btn-primary" 
                                            onClick={handleSaveTiempos} 
                                            disabled={saving}
                                            style={{ padding: '12px 30px', fontSize: '1rem', fontWeight: 'bold' }}
                                        >
                                            {saving ? 'Guardando...' : `💾 Guardar ${faseAMostrar.nombreFase}`}
                                        </button>

                                        {/* Botón de Promoción - Solo aparece si la etapa está completa */}
                                        {(() => {
                                            const etapaNombre = faseAMostrar.etapaNombre;
                                            const fasesDeEstaEtapa = fases.filter(f => f.etapaNombre === etapaNombre);
                                            const isFinal = etapaNombre === "Finales";
                                            
                                            // Chequear que CADA fase de la etapa tenga al menos 1 resultado con tiempo (desde servidor O local)
                                            const isEtapaListo = fasesDeEstaEtapa.every(f => {
                                                const tieneResultadoServidor = f.resultados.some(r => r.tiempoOficial);
                                                const tieneResultadoLocal = f.resultados.some(r => {
                                                    const local = tiemposLocales[r.id];
                                                    return local && local.tiempoOficial && local.tiempoOficial !== '' && local.tiempoOficial !== '00:00.00';
                                                });
                                                return tieneResultadoServidor || tieneResultadoLocal;
                                            });

                                            if (isEtapaListo && !isFinal) {
                                                return (
                                                    <button 
                                                        className="btn-info" 
                                                        onClick={() => handlePromoverEtapa(faseAMostrar.etapaNombre)}
                                                        style={{ padding: '12px 30px', fontSize: '1rem', fontWeight: 'bold', background: '#00bcd4', borderRadius: '8px' }}
                                                    >
                                                        🚀 Promover a Siguiente Etapa
                                                    </button>
                                                );
                                            }
                                            return null;
                                        })()}
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </div>
            )}
        </div>
    );
};

export default GestionResultadosSection;
