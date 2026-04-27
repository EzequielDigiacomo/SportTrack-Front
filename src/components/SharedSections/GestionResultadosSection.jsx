import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, FileDown, ChevronDown, Trash2, RotateCcw } from 'lucide-react';
import { useResultados } from './useResultados';
import ResultadosHeader from './ResultadosHeader';
import FaseCard from './FaseCard';
import ResultadosTable from './ResultadosTable';
import ConfirmDialog from '../Common/ConfirmDialog';
import { useAlert } from '../../hooks/useAlert';
import PdfExportService from '../../services/PdfExportService';
import './GestionResultados.css';

const GestionResultadosSection = ({ preselectedEventoId, defaultTab, isEmbedded, viewMode }) => {
    const navigate = useNavigate();
    const [showPdfMenu, setShowPdfMenu] = useState(false);
    const {
        eventos, selectedEvento, setSelectedEvento,
        pruebas, selectedPrueba, setSelectedPrueba,
        currentTab, setCurrentTab,
        inscriptos, fases,
        loading, saving, isLocked, message,
        filtroVisualFase, setFiltroVisualFase,
        tiemposLocales, setTiemposLocales,
        saveSuccess,
        handleSortearCarriles, handleSaveTiempos, handleToggleSeeding, handlePromoverEtapa, handleDeleteFase, handleResetFase, handleFinalizarFase,
        loadDatosPrueba, setMessage
    } = useResultados(preselectedEventoId, defaultTab);

    const { alert, showAlert } = useAlert();

    // Si venimos de las nuevas cards, forzamos el tab pero ocultamos el selector de tabs
    const hideTabs = viewMode === 'tiempos' || viewMode === 'resultados' || viewMode === 'startlist';

    const agrupadoPorEtapa = fases.reduce((acc, f) => {
        const etapa = f.etapaNombre || f.EtapaNombre || 'Competencia';
        if (!acc[etapa]) acc[etapa] = [];
        acc[etapa].push(f);
        return acc;
    }, {});

    const faseSeleccionada = filtroVisualFase === 'Todas' 
        ? null 
        : (fases.find(f => f.nombreFase === filtroVisualFase) || fases[0]);

    const handleSimulateResults = () => {
        if (!faseSeleccionada) {
            setMessage('⚠️ Seleccioná una fase primero para simular.');
            return;
        }

        // Bloqueo granular: Solo bloqueamos si LA FASE seleccionada ya tiene tiempos oficiales
        const faseYaTieneTiempos = faseSeleccionada.resultados.some(r => r.tiempoOficial && r.tiempoOficial !== '' && r.tiempoOficial !== '00:00:00');
        
        if (faseYaTieneTiempos) {
            setMessage('⚠️ No se puede simular: Esta fase ya tiene resultados oficiales guardados.');
            return;
        }

        const tls = { ...tiemposLocales };
        
        // 1. Generar tiempos aleatorios solo para los resultados de la fase seleccionada
        const baseResults = faseSeleccionada.resultados.map(r => {
            const minutos = Math.floor(Math.random() * 2) + 1;
            const segundos = Math.floor(Math.random() * 60);
            const centesimas = Math.floor(Math.random() * 99);
            
            const tiempoStr = `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}.${String(centesimas).padStart(2, '0')}`;
            const totalMs = (minutos * 60000) + (segundos * 1000) + (centesimas * 10);
            
            return { id: r.id, tiempoStr, totalMs };
        });

        // 2. Ordenar por tiempo y asignar posiciones
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
            />

            {loading ? (
                <div className="loader-container"><div className="loader"></div></div>
            ) : selectedPrueba ? (
                <div className="resultados-content-area">
                    
                    {/* TAB: START LIST / SIEMBRA */}
                    {currentTab === 'startList' && (
                        <div className="start-list-view fade-in">
                            <div className="action-bar-premium glass-effect mb-md">
                                <div className="info-badge">
                                    <strong>{inscriptos.length}</strong> Inscritos en esta prueba
                                </div>
                                <div className="flex-row gap-sm">
                                    <button 
                                        className="btn-admin-primary" 
                                        onClick={handleSortearCarriles}
                                        disabled={saving}
                                    >
                                        🎲 {fases.length > 0 ? 'Resortear y Regenerar' : 'Generar Heats y Sortear'}
                                    </button>
                                </div>
                            </div>

                            {inscriptos.length > 0 && (
                                <div className="inscriptos-seeding-panel glass-effect p-md mb-lg" style={{ borderRadius: 'var(--radius-lg)' }}>
                                    <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: 'var(--color-primary-light)' }}>
                                        Nómina de Inscritos y Siembra
                                    </h3>
                                    <div className="admin-table-wrapper" style={{ maxHeight: '300px', borderRadius: 'var(--radius-md)' }}>
                                        <table className="admin-table">
                                            <thead>
                                                <tr>
                                                    <th>Atleta / Tripulación</th>
                                                    <th>Club</th>
                                                    <th style={{ textAlign: 'center' }}>Cabeza de Serie (Carril 5)</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {inscriptos.map(ins => (
                                                    <tr key={ins.id} style={{ background: ins.esCabezaDeSerie ? 'rgba(255,221,0,0.05)' : 'transparent' }}>
                                                        <td>
                                                            <strong style={{ color: ins.esCabezaDeSerie ? '#ffdd00' : 'inherit' }}>
                                                                 {ins.participanteNombreCompleto || "Bote de Equipo"}
                                                            </strong>
                                                            {ins.tripulantes && ins.tripulantes.length > 0 && (
                                                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', marginTop: '2px' }}>
                                                                    {ins.tripulantes.map(t => t.participanteNombreCompleto).join(' • ')}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td>{ins.clubNombre || ins.clubSigla || 'Independiente'}</td>
                                                        <td style={{ textAlign: 'center' }}>
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
                                                        </td>
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

                            {Object.keys(agrupadoPorEtapa).length > 0 ? (
                                <div className="series-preview-section fade-in">
                                    <h3 style={{ margin: '1.5rem 0 1rem 0', fontSize: '1.1rem', color: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                        🏁 Series y Sorteo de Carriles
                                    </h3>
                                    {Object.entries(agrupadoPorEtapa).map(([etapa, fasesDeEtapa]) => (
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
                            ) : (
                                <div className="empty-state-card glass-effect">
                                    <p>No se han generado las series para esta prueba.</p>
                                    <span>Presiona el botón de arriba para sortear los carriles automáticamente.</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB: RESULTADOS */}
                    {currentTab === 'resultados' && (
                        <div className="resultados-view fade-in">
                            <div className="action-bar-premium glass-effect mb-md">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                                    <div className="info-badge">
                                        <strong>{fases.length}</strong> {fases.length === 1 ? 'Fase' : 'Fases'} generadas
                                    </div>
                                    {fases.length > 0 && (
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <select
                                                className="admin-select"
                                                value={filtroVisualFase}
                                                onChange={(e) => setFiltroVisualFase(e.target.value)}
                                                style={{ minWidth: '200px', fontSize: '0.9rem' }}
                                            >
                                                <option value="Todas">— Seleccionar Fase —</option>
                                                {fases
                                                    .filter(f => viewMode !== 'resultados' || f.resultados.some(r => r.tiempoOficial))
                                                    .map(f => (
                                                        <option key={f.id} value={f.nombreFase}>
                                                            {f.nombreFase} {f.fechaHoraProgramada ? `· ${new Date(f.fechaHoraProgramada).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                                                        </option>
                                                    ))}
                                            </select>
                                            {viewMode === 'tiempos' && filtroVisualFase !== 'Todas' && (
                                                <button 
                                                    className="btn-icon-admin danger"
                                                    onClick={() => {
                                                        const f = fases.find(f => f.nombreFase === filtroVisualFase);
                                                        if (f) handleDeleteFase(f.id);
                                                    }}
                                                    title="Eliminar esta fase seleccionada"
                                                    style={{ padding: '0 1rem' }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                    {fases.length > 0 && viewMode === 'tiempos' && (
                                        <button 
                                            className="btn-admin-primary" 
                                            onClick={handlePromoverEtapa}
                                            disabled={saving}
                                            style={{ 
                                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
                                            }}
                                            title="Generar la siguiente etapa (Semifinales/Finales) basado en estos resultados"
                                        >
                                            🏆 Promover Etapa
                                        </button>
                                    )}
                                </div>

                                {/* PDF Export Dropdown */}
                                {fases.length > 0 && viewMode !== 'tiempos' && (
                                    <div style={{ position: 'relative', zIndex: 9999 }}>
                                        <button
                                            className="btn-admin-secondary"
                                            onClick={() => setShowPdfMenu(v => !v)}
                                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                        >
                                            <FileDown size={16} /> Exportar PDF <ChevronDown size={14} />
                                        </button>
                                        {showPdfMenu && (
                                            <div 
                                                style={{ 
                                                    position: 'absolute', right: 0, top: 'calc(100% + 6px)',
                                                    zIndex: 9999,
                                                    minWidth: '260px', borderRadius: '12px', overflow: 'hidden',
                                                    background: 'rgba(18, 26, 48, 0.98)',
                                                    border: '1px solid rgba(100, 160, 255, 0.2)',
                                                    boxShadow: '0 16px 48px rgba(0,0,0,0.7)',
                                                }}
                                            >
                                                <div style={{ padding: '0.4rem 0' }}>
                                                    {/* Current fase */}
                                                    {faseSeleccionada && (
                                                        <button
                                                            onClick={handleExportFase}
                                                            style={{ width: '100%', textAlign: 'left', padding: '0.65rem 1rem', background: 'none', border: 'none', color: 'var(--color-text)', cursor: 'pointer', fontSize: '0.9rem' }}
                                                            onMouseOver={e => e.currentTarget.style.background = 'rgba(100,160,255,0.1)'}
                                                            onMouseOut={e => e.currentTarget.style.background = 'none'}
                                                        >
                                                            📄 Solo: <strong>{faseSeleccionada.nombreFase}</strong>
                                                        </button>
                                                    )}
                                                    {/* Per etapa */}
                                                    {etiquetasEtapas.map(etapa => (
                                                        <button
                                                            key={etapa}
                                                            onClick={() => handleExportGrupo(etapa)}
                                                            style={{ width: '100%', textAlign: 'left', padding: '0.65rem 1rem', background: 'none', border: 'none', color: 'var(--color-text)', cursor: 'pointer', fontSize: '0.9rem' }}
                                                            onMouseOver={e => e.currentTarget.style.background = 'rgba(100,160,255,0.1)'}
                                                            onMouseOut={e => e.currentTarget.style.background = 'none'}
                                                        >
                                                            📋 Todas las {etapa}
                                                        </button>
                                                    ))}
                                                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '0.3rem 0' }} />
                                                    {/* Full prueba */}
                                                    <button
                                                        onClick={handleExportPrueba}
                                                        style={{ width: '100%', textAlign: 'left', padding: '0.65rem 1rem', background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}
                                                        onMouseOver={e => e.currentTarget.style.background = 'rgba(100,160,255,0.1)'}
                                                        onMouseOut={e => e.currentTarget.style.background = 'none'}
                                                    >
                                                        🏆 Prueba completa (todo en un PDF)
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {faseSeleccionada ? (
                                <div className="resultados-main-card glass-effect p-md">
                                    {faseSeleccionada.estado === "Pendiente de Validación" && (
                                        <div className="alert-msg warning fade-in" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '4px solid #fbbf24', background: 'rgba(251, 191, 36, 0.1)' }}>
                                            <span style={{ color: '#fbbf24', fontWeight: 600 }}>⚠️ Serie enviada por cronometrista. Pendiente de validación oficial.</span>
                                            <button 
                                                className="btn-admin-primary"
                                                onClick={() => handleFinalizarFase(faseSeleccionada.id)}
                                                style={{ background: '#10b981', border: 'none', padding: '0.6rem 1.2rem', borderRadius: 'var(--radius-md)', fontWeight: 700 }}
                                            >
                                                ✅ Validar y Hacer Oficial
                                            </button>
                                        </div>
                                    )}
                                    <ResultadosTable 
                                        fase={faseSeleccionada}
                                        tiemposLocales={tiemposLocales}
                                        onResultChange={handleResultChange}
                                        isLocked={isLocked || viewMode === 'resultados'}
                                        isSuccess={saveSuccess}
                                    />

                                    {viewMode !== 'resultados' && (
                                        <div className="form-footer-actions mt-md" style={{ justifyContent: 'space-between' }}>
                                            <div style={{ display: 'flex', gap: '0.8rem' }}>
                                                <button 
                                                    className="btn-admin-secondary" 
                                                    onClick={handleSimulateResults}
                                                    style={{ borderColor: 'rgba(255,221,0,0.3)', color: '#ffdd00' }}
                                                    disabled={faseSeleccionada?.resultados?.some(r => r.tiempoOficial && r.tiempoOficial !== '' && r.tiempoOficial !== '00:00:00')}
                                                >
                                                    ⚡ Simular Tiempos
                                                </button>
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
            ) : (
                <div className="empty-selection-state">
                    <div className="icon-circle">🎯</div>
                    <h3>Seleccioná un evento y una regata</h3>
                    <p>Para comenzar a gestionar los carriles o cargar tiempos, debés elegir una competencia del menú superior.</p>
                </div>
            )}
        </div>
    );
};

export default GestionResultadosSection;
