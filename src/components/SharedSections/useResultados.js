import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import EventoService from '../../services/EventoService';
import ClubService from '../../services/ClubService';
import { PruebaService } from '../../services/ConfigService';
import InscripcionService from '../../services/InscripcionService';
import ResultadoService from '../../services/ResultadoService';
import FaseService from '../../services/FaseService';
import SchedulerService from '../../services/SchedulerService';
import { getClubFederationId, getUserFederationId } from '../../utils/apiHelpers';
import { applyPositionsToTiemposLocales, computePositionsForPhase, isExcludedFromRanking, mapEstadoCantoToBackend, normalizeEstadoCantoFromBackend } from '../../utils/resultadosHelpers';
import { getPromotionStatus } from '../../utils/promotionHelpers';

export const useResultados = (preselectedEventoId, defaultTab) => {
    const { user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [eventos, setEventos] = useState([]);
    const [selectedEvento, setSelectedEvento] = useState(() => localStorage.getItem('results_selected_evento') || preselectedEventoId || '');
    const [pruebas, setPruebas] = useState([]);
    const [selectedPrueba, setSelectedPrueba] = useState(() => localStorage.getItem('results_selected_prueba') || '');
    const [currentTab, setCurrentTab] = useState(defaultTab || 'startList');
    const [inscriptos, setInscriptos] = useState([]);
    const [fases, setFases] = useState([]);
    const [cronograma, setCronograma] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isLocked, setIsLocked] = useState(false);
    const [message, setMessage] = useState('');
    const [filtroVisualFase, setFiltroVisualFase] = useState('Todas');
    const [tiemposLocales, setTiemposLocales] = useState({});
    const [saveSuccess, setSaveSuccess] = useState(false);

    // When handleSelectRegata fires it fills this ref BEFORE changing selectedPrueba,
    // so the useEffect below can apply the intended filtro instead of resetting to 'Todas'.
    const pendingFiltro = useRef(null);

    // Deep-linking: respeta ?faseId= solo si coincide con la prueba activa; si no, limpia la URL.
    useEffect(() => {
        if (cronograma.length === 0) return;
        const params = new URLSearchParams(location.search);
        const faseId = params.get('faseId');
        const urlTab = params.get('tab');

        if (faseId) {
            const f = cronograma.find(x => String(x.id) === String(faseId));
            if (f) {
                const pid = f.eventoPruebaId || f.EventoPruebaId;
                if (!selectedPrueba || String(pid) === String(selectedPrueba)) {
                    pendingFiltro.current = f.nombreFase;
                    if (String(pid) !== String(selectedPrueba)) {
                        setSelectedPrueba(String(pid));
                    } else {
                        setFiltroVisualFase(f.nombreFase);
                    }
                } else {
                    params.delete('faseId');
                    const search = params.toString();
                    navigate(
                        { pathname: location.pathname, search: search ? `?${search}` : '' },
                        { replace: true }
                    );
                }
            }
        }

        if (urlTab) {
            setCurrentTab(urlTab);
        }
    }, [cronograma, location.search, selectedPrueba, navigate, location.pathname]);

    useEffect(() => {
        loadEventos();
    }, [user]);

    useEffect(() => {
        if (selectedEvento) {
            localStorage.setItem('results_selected_evento', selectedEvento);
            loadPruebas(selectedEvento);
            loadCronograma(selectedEvento);
            // No reseteamos selectedPrueba automáticamente si acaba de cargar de localStorage
            setInscriptos([]);
            setFases([]);
            setFiltroVisualFase('Todas');
        } else {
            localStorage.removeItem('results_selected_evento');
        }
    }, [selectedEvento]);

    useEffect(() => {
        if (selectedPrueba) {
            localStorage.setItem('results_selected_prueba', selectedPrueba);
            const lockedPruebas = JSON.parse(localStorage.getItem('locked_pruebas') || '[]');
            const sealedPruebas = JSON.parse(localStorage.getItem('sealed_pruebas') || '[]');
            setIsLocked(lockedPruebas.includes(selectedPrueba) || sealedPruebas.includes(selectedPrueba));
            // If handleSelectRegata pre-loaded a specific fase, apply it; otherwise reset to 'Todas'
            if (pendingFiltro.current !== null) {
                setFiltroVisualFase(pendingFiltro.current);
                pendingFiltro.current = null;
            } else {
                setFiltroVisualFase('Todas');
            }
            loadDatosPrueba(selectedPrueba);
        } else {
            localStorage.removeItem('results_selected_prueba');
            setFiltroVisualFase('Todas');
            setInscriptos([]);
            setFases([]);
            setTiemposLocales({});
            setIsLocked(false);
        }
    }, [selectedPrueba]);

    useEffect(() => {
        if (cronograma.length > 0 && pruebas.length > 0) {
            const mapping = {};
            cronograma.forEach((f, idx) => {
                const pid = f.eventoPruebaId || f.EventoPruebaId;
                if (!mapping[pid]) mapping[pid] = [];
                mapping[pid].push(idx + 1);
            });

            const sorted = [...pruebas].sort((a, b) => {
                const aNums = mapping[a.id] || [];
                const bNums = mapping[b.id] || [];
                const minA = aNums.length > 0 ? Math.min(...aNums) : Infinity;
                const minB = bNums.length > 0 ? Math.min(...bNums) : Infinity;

                if (minA !== minB) {
                    return minA - minB;
                }

                const timeA = new Date(a.fechaHora || a.FechaHora || 0).getTime();
                const timeB = new Date(b.fechaHora || b.FechaHora || 0).getTime();
                return timeA - timeB;
            });

            const orderChanged = sorted.some((p, i) => p.id !== pruebas[i]?.id);
            if (orderChanged) {
                setPruebas(sorted);
            }
        }
    }, [cronograma, pruebas]);

    const loadEventos = async () => {
        try {
            let data;
            if (user?.rol === 'Club' && user?.clubId) {
                const club = await ClubService.getById(user.clubId);
                const fedId = getClubFederationId(club);
                data = await EventoService.getAll(fedId);
            } else if (user?.rol === 'Admin') {
                const fedId = getUserFederationId(user);
                data = await EventoService.getAll(fedId);
            } else {
                data = await EventoService.getAll();
            }
            setEventos(data || []);
        } catch (error) {
            setMessage("Error al cargar eventos.");
        }
    };

    const loadPruebas = async (eventoId) => {
        try {
            const data = await PruebaService.getByEvento(eventoId);
            setPruebas((data || []).sort((a,b) => new Date(a.fechaHora) - new Date(b.fechaHora)));
        } catch (error) {
            // Error silently handled
        }
    };

    const loadCronograma = async (eventoId) => {
        const id = eventoId || selectedEvento;
        if (!id || id === 'undefined') return;
        
        try {
            const data = await FaseService.getByEvento(id);
            // Ordenar por fecha programada (evitando desvíos de zona horaria al comparar strings)
            const sorted = (data || []).sort((a, b) => {
                const dateA = a.fechaHoraProgramada || '2000-01-01T00:00:00';
                const dateB = b.fechaHoraProgramada || '2000-01-01T00:00:00';
                return dateA.localeCompare(dateB);
            });
            setCronograma(sorted);
        } catch (error) {
            // Error silently handled
        }
    };

    const loadDatosPrueba = async (pruebaId) => {
        if (!pruebaId || pruebaId === "EventoPrueba") return;
        setLoading(true);
        try {
            const [inscs, fs] = await Promise.all([
                InscripcionService.getByEventoPrueba(pruebaId),
                FaseService.getByEventoPrueba(pruebaId)
            ]);
            const rawInscs = inscs || [];
            
            // Lógica de Agrupación por Bote para K2/K4
            // Si varios inscriptos comparten la misma lista de tripulantes, es el mismo bote.
            const uniqueBoats = [];
            const seenKeys = new Set();

            rawInscs.forEach(ins => {
                // Obtenemos todos los IDs de la tripulación (Líder + Tripulantes)
                const allMemberIds = [
                    ins.participanteId, 
                    ...(ins.tripulantes || []).map(t => t.participanteId)
                ].filter(id => id != null);

                // Creamos una llave única basada en los IDs ordenados para identificar al mismo bote
                const boatKey = allMemberIds.sort((a, b) => a - b).join('-');

                if (!seenKeys.has(boatKey)) {
                    seenKeys.add(boatKey);
                    uniqueBoats.push(ins);
                }
            });

            setInscriptos(uniqueBoats);
            setFases(fs || []);
            
            const tls = {};
            (fs || []).forEach(f => {
                f.resultados.forEach(r => {
                    tls[r.id] = {
                        tiempoOficial: r.tiempoOficial || '',
                        posicion: r.posicion || '',
                        carril: r.carril || '',
                        participanteNombre: r.participanteNombre || '',
                        clubSigla: r.clubSigla || '',
                        estadoCanto: normalizeEstadoCantoFromBackend(r.estado)
                    };
                });
            });
            setTiemposLocales(tls);

            // Sincronizar bloqueo con la realidad de los datos (SOLO bloquea si hay tiempos oficiales REALES)
            const hasAnyOfficialTime = (fs || []).some(f => f.resultados.some(r => r.tiempoOficial && r.tiempoOficial !== ''));
            const sealedPruebas = JSON.parse(localStorage.getItem('sealed_pruebas') || '[]');
            const isSealed = sealedPruebas.includes(pruebaId);
            setIsLocked(isSealed || hasAnyOfficialTime);
        } catch (error) {
            setMessage("Error al cargar los datos.");
        } finally {
            setLoading(false);
        }
    };

    const handleSortearCarriles = async () => {
        const N = inscriptos.length;
        if (N > 9) {
            const requiredSeeds = Math.ceil(N / 9.0);
            const currentSeedsCount = inscriptos.filter(i => i.esCabezaDeSerie).length;
            if (currentSeedsCount !== requiredSeeds) {
                setMessage(`⚠️ Para realizar el sorteo con ${N} inscritos, debes seleccionar exactamente ${requiredSeeds} ${requiredSeeds === 1 ? 'cabeza' : 'cabezas'} de serie (actualmente tienes ${currentSeedsCount}).`);
                return;
            }
        }

        setSaving(true);
        try {
            // 1. Generar los Heats en el backend
            await FaseService.generar(selectedPrueba);
            
            // 2. AUTO-REPROGRAMAR: Aplicar el algoritmo de entreverado inteligente a todo el evento
            await handleRecalcularCronograma();

            // LIMPIAR BLOQUEOS
            const locked = JSON.parse(localStorage.getItem('locked_pruebas') || '[]');
            const newLocked = locked.filter(id => id !== selectedPrueba);
            localStorage.setItem('locked_pruebas', JSON.stringify(newLocked));
            setIsLocked(false);

            setMessage("✅ Heats generados y sincronizados con el horario original.");
            await loadDatosPrueba(selectedPrueba);
            await loadCronograma();
        } catch (error) {
            console.error("Error al sortear:", error);
            setMessage("❌ Error al generar heats.");
        } finally {
            setSaving(false);
        }
    };

    const handleGenerarManual = async (placements) => {
        const N = inscriptos.length;
        if (N > 9) {
            const requiredSeeds = Math.ceil(N / 9.0);
            const currentSeedsCount = inscriptos.filter(i => i.esCabezaDeSerie).length;
            if (currentSeedsCount !== requiredSeeds) {
                setMessage(`⚠️ Para realizar el sorteo manual con ${N} inscritos, debes seleccionar exactamente ${requiredSeeds} ${requiredSeeds === 1 ? 'cabeza' : 'cabezas'} de serie (actualmente tienes ${currentSeedsCount}).`);
                return;
            }
        }

        setSaving(true);
        try {
            await FaseService.generarManual(selectedPrueba, placements);
            await handleRecalcularCronograma();
            
            const locked = JSON.parse(localStorage.getItem('locked_pruebas') || '[]');
            const newLocked = locked.filter(id => id !== selectedPrueba);
            localStorage.setItem('locked_pruebas', JSON.stringify(newLocked));
            setIsLocked(false);

            setMessage("✅ Heats generados con organización manual.");
            await loadDatosPrueba(selectedPrueba);
            await loadCronograma();
        } catch (error) {
            console.error("Error al generar manual:", error);
            setMessage("❌ Error al generar organización manual.");
        } finally {
            setSaving(false);
        }
    };

    const handlePromoverEtapa = async () => {
        const status = getPromotionStatus(
            fases,
            inscriptos.length,
            filtroVisualFase === 'Todas' ? null : filtroVisualFase
        );

        if (!status.canPromote) {
            setMessage(`⚠️ ${status.message || 'No se puede promover en este momento.'}`);
            return;
        }

        if (!window.confirm(`¿Promover ${status.etapaNombre || 'la etapa'} y generar la siguiente ronda?`)) {
            return;
        }

        setSaving(true);
        try {
            await FaseService.promover(selectedPrueba);
            await handleRecalcularCronograma();
            setMessage("✅ Etapa promocionada exitosamente. Cronograma actualizado.");
            await loadDatosPrueba(selectedPrueba);
            await loadCronograma();
        } catch (error) {
            console.error("Error al promover:", error);
            setMessage("❌ Error al promover etapa: " + (error.response?.data?.message || error.message));
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteFase = async (id) => {
        if (!window.confirm("¿Estás seguro de eliminar esta fase? Esto podría invalidar los pases a fases posteriores si ya fueron generados.")) return;
        
        try {
            await FaseService.delete(id);
            setMessage("✅ Fase eliminada correctamente.");
            loadDatosPrueba(selectedPrueba);
        } catch (error) {
            setMessage("❌ Error al eliminar la fase.");
        }
    };

    const handleResetFase = async (id) => {
        if (!window.confirm("¿Estás seguro de reiniciar esta fase? Se borrarán todos los tiempos oficiales y posiciones de esta serie, pero se conservarán los carriles.")) return;
        
        setSaving(true);
        try {
            await FaseService.reiniciar(id);
            
            // Limpiar bloqueos locales para esta prueba si existían
            const locked = JSON.parse(localStorage.getItem('locked_pruebas') || '[]');
            const newLocked = locked.filter(itemId => itemId !== selectedPrueba);
            localStorage.setItem('locked_pruebas', JSON.stringify(newLocked));
            
            setIsLocked(false);
            setMessage("✅ Fase reiniciada correctamente. Tiempos borrados.");
            await loadDatosPrueba(selectedPrueba);
        } catch (error) {
            setMessage("❌ Error al reiniciar la fase.");
        } finally {
            setSaving(false);
        }
    };

    const handleFinalizarFase = async (id) => {
        if (!window.confirm("¿Confirmar estos resultados como OFICIALES y publicarlos en la web?")) return;
        setSaving(true);
        try {
            await FaseService.finalizar(id);
            setMessage("✅ Fase oficializada y publicada correctamente.");
            await loadDatosPrueba(selectedPrueba);
        } catch (error) {
            setMessage("❌ Error al oficializar la fase.");
        } finally {
            setSaving(false);
        }
    };

    const parseTimeToTimeSpan = (timeStr) => {
        if (!timeStr || timeStr.trim() === '') return null;
        try {
            const parts = timeStr.trim().split(':');
            if (parts.length === 2) {
                const [min, secStr] = parts;
                const [sec, ms] = (secStr || '0').split('.');
                // ms can be 1, 2, 3 digits... pad to 7
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

    const handleSaveTiempos = async (faseId, finalize = false) => {
        if (!faseId) {
            setMessage('⚠️ Seleccioná una fase para guardar.');
            return;
        }

        const fase = fases.find(f => String(f.id) === String(faseId));
        if (!fase?.resultados?.length) {
            setMessage('⚠️ La fase seleccionada no tiene resultados.');
            return;
        }

        if (finalize) {
            if (!window.confirm('¿Guardar los tiempos y publicar esta serie como resultados oficiales?')) {
                return;
            }
        }

        setSaving(true);
        setMessage(finalize ? '⏳ Guardando y oficializando...' : '⏳ Iniciando guardado...');
        try {
            const tiemposConPosiciones = applyPositionsToTiemposLocales(fase.resultados, tiemposLocales);
            setTiemposLocales(tiemposConPosiciones);

            const positionMap = computePositionsForPhase(fase.resultados, tiemposConPosiciones);
            const faseResultIds = new Set(fase.resultados.map(r => String(r.id)));

            const resultsToSave = [];
            for (const id of Object.keys(tiemposConPosiciones)) {
                if (!faseResultIds.has(String(id))) continue;

                const item = tiemposConPosiciones[id];
                if (!item) continue;

                const t = item.tiempoOficial;
                const c = item.carril;
                const n = item.participanteNombre;
                const s = item.clubSigla;
                const estado = item.estadoCanto;
                const excluded = isExcludedFromRanking(estado);

                if (t === undefined && c === undefined && n === undefined && s === undefined && !excluded) continue;

                resultsToSave.push({
                    id: parseInt(id),
                    tiempoOficial: excluded ? null : t,
                    posicion: excluded ? null : (positionMap[parseInt(id)] || null),
                    carril: c,
                    participanteNombre: n,
                    clubSigla: s,
                    estado: mapEstadoCantoToBackend(estado)
                });
            }

            if (resultsToSave.length === 0 && !finalize) {
                setMessage('⚠️ No hay datos nuevos para guardar en esta serie.');
                setSaving(false);
                return;
            }

            if (resultsToSave.length > 0) {
                const dto = resultsToSave.map(r => ({
                    id: r.id,
                    tiempoOficial: r.tiempoOficial ? parseTimeToTimeSpan(r.tiempoOficial) : null,
                    posicion: r.posicion ? parseInt(r.posicion) : null,
                    carril: r.carril ? parseInt(r.carril) : null,
                    participanteNombre: r.participanteNombre || null,
                    clubSigla: r.clubSigla || null,
                    estado: r.estado || null
                }));

                setMessage(`⏳ Enviando ${dto.length} resultados de ${fase.nombreFase}...`);
                await ResultadoService.batchUpdate(dto);
            }

            if (finalize) {
                await FaseService.finalizar(faseId);
            }
            
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);

            const locked = JSON.parse(localStorage.getItem('locked_pruebas') || '[]');
            if (!locked.includes(selectedPrueba)) {
                locked.push(selectedPrueba);
                localStorage.setItem('locked_pruebas', JSON.stringify(locked));
            }

            const esFinal = fases.some(f => 
                f.nombreFase.toLowerCase().includes('final') && 
                f.resultados.some(r => resultsToSave.some(d => d.id === r.id))
            );
            
            if (esFinal) {
                const sealed = JSON.parse(localStorage.getItem('sealed_pruebas') || '[]');
                if (!sealed.includes(selectedPrueba)) {
                    sealed.push(selectedPrueba);
                    localStorage.setItem('sealed_pruebas', JSON.stringify(sealed));
                }
            }

            setIsLocked(true);
            await loadDatosPrueba(selectedPrueba);

            if (finalize) {
                setMessage('✅ Tiempos guardados y serie oficializada correctamente.');
            } else {
                setMessage(esFinal ? '🔒 PRUEBA SELLADA: Resultados finales oficiales guardados.' : '✅ Tiempos guardados correctamente.');
            }
        } catch (err) {
            setMessage(finalize
                ? '❌ Error al guardar u oficializar: ' + (err.response?.data?.message || err.message)
                : '❌ Error interno al procesar.');
        } finally {
            setSaving(false);
        }
    };

    const handleToggleSeeding = async (inscId) => {
        const insToToggle = inscriptos.find(i => i.id === inscId);
        if (!insToToggle) return;

        const maxSeedsAllowed = Math.ceil(inscriptos.length / 9.0);
        const currentSeeds = inscriptos.filter(i => i.esCabezaDeSerie);

        // Si se intenta activar y ya se alcanzó el límite
        if (!insToToggle.esCabezaDeSerie && currentSeeds.length >= maxSeedsAllowed) {
            // Si el límite es 1, podemos hacer un SWAP automático para mejorar UX
            if (maxSeedsAllowed === 1 && currentSeeds.length === 1) {
                const oldSeed = currentSeeds[0];
                try {
                    // 1. Quitar la vieja
                    await InscripcionService.toggleSeeding(oldSeed.id);
                    // 2. Poner la nueva
                    await InscripcionService.toggleSeeding(inscId);
                    
                    setInscriptos(prev => prev.map(ins => {
                        if (ins.id === oldSeed.id) return { ...ins, esCabezaDeSerie: false };
                        if (ins.id === inscId) return { ...ins, esCabezaDeSerie: true };
                        return ins;
                    }));
                    setMessage("✅ Cabeza de serie actualizada.");
                    return;
                } catch (error) {
                    console.error("Error en swap de seeding:", error);
                    setMessage("❌ Error al cambiar el cabeza de serie.");
                    return;
                }
            }

            // Si el límite es > 1, mostramos el mensaje original
            setMessage(`⚠️ Límite alcanzado: máximo ${maxSeedsAllowed} ${maxSeedsAllowed === 1 ? 'cabeza' : 'cabezas'} de serie.`);
            return;
        }

        try {
            await InscripcionService.toggleSeeding(inscId);
            setInscriptos(prev => prev.map(ins => 
                ins.id === inscId ? { ...ins, esCabezaDeSerie: !ins.esCabezaDeSerie } : ins
            ));
        } catch (error) {
            setMessage("❌ Error de servidor al cambiar sembrado.");
        }
    };

    async function handleRecalcularCronograma() {
        if (!selectedEvento) return;
        setSaving(true);
        setMessage("⏳ Analizando cronograma y calculando gaps...");
        try {
            // 1. Obtener TODAS las fases del evento (no solo de la prueba actual)
            const todasLasFases = await FaseService.getByEvento(selectedEvento);
            const eventoConfig = eventos.find(e => String(e.id) === String(selectedEvento));

            if (!todasLasFases || todasLasFases.length === 0) {
                setMessage("⚠️ No hay fases generadas para este evento.");
                return;
            }

            // Mapear el GapSugerido desde la distancia para el motor
            const fasesConGaps = todasLasFases.map(f => ({
                ...f,
                gapSugerido: f.etapa?.eventoPrueba?.prueba?.distancia?.gapSugerido || 0
            }));

            // 2. Usar el motor matemático para recalcular
            const config = {
                horaInicioEvento: eventoConfig?.horaInicioEvento || "08:00",
                gapEntrePruebas: eventoConfig?.gapEntrePruebas || 10,
                sinReceso: eventoConfig?.sinReceso || false,
                horaInicioReceso: eventoConfig?.horaInicioReceso || "13:00",
                horaFinReceso: eventoConfig?.horaFinReceso || "14:00",
                gapRecuperacionMs: 40 * 60 * 1000,
                usarGapVariable: eventoConfig?.usarGapVariable || false,
            };
            const fasesReprogramadas = SchedulerService.recalcularTiempos(fasesConGaps, config);
            
            // Informar al usuario si el cronograma abarca múltiples días
            const diasTotales = Math.max(...fasesReprogramadas.map(f => f.diaOffset || 0)) + 1;
            
            if (diasTotales > 1) {
                if (!window.confirm(`⚠️ El cronograma se extenderá automáticamente a ${diasTotales} días para respetar el límite horario (18:00 hs). ¿Deseas aplicar el salto de día?`)) {
                    setSaving(false);
                    setMessage("❌ Operación cancelada por el usuario.");
                    return;
                }
            }

            // 3. Guardar cambios en masa (Batch Update de Fases)
            const dto = fasesReprogramadas.map(f => ({
                id: f.id,
                fechaHoraProgramada: f.nuevaHora || "08:00",
                diaOffset: f.diaOffset || 0
            }));

            // El backend necesita el DateTime completo, combinamos la fecha del evento, hora y offset de días
            const baseDateStr = (eventoConfig?.fecha || new Date().toISOString()).substring(0, 10);
            const [year, month, day] = baseDateStr.split('-').map(Number);
            
            const dtoFinal = dto.map(item => {
                // Generar un objeto Date local para combinar fecha y hora del programa
                const [h, m] = item.fechaHoraProgramada.split(':');
                const fDate = new Date(year, month - 1, day, parseInt(h), parseInt(m), 0);
                
                // Aplicar el offset de días si el cronograma saltó de jornada
                fDate.setDate(fDate.getDate() + item.diaOffset);
                
                return {
                    id: item.id,
                    // Enviamos el ISO string completo (UTC) para que el backend no tenga dudas
                    fechaHoraProgramada: fDate.toISOString()
                };
            });

            await FaseService.batchUpdate(dtoFinal);
            
            setMessage("✅ ¡Cronograma optimizado exitosamente! Gaps y recesos aplicados.");
            loadDatosPrueba(selectedPrueba);
            loadCronograma();
        } catch (error) {
            setMessage("❌ Error al aplicar el cronograma inteligente.");
        } finally {
            setSaving(false);
        }
    };

    const syncFaseIdInUrl = useCallback((faseId) => {
        const params = new URLSearchParams(location.search);
        const current = params.get('faseId');
        const next = faseId != null && faseId !== '' ? String(faseId) : null;
        if ((current || null) === next) return;
        if (next) params.set('faseId', next);
        else params.delete('faseId');
        const search = params.toString();
        navigate(
            { pathname: location.pathname, search: search ? `?${search}` : '' },
            { replace: true }
        );
    }, [location.pathname, location.search, navigate]);

    const handleSelectRegata = (fase) => {
        if (!fase) {
            pendingFiltro.current = null;
            setFiltroVisualFase('Todas');
            syncFaseIdInUrl(null);
            return;
        }

        const pid = String(fase.eventoPruebaId || fase.EventoPruebaId || '');
        const nombreFase = fase.nombreFase || fase.NombreFase || '';

        // Ir siempre a Resultados para que se vea la grilla de esa regata.
        setCurrentTab('resultados');
        syncFaseIdInUrl(fase.id);

        if (String(selectedPrueba) === pid) {
            // Misma prueba: el useEffect de selectedPrueba no corre; actualizar fase ya.
            pendingFiltro.current = null;
            setFiltroVisualFase(nombreFase || 'Todas');
            return;
        }

        // Otra prueba: guardar filtro para el useEffect que dispara loadDatosPrueba.
        pendingFiltro.current = nombreFase || null;
        setSelectedPrueba(pid);
    };

    const handleSelectFaseVisual = (nombreFase) => {
        const nombre = nombreFase || 'Todas';
        setFiltroVisualFase(nombre);
        if (!nombre || nombre === 'Todas') {
            syncFaseIdInUrl(null);
            return;
        }
        const match =
            (fases || []).find(f => f.nombreFase === nombre)
            || (cronograma || []).find(f =>
                String(f.eventoPruebaId || f.EventoPruebaId) === String(selectedPrueba)
                && f.nombreFase === nombre
            );
        syncFaseIdInUrl(match?.id ?? null);
    };

    /** Cambio manual de prueba: limpia faseId obsoleto en la URL para no volver a la prueba anterior. */
    const handleSelectPrueba = useCallback((pruebaId) => {
        const params = new URLSearchParams(location.search);
        const faseId = params.get('faseId');

        if (faseId) {
            const f = cronograma.find(x => String(x.id) === String(faseId));
            const fasePruebaId = f?.eventoPruebaId || f?.EventoPruebaId;
            if (!f || String(fasePruebaId) !== String(pruebaId)) {
                params.delete('faseId');
                const search = params.toString();
                navigate(
                    { pathname: location.pathname, search: search ? `?${search}` : '' },
                    { replace: true }
                );
            }
        }

        setSelectedPrueba(pruebaId || '');
    }, [cronograma, location.pathname, location.search, navigate]);

    const handleUpdateFaseDetails = async (id, details) => {
        setSaving(true);
        try {
            await FaseService.updateDetails(id, details);
            setMessage("✅ Detalles de la fase (clima/notas) actualizados.");
            // Actualizar el estado local para que se vea el cambio sin recargar
            setFases(prev => prev.map(f => f.id === id ? { ...f, ...details } : f));
        } catch (error) {
            console.error("Error al actualizar detalles:", error);
            setMessage("❌ Error al guardar notas climáticas.");
        } finally {
            setSaving(false);
        }
    };

    return {
        eventos, selectedEvento, setSelectedEvento,
        pruebas, selectedPrueba, setSelectedPrueba: handleSelectPrueba,
        currentTab, setCurrentTab,
        inscriptos, fases, cronograma,
        loading, saving, isLocked, message, setMessage,
        filtroVisualFase, setFiltroVisualFase: handleSelectFaseVisual,
        tiemposLocales, setTiemposLocales,
        saveSuccess,
        handleSortearCarriles, handleSaveTiempos, handleToggleSeeding, handlePromoverEtapa, handleDeleteFase, handleResetFase, handleFinalizarFase,
        handleGenerarManual,
        handleRecalcularCronograma,
        handleSelectRegata, loadCronograma,
        loadDatosPrueba,
        handleUpdateFaseDetails
    };
};
