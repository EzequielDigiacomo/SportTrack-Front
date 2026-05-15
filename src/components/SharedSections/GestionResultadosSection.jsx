import React, { useState } from 'react';
import { formatTime } from '../../utils/dateUtils';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Star, FileDown, ChevronDown, Trash2, RotateCcw, RefreshCw, List, Trophy, Minus, Plus } from 'lucide-react';
import { useResultados } from './useResultados';
import ResultadosHeader from './ResultadosHeader';
import FaseCard from './FaseCard';
import ResultadosTable from './ResultadosTable';
import ConfirmDialog from '../Common/ConfirmDialog';
import { useAlert } from '../../hooks/useAlert';
import PdfExportService from '../../services/PdfExportService';
import CsvExportService from '../../services/CsvExportService';
import timingSignalRService from '../../services/TimingSignalRService';
// import FaseDetailsForm from './FaseDetailsForm';
import './GestionResultados.css';

const GestionResultadosSection = ({ preselectedEventoId, defaultTab, isEmbedded, viewMode }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [showPdfMenu, setShowPdfMenu] = useState(false);
    
    const planNombre = user?.plan?.nombre?.toLowerCase() || 'bronce';
    const isBronce = planNombre === 'bronce';
    const role = user?.rol?.trim();
    const isAdmin = role === 'Admin' || role === 'SuperAdmin' || user?.username === 'soporte_tecnico';
    const {
        eventos, selectedEvento, setSelectedEvento,
        pruebas, selectedPrueba, setSelectedPrueba,
        currentTab, setCurrentTab,
        inscriptos, fases, cronograma,
        loading, saving, isLocked, message,
        filtroVisualFase, setFiltroVisualFase,
        tiemposLocales, setTiemposLocales,
        saveSuccess,
        handleSortearCarriles, handleSaveTiempos, handleToggleSeeding, handlePromoverEtapa, handleDeleteFase, handleResetFase, handleFinalizarFase,
        handleGenerarManual,
        handleRecalcularCronograma, handleSelectRegata,
        loadDatosPrueba, setMessage,
        handleUpdateFaseDetails
    } = useResultados(preselectedEventoId, defaultTab);

    const [elapsedTime, setElapsedTime] = useState(0);
    const [isRaceRunning, setIsRaceRunning] = useState(false);
    const timerRef = React.useRef(null);

    const { alert, showAlert } = useAlert();
    const [isManualMode, setIsManualMode] = useState(false);
    const [manualPlacements, setManualPlacements] = useState({});
    const [isNominaCollapsed, setIsNominaCollapsed] = useState(false);

    // Lógica de selección de fase (Movida arriba para evitar errores de hoisting)
    const hideTabs = viewMode === 'tiempos' || viewMode === 'startlist';

    const agrupadoPorEtapa = (fases || []).reduce((acc, f) => {
        const etapa = f.etapaNombre || f.EtapaNombre || 'Competencia';
        if (!acc[etapa]) acc[etapa] = [];
        acc[etapa].push(f);
        return acc;
    }, {});

    const faseSeleccionada = filtroVisualFase === 'Todas'
        ? null
        : ((fases || []).find(f => f.nombreFase === filtroVisualFase) || (fases || [])[0]);

    const startLocalTimer = (startTime) => {
        setIsRaceRunning(true);
        clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setElapsedTime(new Date() - startTime);
        }, 10);
    };

    const stopLocalTimer = () => {
        setIsRaceRunning(false);
        clearInterval(timerRef.current);
    };

    React.useEffect(() => {
        const canSync = viewMode === 'tiempos' || viewMode === 'resultados';
        if (!faseSeleccionada || !canSync) {
            stopLocalTimer();
            return;
        }

        let isMounted = true;

        const setupLiveSync = async () => {
            if (isBronce) return; // EL PLAN BRONCE NO TIENE SYNC EN VIVO
            
            // Sincronizar si la regata está activa o terminando
            if (faseSeleccionada.estado === 'En Carrera' ||
                faseSeleccionada.estado === 'Pendiente de Validación' ||
                faseSeleccionada.estado === 'Finalizada') {
                try {
                    await timingSignalRService.connect(faseSeleccionada.id);
                if (!isMounted) return;

                // 1. Sincronizar el temporizador si ya inició
                if (faseSeleccionada.fechaHoraInicioReal) {
                    const start = new Date(faseSeleccionada.fechaHoraInicioReal + (faseSeleccionada.fechaHoraInicioReal.endsWith('Z') ? '' : 'Z'));
                    if (!isNaN(start)) startLocalTimer(start);
                }

                // 2. Escuchar inicio de carrera (si ocurre mientras estamos mirando)
                timingSignalRService.onRaceStarted((id, startTime) => {
                    if (id.toString() === faseSeleccionada.id.toString()) {
                        const start = new Date(startTime + (startTime.endsWith('Z') ? '' : 'Z'));
                        if (!isNaN(start)) startLocalTimer(start);
                    }
                });

                // 3. RECIBIR TIEMPOS EN VIVO (CARRIL POR CARRIL)
                timingSignalRService.onTimeReceived((resId, timeStr, ms) => {
                    setTiemposLocales(prev => ({
                        ...prev,
                        [resId]: { ...prev[resId], tiempoOficial: timeStr }
                    }));
                });

                // 4. Fin de carrera
                timingSignalRService.onRaceFinished(() => {
                    stopLocalTimer();
                    // Refrescar para obtener posiciones finales si las hay
                    loadDatosPrueba(selectedPrueba);
                });

                // 5. Reset de carrera
                timingSignalRService.onRaceReset((id) => {
                    if (id.toString() === faseSeleccionada.id.toString()) {
                        stopLocalTimer();
                        setElapsedTime(0);
                        setTiemposLocales({});
                    }
                });

                // 6. En revisión
                timingSignalRService.onRaceInReview((id) => {
                    if (id.toString() === faseSeleccionada.id.toString()) {
                        stopLocalTimer();
                        loadDatosPrueba(selectedPrueba);
                    }
                });

                // 7. Status Update (DNS/DNF/DSQ)
                timingSignalRService.onResultStatusUpdated((resId, status) => {
                    setTiemposLocales(prev => ({
                        ...prev,
                        [resId]: { ...prev[resId], estadoCanto: status }
                    }));
                });

                } catch (err) {
                    console.error("Error connecting to live sync:", err);
                }
            }
        };

        setupLiveSync();

        return () => {
            isMounted = false;
            // No desconectamos para no romper la campana global
            // timingSignalRService.disconnect();
            stopLocalTimer();
        };
    }, [faseSeleccionada, viewMode]);

    // Funciones movidas arriba

const formatTimer = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = Math.floor(ms % 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
};


const handleSimulateResults = () => {
    if (!faseSeleccionada) {
        setMessage('⚠️ Seleccioná una fase primero para simular.');
        return;
    }

    const tls = { ...tiemposLocales };

    // Generar tiempos aleatorios para todos los resultados de la fase seleccionada
    const baseResults = faseSeleccionada.resultados.map(r => {
        const minutos = Math.floor(Math.random() * 2) + 1;
        const segundos = Math.floor(Math.random() * 60);
        const centesimas = Math.floor(Math.random() * 99);

        const tiempoStr = `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}.${String(centesimas).padStart(2, '0')}`;
        const totalMs = (minutos * 60000) + (segundos * 1000) + (centesimas * 10);

        return { id: r.id, tiempoStr, totalMs };
    });

    // Ordenar por tiempo y asignar posiciones
    baseResults.sort((a, b) => a.totalMs - b.totalMs);

    baseResults.forEach((res, idx) => {
        tls[res.id] = {
            tiempoOficial: res.tiempoStr,
            posicion: idx + 1
        };
    });

    setTiemposLocales(tls);
    setMessage(`✅ Simulación completada para ${faseSeleccionada.nombreFase}.`);
};

const handleManualPlacementChange = (inscId, field, value) => {
    setManualPlacements(prev => ({
        ...prev,
        [inscId]: {
            ...(prev[inscId] || { serie: 1, carril: 1 }),
            [field]: parseInt(value) || 0
        }
    }));
};

const handleApplyManualGeneration = () => {
    const placements = inscriptos.map(ins => ({
        inscripcionId: ins.id,
        serie: manualPlacements[ins.id]?.serie || 1,
        carril: manualPlacements[ins.id]?.carril || 1
    }));

    if (placements.some(p => p.carril < 1 || p.carril > 9)) {
        setMessage("⚠️ Todos los carriles deben estar entre 1 y 9.");
        return;
    }

    handleGenerarManual(placements);
    setIsManualMode(false);
};


const handleResultChange = (id, field, val) => {
    setTiemposLocales(prev => ({
        ...prev,
        [id]: { ...prev[id], [field]: val }
    }));
};

const eventoNombre = eventos.find(e => String(e.id) === String(selectedEvento))?.nombre || 'Evento';
const pruebaNombre = pruebas.find(p => String(p.id) === String(selectedPrueba))?.nombre || 'Prueba';
const etiquetasEtapas = Object.keys(agrupadoPorEtapa);

const handleExportFase = () => {
    if (!faseSeleccionada) return;
    PdfExportService.exportFase(faseSeleccionada, eventoNombre, pruebaNombre);
    setShowPdfMenu(false);
};

const handleExportGrupo = (etapa) => {
    const fasesDelGrupo = agrupadoPorEtapa[etapa] || [];
    PdfExportService.exportGrupo(fasesDelGrupo, eventoNombre, pruebaNombre, etapa);
    setShowPdfMenu(false);
};

const handleExportPrueba = () => {
    PdfExportService.exportPrueba(fases, eventoNombre, pruebaNombre);
    setShowPdfMenu(false);
};

const handleExportEvento = () => {
    PdfExportService.exportCronogramaCompleto(cronograma, eventoNombre);
    setShowPdfMenu(false);
};

const handleExportCsv = () => {
    if (filtroVisualFase === 'Todas') {
        CsvExportService.exportResultadosCsv(fases, eventoNombre, pruebaNombre);
    } else if (faseSeleccionada) {
        CsvExportService.exportResultadosCsv([faseSeleccionada], eventoNombre, pruebaNombre);
    }
    setShowPdfMenu(false);
};

return (
    <div className="gestion-resultados-container fade-in">
        {!hideTabs && (
            <div className="admin-header-main">
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
                        {!isEmbedded && (
                            <button
                                className="btn-admin-secondary"
                                onClick={() => navigate(-1)}
                                title="Volver"
                                style={{
                                    padding: '0',
                                    width: '22px',
                                    height: '22px',
                                    minWidth: '22px',
                                    minHeight: '22px',
                                    borderRadius: '50%',
                                    flexShrink: 0
                                }}
                            >
                                <ArrowLeft size={12} />
                            </button>
                        )}
                        <h2 className="admin-title" style={{ margin: 0 }}>Panel de Resultados y Start List</h2>
                    </div>
                    <p className="admin-subtitle" style={{ marginTop: '0.5rem' }}>Sorteo de carriles, armado de heats y carga de resultados oficiales.</p>
                </div>
            </div>
        )}

        {message && <div className="alert-msg info fade-in">{message}</div>}

        <ResultadosHeader
            eventos={eventos}
            selectedEvento={selectedEvento}
            setSelectedEvento={setSelectedEvento}
            pruebas={pruebas}
            selectedPrueba={selectedPrueba}
            setSelectedPrueba={setSelectedPrueba}
            currentTab={currentTab}
            setCurrentTab={setCurrentTab}
            hideTabs={hideTabs}
            cronograma={cronograma}
            onSelectRegata={handleSelectRegata}
            selectedFaseId={faseSeleccionada?.id}
        />

        {loading ? (
            <div className="loader-container"><div className="loader"></div></div>
        ) : selectedPrueba ? (
            <div className="resultados-content-area">

                {/* TAB: START LIST / SIEMBRA */}
                {currentTab === 'startList' && (
                    <div className="start-list-view fade-in">
                        <div className="action-bar-premium glass-effect mb-md" style={{ padding: '0.8rem 1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div className="info-badge-modern">
                                <List size={14} />
                                <span><strong>{inscriptos.length}</strong> Inscritos</span>
                            </div>
                            
                            <div className="flex-row gap-md">
                                <button
                                    className="btn-admin-action primary"
                                    onClick={handleSortearCarriles}
                                    disabled={saving || isManualMode}
                                >
                                    <RotateCcw size={16} /> {fases.length > 0 ? 'Regenerar Sorteo' : 'Generar Heats'}
                                </button>
                                
                                <button
                                    className={`btn-admin-action secondary ${isManualMode ? 'active' : ''}`}
                                    onClick={() => {
                                        if (!isManualMode) {
                                            const initial = {};
                                            inscriptos.forEach((ins, idx) => {
                                                initial[ins.id] = { 
                                                    serie: Math.floor(idx / 9) + 1, 
                                                    carril: (idx % 9) + 1 
                                                };
                                            });
                                            setManualPlacements(initial);
                                        }
                                        setIsManualMode(!isManualMode);
                                    }}
                                >
                                    {isManualMode ? '❌ Cancelar' : <><RefreshCw size={16} /> Manual</>}
                                </button>
                                
                                {isManualMode && (
                                    <button
                                        className="btn-admin-action accent"
                                        onClick={handleApplyManualGeneration}
                                    >
                                        🚀 Aplicar
                                    </button>
                                )}

                                {fases.length > 0 && (
                                    <div style={{ position: 'relative' }}>
                                        <button
                                            className="btn-admin-action secondary"
                                            onClick={() => setShowPdfMenu(v => !v)}
                                        >
                                            <FileDown size={16} /> Exportar PDF <ChevronDown size={14} />
                                        </button>
                                        {showPdfMenu && (
                                            <div className="pdf-dropdown-menu fade-in">
                                                <button onClick={handleExportEvento}>📅 Cronograma General</button>
                                                <button onClick={handleExportPrueba}>🏆 Prueba Seleccionada</button>
                                                {etiquetasEtapas.map(etapa => (
                                                    <button key={etapa} onClick={() => handleExportGrupo(etapa)}>📋 Solo {etapa}</button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {fases.length > 0 && (
                                    <button
                                        className="btn-admin-action info"
                                        onClick={handleRecalcularCronograma}
                                        disabled={saving}
                                    >
                                        <RefreshCw size={16} /> Reprogramar
                                    </button>
                                )}
                            </div>
                        </div>

                        {inscriptos.length > 0 && (
                            <div className="inscriptos-seeding-panel glass-effect p-md mb-lg" style={{ borderRadius: 'var(--radius-lg)', position: 'relative' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isNominaCollapsed ? '0' : '1.5rem' }}>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-primary-light)' }}>
                                        Nómina de Inscritos y Siembra
                                    </h3>
                                    <button 
                                        className="btn-admin-icon" 
                                        onClick={() => setIsNominaCollapsed(!isNominaCollapsed)}
                                        title={isNominaCollapsed ? "Expandir" : "Minimizar"}
                                        style={{ width: '28px', height: '28px', borderRadius: '4px' }}
                                    >
                                        {isNominaCollapsed ? <Plus size={14} /> : <Minus size={14} />}
                                    </button>
                                </div>

                                {!isNominaCollapsed && (
                                    <div className="fade-in">
                                        <div className="admin-table-wrapper" style={{ maxHeight: '300px', borderRadius: 'var(--radius-md)' }}>
                                            <table className="admin-table">
                                                <thead>
                                                    <tr>
                                                        <th>Atleta / Tripulación</th>
                                                        <th>Club</th>
                                                        {isManualMode ? (
                                                            <>
                                                                <th style={{ textAlign: 'center' }}>Serie / Heat</th>
                                                                <th style={{ textAlign: 'center' }}>Carril</th>
                                                            </>
                                                        ) : (
                                                            <th style={{ textAlign: 'center' }}>Cabeza de Serie (Carril 5)</th>
                                                        )}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {inscriptos.map(ins => (
                                                        <tr key={ins.id} style={{ background: ins.esCabezaDeSerie ? 'rgba(255,221,0,0.05)' : 'transparent' }}>
                                                            <td>
                                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                    <strong style={{ color: ins.esCabezaDeSerie ? '#ffdd00' : 'inherit', fontSize: '1.1rem' }}>
                                                                        {ins.tripulantes && ins.tripulantes.length > 0 
                                                                            ? [ins.participanteNombreCompleto, ...ins.tripulantes.map(t => t.participanteNombreCompleto)].join(' - ')
                                                                            : (ins.participanteNombreCompleto || "Bote de Equipo")
                                                                        }
                                                                    </strong>
                                                                    {ins.tripulantes && ins.tripulantes.length > 0 && (
                                                                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', marginTop: '2px', letterSpacing: '0.5px' }}>
                                                                            TRIPULACIÓN COMPLETA
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td>{ins.clubNombre || ins.clubSigla || 'Independiente'}</td>
                                                            <td style={{ textAlign: 'center' }}>
                                                                {isManualMode ? (
                                                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                                                                        <input 
                                                                            type="number"
                                                                            className="admin-input-small"
                                                                            style={{ width: '60px', textAlign: 'center' }}
                                                                            value={manualPlacements[ins.id]?.serie || 1}
                                                                            onChange={(e) => handleManualPlacementChange(ins.id, 'serie', e.target.value)}
                                                                        />
                                                                    </div>
                                                                ) : (
                                                                    <button
                                                                        className="btn-icon-admin"
                                                                        onClick={() => handleToggleSeeding(ins.id)}
                                                                        title={ins.esCabezaDeSerie ? "Quitar Cabeza de Serie" : "Marcar como Cabeza de Serie"}
                                                                        style={{
                                                                            color: ins.esCabezaDeSerie ? '#ffdd00' : 'var(--color-text-muted)',
                                                                            background: ins.esCabezaDeSerie ? 'rgba(255,221,0,0.1)' : 'rgba(255,255,255,0.05)',
                                                                            border: ins.esCabezaDeSerie ? '1px solid rgba(255,221,0,0.3)' : '1px solid rgba(255,255,255,0.1)',
                                                                            padding: '0.4rem',
                                                                            borderRadius: '50%'
                                                                        }}
                                                                    >
                                                                        <Star size={16} fill={ins.esCabezaDeSerie ? '#ffdd00' : 'none'} />
                                                                    </button>
                                                                )}
                                                            </td>
                                                            {isManualMode && (
                                                                <td style={{ textAlign: 'center' }}>
                                                                    <input 
                                                                        type="number"
                                                                        className="admin-input-small"
                                                                        style={{ width: '60px', textAlign: 'center' }}
                                                                        min="1" max="9"
                                                                        value={manualPlacements[ins.id]?.carril || 1}
                                                                        onChange={(e) => handleManualPlacementChange(ins.id, 'carril', e.target.value)}
                                                                    />
                                                                </td>
                                                            )}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)', marginTop: '1rem', fontStyle: 'italic' }}>
                                            * Se debe marcar 1 cabeza de serie por cada 9 atletas para armar los heats correctamente.
                                            El sistema ubicará automáticamente a los cabezas de serie en el Carril 5 de cada serie.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {(() => {
                            // Dropdown 3 → filtroVisualFase = specific fase name → show only that fase
                            // Dropdown 2 → filtroVisualFase = 'Todas' → show all fases of the prueba
                            const fasesParaStartList = filtroVisualFase !== 'Todas'
                                ? fases.filter(f => f.nombreFase === filtroVisualFase)
                                : fases;

                            const gruposFiltrados = fasesParaStartList.reduce((acc, f) => {
                                const etapa = f.etapaNombre || f.EtapaNombre || 'Competencia';
                                if (!acc[etapa]) acc[etapa] = [];
                                acc[etapa].push(f);
                                return acc;
                            }, {});

                            if (Object.keys(gruposFiltrados).length === 0) {
                                return (
                                    <div className="empty-state-card glass-effect">
                                        <p>No se han generado las series para esta prueba.</p>
                                        <span>Presiona el botón de arriba para sortear los carriles automáticamente.</span>
                                    </div>
                                );
                            }

                            return (
                                <div className="series-preview-section fade-in">
                                    <h3 style={{ margin: '1.5rem 0 1rem 0', fontSize: '1.1rem', color: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                        🏁 {faseSeleccionada ? `#${cronograma.findIndex(c => c.id === faseSeleccionada.id) + 1} - ` : ''} Series y Sorteo de Carriles
                                        {filtroVisualFase !== 'Todas' && (
                                            <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--color-text-dim)', background: 'rgba(100,160,255,0.1)', border: '1px solid rgba(100,160,255,0.2)', borderRadius: '6px', padding: '2px 10px' }}>
                                                Mostrando: <strong style={{ color: 'var(--color-primary-light)' }}>{filtroVisualFase}</strong>
                                                <button
                                                    onClick={() => setFiltroVisualFase('Todas')}
                                                    style={{ marginLeft: '8px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.85rem' }}
                                                    title="Ver todas las fases"
                                                >✕</button>
                                            </span>
                                        )}
                                    </h3>
                                    {Object.entries(gruposFiltrados).map(([etapa, fasesDeEtapa]) => (
                                        <div key={etapa} className="etapa-wrapper mb-lg">
                                            <div className="fases-grid-responsive">
                                                {fasesDeEtapa.map(f => (
                                                    <FaseCard
                                                        key={f.id}
                                                        fase={f}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}

                    </div>
                )}

                {/* TAB: RESULTADOS */}
                {currentTab === 'resultados' && (
                    <div className="resultados-view fade-in">
                        <div className="action-bar-premium glass-effect mb-md" style={{ padding: '0.8rem 1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div className="info-badge-modern">
                                    <Trophy size={14} />
                                    <span><strong>{fases.length}</strong> {fases.length === 1 ? 'Fase' : 'Fases'}</span>
                                </div>
                                {fases.length > 0 && (
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <select
                                            className="admin-select compact"
                                            value={filtroVisualFase}
                                            onChange={(e) => setFiltroVisualFase(e.target.value)}
                                            style={{ minWidth: '180px' }}
                                        >
                                            <option value="Todas">— Seleccionar Fase —</option>
                                            {fases.map(f => (
                                                <option key={f.id} value={f.nombreFase}>
                                                    {f.nombreFase} {f.estado === 'En Carrera' ? '🔴' : ''}
                                                </option>
                                            ))}
                                        </select>
                                        
                                        <button
                                            className="btn-admin-icon"
                                            onClick={() => loadDatosPrueba(selectedPrueba)}
                                            disabled={loading}
                                            title="Actualizar"
                                        >
                                            <RefreshCw size={14} className={loading ? 'spin' : ''} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                                {fases.length > 0 && (isAdmin || viewMode === 'tiempos' || viewMode === 'resultados') && (
                                    <button
                                        className="btn-admin-action success"
                                        onClick={handlePromoverEtapa}
                                        disabled={saving}
                                    >
                                        🏆 Promover Etapa
                                    </button>
                                )}

                                {fases.length > 0 && (
                                    <div style={{ position: 'relative' }}>
                                        <button
                                            className="btn-admin-action secondary"
                                            onClick={() => setShowPdfMenu(v => !v)}
                                        >
                                            <FileDown size={16} /> PDF <ChevronDown size={14} />
                                        </button>
                                        {showPdfMenu && (
                                            <div className="pdf-dropdown-menu fade-in">
                                                {faseSeleccionada && <button onClick={handleExportFase}>📄 Solo: {faseSeleccionada.nombreFase}</button>}
                                                {etiquetasEtapas.map(etapa => (
                                                    <button key={etapa} onClick={() => handleExportGrupo(etapa)}>📋 Todas las {etapa}</button>
                                                ))}
                                                <div className="dropdown-divider" />
                                                <button onClick={handleExportPrueba} className="highlight">🏆 Prueba Completa</button>
                                                <button onClick={handleExportCsv} className="success">📊 Exportar Excel (.csv)</button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>


                        {faseSeleccionada ? (
                            <div className="resultados-main-card glass-effect p-md">
                                {isRaceRunning && (
                                    <div className="live-monitor-header fade-in">
                                        <div className="live-badge">🔴 EN VIVO</div>
                                        <div className="live-timer-big">{formatTimer(elapsedTime)}</div>
                                        <p>Siguiendo la regata en tiempo real...</p>
                                    </div>
                                )}

                                {(faseSeleccionada.estado === "Pendiente de Validación" || faseSeleccionada.estado === "Finalizada") && (
                                    viewMode === 'tiempos' ? (
                                        <div className="alert-msg warning fade-in" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '4px solid #f59e0b', background: 'rgba(245,158,11,0.1)' }}>
                                            <span style={{ color: '#f59e0b', fontWeight: 600 }}>
                                                ⚠️ Modo Override — Esta fase ya fue {faseSeleccionada.estado === 'Finalizada' ? 'oficializada' : 'completada'}. Podés editar tiempos y posiciones directamente.
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="alert-msg warning fade-in" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '4px solid #10b981', background: 'rgba(16, 185, 129, 0.1)' }}>
                                            <span style={{ color: '#10b981', fontWeight: 600 }}>
                                                {faseSeleccionada.estado === "Pendiente de Validación"
                                                    ? '🏁 Serie completada por cronometrista. Lista para validación oficial.'
                                                    : '✅ Resultados oficiales publicados.'}
                                            </span>
                                            {faseSeleccionada.estado === "Pendiente de Validación" && (
                                                <button
                                                    className="btn-admin-primary"
                                                    onClick={() => handleFinalizarFase(faseSeleccionada.id)}
                                                    style={{ background: '#10b981', border: 'none', padding: '0.6rem 1.2rem', borderRadius: 'var(--radius-md)', fontWeight: 700 }}
                                                >
                                                    ✅ Validar y Hacer Oficial
                                                </button>
                                            )}
                                        </div>
                                    )
                                )}
                                <ResultadosTable
                                    fase={faseSeleccionada}
                                    tiemposLocales={tiemposLocales}
                                    onResultChange={handleResultChange}
                                    isLocked={(isAdmin || viewMode === 'tiempos' || viewMode === 'resultados') ? false : isLocked}
                                    isSuccess={saveSuccess}
                                />
                                
                                {(isAdmin || viewMode === 'tiempos' || viewMode === 'resultados') && (
                                    <div className="form-footer-actions mt-md" style={{ justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                                            {isBronce && (
                                                <span style={{ fontSize: '0.75rem', color: '#CD7F32', fontWeight: 'bold', background: 'rgba(205,127,50,0.1)', padding: '4px 10px', borderRadius: '4px', border: '1px solid rgba(205,127,50,0.2)' }}>
                                                    PLAN BRONCE: CARGA MANUAL HABILITADA
                                                </span>
                                            )}
                                            {viewMode === 'tiempos' && !isBronce && (
                                                <button
                                                    className="btn-admin-secondary"
                                                    onClick={handleSimulateResults}
                                                    style={{ borderColor: 'rgba(255,221,0,0.3)', color: '#ffdd00' }}
                                                    title="Genera tiempos aleatorios para testear (sobreescribe los actuales)"
                                                >
                                                    ⚡ Simular Tiempos
                                                </button>
                                            )}
                                            <button
                                                className="btn-admin-secondary"
                                                onClick={() => handleResetFase(faseSeleccionada.id)}
                                                style={{ borderColor: 'rgba(255, 100, 100, 0.3)', color: '#ff6b6b' }}
                                                title="Borrar todos los tiempos y reiniciar cronómetro"
                                            >
                                                <RotateCcw size={14} style={{ marginRight: '6px' }} /> Reiniciar Fase
                                            </button>
                                        </div>
                                        <button
                                            className="btn-admin-primary"
                                            onClick={handleSaveTiempos}
                                            disabled={saving}
                                        >
                                            💾 {saving ? 'Guardando...' : 'Guardar Tiempos Oficiales'}
                                        </button>
                                    </div>
                                )}
                                {isLocked && (
                                    <div style={{ marginTop: '0.5rem', color: 'var(--color-warning)', fontSize: '0.85rem', textAlign: 'right' }}>
                                        ⚠️ Esta prueba está marcada como bloqueada, pero puedes guardar cambios si es necesario.
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="empty-state">
                                {viewMode === 'resultados'
                                    ? 'No hay resultados oficiales guardados para esta prueba todavía.'
                                    : 'Seleccioná una fase para cargar tiempos.'}
                            </div>
                        )}
                    </div>
                )}
            </div>
        ) : selectedEvento && cronograma.length > 0 ? (
            <div className="global-cronograma-view fade-in" style={{ padding: '0 1rem' }}>
                <div className="section-header-row mb-lg" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 style={{ color: 'var(--color-primary-light)', margin: 0 }}>📅 Cronograma General del Evento</h3>
                        <p style={{ color: 'var(--color-text-dim)', fontSize: '0.9rem', margin: '0.3rem 0 0 0' }}>
                            Vista consolidada de todas las series, semifinales y finales programadas.
                        </p>
                    </div>
                    <button 
                        className="btn-admin-secondary"
                        onClick={handleRecalcularCronograma}
                        disabled={saving}
                        style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
                    >
                        🧠 Reprogramar Todo el Evento
                    </button>
                </div>
                
                <div className="fases-grid-responsive">
                    {cronograma.map((f, idx) => (
                        <div 
                            key={f.id} 
                            onClick={() => handleSelectRegata(f)} 
                            style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                            onMouseOver={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                            onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            <FaseCard 
                                fase={f} 
                                showPruebaName={true} 
                                filtroVisualFase="Cronograma"
                                pruebaNro={idx + 1}
                            />
                        </div>
                    ))}
                </div>
            </div>
        ) : (
            <div className="empty-selection-state">
                <div className="icon-circle">🎯</div>
                <h3>Seleccioná un evento y una regata</h3>
                <p>Para comenzar a gestionar los carriles o cargar tiempos, debés elegir una competencia del menú superior o ver el cronograma completo.</p>
            </div>
        )}
    </div>
);
};

export default GestionResultadosSection;
