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

    const handleSaveTiempos = async () => {
        setSaving(true);
        try {
            const dto = Object.keys(tiemposLocales).map(id => {
                const data = tiemposLocales[id];
                return { id: parseInt(id), tiempoOficial: data.tiempoOficial, posicion: data.posicion ? parseInt(data.posicion) : null };
            }).filter(i => i.tiempoOficial || i.posicion);

            if (dto.length > 0) {
                await ResultadoService.batchUpdate(dto);
                await loadDatosPrueba(selectedPrueba);
                setMessage("✅ Tiempos guardados localmente.");
            }
        } catch (err) {
            setMessage("❌ Error al guardar.");
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
