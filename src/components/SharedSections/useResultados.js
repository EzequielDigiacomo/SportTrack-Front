import { useState, useEffect, useRef } from 'react';
import EventoService from '../../services/EventoService';
import { PruebaService } from '../../services/ConfigService';
import InscripcionService from '../../services/InscripcionService';
import ResultadoService from '../../services/ResultadoService';
import FaseService from '../../services/FaseService';
import SchedulerService from '../../services/SchedulerService';

export const useResultados = (preselectedEventoId, defaultTab) => {
    const [eventos, setEventos] = useState([]);
    const [selectedEvento, setSelectedEvento] = useState(preselectedEventoId || '');
    const [pruebas, setPruebas] = useState([]);
    const [selectedPrueba, setSelectedPrueba] = useState('');
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

    useEffect(() => {
        loadEventos();
    }, []);

    useEffect(() => {
        if (selectedEvento) {
            loadPruebas(selectedEvento);
            loadCronograma(selectedEvento);
            setSelectedPrueba('');
            setInscriptos([]);
            setFases([]);
            setFiltroVisualFase('Todas');
        }
    }, [selectedEvento]);

    useEffect(() => {
        if (selectedPrueba) {
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
            setFiltroVisualFase('Todas');
            setInscriptos([]);
            setFases([]);
            setTiemposLocales({});
            setIsLocked(false);
        }
    }, [selectedPrueba]);

    const loadEventos = async () => {
        try {
            const data = await EventoService.getAll();
            setEventos(data);
        } catch (error) {
            setMessage("Error al cargar eventos.");
        }
    };

    const loadPruebas = async (eventoId) => {
        try {
            const data = await PruebaService.getByEvento(eventoId);
            setPruebas((data || []).sort((a,b) => new Date(a.fechaHora) - new Date(b.fechaHora)));
        } catch (error) {
            console.error(error);
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
            console.error("Error al cargar cronograma:", error);
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
                        posicion: r.posicion || ''
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

    const handlePromoverEtapa = async () => {
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

    const handleSaveTiempos = async () => {
        window.alert("Iniciando proceso de guardado..."); // Diagnóstico forzado
        setSaving(true);
        setMessage('⏳ Iniciando guardado...');
        try {
            const resultsToSave = [];
            const ids = Object.keys(tiemposLocales);
            
            for (const id of ids) {
                const item = tiemposLocales[id];
                if (!item) continue;

                const t = item.tiempoOficial || '';
                const p = item.posicion;
                
                // Solo procesar si tiene algo
                if (!t && !p) continue;

                let totalMs = 99999999;
                const parts = String(t).split(':');
                if (parts.length === 2) {
                    const [m, sFull] = parts;
                    const [s, ms] = (sFull || '0').split('.');
                    totalMs = (parseInt(m) * 60000) + (parseInt(s) * 1000) + (parseInt((ms || '0').substring(0,3).padEnd(3,'0')));
                }

                resultsToSave.push({
                    id: parseInt(id),
                    tiempoOficial: t,
                    posicion: p,
                    totalMs
                });
            }

            if (resultsToSave.length === 0) {
                setMessage('⚠️ No hay datos nuevos para guardar.');
                setSaving(false);
                return;
            }

            // Si el usuario no puso posiciones, las calculamos por tiempo
            const needsPositions = resultsToSave.some(r => !r.posicion);
            if (needsPositions) {
                resultsToSave.sort((a,b) => a.totalMs - b.totalMs);
                resultsToSave.forEach((r, idx) => {
                    if (!r.posicion) r.posicion = idx + 1;
                });
            }

            const dto = resultsToSave.map(r => ({
                id: r.id,
                tiempoOficial: parseTimeToTimeSpan(r.tiempoOficial),
                posicion: r.posicion ? parseInt(r.posicion) : null
            }));

            setMessage(`⏳ Enviando ${dto.length} resultados...`);
            await ResultadoService.batchUpdate(dto);
            
            // Efecto visual de éxito
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);

            // Bloquear la prueba localmente
            const locked = JSON.parse(localStorage.getItem('locked_pruebas') || '[]');
            if (!locked.includes(selectedPrueba)) {
                locked.push(selectedPrueba);
                localStorage.setItem('locked_pruebas', JSON.stringify(locked));
            }

            const esFinal = fases.some(f => 
                f.nombreFase.toLowerCase().includes('final') && 
                f.resultados.some(r => dto.some(d => d.id === r.id))
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
            setMessage(esFinal ? '🔒 PRUEBA SELLADA: Resultados finales oficiales guardados.' : '✅ Tiempos guardados correctamente.');
        } catch (err) {
            console.error('Error crítico en handleSaveTiempos:', err);
            setMessage('❌ Error interno al procesar: ' + err.message);
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
            console.error("Error al toggle seeding:", error);
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
                // Instanciar a las 12:00 para evitar que el cambio de Zona Horaria reste 1 día por accidente
                const fDate = new Date(year, month - 1, day, 12, 0, 0);
                fDate.setDate(fDate.getDate() + item.diaOffset);
                
                const yyyy = fDate.getFullYear();
                const mm = String(fDate.getMonth() + 1).padStart(2, '0');
                const dd = String(fDate.getDate()).padStart(2, '0');
                
                return {
                    id: item.id,
                    fechaHoraProgramada: `${yyyy}-${mm}-${dd}T${item.fechaHoraProgramada}:00`
                };
            });

            await FaseService.batchUpdate(dtoFinal);
            
            setMessage("✅ ¡Cronograma optimizado exitosamente! Gaps y recesos aplicados.");
            loadDatosPrueba(selectedPrueba);
            loadCronograma();
        } catch (error) {
            console.error("Error al recalcular:", error);
            setMessage("❌ Error al aplicar el cronograma inteligente.");
        } finally {
            setSaving(false);
        }
    };

    const handleSelectRegata = (fase) => {
        if (!fase) {
            setSelectedPrueba(null);
            setFiltroVisualFase('Cronograma');
            return;
        }
        // Store the desired filter BEFORE triggering the selectedPrueba useEffect
        pendingFiltro.current = fase.nombreFase;
        // 1. Select the prueba (EventoPruebaId) — triggers useEffect which will consume pendingFiltro
        setSelectedPrueba(fase.eventoPruebaId);
    };

    return {
        eventos, selectedEvento, setSelectedEvento,
        pruebas, selectedPrueba, setSelectedPrueba,
        currentTab, setCurrentTab,
        inscriptos, fases, cronograma,
        loading, saving, isLocked, message, setMessage,
        filtroVisualFase, setFiltroVisualFase,
        tiemposLocales, setTiemposLocales,
        saveSuccess,
        handleSortearCarriles, handleSaveTiempos, handleToggleSeeding, handlePromoverEtapa, handleDeleteFase, handleResetFase, handleFinalizarFase,
        handleRecalcularCronograma,
        handleSelectRegata, loadCronograma,
        loadDatosPrueba
    };
};
