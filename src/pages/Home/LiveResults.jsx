import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import EventoService from '../../services/EventoService';
import { PruebaService } from '../../services/ConfigService';
import ResultadoService from '../../services/ResultadoService';
import FaseService from '../../services/FaseService';
import signalRServiceInstance from '../../services/SignalRService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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

const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
};

const LiveResults = () => {
    const { id } = useParams();
    const [evento, setEvento] = useState(null);
    const [pruebas, setPruebas] = useState([]);
    const [selectedPrueba, setSelectedPrueba] = useState(null);
    const [fases, setFases] = useState([]);
    const [selectedFase, setSelectedFase] = useState(null);
    const [resultados, setResultados] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showPdfMenu, setShowPdfMenu] = useState(false);

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
        const loadData = async () => {
            setLoading(true);
            try {
                // 1. Cargamos las FASES de la prueba (incluyendo sus resultados anidados)
                const data = await FaseService.getByEventoPrueba(selectedPrueba.id);
                setFases(data || []);
                
                // 2. Aplanamos todos los resultados de todas las fases en un solo estado
                const allResults = [];
                (data || []).forEach(f => {
                    if (f.resultados && f.resultados.length > 0) {
                        // Nos aseguramos que cada resultado tenga su faseId para el filtrado
                        f.resultados.forEach(r => {
                            allResults.push({
                                ...r,
                                faseId: f.id // Garantizamos que lo tenga
                            });
                        });
                    }
                });
                setResultados(allResults);

                // Si no hay nada seleccionado, o lo que estaba seleccionado ya no existe, buscamos el default
                const stillExists = data.find(f => f.id === selectedFase?.id);
                if (!selectedFase || !stillExists) {
                    const final = data.find(f => (f.nombreFase || f.NombreFase || '').toUpperCase().includes('FINAL'));
                    setSelectedFase(final || data[0]);
                }

                setError(null);
            } catch (err) {
                console.error("Error al cargar resultados:", err);
                setError("No se pudieron cargar los resultados de esta regata.");
            } finally {
                setLoading(false);
            }
        };

        loadData();

        // SignalR setup
        let signalRJoined = false;
        const setupSignalR = async () => {
            try {
                // Nos unimos al grupo de la PRUEBA completa para recibir updates de todas sus fases
                await signalRServiceInstance.joinEventGroup(selectedPrueba.id);
                signalRJoined = true;
                signalRServiceInstance.onResultUpdated((updatedData) => {
                    const normalized = {
                        ...updatedData,
                        id: updatedData.id || updatedData.Id,
                        posicion: updatedData.posicion || updatedData.Posicion,
                        tiempoOficial: updatedData.tiempoOficial || updatedData.TiempoOficial,
                        faseId: updatedData.faseId || updatedData.FaseId,
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
                    setLastUpdated(new Date());
                });

                signalRServiceInstance.connection.on("RecibirEstructura", () => {
                    console.log("Competition structure changed. Reloading data...");
                    loadData();
                });
            } catch (err) {
                console.warn("SignalR not available, falling back to polling.", err);
            }
        };

        setupSignalR();

        const pollInterval = setInterval(() => {
            if (!signalRJoined) loadData();
        }, 30000);

        return () => {
            clearInterval(pollInterval);
            if (signalRJoined) {
                signalRServiceInstance.leaveEventGroup(selectedPrueba.id).catch(console.error);
                signalRServiceInstance.connection?.off("RecibirResultado");
                signalRServiceInstance.connection?.off("RecibirEstructura");
            }
        };
    }, [selectedPrueba]);

    const handleDownloadPDF = (mode = 'current') => {
        if (!selectedPrueba || !fases.length) {
            console.error("No hay prueba o fases para exportar");
            return;
        }

        try {
            const doc = new jsPDF();
            const MARGIN = 15;
            let currentY = 20;

            // 1. TÍTULO Y CABECERA
            doc.setFontSize(20);
            const eventName = (evento.nombre || evento.Nombre || 'SportTrack Event').toUpperCase();
            doc.text(eventName, MARGIN, currentY);
            currentY += 10;
            
            doc.setFontSize(12);
            doc.text(`${evento.ubicacion || ''} | ${new Date(evento.fecha).toLocaleDateString()}`, MARGIN, currentY);
            currentY += 15;

            // Título de la Prueba
            const cat = selectedPrueba.prueba?.categoria?.nombre || selectedPrueba.prueba?.Categoria?.Nombre || '';
            const bot = selectedPrueba.prueba?.bote?.tipo || selectedPrueba.prueba?.Bote?.Tipo || '';
            const dist = selectedPrueba.prueba?.distancia?.descripcion || selectedPrueba.prueba?.Distancia?.Descripcion || '';
            const sex = selectedPrueba.prueba?.sexo?.nombre || selectedPrueba.prueba?.Sexo?.Nombre || 'Mixto';
            const pruebaName = `${cat} ${bot} ${dist} (${sex})`;
            
            doc.setFontSize(16);
            doc.setTextColor(0, 102, 204);
            doc.text(pruebaName, MARGIN, currentY);
            currentY += 10;

            // 2. FILTRAR FASES SEGÚN EL MODO Y ORDENAR
            let fasesToExport = [];
            if (mode === 'current') {
                fasesToExport = selectedFase ? [selectedFase] : [];
            } else {
                const rawFases = [...fases];
                if (mode === 'series') {
                    fasesToExport = rawFases.filter(f => (f.nombreFase || f.NombreFase || '').toLowerCase().includes('serie'));
                } else if (mode === 'semis') {
                    fasesToExport = rawFases.filter(f => (f.nombreFase || f.NombreFase || '').toLowerCase().includes('semi'));
                } else if (mode === 'finals') {
                    fasesToExport = rawFases.filter(f => (f.nombreFase || f.NombreFase || '').toLowerCase().includes('final'));
                } else {
                    fasesToExport = rawFases;
                }
                
                // Ordenar por EtapaOrden (Series 0, Semis 1, Finales 2) y luego por NumeroFase
                fasesToExport.sort((a, b) => 
                    (a.etapaOrden ?? a.EtapaOrden ?? 0) - (b.etapaOrden ?? b.EtapaOrden ?? 0) || 
                    (a.numeroFase ?? a.NumeroFase ?? 0) - (b.numeroFase ?? b.NumeroFase ?? 0)
                );
            }

            if (fasesToExport.length === 0) {
                alert("No hay fases para el filtro seleccionado");
                return;
            }

            // 3. ITERAR FASES Y GENERAR TABLAS
            let lastY = currentY + 15;
            const PAGE_HEIGHT = doc.internal.pageSize.getHeight();

            fasesToExport.forEach((fase, index) => {
                // Si ya estamos más abajo de la mitad de la hoja y no es la primera fase, saltamos de hoja
                // Esto ayuda a que entren 2 grillas por hoja aproximadamente
                if (index > 0 && lastY > (PAGE_HEIGHT * 0.6)) {
                    doc.addPage();
                    lastY = 20;
                } else if (index > 0) {
                    // Si nos quedamos en la misma hoja, añadimos un espacio extra
                    lastY += 15;
                }
                
                const fNombre = fase.nombreFase || fase.NombreFase || `Fase ${fase.numeroFase || fase.NumeroFase}`;
                const eNombre = fase.etapaNombre || fase.EtapaNombre || '';
                const fTime = formatTime(fase.fechaHoraProgramada || fase.FechaHoraProgramada);

                doc.setFontSize(14);
                doc.setTextColor(50, 50, 50);
                doc.text(`${eNombre} - ${fNombre} (${fTime} hs)`, MARGIN, lastY);

                const phaseResults = resultados.filter(r => (r.faseId || r.FaseId) === fase.id);
                const sortedResults = [...phaseResults].sort((a, b) => {
                    const posA = a.posicion || a.Posicion;
                    const posB = b.posicion || b.Posicion;
                    if (posA && posB) return posA - posB;
                    if (posA) return -1;
                    if (posB) return 1;
                    return (a.carril || a.Carril || 99) - (b.carril || b.Carril || 99);
                });

                const hasResults = sortedResults.some(r => r.tiempoOficial || r.TiempoOficial);
                
                const columns = hasResults 
                    ? ["POS", "CARRIL", "ATLETA / TRIPULACION", "CLUB", "TIEMPO", "DIF."]
                    : ["CARRIL", "ATLETA / TRIPULACION", "CLUB", "PROCEDENCIA"];
                
                const body = sortedResults.map(r => {
                    const pName = r.participanteNombre || r.ParticipanteNombre || '';
                    const cSigla = r.clubSigla || r.ClubSigla || '';
                    const carril = r.carril || r.Carril || '-';

                    if (hasResults) {
                        const pos = r.posicion || r.Posicion;
                        const isLeader = pos === 1;
                        const tOficial = r.tiempoOficial || r.TiempoOficial;
                        const tMs = timeToMs(tOficial);
                        
                        const lider = sortedResults.find(res => (res.posicion || res.Posicion) === 1);
                        const liderT = lider ? (lider.tiempoOficial || lider.TiempoOficial) : null;
                        const liderMs = liderT ? timeToMs(liderT) : null;
                        
                        const diff = (!isLeader && liderMs && tMs) ? formatDiff(tMs - liderMs) : (isLeader ? 'LIDER' : '-');

                        return [
                            pos || '-',
                            carril,
                            pName,
                            cSigla,
                            tOficial?.split('.')[0] || '--:--',
                            diff
                        ];
                    } else {
                        return [
                            carril,
                            pName,
                            cSigla,
                            r.clubNombre || r.ClubNombre || ''
                        ];
                    }
                });

                autoTable(doc, {
                    startY: lastY + 5,
                    head: [columns],
                    body: body,
                    theme: 'striped',
                    headStyles: { fillColor: [0, 102, 204] },
                    margin: { left: MARGIN, right: MARGIN },
                    styles: { fontSize: 9 }
                });

                // Actualizamos lastY para la siguiente tabla basándonos en dónde terminó la actual
                lastY = doc.lastAutoTable.finalY;
            });

            const fileName = `${pruebaName.replace(/ /g, '_')}_${mode}.pdf`;
            doc.save(fileName);
        } catch (err) {
            console.error("Error generating PDF:", err);
            alert("Error al generar el PDF. Revisa los datos de la fase.");
        }
    };

    if (loading) return <div className="results-loading"><div className="loader"></div><p>Sincronizando con el canal oficial...</p></div>;
    if (!evento) return <div className="results-error">Evento no encontrado</div>;

    const filteredPruebas = pruebas.filter(p => {
        const name = `${p.prueba?.categoria?.nombre} ${p.prueba?.bote?.tipo} ${p.prueba?.distancia?.descripcion}`.toLowerCase();
        return name.includes(searchTerm.toLowerCase());
    });

    return (
        <div className="live-results-page fade-in">
            <div className="results-bg-glow"></div>
            
            <header className="results-header container">
                <div className="top-nav">
                    <Link to="/" className="back-link">
                        <span className="icon">←</span> Ver todos los eventos
                    </Link>
                    {lastUpdated && (
                        <div className="sync-status">
                            Última actualización: {lastUpdated.toLocaleTimeString()}
                        </div>
                    )}
                </div>
                
                <div className="header-main">
                    <div className="event-info">
                        {(() => {
                            const est = (selectedPrueba?.estado || selectedPrueba?.Estado || '').toUpperCase();
                            let badgeLabel = 'EN VIVO';
                            let badgeClass = 'live-badge status-green';
                            let dotColor = '#10b981'; // default green

                            if (est === 'FINALIZADO') {
                                badgeLabel = 'RESULTADOS FINALES';
                                dotColor = '#eab308'; // Oro para la medalla
                                badgeClass = 'live-badge status-grey';
                            } else if (est === 'CANCELADO') {
                                badgeLabel = 'RECESO / CANCELADO';
                                dotColor = '#ef4444'; // rojo
                                badgeClass = 'live-badge status-red';
                            }

                            return (
                                <div className={badgeClass}>
                                    <span className="dot" style={{ backgroundColor: dotColor }}></span> {badgeLabel}
                                </div>
                            );
                        })()}
                        <h1>{evento.nombre}</h1>
                        <div className="event-meta">
                            <span>📍 {evento.ubicacion}</span>
                            <span className="sep">•</span>
                            <span>📅 {new Date(evento.fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}</span>
                        </div>
                    </div>
                </div>
            </header>

            <main className="results-container container">
                {/* Selector de Pruebas */}
                <aside className="pruebas-sidebar glass-effect">
                    <div className="sidebar-header">
                        <h3>Cronograma</h3>
                        <div className="search-box">
                            <input 
                                type="text" 
                                placeholder="Buscar categoría..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="pruebas-v-list">
                        {filteredPruebas.map(p => (
                            <button 
                                key={p.id} 
                                className={`prueba-v-item ${selectedPrueba?.id === p.id ? 'active' : ''}`}
                                style={{ opacity: (p.estado || p.Estado || '').toUpperCase() === 'FINALIZADO' ? 0.6 : 1 }}
                                onClick={() => setSelectedPrueba(p)}
                            >
                                <div className="p-header">
                                    <div className="status-dot-container" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        {(() => {
                                            const est = (p.estado || p.Estado || '').toUpperCase();
                                            let dotColor = 'transparent';
                                            let isPulsing = false;
                                            let isMedal = false;

                                            if (est === 'ENCURSO' || est === 'PROGRAMADA' || est === '') {
                                                dotColor = '#10b981';
                                                isPulsing = true;
                                            } else if (est === 'FINALIZADO') {
                                                isMedal = true;
                                            } else if (est === 'CANCELADO') {
                                                dotColor = '#ef4444';
                                            }
                                            
                                            if (isMedal) return <span style={{ fontSize: '0.9rem', marginRight: '2px' }}>🥇</span>;

                                            return dotColor !== 'transparent' && (
                                                <span 
                                                    className={`status-dot ${isPulsing ? 'pulse-anim' : ''}`} 
                                                    style={{ 
                                                        width: '8px', 
                                                        height: '8px', 
                                                        borderRadius: '50%', 
                                                        backgroundColor: dotColor,
                                                        boxShadow: `0 0 10px ${dotColor}66`
                                                    }}
                                                ></span>
                                            );
                                        })()}
                                        <span className="p-time">{formatDate(p.fechaHora)} - {formatTime(p.fechaHora)}</span>
                                    </div>
                                    {p.cantidadInscritos > 0 && <span className="p-badge">{p.cantidadInscritos} botes</span>}
                                </div>
                                <span className="p-name">
                                    {p.prueba?.categoria?.nombre} {p.prueba?.bote?.tipo} {p.prueba?.distancia?.descripcion}
                                </span>
                            </button>
                        ))}
                    </div>
                </aside>

                {/* Vista de Resultados con Tabs */}
                <section className="results-main">
                    {selectedPrueba ? (
                        <div className="results-content glass-effect">
                            <div className="results-content-header">
                                <div className="title-area">
                                    <h2>
                                        {selectedPrueba.prueba?.categoria?.nombre} {selectedPrueba.prueba?.bote?.tipo} {selectedPrueba.prueba?.distancia?.descripcion}
                                    </h2>
                                    <div className="gender-tag">
                                        {selectedPrueba.prueba?.sexo?.nombre || 'Mixto'}
                                    </div>
                                </div>
                                <div className="status-indicator" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <div className="pdf-dropdown-container">
                                        <button 
                                            className="btn-pdf-main" 
                                            onClick={() => setShowPdfMenu(!showPdfMenu)}
                                        >
                                            📥 Descargar PDF
                                        </button>
                                        
                                        {showPdfMenu && (
                                            <>
                                                <div className="pdf-menu-backdrop" onClick={() => setShowPdfMenu(false)}></div>
                                                <div className="pdf-dropdown-menu">
                                                    <div className="dropdown-item" onClick={() => { setShowPdfMenu(false); setTimeout(() => handleDownloadPDF('current'), 100); }}>Fase Actual</div>
                                                    <div className="dropdown-item" onClick={() => { setShowPdfMenu(false); setTimeout(() => handleDownloadPDF('series'), 100); }}>Todas las Series</div>
                                                    <div className="dropdown-item" onClick={() => { setShowPdfMenu(false); setTimeout(() => handleDownloadPDF('semis'), 100); }}>Todas las Semis</div>
                                                    <div className="dropdown-item" onClick={() => { setShowPdfMenu(false); setTimeout(() => handleDownloadPDF('finals'), 100); }}>Todas las Finales</div>
                                                    <div className="dropdown-divider"></div>
                                                    <div className="dropdown-item" onClick={() => { setShowPdfMenu(false); setTimeout(() => handleDownloadPDF('full'), 100); }}>Prueba Completa</div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    {(() => {
                                        // Verificar si la prueba está terminada
                                        // Se considera terminada si existen fases de tipo Final y todas tienen resultados con tiempo
                                        const finalFases = fases.filter(f => (f.etapaNombre || f.EtapaNombre || '').toUpperCase().includes('FINAL'));
                                        const allFinalsDone = finalFases.length > 0 && finalFases.every(f => {
                                            const res = resultados.filter(r => (r.faseId || r.FaseId) === f.id);
                                            return res.length > 0 && res.every(r => r.tiempoOficial || r.TiempoOficial);
                                        });

                                        return allFinalsDone ? (
                                            <span className="status-label" style={{ color: '#3b82f6', background: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.2)' }}>
                                                PRUEBA FINALIZADA
                                            </span>
                                        ) : (
                                            <span className="status-label">PRUEBA EN CURSO</span>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* Selector de Fases Agrupado */}
                            {fases.length > 0 && (
                                <div className="phase-selector-container-v2" style={{ marginBottom: '2rem' }}>
                                    {Object.entries(
                                        fases.reduce((acc, f) => {
                                            const key = f.etapaNombre || f.EtapaNombre || 'Etapa';
                                            if (!acc[key]) acc[key] = [];
                                            acc[key].push(f);
                                            return acc;
                                        }, {})
                                    ).map(([etapaName, etapaFases]) => (
                                        <div key={etapaName} className="etapa-group" style={{ marginBottom: '1rem' }}>
                                            <div className="etapa-label" style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                                                {etapaName}
                                            </div>
                                            <div className="phase-tabs" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                {etapaFases.map(f => (
                                                    <button 
                                                        key={f.id}
                                                        className={`phase-tab ${selectedFase?.id === f.id ? 'active' : ''}`}
                                                        style={{ 
                                                            padding: '0.6rem 1.2rem',
                                                            borderRadius: '8px',
                                                            border: '1px solid rgba(255,255,255,0.1)',
                                                            background: selectedFase?.id === f.id ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)',
                                                            color: 'white',
                                                            cursor: 'pointer',
                                                            fontSize: '0.9rem',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        onClick={() => setSelectedFase(f)}
                                                    >
                                                        {f.nombreFase || f.NombreFase || `Fase ${f.numeroFase || f.NumeroFase}`}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {selectedFase ? (
                                <div className="table-responsive">
                                    <div className="fase-header" style={{ marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h3 style={{ margin: 0, color: 'var(--color-primary)' }}>
                                            {selectedFase.nombreFase || selectedFase.NombreFase}
                                        </h3>
                                        <div className="fase-time" style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: '600' }}>
                                            ⏰ Programada: {formatTime(selectedFase.fechaHoraProgramada || selectedFase.FechaHoraProgramada)} hs
                                        </div>
                                    </div>
                                    <table className="results-table">
                                        <thead>
                                            <tr>
                                                <th>Pos</th>
                                                <th>Carril</th>
                                                <th>Atleta / Tripulación</th>
                                                <th>Club</th>
                                                <th>Tiempo</th>
                                                <th>Dif.</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(() => {
                                                const currentResults = resultados.filter(r => (r.faseId || r.FaseId) === selectedFase.id);
                                                const sorted = [...currentResults].sort((a,b) => {
                                                    const posA = a.posicion || a.Posicion;
                                                    const posB = b.posicion || b.Posicion;
                                                    if (posA && posB) return posA - posB;
                                                    if (posA) return -1;
                                                    if (posB) return 1;
                                                    return (a.carril || a.Carril || 99) - (b.carril || b.Carril || 99);
                                                });
                                                
                                                const lider = sorted.find(r => (r.posicion || r.Posicion) === 1);
                                                const liderMs = lider ? timeToMs(lider.tiempoOficial || lider.TiempoOficial) : null;

                                                return sorted.length > 0 ? sorted.map((r, i) => {
                                                    const pos = r.posicion || r.Posicion;
                                                    const isLeader = pos === 1;
                                                    const tMs = timeToMs(r.tiempoOficial || r.TiempoOficial);
                                                    const diff = (!isLeader && liderMs && tMs) ? tMs - liderMs : null;

                                                    return (
                                                        <tr key={r.id || r.Id || i} className={`pos-row pos-${pos}`}>
                                                            <td className="pos-cell">
                                                                <div className="pos-number">
                                                                    {pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : pos || '-'}
                                                                </div>
                                                            </td>
                                                            <td className="carril-cell">{r.carril || r.Carril || '-'}</td>
                                                            <td>
                                                                <div className="athlete-info">
                                                                    <span className="name">{r.participanteNombre || r.ParticipanteNombre}</span>
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <div className="club-info" title={r.clubNombre || r.ClubNombre}>
                                                                    <span className="club-badge">{r.clubSigla || r.ClubSigla}</span>
                                                                </div>
                                                            </td>
                                                            <td className="time-cell">{(r.tiempoOficial || r.TiempoOficial)?.split('.')[0] || '--:--'}</td>
                                                            <td className="diff-cell">
                                                                {isLeader ? <span className="leader-label">LIDER</span> : formatDiff(diff)}
                                                            </td>
                                                        </tr>
                                                    );
                                                }) : (
                                                    <tr>
                                                        <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: '#475569' }}>
                                                            No hay resultados cargados para esta fase.
                                                        </td>
                                                    </tr>
                                                );
                                            })()}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="empty-state" style={{ padding: '5rem' }}>
                                    <p>Seleccioná una fase para ver los resultados.</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="no-prueba-selected glass-effect">
                            <div className="placeholder-content">
                                <h3>Seleccioná una regata</h3>
                                <p>Elegí una categoría del menú lateral para ver el cronograma y resultados históricos.</p>
                            </div>
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
};

export default LiveResults;
