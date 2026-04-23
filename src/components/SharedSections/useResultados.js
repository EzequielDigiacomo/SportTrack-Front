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
            loadDatosPrueba(selectedPrueba);
        } else {
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
        setSaving(true);
        try {
            // 1. Preparar datos y recalcular posiciones si es necesario
            const resultsToSave = Object.keys(tiemposLocales).map(id => ({
                id: parseInt(id),
                tiempoOficial: tiemposLocales[id].tiempoOficial,
                posicion: tiemposLocales[id].posicion,
                totalMs: (() => {
                    const t = tiemposLocales[id].tiempoOficial || '';
                    const parts = t.split(':');
                    if (parts.length === 2) {
                        const [m, sFull] = parts;
                        const [s, ms] = (sFull || '0').split('.');
                        return (parseInt(m) * 60000) + (parseInt(s) * 1000) + (parseInt((ms || '0').substring(0,3).padEnd(3,'0')));
                    }
                    return 99999999;
                })()
            }));

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
            })).filter(i => i.tiempoOficial || i.posicion);

            if (dto.length > 0) {
                await ResultadoService.batchUpdate(dto);
                
                // Bloquear la prueba
                const locked = JSON.parse(localStorage.getItem('locked_pruebas') || '[]');
                if (!locked.includes(selectedPrueba)) {
                    locked.push(selectedPrueba);
                    localStorage.setItem('locked_pruebas', JSON.stringify(locked));
                }

                // Si es una Final, guardamos una marca especial de "sellado"
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
                setMessage(esFinal ? '🔒 PRUEBA SELLADA: Resultados finales oficiales guardados.' : '✅ Tiempos guardados y prueba bloqueada para edición oficial.');
            } else {
                setMessage('⚠️ No hay tiempos válidos para guardar.');
            }
        } catch (err) {
            console.error('Error guardando tiempos:', err);
            setMessage('❌ Error al guardar: ' + (err.response?.data?.message || err.message));
        } finally {
            setSaving(false);
        }
    };

    const handleToggleSeeding = async (inscId) => {
        const insToToggle = inscriptos.find(i => i.id === inscId);
        if (!insToToggle) return;

        // Validar límite si se intenta activar (pasar de false a true)
        if (!insToToggle.esCabezaDeSerie) {
            const currentSeedsCount = inscriptos.filter(i => i.esCabezaDeSerie).length;
            const maxSeedsAllowed = Math.ceil(inscriptos.length / 9.0);

            if (currentSeedsCount >= maxSeedsAllowed) {
                setMessage(`⚠️ Límite alcanzado: máximo ${maxSeedsAllowed} ${maxSeedsAllowed === 1 ? 'cabeza' : 'cabezas'} de serie para ${inscriptos.length} atletas.`);
                return;
            }
        }

        try {
            await InscripcionService.toggleSeeding(inscId);
            setInscriptos(prev => prev.map(ins => 
                ins.id === inscId ? { ...ins, esCabezaDeSerie: !ins.esCabezaDeSerie } : ins
            ));
        } catch (error) {
            setMessage("Error al cambiar sembrado.");
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
        handleSortearCarriles, handleSaveTiempos, handleToggleSeeding, handlePromoverEtapa, handleDeleteFase,
        loadDatosPrueba
    };
};
