import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, FileDown, ChevronDown } from 'lucide-react';
import { useResultados } from './useResultados';
import ResultadosHeader from './ResultadosHeader';
import FaseCard from './FaseCard';
import ResultadosTable from './ResultadosTable';
import ConfirmDialog from '../Common/ConfirmDialog';
import { useAlert } from '../../hooks/useAlert';
import PdfExportService from '../../services/PdfExportService';
import './GestionResultados.css';

const GestionResultadosSection = ({ preselectedEventoId, defaultTab, isEmbedded }) => {
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
        handleSortearCarriles, handleSaveTiempos, handleToggleSeeding,
        loadDatosPrueba, setMessage
    } = useResultados(preselectedEventoId, defaultTab);

    const { alert, showAlert } = useAlert();

    const agrupadoPorEtapa = fases.reduce((acc, f) => {
        const etapa = f.etapaNombre || f.EtapaNombre || 'Competencia';
        if (!acc[etapa]) acc[etapa] = [];
        acc[etapa].push(f);
        return acc;
    }, {});

    const faseSeleccionada = (filtroVisualFase === 'Todas' || !fases.find(f => f.nombreFase === filtroVisualFase))
        ? fases[0]
        : fases.find(f => f.nombreFase === filtroVisualFase);

    const handleSimulateResults = () => {
        const tls = {};
        fases.forEach(f => {
            const sorted = [...f.resultados].sort((a, b) => (a.carril || 99) - (b.carril || 99));
            sorted.forEach((r, idx) => {
                const minutos = Math.floor(Math.random() * 2) + 1;
                const segundos = String(Math.floor(Math.random() * 60)).padStart(2, '0');
                const centesimas = String(Math.floor(Math.random() * 99) + 1).padStart(2, '0');
                tls[r.id] = {
                    tiempoOficial: `0${minutos}:${segundos}.${centesimas}`,
                    posicion: idx + 1
                };
            });
        });
        setTiemposLocales(tls);
        setMessage('✅ Simulación completada. Revisá los tiempos y guardá si estás conforme.');
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
            <div className="admin-header-main">
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
                        {!isEmbedded && (
                            <button 
                                className="btn-admin-secondary" 
                                onClick={() => navigate(-1)}
                                title="Volver"
                                style={{ padding: '0', width: '42px', height: '42px', borderRadius: '50%', flexShrink: 0 }}
                            >
                                <ArrowLeft size={20} />
                            </button>
                        )}
                        <h2 className="admin-title" style={{ margin: 0 }}>Panel de Resultados y Start List</h2>
                    </div>
                    <p className="admin-subtitle" style={{ marginTop: '0.5rem' }}>Sorteo de carriles, armado de heats y carga de resultados oficiales.</p>
                </div>
            </div>

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
                                <div className="inscriptos-seeding-panel glass-effect p-md mb-lg">
                                    <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: 'var(--color-primary-light)' }}>
                                        Nómina de Inscritos y Siembra
                                    </h3>
                                    <div className="admin-table-wrapper" style={{ maxHeight: '300px' }}>
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
                                Object.entries(agrupadoPorEtapa).map(([etapa, fasesDeEtapa]) => (
                                    <div key={etapa} className="etapa-wrapper mb-lg">
                                        <div className="fases-grid-responsive">
                                            {fasesDeEtapa.map(f => (
                                                <FaseCard key={f.id} fase={f} />
                                            ))}
                                        </div>
                                    </div>
                                ))
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
                                        <select
                                            className="admin-select"
                                            value={filtroVisualFase}
                                            onChange={(e) => setFiltroVisualFase(e.target.value)}
                                            style={{ minWidth: '200px', fontSize: '0.9rem' }}
                                        >
                                            <option value="Todas">— Seleccionar Fase —</option>
                                            {fases.map(f => (
                                                <option key={f.id} value={f.nombreFase}>
                                                    {f.nombreFase} {f.fechaHoraProgramada ? `· ${new Date(f.fechaHoraProgramada).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                {/* PDF Export Dropdown */}
                                {fases.length > 0 && (
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
                                    <ResultadosTable 
                                        fase={faseSeleccionada}
                                        tiemposLocales={tiemposLocales}
                                        isLocked={isLocked}
                                        onResultChange={handleResultChange}
                                    />

                                    <div className="form-footer-actions mt-md">
                                        <button 
                                            className="btn-admin-primary" 
                                            onClick={handleSaveTiempos}
                                            disabled={saving || isLocked}
                                        >
                                            💾 {saving ? 'Guardando...' : 'Guardar Tiempos Oficiales'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="empty-state">Seleccioná una fase para cargar tiempos.</div>
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
