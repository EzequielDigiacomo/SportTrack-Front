import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import EventoService from '../../services/EventoService';
import { PruebaService } from '../../services/ConfigService';
import ResultadoService from '../../services/ResultadoService';
import FaseService from '../../services/FaseService';
import signalRServiceInstance from '../../services/SignalRService';
import timingSignalRService from '../../services/TimingSignalRService';
import PdfExportService from '../../services/PdfExportService';
import ThemeToggle from '../../components/Common/ThemeToggle';
import { MapPin, Calendar, ArrowLeft, Download, Trophy, Clock, Search } from 'lucide-react';
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

const replaceKayakNames = (name) => {
    if (!name) return "";
    return name.replace(/Kayak Individual/gi, "K1")
        .replace(/Kayak Doble/gi, "K2")
        .replace(/Kayak Cuádruple/gi, "K4")
        .replace(/Canoa Individual/gi, "C1")
        .replace(/Canoa Doble/gi, "C2");
};

const SEXO_NAMES = { 1: 'Masculino', 2: 'Femenino', 3: 'Mixto' };

const getSexName = (p) => {
    if (!p) return 'Mixto';
    // 1. Check inside underlying Prueba object (if p is EventoPrueba)
    const innerPrueba = p.prueba || p;
    const sId = innerPrueba.sexoId || innerPrueba.sexo?.id;
    if (sId && SEXO_NAMES[sId]) {
        return SEXO_NAMES[sId];
    }
    // Fallbacks
    return innerPrueba.sexo?.nombre || innerPrueba.sexoNombre || p.sexoNombre || 'Mixto';
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
    const [pruebaNumbersMap, setPruebaNumbersMap] = useState({});
    const [faseNumberMap, setFaseNumberMap] = useState({});
    const [allFases, setAllFases] = useState([]);
    const [refreshResultsCounter, setRefreshResultsCounter] = useState(0);

    const reloadPhasesOnly = async () => {
        try {
            const allFasesData = await FaseService.getByEvento(id);
            const sortedAllFases = [...allFasesData].sort((a, b) => {
                const timeA = new Date(a.fechaHoraProgramada || a.FechaHoraProgramada).getTime();
                const timeB = new Date(b.fechaHoraProgramada || b.FechaHoraProgramada).getTime();
                return timeA - timeB;
            });
            setAllFases(sortedAllFases);

            // Update selectedFase in-place to reflect its new status/data
            if (selectedFase) {
                const updatedSelected = sortedAllFases.find(f => f.id === selectedFase.id);
                if (updatedSelected) {
                    setSelectedFase(updatedSelected);
                }
            }
        } catch (e) {
            console.error("Error reloading phases:", e);
        }
    };

    useEffect(() => {
        // Connect to the timing hub globally
        timingSignalRService.connect().catch(console.error);

        // Listen for any race starting, officialized, in review, or reset globally
        timingSignalRService.onGlobalRaceStarted(({ faseId }) => {
            console.log(`[SignalR] Race started globally: ${faseId}`);
            reloadPhasesOnly();
            if (selectedFase && selectedFase.id === faseId) {
                setRefreshResultsCounter(prev => prev + 1);
            }
        });

        timingSignalRService.onGlobalRaceOfficialized((faseId) => {
            console.log(`[SignalR] Race officialized globally: ${faseId}`);
            reloadPhasesOnly();
            if (selectedFase && selectedFase.id === faseId) {
                setRefreshResultsCounter(prev => prev + 1);
            }
        });

        timingSignalRService.onGlobalRaceInReview((fase) => {
            const fid = fase.id || fase.Id;
            console.log(`[SignalR] Race in review globally: ${fid}`);
            reloadPhasesOnly();
            if (selectedFase && selectedFase.id === fid) {
                setRefreshResultsCounter(prev => prev + 1);
            }
        });

        timingSignalRService.onRaceReset((faseId) => {
            console.log(`[SignalR] Race reset: ${faseId}`);
            reloadPhasesOnly();
            if (selectedFase && selectedFase.id === faseId) {
                setRefreshResultsCounter(prev => prev + 1);
            }
        });

        timingSignalRService.onGlobalResultStatusUpdated((resultadoId, status) => {
            console.log(`[SignalR] Result status updated globally: ${resultadoId} -> ${status}`);
            setRefreshResultsCounter(prev => prev + 1);
        });

        return () => {
            // Shared singleton clean up is not strictly necessary but keeps memory safe
        };
    }, [id, selectedFase]);

    useEffect(() => {
        const loadInitial = async () => {
            try {
                const ev = await EventoService.getById(id);
                setEvento(ev);
                const prs = await PruebaService.getByEvento(id);

                // Fetch all phases to get global sequential race numbers (#1, #2, #3...)
                const allFasesData = await FaseService.getByEvento(id);

                // Sort by date/time to ensure #1 is the first race of the event
                const sortedAllFases = [...allFasesData].sort((a, b) => {
                    const timeA = new Date(a.fechaHoraProgramada || a.FechaHoraProgramada).getTime();
                    const timeB = new Date(b.fechaHoraProgramada || b.FechaHoraProgramada).getTime();
                    return timeA - timeB;
                });

                const sidebarMapping = {};
                const globalFaseNumberMap = {};

                sortedAllFases.forEach((f, idx) => {
                    const raceNum = idx + 1;
                    const pid = f.eventoPruebaId || f.EventoPruebaId;
                    const fid = f.id || f.Id;

                    if (!sidebarMapping[pid]) sidebarMapping[pid] = [];
                    sidebarMapping[pid].push(raceNum);

                    globalFaseNumberMap[fid] = raceNum;
                });

                setPruebaNumbersMap(sidebarMapping);
                setFaseNumberMap(globalFaseNumberMap);
                setAllFases(sortedAllFases);

                // Sort prs based on the minimum race number in sidebarMapping
                const sortedPrs = [...prs].sort((a, b) => {
                    const aNums = sidebarMapping[a.id] || [];
                    const bNums = sidebarMapping[b.id] || [];
                    const minA = aNums.length > 0 ? Math.min(...aNums) : Infinity;
                    const minB = bNums.length > 0 ? Math.min(...bNums) : Infinity;

                    if (minA !== minB) {
                        return minA - minB;
                    }

                    // Fallback to scheduled time if min race number is same
                    const timeA = new Date(a.fechaHora || a.FechaHora || 0).getTime();
                    const timeB = new Date(b.fechaHora || b.FechaHora || 0).getTime();
                    return timeA - timeB;
                });

                setPruebas(sortedPrs);

                if (sortedAllFases.length > 0) {
                    const firstFase = sortedAllFases[0];
                    setSelectedFase(firstFase);

                    const parentPrueba = prs.find(p => p.id === (firstFase.eventoPruebaId || firstFase.EventoPruebaId));
                    if (parentPrueba) {
                        setSelectedPrueba(parentPrueba);
                    }
                }
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
            } catch (err) {
                console.error("Error al cargar resultados:", err);
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
                        carril: updatedData.carril || updatedData.Carril,
                        estado: updatedData.estado || updatedData.Estado || updatedData.estadoCanto || updatedData.EstadoCanto
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
    }, [selectedPrueba, refreshResultsCounter]);

    const handleDownloadPDF = (mode = 'current') => {
        if (!selectedPrueba || !fases.length) return;

        try {
            const eventoNombre = evento?.nombre || evento?.Nombre || 'Evento';
            const pruebaNombre = [
                selectedPrueba.prueba?.categoria?.nombre,
                selectedPrueba.prueba?.bote?.tipo || selectedPrueba.prueba?.bote?.nombre,
                selectedPrueba.prueba?.distancia?.descripcion || selectedPrueba.prueba?.distancia?.metros + 'm',
                getSexName(selectedPrueba),
            ].filter(Boolean).join(' - ');

            // Enrich each fase with the resultados from local state (real-time)
            const enrichFase = (fase) => ({
                ...fase,
                nombreFase: fase.nombreFase || fase.NombreFase || `Fase ${fase.numeroFase}`,
                fechaHoraProgramada: fase.fechaHoraProgramada || fase.FechaHoraProgramada,
                resultados: resultados
                    .filter(r => (r.faseId || r.FaseId) === fase.id)
                    .map(r => ({
                        posicion: r.posicion || r.Posicion,
                        carril: r.carril || r.Carril,
                        participanteNombre: r.participanteNombre || r.ParticipanteNombre,
                        clubNombre: r.clubNombre || r.ClubNombre,
                        clubSigla: r.clubSigla || r.ClubSigla,
                        tiempoOficial: r.tiempoOficial || r.TiempoOficial,
                        tripulantes: r.tripulantes || [],
                    })),
            });

            // Filter fases by mode
            let raw = [...fases];
            let fasesToExport = [];
            if (mode === 'current') {
                fasesToExport = selectedFase ? [selectedFase] : [];
            } else if (mode === 'series') {
                fasesToExport = raw.filter(f => (f.nombreFase || f.NombreFase || '').toLowerCase().includes('serie'));
            } else if (mode === 'semis') {
                fasesToExport = raw.filter(f => (f.nombreFase || f.NombreFase || '').toLowerCase().includes('semi'));
            } else if (mode === 'finals') {
                fasesToExport = raw.filter(f => (f.nombreFase || f.NombreFase || '').toLowerCase().includes('final'));
            } else {
                fasesToExport = raw;
            }

            fasesToExport.sort((a, b) =>
                (a.etapaOrden ?? a.EtapaOrden ?? 0) - (b.etapaOrden ?? b.EtapaOrden ?? 0) ||
                (a.numeroFase ?? a.NumeroFase ?? 0) - (b.numeroFase ?? b.NumeroFase ?? 0)
            );

            if (!fasesToExport.length) { alert('No hay fases para el filtro seleccionado'); return; }

            const enriched = fasesToExport.map(enrichFase);
            PdfExportService.exportGrupo(enriched, eventoNombre, pruebaNombre, mode === 'current' ? enriched[0]?.nombreFase : mode);
        } catch (err) {
            console.error('Error generating PDF:', err);
            alert('Error al generar el PDF.');
        }
    };

    if (loading) return <div className="results-loading"><div className="loader"></div><p>Sincronizando con el canal oficial...</p></div>;
    if (!evento) return <div className="results-error">Evento no encontrado</div>;
    const filteredFases = allFases.filter(f => {
        const p = f.prueba || {};
        const rawName = `${f.nombreFase} ${p.prueba?.categoria?.nombre || p.categoria?.nombre || ''} ${p.prueba?.bote?.tipo || p.bote?.tipo || ''} ${p.prueba?.distancia?.descripcion || p.distancia?.descripcion || ''} ${getSexName(p)}`;
        const name = replaceKayakNames(rawName).toLowerCase();
        return name.includes(searchTerm.toLowerCase());
    });

    // Buscar la prueba activa en curso
    const activeRace = allFases.find(f => {
        const est = (f.estado || f.Estado || '').toUpperCase();
        return est === 'ENCURSO' || est === 'EN CARRERA';
    });

    // Buscar la próxima prueba programada (que no esté en curso ni finalizada/cancelada)
    const nextRace = allFases.find(f => {
        const est = (f.estado || f.Estado || '').toUpperCase();
        return est !== 'ENCURSO' && est !== 'EN CARRERA' && est !== 'FINALIZADA' && est !== 'FINALIZADO' && est !== 'CANCELADO' && est !== 'CANCELADA';
    });

    // Validar si el evento completo finalizó
    const allFinished = allFases.length > 0 && allFases.every(f => {
        const est = (f.estado || f.Estado || '').toUpperCase();
        return est === 'FINALIZADA' || est === 'FINALIZADO' || est === 'CANCELADO' || est === 'CANCELADA';
    });

    const getRaceBannerLabel = (f) => {
        if (!f) return null;
        const p = f.prueba || {};
        const catName = p.prueba?.categoria?.nombre || p.categoria?.nombre || '';
        const botName = p.prueba?.bote?.tipo || p.bote?.tipo || p.prueba?.bote?.nombre || p.bote?.nombre || '';
        const distName = p.prueba?.distancia?.descripcion || p.distancia?.descripcion || (p.prueba?.distancia?.metros ? `${p.prueba.distancia.metros}m` : '');
        const sexName = getSexName(p);
        const details = replaceKayakNames(`${catName} ${botName} ${distName} - ${sexName}`);
        const number = (faseNumberMap && faseNumberMap[f.id]) || f.numeroPrueba || f.NumeroPrueba || '';
        return {
            number,
            faseName: f.nombreFase || f.NombreFase || `Fase ${f.numeroFase}`,
            details
        };
    };

    const activeBanner = getRaceBannerLabel(activeRace);
    const nextBanner = getRaceBannerLabel(nextRace);

    return (
        <div className="live-results-page fade-in">
            <div className="results-bg-glow"></div>

            <header className="results-header container">
                <div className="top-nav">
                    <Link to="/" className="back-link">
                        <ArrowLeft size={16} style={{ marginRight: '8px' }} /> Ver todos los eventos
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
                            <span><MapPin size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> {evento.ubicacion}</span>
                            <span className="sep">•</span>
                            <span><Calendar size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> {new Date(evento.fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}</span>
                        </div>
                    </div>

                    {/* LIVE STATUS BOARD BANNERS */}
                    {activeBanner ? (
                        <div className="live-status-board running fade-in">
                            <div className="board-header">
                                <span className="live-pulse-dot"></span>
                                <span className="board-title">Se está corriendo</span>
                            </div>
                            <div className="board-content">
                                <div className="board-race-num">#{activeBanner.number}</div>
                                <div className="board-race-details">
                                    <div className="board-race-fase">{activeBanner.faseName}</div>
                                    <div className="board-race-cat">{activeBanner.details}</div>
                                </div>
                            </div>
                        </div>
                    ) : nextBanner ? (
                        <div className="live-status-board scheduled fade-in">
                            <div className="board-header">
                                <Clock size={12} className="board-icon-grey" />
                                <span className="board-title">Continúa</span>
                            </div>
                            <div className="board-content">
                                <div className="board-race-num upcoming">#{nextBanner.number}</div>
                                <div className="board-race-details">
                                    <div className="board-race-fase upcoming">{nextBanner.faseName}</div>
                                    <div className="board-race-cat">{nextBanner.details}</div>
                                </div>
                            </div>
                        </div>
                    ) : allFinished ? (
                        <div className="live-status-board finished fade-in">
                            <div className="board-header">
                                <Trophy size={12} className="board-icon-gold" />
                                <span className="board-title">Competencia Finalizada</span>
                            </div>
                            <div className="board-content">
                                <div className="board-finished-msg">Todas las regatas han concluido.</div>
                            </div>
                        </div>
                    ) : null}
                </div>
            </header>

            <main className="results-container container">
                {/* Selector de Pruebas */}
                <aside className="pruebas-sidebar glass-effect">
                    <div className="sidebar-header">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <h3 style={{ margin: 0 }}>Cronograma</h3>
                            <ThemeToggle />
                        </div>
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
                        {filteredFases.map(f => {
                            const p = f.prueba || {};
                            const raceNum = faseNumberMap[f.id] || f.numeroPrueba || f.NumeroPrueba || f.id;
                            const isSelected = selectedFase?.id === f.id;
                            const catName = p.prueba?.categoria?.nombre || p.categoria?.nombre || '';
                            const botName = p.prueba?.bote?.tipo || p.bote?.tipo || p.prueba?.bote?.nombre || p.bote?.nombre || '';
                            const distName = p.prueba?.distancia?.descripcion || p.distancia?.descripcion || (p.prueba?.distancia?.metros ? `${p.prueba.distancia.metros}m` : '');
                            const sexName = getSexName(p);
                            const label = replaceKayakNames(`${catName} ${botName} ${distName} - ${sexName}`);
                            return (
                                <button 
                                    key={f.id} 
                                    className={`prueba-v-item ${isSelected ? 'active' : ''}`}
                                    style={{ opacity: (f.estado || f.Estado || '').toUpperCase().startsWith('FINAL') ? 0.8 : 1 }}
                                    onClick={() => {
                                        setSelectedFase(f);
                                        const parentPrueba = pruebas.find(pr => pr.id === (f.eventoPruebaId || f.EventoPruebaId));
                                        if (parentPrueba) {
                                            setSelectedPrueba(parentPrueba);
                                        }
                                    }}
                                >
                                    <div className="p-header">
                                        <div className="status-dot-container" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <span className="p-time">{formatDate(f.fechaHoraProgramada)} - {formatTime(f.fechaHoraProgramada)}</span>
                                        </div>
                                        <span className="p-badge" style={{ background: 'var(--color-primary-light)', color: 'white', fontWeight: 'bold' }}>#{raceNum}</span>
                                    </div>
                                    <span className="p-name" style={{ fontWeight: 'bold', color: 'white' }}>
                                        {f.nombreFase}
                                    </span>
                                    <span className="p-name" style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)', marginTop: '2px' }}>
                                        {label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </aside>

                {/* Vista de Resultados con Tabs */}
                <section className="results-main">
                    {selectedPrueba ? (
                        <div className="results-content glass-effect">
                            <div className="results-content-header">
                                <div className="title-area">
                                    <h2>
                                        {replaceKayakNames(`${selectedPrueba.prueba?.categoria?.nombre} ${selectedPrueba.prueba?.bote?.tipo} ${selectedPrueba.prueba?.distancia?.descripcion}`)}
                                    </h2>
                                    <div className="gender-tag">
                                        {getSexName(selectedPrueba)}
                                    </div>
                                </div>
                                <div className="status-indicator" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <div className="pdf-dropdown-container">
                                        <button
                                            className="btn-pdf-main"
                                            onClick={() => setShowPdfMenu(!showPdfMenu)}
                                        >
                                            <Download size={16} style={{ marginRight: '8px' }} /> Descargar PDF
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
                                        const est = (selectedFase?.estado || selectedFase?.Estado || '').toUpperCase();
                                        if (est === 'ENCURSO' || est === 'EN CARRERA') {
                                            return (
                                                <span className="status-label" style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
                                                    PRUEBA EN CURSO
                                                </span>
                                            );
                                        } else if (est === 'FINALIZADA' || est === 'FINALIZADO') {
                                            return (
                                                <span className="status-label" style={{ color: '#3b82f6', background: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.2)' }}>
                                                    FINALIZADA
                                                </span>
                                            );
                                        } else if (est === 'CANCELADO' || est === 'CANCELADA') {
                                            return (
                                                <span className="status-label" style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                                                    CANCELADA
                                                </span>
                                            );
                                        } else {
                                            return (
                                                <span className="status-label" style={{ color: '#94a3b8', background: 'rgba(148, 163, 184, 0.1)', borderColor: 'rgba(148, 163, 184, 0.2)' }}>
                                                    PROGRAMADA
                                                </span>
                                            );
                                        }
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
                                                            transition: 'all 0.2s',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '8px'
                                                        }}
                                                        onClick={() => setSelectedFase(f)}
                                                    >
                                                        <span style={{ opacity: 0.6, fontSize: '0.8rem', fontWeight: 'bold' }}>#{faseNumberMap[f.id] || f.numeroPrueba || f.NumeroPrueba || f.id}</span>
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
                                        <div className="fase-time" style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Clock size={14} /> Programada: {formatTime(selectedFase.fechaHoraProgramada || selectedFase.FechaHoraProgramada)} hs
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
                                                const sorted = [...currentResults].sort((a, b) => {
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
                                                                    {pos === 1 ? <Trophy size={16} style={{ color: '#eab308' }} /> : pos === 2 ? <Trophy size={16} style={{ color: '#94a3b8' }} /> : pos === 3 ? <Trophy size={16} style={{ color: '#cd7f32' }} /> : pos || '-'}
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
                                                            <td className="time-cell">
                                                                {(() => {
                                                                    const statusStr = (r.estado || r.Estado || r.estadoCanto || r.EstadoCanto || '').toUpperCase();
                                                                    const isSpecialStatus = ['DNS', 'DNF', 'DSQ', 'DESCALIFICADO'].includes(statusStr);

                                                                    if (isSpecialStatus) {
                                                                        return (
                                                                            <span style={{
                                                                                display: 'inline-block',
                                                                                padding: '4px 10px',
                                                                                borderRadius: '6px',
                                                                                fontWeight: '800',
                                                                                fontSize: '0.85rem',
                                                                                textTransform: 'uppercase',
                                                                                textAlign: 'center',
                                                                                background: statusStr === 'DNS'
                                                                                    ? 'rgba(31, 41, 55, 0.6)'
                                                                                    : statusStr === 'DNF'
                                                                                        ? 'rgba(146, 64, 14, 0.4)'
                                                                                        : 'rgba(153, 27, 27, 0.4)',
                                                                                color: statusStr === 'DNS'
                                                                                    ? '#f3f4f6'
                                                                                    : statusStr === 'DNF'
                                                                                        ? '#fef3c7'
                                                                                        : '#fee2e2',
                                                                                border: `1px solid ${statusStr === 'DNS'
                                                                                    ? 'rgba(255, 255, 255, 0.15)'
                                                                                    : statusStr === 'DNF'
                                                                                        ? 'rgba(251, 191, 36, 0.25)'
                                                                                        : 'rgba(248, 113, 113, 0.25)'
                                                                                    }`
                                                                            }}>
                                                                                {statusStr === 'DESCALIFICADO' ? 'DSQ' : statusStr}
                                                                            </span>
                                                                        );
                                                                    }

                                                                    return (r.tiempoOficial || r.TiempoOficial)?.split('.')[0] || '--:--';
                                                                })()}
                                                            </td>
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
