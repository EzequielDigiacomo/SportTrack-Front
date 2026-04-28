import { useState, useEffect } from 'react';
import EventoService from '../../services/EventoService';
import { PruebaService } from '../../services/ConfigService';
import InscripcionService from '../../services/InscripcionService';
import ResultadoService from '../../services/ResultadoService';
import FaseService from '../../services/FaseService';

export const useResultados = (preselectedEventoId, defaultTab) => {
    const [eventos, setEventos] = useState([]);
    const [selectedEvento, setSelectedEvento] = useState(preselectedEventoId || '');
    const [pruebas, setPruebas] = useState([]);
    const [selectedPrueba, setSelectedPrueba] = useState('');
    const [currentTab, setCurrentTab] = useState(defaultTab || 'startList');
    const [inscriptos, setInscriptos] = useState([]);
    const [fases, setFases] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isLocked, setIsLocked] = useState(false);
    const [message, setMessage] = useState('');
    const [filtroVisualFase, setFiltroVisualFase] = useState('Todas');
    const [tiemposLocales, setTiemposLocales] = useState({});
    const [saveSuccess, setSaveSuccess] = useState(false);

    useEffect(() => {
        loadEventos();
    }, []);

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
            const sealedPruebas = JSON.parse(localStorage.getItem('sealed_pruebas') || '[]');
            setIsLocked(lockedPruebas.includes(selectedPrueba) || sealedPruebas.includes(selectedPrueba));
            setFiltroVisualFase('Todas');
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

    const loadDatosPrueba = async (pruebaId) => {
        setLoading(true);
        try {
            const [inscs, fs] = await Promise.all([
                InscripcionService.getByEventoPrueba(pruebaId),
                FaseService.getByEventoPrueba(pruebaId)
            ]);
            setInscriptos(inscs || []);
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
            const newFases = await FaseService.generar(selectedPrueba);
            
            // LIMPIAR BLOQUEOS: Si estamos sorteando de nuevo, la prueba NO está bloqueada
            const locked = JSON.parse(localStorage.getItem('locked_pruebas') || '[]');
            const newLocked = locked.filter(id => id !== selectedPrueba);
            localStorage.setItem('locked_pruebas', JSON.stringify(newLocked));
            setIsLocked(false);

            setFases(newFases || []);
            setMessage("✅ Heats generados y carriles asignados.");
            loadDatosPrueba(selectedPrueba);
        } catch (error) {
            setMessage("❌ Error al generar las Fases.");
        } finally {
            setSaving(false);
        }
    };

    const handlePromoverEtapa = async () => {
        setSaving(true);
        try {
            const newFases = await FaseService.promover(selectedPrueba);
            setFases(newFases || []);
            setMessage("✅ Etapa promocionada exitosamente. Se generaron los pases a la siguiente fase.");
            loadDatosPrueba(selectedPrueba);
        } catch (error) {
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

    return {
        eventos, selectedEvento, setSelectedEvento,
        pruebas, selectedPrueba, setSelectedPrueba,
        currentTab, setCurrentTab,
        inscriptos, fases,
        loading, saving, isLocked, message, setMessage,
        filtroVisualFase, setFiltroVisualFase,
        tiemposLocales, setTiemposLocales,
        saveSuccess,
        handleSortearCarriles, handleSaveTiempos, handleToggleSeeding, handlePromoverEtapa, handleDeleteFase, handleResetFase, handleFinalizarFase,
        loadDatosPrueba
    };
};
