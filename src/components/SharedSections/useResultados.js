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
            setIsLocked(lockedPruebas.includes(selectedPrueba));
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

    const parseTimeToTimeSpan = (timeStr) => {
        if (!timeStr || timeStr.trim() === '') return null;
        // Accepts formats: m:ss.cc, mm:ss.cc, h:mm:ss.cc
        // Backend expects TimeSpan: "00:mm:ss.fffffff"
        try {
            const parts = timeStr.trim().split(':');
            if (parts.length === 2) {
                // mm:ss.cc
                const [min, secStr] = parts;
                const [sec, ms] = (secStr || '0').split('.');
                const msFormatted = (ms || '00').padEnd(7, '0');
                return `00:${String(parseInt(min)).padStart(2,'0')}:${String(parseInt(sec)).padStart(2,'0')}.${msFormatted}`;
            } else if (parts.length === 3) {
                // h:mm:ss.cc
                const [hr, min, secStr] = parts;
                const [sec, ms] = (secStr || '0').split('.');
                const msFormatted = (ms || '00').padEnd(7, '0');
                return `${String(parseInt(hr)).padStart(2,'0')}:${String(parseInt(min)).padStart(2,'0')}:${String(parseInt(sec)).padStart(2,'0')}.${msFormatted}`;
            }
        } catch (e) {}
        return null;
    };

    const handleSaveTiempos = async () => {
        setSaving(true);
        try {
            const dto = Object.keys(tiemposLocales)
                .map(id => {
                    const data = tiemposLocales[id];
                    const tiempoParseado = parseTimeToTimeSpan(data.tiempoOficial);
                    return {
                        id: parseInt(id),
                        tiempoOficial: tiempoParseado,
                        posicion: data.posicion ? parseInt(data.posicion) : null
                    };
                })
                .filter(i => i.tiempoOficial || i.posicion);

            if (dto.length > 0) {
                await ResultadoService.batchUpdate(dto);
                await loadDatosPrueba(selectedPrueba);
                setMessage('✅ Tiempos oficiales guardados correctamente.');
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
        handleSortearCarriles, handleSaveTiempos, handleToggleSeeding,
        loadDatosPrueba
    };
};
