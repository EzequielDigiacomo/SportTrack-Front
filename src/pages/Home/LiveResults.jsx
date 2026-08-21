import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import EventoService from '../../services/EventoService';
import { PruebaService } from '../../services/ConfigService';
import ResultadoService from '../../services/ResultadoService';
import FaseService from '../../services/FaseService';
import timingSignalRService from '../../services/TimingSignalRService';
import PdfExportService from '../../services/PdfExportService';
import ThemeToggle from '../../components/Common/ThemeToggle';
import { MapPin, Calendar, ArrowLeft, Download, Trophy, Clock, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import './LiveResults.css';
import { formatRaceTime, timeToMs } from '../../utils/raceTimeUtils';
import { resolveIsMaratonEvent } from '../../utils/pruebaLabelUtils';
import { computePositionsForPhase } from '../../utils/resultadosHelpers';
import {
    groupMaratonResultadosByClasificacion,
    loadMaratonLargadaInscriptos,
} from '../../components/SharedSections/maraton/maratonStartListUtils';

// Formatea una diferencia en ms como "+Xs" o "+m:ss"
const formatDiff = (diffMs) => {
    if (diffMs === null || diffMs <= 0) return '-';
    const totalSec = diffMs / 1000;
    if (totalSec < 60) return `+${totalSec.toFixed(2)}s`;
    const m = Math.floor(totalSec / 60);
    const s = (totalSec % 60).toFixed(2).padStart(5, '0');
    return `+${m}:${s}`;
};

const getFaseMeta = (f) => {
    const p = f?.prueba || {};
    const catName = p.prueba?.categoria?.nombre || p.categoria?.nombre || '';
    const botRaw = p.prueba?.bote?.tipo || p.bote?.tipo || p.prueba?.bote?.nombre || p.bote?.nombre || '';
    const botName = replaceKayakNames(botRaw).trim();
    const distName = p.prueba?.distancia?.descripcion
        || p.distancia?.descripcion
        || (p.prueba?.distancia?.metros ? `${p.prueba.distancia.metros}m` : '')
        || '';
    const sexName = getSexName(p);
    const etapa = f?.nombreFase || f?.NombreFase || f?.etapaNombre || f?.EtapaNombre || '';
    return { catName, botName, distName, sexName, etapa };
};

const uniqueSorted = (values) => [...new Set(values.filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'es', { sensitivity: 'base', numeric: true })
);

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

const getSoloApellido = (nombreCompleto) => {
    if (!nombreCompleto) return "-";
    const parts = nombreCompleto.trim().split(' ');
    return parts[parts.length - 1];
};

const isBoteK4 = (fase) => {
    const p = fase?.prueba?.prueba || fase?.prueba || fase;
    if (!p) return false;
    const bote = p.bote;
    if (!bote) return false;
    if (bote.id === 3 || bote.id === 6) return true; // K4 or C4
    const name = bote.nombre || '';
    return name.toUpperCase().includes('4');
};

const LiveResults = () => {
    const { id } = useParams();
    const { addToast } = useToast();
    const [evento, setEvento] = useState(null);
    const [pruebas, setPruebas] = useState([]);
    const [selectedPrueba, setSelectedPrueba] = useState(null);
    const [fases, setFases] = useState([]);
    const [selectedFase, setSelectedFase] = useState(null);
    const [resultados, setResultados] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [filterCategoria, setFilterCategoria] = useState('');
    const [filterBote, setFilterBote] = useState('');
    const [filterDistancia, setFilterDistancia] = useState('');
    const [filterSexo, setFilterSexo] = useState('');
    const [filterEtapa, setFilterEtapa] = useState('');
    const [showPdfMenu, setShowPdfMenu] = useState(false);
    const [pruebaNumbersMap, setPruebaNumbersMap] = useState({});
    const [faseNumberMap, setFaseNumberMap] = useState({});
    const [allFases, setAllFases] = useState([]);
    const [refreshResultsCounter, setRefreshResultsCounter] = useState(0);
    const [startIndex, setStartIndex] = useState(0);
    const [liveRealtimeEnabled, setLiveRealtimeEnabled] = useState(true);
    const [maratonInscripcionEpMap, setMaratonInscripcionEpMap] = useState(null);

    const isMaratonEvent = resolveIsMaratonEvent(evento);

    useEffect(() => {
        if (!isMaratonEvent || !selectedPrueba?.id || !pruebas?.length) {
            setMaratonInscripcionEpMap(null);
            return undefined;
        }
        let cancelled = false;
        (async () => {
            try {
                const list = await loadMaratonLargadaInscriptos(pruebas, selectedPrueba.id);
                if (cancelled) return;
                setMaratonInscripcionEpMap(
                    new Map((list || []).map(i => [String(i.id), i.eventoPruebaId]))
                );
            } catch {
                if (!cancelled) setMaratonInscripcionEpMap(null);
            }
        })();
        return () => { cancelled = true; };
    }, [isMaratonEvent, selectedPrueba?.id, pruebas]);

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
        if (!liveRealtimeEnabled) return undefined;

        // Hub real: /hubs/timing (no existe /hubs/results)
        timingSignalRService
            .connect(id, selectedFase?.id, 'Espectador Live', 'Espectador')
            .catch(console.error);

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

        const applyLiveTime = (resId, timeStr) => {
            const idKey = String(resId);
            setResultados(prev => prev.map(r =>
                String(r.id || r.Id) === idKey
                    ? { ...r, tiempoOficial: timeStr, TiempoOficial: timeStr }
                    : r
            ));
            setLastUpdated(new Date());
        };

        timingSignalRService.onGlobalTimeReceived((_faseId, resId, timeStr) => {
            applyLiveTime(resId, timeStr);
        });
        timingSignalRService.onTimeReceived((resId, timeStr) => {
            applyLiveTime(resId, timeStr);
        });

        return () => {
            timingSignalRService.onGlobalTimeReceived(null);
            timingSignalRService.onTimeReceived(null);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, selectedFase, liveRealtimeEnabled]);

    useEffect(() => {
        const loadInitial = async () => {
            try {
                const ev = await EventoService.getById(id);
                setEvento(ev);
                const realtime = ev?.resultadosTiempoReal ?? ev?.ResultadosTiempoReal;
                setLiveRealtimeEnabled(realtime !== false);
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

        // Backup / modo Esencial: polling con backoff si el WS está caído
        let pollMs = liveRealtimeEnabled ? 30000 : 10000;
        let pollTimer = null;
        let cancelled = false;

        const schedulePoll = () => {
            if (cancelled) return;
            pollTimer = setTimeout(async () => {
                const wsDown = !liveRealtimeEnabled
                    || timingSignalRService.getConnectionState() !== 'Connected';
                if (wsDown) {
                    await loadData();
                    // Backoff hasta 60s para no martillar API/DB en picos
                    pollMs = Math.min(Math.round(pollMs * 1.5), 60000);
                } else {
                    pollMs = liveRealtimeEnabled ? 30000 : 10000;
                }
                schedulePoll();
            }, pollMs);
        };

        schedulePoll();

        return () => {
            cancelled = true;
            if (pollTimer) clearTimeout(pollTimer);
        };
    }, [selectedPrueba, refreshResultsCounter, liveRealtimeEnabled]);

    const handleDownloadPDF = async (mode = 'current', clasificacionKey = null) => {
        if (!selectedPrueba || !fases.length) return;

        try {
            const eventoExport = evento || 'Evento';
            const distLabel = selectedPrueba.prueba?.distancia?.descripcion
                || (selectedPrueba.prueba?.distancia?.metros ? `${selectedPrueba.prueba.distancia.metros}m` : '');
            const grupoSeleccionado = clasificacionKey
                ? maratonLiveGroups.find(g => g.key === clasificacionKey)
                : null;
            const pruebaNombre = isMaratonEvent
                ? [
                    selectedFase?.nombreFase || selectedFase?.NombreFase || 'Largada',
                    distLabel,
                    grupoSeleccionado?.title,
                ].filter(Boolean).join(' - ')
                : [
                    selectedPrueba.prueba?.categoria?.nombre,
                    selectedPrueba.prueba?.bote?.tipo || selectedPrueba.prueba?.bote?.nombre,
                    distLabel,
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
                        id: r.id || r.Id,
                        posicion: r.posicion || r.Posicion,
                        carril: r.carril || r.Carril,
                        participanteNombre: r.participanteNombre || r.ParticipanteNombre,
                        clubNombre: r.clubNombre || r.ClubNombre,
                        clubSigla: r.clubSigla || r.ClubSigla,
                        tiempoOficial: r.tiempoOficial || r.TiempoOficial,
                        tripulantes: r.tripulantes || [],
                        estado: r.estado || r.Estado,
                        eventoPruebaId: r.eventoPruebaId || r.EventoPruebaId,
                        inscripcionId: r.inscripcionId || r.InscripcionId,
                    })),
            });

            // Filter fases by mode
            let raw = [...fases];
            let fasesToExport = [];
            if (isMaratonEvent && (mode === 'maraton-full' || mode === 'maraton-group')) {
                fasesToExport = selectedFase ? [selectedFase] : [];
            } else if (mode === 'current') {
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

            if (!fasesToExport.length) { addToast('warning', 'No hay fases para el filtro seleccionado'); return; }

            const enriched = fasesToExport.map(enrichFase);
            const maratonOpts = isMaratonEvent
                ? {
                    isMaraton: true,
                    pruebas,
                    inscripcionEpMap: maratonInscripcionEpMap,
                    ...(mode === 'maraton-group' && clasificacionKey
                        ? { clasificacionKey }
                        : {}),
                }
                : {};

            if (mode === 'maraton-group' && clasificacionKey && !grupoSeleccionado) {
                addToast('warning', 'No se encontró esa clasificación.');
                return;
            }

            const grupoLabel = mode === 'maraton-group'
                ? (grupoSeleccionado?.title || 'Clasificación')
                : mode === 'maraton-full'
                    ? 'Prueba Completa'
                    : mode === 'current'
                        ? enriched[0]?.nombreFase
                        : mode;

            await PdfExportService.exportGrupo(
                enriched,
                eventoExport,
                pruebaNombre,
                grupoLabel,
                maratonOpts
            );
        } catch (err) {
            console.error('Error generating PDF:', err);
            addToast('error', 'Error al generar el PDF.');
        }
    };

    const filterOptions = (() => {
        const cats = [];
        const botes = [];
        const dists = [];
        const sexos = [];
        const etapas = [];
        allFases.forEach(f => {
            const m = getFaseMeta(f);
            cats.push(m.catName);
            botes.push(m.botName);
            dists.push(m.distName);
            sexos.push(m.sexName);
            etapas.push(m.etapa);
        });
        return {
            categorias: uniqueSorted(cats),
            botes: uniqueSorted(botes),
            distancias: uniqueSorted(dists),
            sexos: uniqueSorted(sexos),
            etapas: uniqueSorted(etapas),
        };
    })();

    const hasActiveFilters = !!(filterCategoria || filterBote || filterDistancia || filterSexo || filterEtapa);

    const clearFilters = () => {
        setFilterCategoria('');
        setFilterBote('');
        setFilterDistancia('');
        setFilterSexo('');
        setFilterEtapa('');
    };

    const filteredFases = allFases.filter(f => {
        const m = getFaseMeta(f);
        if (filterCategoria && m.catName !== filterCategoria) return false;
        if (filterBote && m.botName !== filterBote) return false;
        if (filterDistancia && m.distName !== filterDistancia) return false;
        if (filterSexo && m.sexName !== filterSexo) return false;
        if (filterEtapa && m.etapa !== filterEtapa) return false;
        return true;
    });

    // Resetear startIndex a 0 cuando cambien los filtros
    useEffect(() => {
        setStartIndex(0);
    }, [filterCategoria, filterBote, filterDistancia, filterSexo, filterEtapa]);

    // Limitar/validar startIndex si filteredFases disminuye por filtrado
    useEffect(() => {
        setStartIndex(prev => {
            const maxStart = Math.max(0, filteredFases.length - 10);
            return Math.min(prev, maxStart);
        });
    }, [filteredFases.length]);

    // Sincronizar el scroll de la pagina/carrera seleccionada
    useEffect(() => {
        if (!selectedFase) return;
        const selectedIndex = filteredFases.findIndex(f => f.id === selectedFase.id);
        if (selectedIndex !== -1) {
            if (selectedIndex < startIndex) {
                setStartIndex(selectedIndex);
            } else if (selectedIndex >= startIndex + 10) {
                setStartIndex(Math.max(0, selectedIndex - 9));
            }
        }
    }, [selectedFase?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const currentResultsForFase = useMemo(() => {
        if (!selectedFase) return [];
        return resultados.filter(r => (r.faseId || r.FaseId) === selectedFase.id);
    }, [resultados, selectedFase]);

    const maratonLiveGroups = useMemo(() => {
        if (!isMaratonEvent || !selectedFase || !currentResultsForFase.length) return [];

        const enriched = currentResultsForFase.map(r => {
            if (r.eventoPruebaId || r.EventoPruebaId) return r;
            const epId = maratonInscripcionEpMap?.get?.(
                String(r.inscripcionId || r.InscripcionId)
            );
            return epId ? { ...r, eventoPruebaId: epId } : r;
        });

        return groupMaratonResultadosByClasificacion(
            { ...selectedFase, resultados: enriched },
            pruebas
        );
    }, [isMaratonEvent, selectedFase, currentResultsForFase, maratonInscripcionEpMap, pruebas]);

    const renderLiveResultsTable = (rows, faseCtx) => {
        const posMap = computePositionsForPhase(rows);
        const sorted = [...rows].sort((a, b) => {
            const posA = posMap[a.id] || posMap[String(a.id)];
            const posB = posMap[b.id] || posMap[String(b.id)];
            if (posA && posB) return posA - posB;
            if (posA) return -1;
            if (posB) return 1;
            return (a.carril || a.Carril || 99) - (b.carril || b.Carril || 99);
        });

        const lider = sorted.find(r => (posMap[r.id] || posMap[String(r.id)]) === 1);
        const liderMs = lider ? timeToMs(lider.tiempoOficial || lider.TiempoOficial) : null;

        return (
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
                    {sorted.length > 0 ? sorted.map((r, i) => {
                        const pos = posMap[r.id] || posMap[String(r.id)];
                        const isLeader = pos === 1;
                        const tMs = timeToMs(r.tiempoOficial || r.TiempoOficial);
                        const diff = (!isLeader && liderMs && tMs) ? tMs - liderMs : null;

                        return (
                            <tr key={r.id || r.Id || i} className={`pos-row pos-${pos || ''}`}>
                                <td className="pos-cell">
                                    <div className="pos-number">
                                        {pos === 1 ? <Trophy size={16} style={{ color: '#eab308' }} />
                                            : pos === 2 ? <Trophy size={16} style={{ color: '#94a3b8' }} />
                                                : pos === 3 ? <Trophy size={16} style={{ color: '#cd7f32' }} />
                                                    : pos || '-'}
                                    </div>
                                </td>
                                <td className="carril-cell">{r.carril || r.Carril || '-'}</td>
                                <td>
                                    <div className="athlete-info">
                                        <span className="name">
                                            {(() => {
                                                const mainName = r.participanteNombre || r.ParticipanteNombre;
                                                const trips = r.tripulantes || [];
                                                const names = trips.length > 0
                                                    ? [mainName, ...trips.map(t => t.participanteNombreCompleto || t.participanteNombre)]
                                                    : [mainName];

                                                if (isBoteK4(faseCtx)) {
                                                    return names.map(n => getSoloApellido(n)).join(' - ');
                                                }
                                                return names.join(' - ');
                                            })()}
                                        </span>
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

                                        const rawTime = r.tiempoOficial || r.TiempoOficial;
                                        return rawTime ? formatRaceTime(rawTime) : '--:--.---';
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
                    )}
                </tbody>
            </table>
        );
    };

    if (loading) return <div className="results-loading"><div className="loader"></div><p>Sincronizando con el canal oficial...</p></div>;
    if (!evento) return <div className="results-error">Evento no encontrado</div>;

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

    const allCancelled = allFases.length > 0 && allFases.every(f => {
        const est = (f.estado || f.Estado || '').toUpperCase();
        return est === 'CANCELADO' || est === 'CANCELADA';
    });

    const getEventBadge = () => {
        const eventoEst = String(evento?.estado || evento?.Estado || '')
            .replace(/\s+/g, '')
            .toUpperCase();

        if (eventoEst === 'CANCELADO' || eventoEst === 'CANCELADA') {
            return { label: 'RECESO / CANCELADO', className: 'live-badge status-red', dotColor: '#ef4444' };
        }

        // EN VIVO solo cuando hay una prueba largada (también en eventos Finalizado).
        if (activeRace) {
            return { label: 'EN VIVO', className: 'live-badge status-green', dotColor: '#10b981' };
        }

        if (eventoEst === 'FINALIZADO' || eventoEst === 'FINALIZADA' || allFinished) {
            if (allCancelled) {
                return { label: 'RECESO / CANCELADO', className: 'live-badge status-red', dotColor: '#ef4444' };
            }
            return { label: 'RESULTADOS FINALES', className: 'live-badge status-grey', dotColor: '#eab308' };
        }

        if (eventoEst === 'ENCURSO') {
            return { label: 'EN CURSO', className: 'live-badge status-green', dotColor: '#10b981' };
        }

        return { label: 'PROGRAMADO', className: 'live-badge status-grey', dotColor: '#94a3b8' };
    };

    const eventBadge = getEventBadge();

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
                        <div className={eventBadge.className}>
                            <span className="dot" style={{ backgroundColor: eventBadge.dotColor }}></span> {eventBadge.label}
                        </div>
                        <h1>{evento.nombre}</h1>
                        <div className="event-meta">
                            <span><MapPin size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> {evento.ubicacion}</span>
                            <span className="sep">•</span>
                            <span><Calendar size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> {new Date(evento.fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}</span>
                        </div>
                    </div>

                    {/* LIVE STATUS BOARD BANNERS */}
                    {(() => {
                        const eventoEst = String(evento?.estado || evento?.Estado || '')
                            .replace(/\s+/g, '')
                            .toUpperCase();
                        const eventoFinalizado = eventoEst === 'FINALIZADO' || eventoEst === 'FINALIZADA' || allFinished;
                        const eventoCancelado = eventoEst === 'CANCELADO' || eventoEst === 'CANCELADA' || allCancelled;

                        // Con prueba largada: mostrar carrera activa (también si el evento ya figura Finalizado).
                        if (activeBanner) {
                            return (
                                <div className="live-status-board running fade-in">
                                    <div className="live-board-header">
                                        <span className="live-pulse-dot"></span>
                                        <span className="board-title">Se está corriendo</span>
                                    </div>
                                    <div className="board-race-num">#{activeBanner.number}</div>
                                    <div className="board-race-details">
                                        <div className="board-race-fase">{activeBanner.faseName}</div>
                                        <div className="board-race-cat">{activeBanner.details}</div>
                                    </div>
                                </div>
                            );
                        }

                        if (eventoCancelado) {
                            return (
                                <div className="live-status-board finished fade-in">
                                    <div className="live-board-header">
                                        <Trophy size={12} className="board-icon-gold" />
                                        <span className="board-title">Cancelado</span>
                                    </div>
                                    <div className="board-finished-msg">El evento fue cancelado.</div>
                                </div>
                            );
                        }

                        if (eventoFinalizado) {
                            return (
                                <div className="live-status-board finished fade-in">
                                    <div className="live-board-header">
                                        <Trophy size={12} className="board-icon-gold" />
                                        <span className="board-title">Finalizado</span>
                                    </div>
                                    <div className="board-finished-msg">Todas las regatas han concluido.</div>
                                </div>
                            );
                        }

                        if (nextBanner) {
                            return (
                                <div className="live-status-board scheduled fade-in">
                                    <div className="live-board-header">
                                        <Clock size={12} className="board-icon-grey" />
                                        <span className="board-title">Continúa</span>
                                    </div>
                                    <div className="board-race-num upcoming">#{nextBanner.number}</div>
                                    <div className="board-race-details">
                                        <div className="board-race-fase upcoming">{nextBanner.faseName}</div>
                                        <div className="board-race-cat">{nextBanner.details}</div>
                                    </div>
                                </div>
                            );
                        }

                        return null;
                    })()}
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
                        <div className="cronograma-filters">
                            <div className="filter-grid">
                                <select
                                    className="filter-select"
                                    value={filterCategoria}
                                    onChange={(e) => setFilterCategoria(e.target.value)}
                                    aria-label="Filtrar por categoría"
                                >
                                    <option value="">Categoría</option>
                                    {filterOptions.categorias.map(v => (
                                        <option key={v} value={v}>{v}</option>
                                    ))}
                                </select>
                                <select
                                    className="filter-select"
                                    value={filterBote}
                                    onChange={(e) => setFilterBote(e.target.value)}
                                    aria-label="Filtrar por bote"
                                >
                                    <option value="">Bote</option>
                                    {filterOptions.botes.map(v => (
                                        <option key={v} value={v}>{v}</option>
                                    ))}
                                </select>
                                <select
                                    className="filter-select"
                                    value={filterDistancia}
                                    onChange={(e) => setFilterDistancia(e.target.value)}
                                    aria-label="Filtrar por distancia"
                                >
                                    <option value="">Distancia</option>
                                    {filterOptions.distancias.map(v => (
                                        <option key={v} value={v}>{v}</option>
                                    ))}
                                </select>
                                <select
                                    className="filter-select"
                                    value={filterSexo}
                                    onChange={(e) => setFilterSexo(e.target.value)}
                                    aria-label="Filtrar por sexo"
                                >
                                    <option value="">Sexo</option>
                                    {filterOptions.sexos.map(v => (
                                        <option key={v} value={v}>{v}</option>
                                    ))}
                                </select>
                                <select
                                    className="filter-select filter-select--wide"
                                    value={filterEtapa}
                                    onChange={(e) => setFilterEtapa(e.target.value)}
                                    aria-label="Filtrar por etapa"
                                >
                                    <option value="">Etapa</option>
                                    {filterOptions.etapas.map(v => (
                                        <option key={v} value={v}>{v}</option>
                                    ))}
                                </select>
                            </div>
                            {hasActiveFilters && (
                                <button type="button" className="filter-clear-btn" onClick={clearFilters}>
                                    <X size={14} /> Limpiar filtros
                                </button>
                            )}
                        </div>
                        {filteredFases.length > 10 && (
                            <div className="sidebar-pagination">
                                <button
                                    className="pagination-arrow-btn"
                                    onClick={() => setStartIndex(prev => Math.max(0, prev - 1))}
                                    disabled={startIndex === 0}
                                    title="Anterior"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <span className="pagination-info">
                                    {startIndex + 1} - {Math.min(filteredFases.length, startIndex + 10)} de {filteredFases.length}
                                </span>
                                <button
                                    className="pagination-arrow-btn"
                                    onClick={() => setStartIndex(prev => Math.min(filteredFases.length - 10, prev + 1))}
                                    disabled={startIndex >= filteredFases.length - 10}
                                    title="Siguiente"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="pruebas-v-list">
                        {filteredFases.length === 0 ? (
                            <p className="cronograma-empty">No hay regatas con esos filtros.</p>
                        ) : filteredFases.slice(startIndex, startIndex + 10).map(f => {
                            const raceNum = faseNumberMap[f.id] || f.numeroPrueba || f.NumeroPrueba || f.id;
                            const isSelected = selectedFase?.id === f.id;
                            const { catName, botName, distName, sexName } = getFaseMeta(f);
                            const label = `${catName} ${botName} ${distName} - ${sexName}`.trim();
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
                                    <div className="p-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '0.4rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            <span className="p-time">{formatDate(f.fechaHoraProgramada)} - {formatTime(f.fechaHoraProgramada)}</span>
                                            <span className="p-phase-name">
                                                {f.nombreFase}
                                            </span>
                                        </div>
                                        <span className="p-badge" style={{ background: 'var(--color-primary-light)', color: 'white', fontWeight: 'bold', fontSize: '0.85rem', padding: '0.25rem 0.6rem', borderRadius: '6px' }}>#{raceNum}</span>
                                    </div>
                                    <span className="p-name">
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
                                        {isMaratonEvent
                                            ? (selectedFase?.nombreFase || selectedFase?.NombreFase || 'Largada')
                                            : replaceKayakNames(`${selectedPrueba.prueba?.categoria?.nombre} ${selectedPrueba.prueba?.bote?.tipo} ${selectedPrueba.prueba?.distancia?.descripcion}`)}
                                    </h2>
                                    <div className="gender-tag">
                                        {isMaratonEvent
                                            ? (maratonLiveGroups.length > 1
                                                ? maratonLiveGroups.map(g => g.sexoLabel).filter((v, i, a) => a.indexOf(v) === i).join(' · ')
                                                : 'Clasificaciones')
                                            : getSexName(selectedPrueba)}
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
                                                    {isMaratonEvent ? (
                                                        <>
                                                            <div
                                                                className="dropdown-item"
                                                                onClick={() => {
                                                                    setShowPdfMenu(false);
                                                                    setTimeout(() => handleDownloadPDF('maraton-full'), 100);
                                                                }}
                                                            >
                                                                Prueba Completa
                                                            </div>
                                                            {maratonLiveGroups.length > 0 && (
                                                                <>
                                                                    <div className="dropdown-divider"></div>
                                                                    {maratonLiveGroups.map(g => (
                                                                        <div
                                                                            key={g.key}
                                                                            className="dropdown-item"
                                                                            onClick={() => {
                                                                                setShowPdfMenu(false);
                                                                                setTimeout(() => handleDownloadPDF('maraton-group', g.key), 100);
                                                                            }}
                                                                        >
                                                                            {g.title}
                                                                        </div>
                                                                    ))}
                                                                </>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div className="dropdown-item" onClick={() => { setShowPdfMenu(false); setTimeout(() => handleDownloadPDF('current'), 100); }}>Fase Actual</div>
                                                            <div className="dropdown-item" onClick={() => { setShowPdfMenu(false); setTimeout(() => handleDownloadPDF('series'), 100); }}>Todas las Series</div>
                                                            <div className="dropdown-item" onClick={() => { setShowPdfMenu(false); setTimeout(() => handleDownloadPDF('semis'), 100); }}>Todas las Semis</div>
                                                            <div className="dropdown-item" onClick={() => { setShowPdfMenu(false); setTimeout(() => handleDownloadPDF('finals'), 100); }}>Todas las Finales</div>
                                                            <div className="dropdown-divider"></div>
                                                            <div className="dropdown-item" onClick={() => { setShowPdfMenu(false); setTimeout(() => handleDownloadPDF('full'), 100); }}>Prueba Completa</div>
                                                        </>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    {(() => {
                                        const est = (selectedFase?.estado || selectedFase?.Estado || '').toUpperCase();
                                        if (est === 'ENCURSO' || est === 'EN CARRERA') {
                                            return (
                                                <span className="status-label in-progress">
                                                    PRUEBA EN CURSO
                                                </span>
                                            );
                                        } else if (est === 'FINALIZADA' || est === 'FINALIZADO') {
                                            return (
                                                <span className="status-label finished">
                                                    FINALIZADA
                                                </span>
                                            );
                                        } else if (est === 'CANCELADO' || est === 'CANCELADA') {
                                            return (
                                                <span className="status-label canceled">
                                                    CANCELADA
                                                </span>
                                            );
                                        } else {
                                            return (
                                                <span className="status-label scheduled">
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
                                    <div className="fase-header" style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h3 style={{ margin: 0, color: 'var(--color-primary)' }}>
                                            {selectedFase.nombreFase || selectedFase.NombreFase}
                                        </h3>
                                        <div className="fase-time" style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Clock size={14} /> Programada: {formatTime(selectedFase.fechaHoraProgramada || selectedFase.FechaHoraProgramada)} hs
                                        </div>
                                    </div>

                                    {isMaratonEvent && maratonLiveGroups.length > 0 ? (
                                        <div className="maraton-live-grids">
                                            <p className="maraton-live-hint">
                                                Maratón: clasificaciones separadas por Categoría · Sexo · Bote
                                                ({maratonLiveGroups.length} tabla{maratonLiveGroups.length !== 1 ? 's' : ''}).
                                            </p>
                                            {maratonLiveGroups.map(g => (
                                                <div key={g.key} className="maraton-live-group">
                                                    <div className="maraton-live-group-title">
                                                        <h4>{g.title}</h4>
                                                        <span className="maraton-live-count">{g.resultados.length}</span>
                                                    </div>
                                                    {renderLiveResultsTable(g.resultados, selectedFase)}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        renderLiveResultsTable(currentResultsForFase, selectedFase)
                                    )}
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
