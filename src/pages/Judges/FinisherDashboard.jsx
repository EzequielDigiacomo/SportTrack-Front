import React, { useState, useEffect, useRef } from 'react';
import { formatTime } from '../../utils/dateUtils';
import { 
    Timer, CheckCircle, Clock, Users, XCircle, RefreshCw, Save, 
    Play, Activity, Search, LogOut, ArrowLeft, ArrowRight, Layout, Grid, Link2
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import EventoService from '../../services/EventoService';
import FaseService from '../../services/FaseService';
import ResultadoService from '../../services/ResultadoService';
import { useAlert } from '../../hooks/useAlert';
import timingSignalRService from '../../services/TimingSignalRService';
import { getJudgeDisplayName, mapFasesFromApi, normalizeFaseEstado } from '../../utils/judgeDashboardHelpers';
import { formatRaceTimeFromMs } from '../../utils/raceTimeUtils';
import { parseStartMs, elapsedMs } from '../../utils/timingMath';

const CATEGORIA_NAMES = {
    1: 'Pre-infantil (8-10 años)', 2: 'Infantil (11-12 años)', 3: 'Menor (13-14 años)', 4: 'Cadete (15-16 años)', 
    5: 'Junior (17-18 años)', 6: 'Sub-23 (19-23 años)', 7: 'Senior (24-39 años)', 8: 'Master A (40-49 años)', 
    9: 'Master B (50-59 años)', 10: 'Master C (60+ años)'
};
const BOTE_NAMES = { 1: 'K1', 2: 'K2', 3: 'K4', 4: 'C1', 5: 'C2', 6: 'C4' };
const DISTANCIA_NAMES = {
    1: '200m', 2: '350m', 3: '400m', 4: '450m', 5: '500m', 6: '1000m', 7: '1500m', 8: '2000m', 9: '3000m', 
    10: '5000m', 11: '10000m', 12: '12000m', 13: '15000m', 14: '18000m', 15: '22000m', 16: '30000m'
};
import { useToast } from '../../context/ToastContext';
import ConfirmDialog from '../../components/Common/ConfirmDialog';
import './Judges.css';

const getSoloApellido = (nombreCompleto) => {
    if (!nombreCompleto) return "-";
    const parts = nombreCompleto.trim().split(' ');
    return parts[parts.length - 1];
};

const FinisherDashboard = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const roleStr = (user?.rol || user?.Rol || user?.role || '').toLowerCase();
    const isAdmin = roleStr.includes('admin');
    const [eventos, setEventos] = useState([]);
    const [selectedEvento, setSelectedEvento] = useState(null);
    const [fases, setFases] = useState([]);
    const [selectedFase, setSelectedFase] = useState(null);
    const [resultados, setResultados] = useState([]);
    const [rawTimes, setRawTimes] = useState([]);
    const [isRaceRunning, setIsRaceRunning] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [startTime, setStartTime] = useState(null);
    const timerRef = useRef(null);
    const startTimeRef = useRef(null);
    const pendingAbsRef = useRef([]); // { kind: 'lane'|'doubt', resultadoId?, finishAbs }
    const [startReceiveLagSec, setStartReceiveLagSec] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isCompact, setIsCompact] = useState(window.innerWidth <= 768);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(window.innerWidth <= 1000);
    const [globalAlert, setGlobalAlert] = useState(null); // { faseId, nroPrueba }
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
    const { addToast } = useToast();
    const [connectionState, setConnectionState] = useState(timingSignalRService.getConnectionState());
    const [activeJudges, setActiveJudges] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [liveClock, setLiveClock] = useState(() => {
        const d = timingSignalRService.getSyncedNow();
        return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    });

    useEffect(() => {
        const unsubscribe = timingSignalRService.onStateChange((state) => {
            setConnectionState(state);
        });
        const clockTick = setInterval(() => {
            const d = timingSignalRService.getSyncedNow();
            setLiveClock(d.toLocaleTimeString('es-AR', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            }));
        }, 250);
        return () => {
            unsubscribe();
            clearInterval(clockTick);
        };
    }, []);

    useEffect(() => {
        const loadEventos = async () => {
            const data = await EventoService.getAll();
            setEventos(data);
            
            const savedEventId = localStorage.getItem('finisher_event_id');
            if (!savedEventId && data.length > 0) {
                setSelectedEvento(data[0]);
            }
        };
        loadEventos();
    }, []);

    useEffect(() => {
        if (!selectedEvento) return;
        const loadFases = async () => {
            const data = await FaseService.getByEvento(selectedEvento.id);
            setFases(mapFasesFromApi(data));
        };
        if (selectedEvento) {
            loadFases();
            localStorage.setItem('finisher_event_id', selectedEvento.id);
        } else {
            localStorage.removeItem('finisher_event_id');
            localStorage.removeItem('finisher_fase_id');
        }
    }, [selectedEvento]);

    useEffect(() => {
        if (selectedFase) {
            localStorage.setItem('finisher_fase_id', selectedFase.id);
        }
    }, [selectedFase]);

    // Recuperar estado al cargar
    useEffect(() => {
        const savedEventId = localStorage.getItem('finisher_event_id');
        if (savedEventId && eventos.length > 0) {
            const ev = eventos.find(e => e.id === parseInt(savedEventId));
            if (ev) setSelectedEvento(ev);
        }
    }, [eventos]);

    useEffect(() => {
        const savedFaseId = localStorage.getItem('finisher_fase_id');
        if (savedFaseId && fases.length > 0) {
            const f = fases.find(x => x.id === parseInt(savedFaseId));
            if (f) setSelectedFase(f);
        }
    }, [fases]);

    useEffect(() => {
        if (!selectedEvento) {
            // timingSignalRService.disconnect();
            return;
        }

        // Limpiar inmediatamente los resultados de la carrera anterior y las dudas para evitar
        // bugs de estado stale donde el comparador cree que ya terminó la nueva carrera.
        if (selectedFase && selectedFase.estado === 'En Carrera') {
            // No limpiamos resultados a [] para que no se dispare el autostop del timer al estar vacío
            // ya que al recargar la fase se sobreescribirá correctamente.
        } else {
            setResultados([]);
        }
        setRawTimes([]);

        // --- ARRANQUE SÍNCRONO DEL CRONÓMETRO ---
        // Si la fase seleccionada ya está "En Carrera", arrancamos el cronómetro inmediatamente
        // para evitar que el reloj se quede trabado o en 0 mientras se realiza la conexión lenta.
        if (selectedFase && selectedFase.estado === 'En Carrera' && selectedFase.fechaHoraInicioReal) {
            const parsed = parseStartMs(selectedFase.fechaHoraInicioReal);
            if (!isNaN(parsed)) {
                setIsRaceRunning(true);
                setStartTime(parsed);
                startTimeRef.current = parsed;
                setElapsedTime(elapsedMs(parsed, timingSignalRService.getSyncedNow().getTime()));
                if (timerRef.current) clearInterval(timerRef.current);
                timerRef.current = setInterval(() => {
                    setElapsedTime(elapsedMs(parsed, timingSignalRService.getSyncedNow().getTime()));
                }, 37);
            }
        } else {
            setElapsedTime(0);
            setIsRaceRunning(false);
            setStartTime(null);
            startTimeRef.current = null;
        }
        
        const setupSignalR = async () => {
            try {
                // Escuchar jueces conectados en este EVENTO ANTES de conectar para no perder el primer evento
                timingSignalRService.onEventPresenceUpdated((presenceList) => {
                    setActiveJudges(presenceList);
                });

                // 1. Conectar al Hub (y unirse al grupo si hay una fase seleccionada)
                await timingSignalRService.connect(
                    selectedEvento?.id,
                    selectedFase?.id,
                    user?.nombreCompleto || user?.nombre || user?.username || "Cronometrista",
                    "Cronometrista"
                );

                // 2. LISTENERS GLOBALES (Siempre activos mientras estemos en el dashboard)
                timingSignalRService.onGlobalRaceStarted(({ faseId, serverTime }) => {
                    // Actualizar la lista de fases local para que el "estado" cambie visualmente en el cronograma
                    setFases(prev => {
                        const newFases = prev.map(f => 
                            String(f.id) === String(faseId) 
                                ? { ...f, estado: 'En Carrera', fechaHoraInicioReal: serverTime } 
                                : f
                        );
                        // Si la fase que largó es la que tenemos seleccionada, actualizarla también
                        if (selectedFase && String(selectedFase.id) === String(faseId)) {
                            const updated = newFases.find(x => String(x.id) === String(faseId));
                            if (updated) setSelectedFase(updated);
                            const parsed = parseStartMs(serverTime);
                            if (!isNaN(parsed)) startLocalTimer(parsed);
                        }
                        return newFases;
                    });

                    // Mostrar alerta si es otra carrera o si no tenemos ninguna seleccionada
                    if (!selectedFase || String(faseId) !== String(selectedFase.id)) {
                        setGlobalAlert({ faseId, serverTime });
                        setTimeout(() => setGlobalAlert(null), 15000);
                    }
                });

                // 3. LÓGICA ESPECÍFICA DE LA FASE SELECCIONADA
                if (selectedFase) {
                    // Sincronización proactiva: Si la fase dice "Programada" localmente,
                    // verificamos si ya empezó en el servidor al cargarla.
                    const loadFaseContext = async () => {
                        const data = await ResultadoService.getByFase(selectedFase.id);
                        const formattedData = data.map(r => ({
                            ...r,
                            estadoCanto: r.estado === 'Descalificado' ? 'DSQ' : r.estado,
                            tiempoOficial: r.tiempoOficial,
                            msLlegada: r.tiempoOficial ? parseTimeToMs(r.tiempoOficial) : null,
                            status: r.tiempoOficial ? 'finished' : 'pending'
                        }));
                        setResultados(formattedData.sort((a,b) => a.carril - b.carril));

                        // ✅ FIX: obtener estado FRESCO de la fase desde la API
                        // Evita el bug de stale closure donde selectedFase.estado es viejo
                        try {
                            const fasesEvento = await FaseService.getByEvento(selectedFase.etapaEventoPruebaEventoId || selectedEvento?.id);
                            const mapped = mapFasesFromApi(fasesEvento);
                            const freshFase = mapped?.find(f => String(f.id) === String(selectedFase.id)) || selectedFase;

                            if (normalizeFaseEstado(freshFase.estado) === 'En Carrera' && freshFase.fechaHoraInicioReal) {
                                const parsed = parseStartMs(freshFase.fechaHoraInicioReal);
                                if (!isNaN(parsed)) startLocalTimer(parsed);
                            } else {
                                // Solo detener si explícitamente ya no está En Carrera
                                if (normalizeFaseEstado(freshFase.estado) !== 'En Carrera') {
                                    stopLocalTimer();
                                }
                            }
                        } catch {
                            // fallback: usar el estado local
                            if (normalizeFaseEstado(selectedFase.estado) === 'En Carrera' && selectedFase.fechaHoraInicioReal) {
                                const parsed = parseStartMs(selectedFase.fechaHoraInicioReal);
                                if (!isNaN(parsed)) startLocalTimer(parsed);
                            } else {
                                if (normalizeFaseEstado(selectedFase.estado) !== 'En Carrera') {
                                    stopLocalTimer();
                                }
                            }
                        }
                    };

                    await loadFaseContext();

                    timingSignalRService.onRaceStarted((id, sTime) => {
                        setFases(prev => {
                            const newFases = prev.map(f => 
                                String(f.id) === String(id) ? { ...f, estado: 'En Carrera', fechaHoraInicioReal: sTime } : f
                            );
                            if (selectedFase && String(selectedFase.id) === String(id)) {
                                const updated = newFases.find(x => String(x.id) === String(id));
                                if (updated) setSelectedFase(updated);
                            }
                            return newFases;
                        });

                        if (String(id) === String(selectedFase.id)) {
                            const parsed = parseStartMs(sTime);
                            if (!isNaN(parsed)) startLocalTimer(parsed);
                        }
                    });

                    timingSignalRService.onRaceFinished(() => {
                        stopLocalTimer();
                    });

                    timingSignalRService.onRaceReset((id) => {
                        if (String(id) === String(selectedFase.id)) {
                            stopLocalTimer();
                            setElapsedTime(0);
                            setStartTime(null);
                            startTimeRef.current = null;
                            pendingAbsRef.current = [];
                            setStartReceiveLagSec(null);
                            setResultados(prev => prev.map(r => ({ ...r, tiempoOficial: null, msLlegada: null, status: 'pending', estadoCanto: 'Pendiente' })));
                        }
                        setFases(prev => prev.map(f => 
                            String(f.id) === String(id) ? { ...f, estado: 'Programada', fechaHoraInicioReal: null } : f
                        ));
                    });

                    timingSignalRService.onGlobalResultStatusUpdated((resId, status) => {
                        // 1. Actualizar resultados de la fase actual (si aplica)
                        setResultados(prev => prev.map(r => 
                            String(r.id) === String(resId) ? { ...r, estadoCanto: status } : r
                        ));

                        // 2. Actualizar también la lista de fases (cronograma)
                        setFases(prev => prev.map(f => ({
                            ...f,
                            resultados: f.resultados?.map(r => 
                                String(r.id) === String(resId) ? { ...r, estadoCanto: status } : r
                            )
                        })));
                    });
                } else {
                    // Limpiar estado si no hay fase
                    setResultados([]);
                    setIsRaceRunning(false);
                    setStartTime(null);
                    setElapsedTime(0);
                    stopLocalTimer();
                }
            } catch (err) {
                console.error("[SignalR] Setup Error:", err);
            }
        };

        setupSignalR();

        return () => {
            stopLocalTimer();
            timingSignalRService.disconnect();
        };
    }, [selectedEvento, selectedFase?.id]);

    // Poll: si SignalR pierde el push de largada, recuperamos t0 por HTTP
    useEffect(() => {
        if (!selectedEvento || !selectedFase) return;
        if (normalizeFaseEstado(selectedFase.estado) !== 'Programada') return;
        if (startTime) return;

        const id = setInterval(async () => {
            try {
                const data = await FaseService.getByEvento(selectedEvento.id);
                const sorted = mapFasesFromApi(data);
                setFases(sorted);
                const fresh = sorted.find(f => String(f.id) === String(selectedFase.id));
                if (fresh && normalizeFaseEstado(fresh.estado) === 'En Carrera' && fresh.fechaHoraInicioReal) {
                    setSelectedFase(fresh);
                    const parsed = parseStartMs(fresh.fechaHoraInicioReal);
                    if (!isNaN(parsed)) startLocalTimer(parsed);
                }
            } catch {
                // red mala: siguiente tick
            }
        }, 4000);

        return () => clearInterval(id);
    }, [selectedEvento?.id, selectedFase?.id, selectedFase?.estado, startTime]);

    // Tras reconnect SignalR: re-fetch fase por si se perdió el evento
    useEffect(() => {
        const unsub = timingSignalRService.onReconnected(async () => {
            if (!selectedEvento || !selectedFase) return;
            try {
                const data = await FaseService.getByEvento(selectedEvento.id);
                const sorted = mapFasesFromApi(data);
                setFases(sorted);
                const fresh = sorted.find(f => String(f.id) === String(selectedFase.id));
                if (!fresh) return;
                setSelectedFase(fresh);
                if (normalizeFaseEstado(fresh.estado) === 'En Carrera' && fresh.fechaHoraInicioReal) {
                    const parsed = parseStartMs(fresh.fechaHoraInicioReal);
                    if (!isNaN(parsed)) startLocalTimer(parsed);
                }
            } catch (err) {
                console.warn('[Finisher] re-fetch after reconnect failed:', err);
            }
        });
        return unsub;
    }, [selectedEvento?.id, selectedFase?.id]);

    // Detener timer automáticamente cuando todos han llegado, tienen estado (DSQ, DNF, etc)
    // o están cubiertos por una duda capturada en rawTimes
    useEffect(() => {
        if (isRaceRunning && resultados && resultados.length > 0) {
            // Cuántos atletas siguen sin tiempo Y sin estado especial
            const stillPending = resultados.filter(r =>
                !r.tiempoOficial && (!r.estadoCanto || r.estadoCanto === 'Pendiente')
            ).length;

            // Si la cantidad de tiempos crudos (dudas) cubre a todos los pendientes → parar
            if (stillPending <= rawTimes.length) {
                stopLocalTimer();
            }
        }
    }, [resultados, rawTimes, isRaceRunning]);

    const parseTimeToTimeSpan = (timeStr) => {
        if (!timeStr || timeStr.trim() === '') return null;
        try {
            const parts = timeStr.trim().split(':');
            if (parts.length === 2) {
                const [min, secStr] = parts;
                const [sec, ms] = (secStr || '0').split('.');
                const msFormatted = (ms || '0').substring(0, 3).padEnd(7, '0');
                return `00:${String(parseInt(min)).padStart(2,'0')}:${String(parseInt(sec)).padStart(2,'0')}.${msFormatted}`;
            } else if (parts.length === 3) {
                const [hr, min, secStr] = parts;
                const [sec, ms] = (secStr || '0').split('.');
                const msFormatted = (ms || '0').substring(0, 3).padEnd(7, '0');
                return `${String(parseInt(hr)).padStart(2,'0')}:${String(parseInt(min)).padStart(2,'0')}:${String(parseInt(sec)).padStart(2,'0')}.${msFormatted}`;
            }
        } catch (e) {}
        return null;
    };

    const parseTimeToMs = (timeStr) => {
        if (!timeStr) return 0;
        const [hms, msPart] = timeStr.split('.');
        const [h, m, s] = hms.split(':').map(Number);
        const ms = Number((msPart || '0').padEnd(3, '0'));
        return (h * 3600000) + (m * 60000) + (s * 1000) + ms;
    };

    const formatTimer = (ms) => formatRaceTimeFromMs(ms);

    const flushPendingAbs = (t0Ms) => {
        const pending = pendingAbsRef.current;
        if (!pending.length) return;
        pendingAbsRef.current = [];

        const laneItems = pending.filter(p => p.kind === 'lane');
        const doubtItems = pending.filter(p => p.kind === 'doubt');

        if (laneItems.length) {
            setResultados(prev => prev.map(r => {
                const hit = laneItems.find(p => String(p.resultadoId) === String(r.id));
                if (!hit) return r;
                const diff = elapsedMs(t0Ms, hit.finishAbs);
                const formatted = formatRaceTimeFromMs(diff);
                timingSignalRService.sendTime(selectedFase?.id, r.id, formatted, diff).catch(() => {});
                return { ...r, tiempoOficial: formatted, msLlegada: diff, status: 'finished' };
            }));
        }
        if (doubtItems.length) {
            setRawTimes(prev => [
                ...prev,
                ...doubtItems.map(d => {
                    const diff = elapsedMs(t0Ms, d.finishAbs);
                    return { id: d.finishAbs, time: formatRaceTimeFromMs(diff), ms: diff, type: 'duda' };
                })
            ]);
        }
    };

    const startLocalTimer = (sTime) => {
        const t0 = typeof sTime === 'number' ? sTime : parseStartMs(sTime);
        if (Number.isNaN(t0)) return;

        const now = timingSignalRService.getSyncedNow().getTime();
        const lagSec = Math.round(elapsedMs(t0, now) / 1000);
        if (lagSec >= 1) {
            setStartReceiveLagSec(lagSec);
            setTimeout(() => setStartReceiveLagSec(null), 4000);
        } else {
            setStartReceiveLagSec(null);
        }

        setIsRaceRunning(true);
        setStartTime(t0);
        startTimeRef.current = t0;
        setElapsedTime(elapsedMs(t0, now));
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setElapsedTime(elapsedMs(t0, timingSignalRService.getSyncedNow().getTime()));
        }, 37);

        flushPendingAbs(t0);
    };

    const stopLocalTimer = () => {
        setIsRaceRunning(false);
        if (timerRef.current) clearInterval(timerRef.current);
    };

    /** Puede marcar llegada aunque t0 aún no haya llegado (se encola abs). */
    const canCaptureFinish = isRaceRunning
        || !!startTime
        || normalizeFaseEstado(selectedFase?.estado) === 'En Carrera';

    const applyOrQueueFinish = (resultadoId) => {
        const finishAbs = timingSignalRService.getSyncedNow().getTime();
        const t0 = startTimeRef.current ?? startTime;

        if (t0 != null && !Number.isNaN(t0)) {
            const diff = elapsedMs(t0, finishAbs);
            const formatted = formatTimer(diff);
            setResultados(prev => prev.map(r =>
                r.id === resultadoId ? { ...r, tiempoOficial: formatted, msLlegada: diff, status: 'finished' } : r
            ));
            timingSignalRService.sendTime(selectedFase.id, resultadoId, formatted, diff).catch(err => {
                console.error("Error sending time:", err);
            });
            return;
        }

        // Sin t0 aún: guardar instante absoluto y materializar cuando llegue la largada
        pendingAbsRef.current = [
            ...pendingAbsRef.current.filter(p => !(p.kind === 'lane' && String(p.resultadoId) === String(resultadoId))),
            { kind: 'lane', resultadoId, finishAbs }
        ];
        addToast('Marca guardada; se calculará al recibir la largada', 'warning');
    };

    const handleRefresh = async () => {
        if (!selectedEvento) {
            addToast('Seleccioná un evento primero', 'warning');
            return;
        }

        const currentFaseId = selectedFase?.id;
        setRefreshing(true);
        try {
            const data = await FaseService.getByEvento(selectedEvento.id);
            const sorted = mapFasesFromApi(data);
            setFases(sorted);

            let freshFase = currentFaseId
                ? sorted.find(f => String(f.id) === String(currentFaseId))
                : null;

            if (currentFaseId) {
                const resultData = await ResultadoService.getByFase(currentFaseId);
                const formattedData = resultData.map(r => ({
                    ...r,
                    estadoCanto: r.estado === 'Descalificado' ? 'DSQ' : r.estado,
                    tiempoOficial: r.tiempoOficial,
                    msLlegada: r.tiempoOficial ? parseTimeToMs(r.tiempoOficial) : null,
                    status: r.tiempoOficial ? 'finished' : 'pending'
                }));
                setResultados(formattedData.sort((a, b) => a.carril - b.carril));

                if (freshFase) {
                    setSelectedFase(freshFase);
                    if (freshFase.estado === 'En Carrera' && freshFase.fechaHoraInicioReal) {
                        const parsed = parseStartMs(freshFase.fechaHoraInicioReal);
                        if (!isNaN(parsed)) startLocalTimer(parsed);
                    } else if (normalizeFaseEstado(freshFase.estado) !== 'En Carrera') {
                        stopLocalTimer();
                        setElapsedTime(0);
                        setStartTime(null);
                        startTimeRef.current = null;
                    }
                }
            }

            setRawTimes([]);

            await timingSignalRService.disconnect();
            await timingSignalRService.connect(
                selectedEvento.id,
                currentFaseId || null,
                getJudgeDisplayName(user, 'Cronometrista'),
                'Cronometrista'
            );

            addToast('Datos y conexión actualizados', 'success');
        } catch (err) {
            console.error('Error al refrescar:', err);
            addToast('No se pudo refrescar. Reintentá.', 'error');
        } finally {
            setRefreshing(false);
        }
    };

    // --- ACCESOS DIRECTOS POR TECLADO ---
    useEffect(() => {
        const handleKeyDown = (e) => {
            // No disparar si el foco está en un input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            // ESPACIO -> DUDA
            if (e.code === 'Space') {
                e.preventDefault();
                if (canCaptureFinish) recordDoubt();
                return;
            }

            // TECLAS 1-9 (Soporta teclado numérico/pad y NumLock desactivado) -> LLEGADA DE CARRIL
            let laneNum = null;
            if (/^[1-9]$/.test(e.key)) {
                laneNum = parseInt(e.key);
            } else if (/^Numpad[1-9]$/.test(e.code)) {
                laneNum = parseInt(e.code.replace('Numpad', ''));
            } else if (/^Digit[1-9]$/.test(e.code)) {
                laneNum = parseInt(e.code.replace('Digit', ''));
            }

            if (laneNum !== null) {
                if (canCaptureFinish) {
                    const res = resultados.find(r => r.carril === laneNum);
                    if (res && !res.tiempoOficial && (!res.estadoCanto || res.estadoCanto === 'Pendiente')) {
                        handleRecordFinish(res.id);
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isRaceRunning, startTime, resultados, rawTimes, selectedFase?.estado]); // Dependencias para acceso a estado fresco

    const handleLaneFinish = (laneNum) => {
        const res = resultados.find(r => r.carril === laneNum);
        if (!res) return;
        handleRecordFinish(res.id);
    };

    const handleRecordFinish = async (resultadoId) => {
        if (!canCaptureFinish && !selectedFase) return;
        applyOrQueueFinish(resultadoId);
    };

    const recordDoubt = () => {
        if (!canCaptureFinish && !isRaceRunning) return;
        const finishAbs = timingSignalRService.getSyncedNow().getTime();
        const t0 = startTimeRef.current ?? startTime;
        if (t0 != null && !Number.isNaN(t0)) {
            const diff = elapsedMs(t0, finishAbs);
            const time = formatTimer(diff);
            setRawTimes(prev => [...prev, { id: finishAbs, time, ms: diff, type: 'duda' }]);
            return;
        }
        pendingAbsRef.current = [...pendingAbsRef.current, { kind: 'doubt', finishAbs }];
        addToast('Duda guardada; se calculará al recibir la largada', 'warning');
    };

    const removeRawTime = (id) => {
        setRawTimes(prev => prev.filter(t => t.id !== id));
    };

    const assignRawTime = async (raw, resId) => {
        setResultados(prev => prev.map(r => 
            r.id === resId ? { ...r, tiempoOficial: raw.time, msLlegada: raw.ms, status: 'finished' } : r
        ));
        setRawTimes(prev => prev.filter(t => t.id !== raw.id));
        try {
            await timingSignalRService.sendTime(selectedFase.id, resId, raw.time, raw.ms);
        } catch (err) {
            addToast("Error al asignar tiempo", "error");
        }
    };

    const handleSaveResults = async () => {
        if (!selectedFase) return;
        setLoading(true);
        try {
            const dataToSave = resultados
                .filter(r => r.tiempoOficial || (r.estadoCanto && r.estadoCanto !== 'Pendiente'))
                .map(r => ({
                    id: r.id,
                    tiempoOficial: parseTimeToTimeSpan(r.tiempoOficial),
                    estadoCanto: r.estadoCanto || 'Pendiente'
                }));

            await ResultadoService.batchUpdate(dataToSave);
            
            // Cambiar el estado de la fase a "Pendiente de Validación"
            await FaseService.enviarARevision(selectedFase.id);
            
            setFases(prev => prev.map(f => 
                f.id === selectedFase.id ? { ...f, estado: 'Pendiente de Validación' } : f
            ));
            
            addToast("Resultados enviados y fase enviada a revisión", "success");
        } catch (err) {
            console.error("Error al finalizar carga:", err);
            addToast("Error al guardar resultados", "error");
        } finally {
            setLoading(false);
        }
    };

    const arribosOrdenados = [...resultados.filter(r => r.tiempoOficial).map(r => ({
        id: r.id,
        time: r.tiempoOficial,
        ms: r.msLlegada,
        label: `Carril ${r.carril}`,
        type: 'atleta',
        participante: r.participanteNombre
    })), ...rawTimes].sort((a, b) => a.ms - b.ms);

    const pendientes = resultados.filter(r => !r.tiempoOficial && (!r.estadoCanto || r.estadoCanto === 'Pendiente'));

        return (
        <>
        {document.getElementById('global-sync-bar-portal-target') && createPortal(
            <div className="global-sync-bar">
                {(() => {
                    const connectedStarter = activeJudges.find(j => {
                        const role = (j.role || j.Role || '').toLowerCase();
                        return role === 'largador';
                    });
                    const connectedControl = activeJudges.find(j => {
                        const role = (j.role || j.Role || '').toLowerCase();
                        return role === 'juez de control' || role === 'admin';
                    });
                    const starterName = connectedStarter ? (connectedStarter.userName || connectedStarter.UserName || 'Largador') : '';
                    const controlName = connectedControl ? (connectedControl.userName || connectedControl.UserName || 'Control') : '';
                    const myName = user?.nombreCompleto || user?.nombre || user?.username || "Cronometrista";
                    
                    const isStarterLinked = !!connectedStarter;
                    const isControlLinked = !!connectedControl;
                    const isSelfLinked = !!selectedEvento;
                    
                    return (
                        <div className="judges-sync-card" title="Estado de Enlace de Jueces">
                            <div className="sync-desktop-row">
                                <div className="sync-role-node">
                                    <span className="sync-role-name">MESA DE LLEGADA</span>
                                    <span className={`sync-user-pill ${isSelfLinked ? 'connected' : 'disconnected'}`}>{myName.toUpperCase()}</span>
                                </div>
                                <div className={`sync-connector-line ${isControlLinked ? 'active' : 'inactive'}`}>
                                    <Link2 size={16} style={isControlLinked ? undefined : { strokeDasharray: '3,3' }} />
                                </div>
                                <div className="sync-role-node">
                                    <span className="sync-role-name">CONTROL</span>
                                    {connectedControl ? (
                                        <span className="sync-user-pill connected">{controlName.toUpperCase()}</span>
                                    ) : (
                                        <span className="sync-user-pill disconnected">DESCONECTADO</span>
                                    )}
                                </div>
                                <div className={`sync-connector-line ${isStarterLinked ? 'active' : 'inactive'}`}>
                                    <Link2 size={16} style={isStarterLinked ? undefined : { strokeDasharray: '3,3' }} />
                                </div>
                                <div className="sync-role-node">
                                    <span className="sync-role-name">LARGADOR</span>
                                    {connectedStarter ? (
                                        <span className="sync-user-pill connected">{starterName.toUpperCase()}</span>
                                    ) : (
                                        <span className="sync-user-pill disconnected">DESCONECTADO</span>
                                    )}
                                </div>
                            </div>
                            <div className="sync-mobile-dots" aria-label="Estado de enlace">
                                <div className={`sync-dot-item ${isSelfLinked ? 'on' : 'off'}`}>
                                    <span className="sync-dot" />
                                    <span className="sync-dot-label">Lleg.</span>
                                </div>
                                <div className={`sync-dot-item ${isControlLinked ? 'on' : 'off'}`}>
                                    <span className="sync-dot" />
                                    <span className="sync-dot-label">Ctrl</span>
                                </div>
                                <div className={`sync-dot-item ${isStarterLinked ? 'on' : 'off'}`}>
                                    <span className="sync-dot" />
                                    <span className="sync-dot-label">Larg.</span>
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </div>,
            document.getElementById('global-sync-bar-portal-target')
        )}

        {['Reconnecting', 'Connecting'].includes(connectionState) && (
            <div className="connection-state-alert-bar reconnecting">
                <RefreshCw className="spin animate-spin" size={14} />
                <span className="alert-text-full">Conexión inestable. Intentando sincronizar con el largador…</span>
                <span className="alert-text-short">Reconectando…</span>
                <button type="button" className="btn-refresh-sync" onClick={handleRefresh} disabled={refreshing}>
                    <RefreshCw size={14} className={refreshing ? 'spin animate-spin' : ''} />
                    <span className="btn-refresh-label">{refreshing ? '…' : 'Refrescar'}</span>
                </button>
            </div>
        )}
        {connectionState === 'Disconnected' && (
            <div className="connection-state-alert-bar disconnected">
                <span className="alert-text-full">Sin tiempo real — no recibirás largadas hasta recuperar señal.</span>
                <span className="alert-text-short">Sin señal</span>
                <button type="button" className="btn-refresh-sync" onClick={handleRefresh} disabled={refreshing}>
                    <RefreshCw size={14} className={refreshing ? 'spin animate-spin' : ''} />
                    <span className="btn-refresh-label">{refreshing ? '…' : 'Refrescar'}</span>
                </button>
            </div>
        )}
        <div className={`finisher-dashboard finisher-mobile-ready ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
            {globalAlert && (
                <div className="global-race-alert-overlay">
                    <div className="global-race-alert">
                        <div className="alert-card-content">
                            <div className="alert-icon-wrapper">
                                <Activity className="pulse-red" size={48} />
                            </div>
                            <h3>¡NUEVA LARGADA!</h3>
                            <p>Una prueba acaba de comenzar en el agua.</p>
                            <div className="alert-actions-vertical">
                                <button className="btn-jump-big" onClick={() => {
                                    const target = fases.find(f => f.id === globalAlert.faseId);
                                    if (target) {
                                        const updatedTarget = {
                                            ...target,
                                            estado: 'En Carrera',
                                            fechaHoraInicioReal: globalAlert.serverTime
                                        };
                                        setSelectedFase(updatedTarget);
                                        const parsed = parseStartMs(globalAlert.serverTime);
                                        if (!isNaN(parsed)) startLocalTimer(parsed);
                                    }
                                    setGlobalAlert(null);
                                }}>
                                    <Timer size={20} /> IR A LA PRUEBA Y CRONOMETRAR
                                </button>
                                <button className="btn-close-soft" onClick={() => setGlobalAlert(null)}>
                                    Ignorar por ahora
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <header className="finisher-header glass-effect">
                <div className="header-info">
                    <div className="race-header-toolbar">
                        <div className="badge-live blue">CRONOMETRISTA</div>
                        <button
                            type="button"
                            className="btn-refresh-sync"
                            onClick={handleRefresh}
                            disabled={refreshing || loading || !selectedEvento}
                            title="Recargar datos y reconectar"
                        >
                            <RefreshCw size={14} className={refreshing ? 'spin animate-spin' : ''} />
                            <span className="btn-refresh-label">{refreshing ? '…' : 'Refrescar'}</span>
                        </button>
                    </div>
                    {selectedFase ? (() => {
                        const p = selectedFase?.prueba?.prueba || selectedFase?.etapa?.eventoPrueba?.prueba || selectedFase?.eventoPrueba?.prueba;
                        const catName = p ? (CATEGORIA_NAMES[p.categoria?.id] || p.categoria?.nombre) : (selectedFase?.categoriaNombre || 'Sin Categoría');
                        const boteName = p ? (BOTE_NAMES[p.bote?.id] || p.bote?.nombre) : (selectedFase?.boteTipo || selectedFase?.tipoBote || 'Sin Bote');
                        const distName = p ? (DISTANCIA_NAMES[p.distancia?.id] || p.distancia?.metros + 'm') : (selectedFase?.distancia ? selectedFase.distancia + 'm' : '0m');
                        const timeName = formatTime(selectedFase?.fechaHoraProgramada);
                        const raceNum = selectedFase?.nroPrueba || (fases.findIndex(x => x.id === selectedFase?.id) !== -1 ? fases.findIndex(x => x.id === selectedFase?.id) + 1 : '');
                        
                        return (
                            <div className="race-header-info">
                                <h2>
                                    <span className="race-id-prefix">#{raceNum}</span>
                                    {' '}{catName}
                                </h2>
                                <div className="race-meta">
                                    <span className="meta-item"><Clock size={14} /> {timeName}</span>
                                    <span className="meta-item">{selectedFase?.nombreFase}</span>
                                    <span className="meta-item">{boteName}</span>
                                    <span className="meta-item">{distName}</span>
                                </div>
                            </div>
                        );
                    })() : (
                        <div className="race-header-info">
                            <h2 className="empty-race-title">Abrí el cronograma</h2>
                        </div>
                    )}

                    {selectedFase && (
                        <div className="quick-nav-footer race-nav-top">
                            <button 
                                type="button"
                                className="btn-nav-step" 
                                disabled={fases.findIndex(f => f.id === selectedFase?.id) <= 0}
                                onClick={() => {
                                    const idx = fases.findIndex(f => f.id === selectedFase?.id);
                                    if (idx > 0) setSelectedFase(fases[idx - 1]);
                                }}
                            >
                                <ArrowLeft size={16} /> <span className="nav-label">Ant.</span>
                            </button>
                            <span className="nav-index">
                                {fases.findIndex(f => f.id === selectedFase?.id) + 1}/{fases.length}
                            </span>
                            <button 
                                type="button"
                                className="btn-nav-step" 
                                disabled={fases.findIndex(f => f.id === selectedFase?.id) >= fases.length - 1}
                                onClick={() => {
                                    const idx = fases.findIndex(f => f.id === selectedFase?.id);
                                    if (idx < fases.length - 1) setSelectedFase(fases[idx + 1]);
                                }}
                            >
                                <span className="nav-label">Sig.</span> <ArrowRight size={16} />
                            </button>
                        </div>
                    )}
                </div>
                <div className={`main-timer ${isRaceRunning ? 'running' : ''}`}>
                    {formatTimer(elapsedTime)}
                </div>
                {startReceiveLagSec != null && startReceiveLagSec >= 1 && (
                    <div className="start-lag-chip" title="El reloj se sincronizó al instante del click del largador">
                        Largada recibida (+{startReceiveLagSec}s)
                    </div>
                )}
            </header>

            <div className="finisher-layout">
            <aside className={`finisher-sidebar glass-effect ${isSidebarCollapsed ? 'collapsed' : 'expanded'}`}>
                <button
                    type="button"
                    className="cronograma-toggle-bar"
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                >
                    <span className="cronograma-toggle-left">
                        <Clock size={16} />
                        <span>Cronograma</span>
                        <span className="cronograma-count">{fases.length}</span>
                    </span>
                    <span
                        className="cronograma-toggle-center"
                        title="Hora del sistema (sincronizada con el servidor)"
                    >
                        <span className="starter-live-clock">
                            <Clock size={16} className="starter-live-clock-icon" aria-hidden />
                            <time className="starter-live-clock-time" dateTime={liveClock}>{liveClock}</time>
                        </span>
                    </span>
                    <span className="cronograma-toggle-right">
                        {selectedFase && (
                            <span className="cronograma-current-chip">
                                #{selectedFase.nroPrueba || (fases.findIndex(x => x.id === selectedFase.id) + 1)}
                            </span>
                        )}
                        <span className="btn-collapse">{isSidebarCollapsed ? 'Abrir' : 'Cerrar'}</span>
                    </span>
                </button>

                {!isSidebarCollapsed && (
                    <div className="selection-stack cronograma-panel">
                        <div className="mobile-event-selector">
                            <label>Evento</label>
                            <select value={selectedEvento?.id || ''} onChange={(e) => setSelectedEvento(eventos.find(ev => ev.id === parseInt(e.target.value)))}>
                                <option value="">Seleccionar Evento...</option>
                                {eventos.map(ev => <option key={ev.id} value={ev.id}>{ev.nombre}</option>)}
                            </select>
                        </div>

                        <div className="sidebar-section-header desktop-only-toggle">
                            <label>Pruebas ({fases.length})</label>
                            <button type="button" className="btn-view-toggle" onClick={() => setIsCompact(!isCompact)}>
                                {isCompact ? <Layout size={14} /> : <Grid size={14} />}
                            </button>
                        </div>

                        <div className={`pruebas-list ${isCompact ? 'compact-grid' : ''}`}>
                            {fases.map((f, index) => (
                                <div 
                                    key={f.id} 
                                    className={`prueba-item-mini ${selectedFase?.id === f.id ? 'active' : ''} ${['Finalizada', 'Finalizado', 'Pendiente de Validación', 'PendienteValidacion'].includes(f.estado) ? 'finished' : ''}`} 
                                    onClick={() => { setSelectedFase(f); if (window.innerWidth <= 1000) setIsSidebarCollapsed(true); }}
                                >
                                    {['Finalizada', 'Finalizado', 'Pendiente de Validación', 'PendienteValidacion'].includes(f.estado) && <span className="status-dot finished"></span>}
                                    <span className="race-num">#{f.nroPrueba || (index + 1)}</span>
                                    {!isCompact && (() => {
                                        const p = f.prueba?.prueba || f.etapa?.eventoPrueba?.prueba || f.eventoPrueba?.prueba;
                                        const catName = p ? (CATEGORIA_NAMES[p.categoria?.id] || p.categoria?.nombre) : (f.categoriaNombre || 'Sin Categoría');
                                        return (
                                            <div className="prueba-item-detail">
                                                <span className="prueba-item-cat">{catName}</span>
                                                <span className="prueba-item-fase">{f.nombreFase}</span>
                                            </div>
                                        );
                                    })()}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </aside>

                <main className="finisher-main glass-effect">
                    {selectedFase ? (
                        <div className="quick-controls-panel">
                            <div className="lane-buttons-grid">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => {
                                    const res = resultados.find(r => r.carril === num);
                                    const isOccupied = !!res;
                                    const isFinished = res?.tiempoOficial;
                                    const hasStatus = res?.estadoCanto && res?.estadoCanto !== 'Pendiente';
                                    return (
                                        <button key={num} type="button" className={`lane-btn ${!isOccupied ? 'empty' : ''} ${isFinished ? 'finished' : ''} ${hasStatus ? 'has-status' : ''}`} onClick={() => handleLaneFinish(num)} disabled={!canCaptureFinish || !isOccupied || isFinished || hasStatus}>
                                            <span className="num">{num}</span>
                                            <span className="label">{isOccupied ? (hasStatus ? res.estadoCanto : (isFinished ? 'LLEGÓ' : 'LLEGADA')) : '-'}</span>
                                        </button>
                                    );
                                })}
                            </div>
                            <button 
                                type="button"
                                className={`btn-doubt ${canCaptureFinish ? 'active' : ''}`}
                                onClick={recordDoubt} 
                                disabled={!canCaptureFinish}
                            >
                                <Activity size={20} /> <span>DUDA (?)</span>
                            </button>
    
                            <div className="arribos-list">
                                <h3><Timer size={18} /> Arribos</h3>
                                <div className="arribos-grid">
                                    {arribosOrdenados.map((arrival, idx) => (
                                        <div key={arrival.id} className={`arrival-card ${arrival.type}`}>
                                            <div className="a-rank">{idx + 1}°</div>
                                            <div className="a-body">
                                                <span className="a-label">
                                                    {arrival.type === 'duda' ? '⚠ DUDA' : (arrival.label || `Carril ${arrival.carril || '—'}`)}
                                                </span>
                                                <span className="a-name">{arrival.participante ? getSoloApellido(arrival.participante) : '—'}</span>
                                            </div>
                                            <div className="a-time">{arrival.time}</div>
                                            <div className="a-actions">
                                                {arrival.type === 'duda' && <button type="button" className="btn-cancel-doubt" onClick={() => removeRawTime(arrival.id)}><XCircle size={16} /></button>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
    
                            {pendientes.length > 0 && (isRaceRunning || rawTimes.length > 0) && (
                                <div className="pendientes-panel fade-in">
                                    <h3>Atletas por clasificar</h3>
                                    <div className="pendientes-list">
                                        {pendientes.map(p => (
                                            <div key={p.id} className="pendiente-item">
                                                <span className="p-lane">{p.carril}</span>
                                                <div className="p-info">
                                                    <span className="p-name">{p.participanteNombre}</span>
                                                    <button type="button" className="btn-assign-quick" onClick={() => rawTimes.length > 0 ? assignRawTime(rawTimes[0], p.id) : handleRecordFinish(p.id)}>{rawTimes.length > 0 ? 'ASIGNAR ?' : 'LLEGADA'}</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="empty-msg">
                            <Activity size={40} opacity={0.25} />
                            <p>Abrí el cronograma y elegí una prueba</p>
                            {isSidebarCollapsed && (
                                <button type="button" className="btn-collapse empty-open-cronograma" onClick={() => setIsSidebarCollapsed(false)}>
                                    Abrir cronograma
                                </button>
                            )}
                        </div>
                    )}

                    <footer className="finisher-actions finisher-sticky-actions">
                        <button type="button" className="btn-reset" onClick={() => {
                            setConfirmDialog({
                                isOpen: true,
                                title: 'Reiniciar Reloj',
                                message: '¿Reiniciar el reloj y los tiempos capturados de esta carrera?',
                                type: 'warning',
                                onConfirm: () => {
                                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                                    setElapsedTime(0);
                                    stopLocalTimer();
                                    setRawTimes([]);
                                    setResultados(prev => prev.map(r => ({ ...r, tiempoOficial: null, msLlegada: null })));
                                }
                            });
                        }} disabled={!selectedFase}>
                            <RefreshCw size={18} /> Reiniciar
                        </button>
                        <button type="button" className="btn-save-official" onClick={handleSaveResults} disabled={!selectedFase || arribosOrdenados.length === 0 || arribosOrdenados.some(a => a.type === 'duda')}>
                            <Save size={18} /> Enviar
                        </button>
                    </footer>
                </main>
            </div>
        </div>
        {confirmDialog.isOpen && (
            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmDialog.onConfirm}
                title={confirmDialog.title}
                message={confirmDialog.message}
                type={confirmDialog.type || 'warning'}
            />
        )}
        </>
    );
};

export default FinisherDashboard;
