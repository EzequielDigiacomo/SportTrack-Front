import React, { useState, useEffect } from 'react';
import ProgressionAudit from '../../../components/Common/ProgressionAudit';
import { FileText, RefreshCw } from 'lucide-react';
import EventoService from '../../../services/EventoService';
import { PruebaService } from '../../../services/ConfigService';
import FaseService from '../../../services/FaseService';
import InscripcionService from '../../../services/InscripcionService';
import { buildFactualProgression } from '../../../utils/ProgressionEngine';
import { useAuth } from '../../../context/AuthContext';

const ProgressionAuditPage = () => {
    const { user } = useAuth();
    const [eventos, setEventos] = useState([]);
    const [selectedEventoId, setSelectedEventoId] = useState('');
    const [pruebas, setPruebas] = useState([]);
    const [selectedPruebaId, setSelectedPruebaId] = useState('');
    
    const [loading, setLoading] = useState(false);
    const [auditData, setAuditData] = useState([]);
    const [eventoPruebaMetaData, setEventoPruebaMetaData] = useState(null);

    // 1. Cargar Eventos
    useEffect(() => {
        const loadEventos = async () => {
            try {
                let data = [];
                // Lógica simplificada basada en el rol, asumiendo Admin/SuperAdmin
                data = await EventoService.getAll();
                setEventos(data || []);
            } catch (err) {
                console.error("Error cargando eventos", err);
            }
        };
        loadEventos();
    }, [user]);

    // 2. Cargar Pruebas cuando se selecciona un evento
    useEffect(() => {
        if (!selectedEventoId) {
            setPruebas([]);
            setSelectedPruebaId('');
            return;
        }
        const loadPruebas = async () => {
            try {
                const data = await PruebaService.getByEvento(selectedEventoId);
                setPruebas((data || []).sort((a,b) => new Date(a.fechaHora) - new Date(b.fechaHora)));
            } catch (err) {
                console.error("Error cargando pruebas", err);
            }
        };
        loadPruebas();
    }, [selectedEventoId]);

    // 3. Cargar Fases e Inscriptos cuando se selecciona una prueba
    const loadAuditData = async () => {
        if (!selectedPruebaId) return;
        setLoading(true);
        try {
            const [inscs, fs] = await Promise.all([
                InscripcionService.getByEventoPrueba(selectedPruebaId),
                FaseService.getByEventoPrueba(selectedPruebaId)
            ]);
            
            const pruebaSeleccionada = pruebas.find(p => String(p.id) === String(selectedPruebaId));
            if (pruebaSeleccionada) {
                setEventoPruebaMetaData({
                    nombre: pruebaSeleccionada.nombre || 'Prueba Seleccionada',
                    planProgresionAsignado: pruebaSeleccionada.planProgresionAsignado || 'Sin Plan Asignado'
                });
            }

            // Usar el motor para parsear el estado actual de los atletas
            const traceData = buildFactualProgression(inscs || [], fs || []);
            setAuditData(traceData);
        } catch (err) {
            console.error("Error cargando datos de auditoría", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedPruebaId) {
            loadAuditData();
        } else {
            setAuditData([]);
            setEventoPruebaMetaData(null);
        }
    }, [selectedPruebaId]);

    return (
        <div className="gestion-section fade-in">
            <div className="section-header">
                <div>
                    <h2 className="gradient-text">
                        <FileText size={28} className="inline-icon mr-2" />
                        Auditoría de Progresión
                    </h2>
                    <p className="section-subtitle">
                        Rastreo de pasajes y asignación de carriles del motor de reglas.
                    </p>
                </div>
            </div>

            <div className="admin-grid-form glass-effect p-md mb-lg" style={{ borderRadius: 'var(--radius-lg)' }}>
                <div className="form-group">
                    <label>1. Seleccionar Evento</label>
                    <select 
                        className="admin-select"
                        value={selectedEventoId}
                        onChange={(e) => setSelectedEventoId(e.target.value)}
                    >
                        <option value="">-- Elige un Evento --</option>
                        {eventos.map(ev => (
                            <option key={ev.id} value={ev.id}>{ev.nombre}</option>
                        ))}
                    </select>
                </div>
                <div className="form-group">
                    <label>2. Seleccionar Prueba</label>
                    <select 
                        className="admin-select"
                        value={selectedPruebaId}
                        onChange={(e) => setSelectedPruebaId(e.target.value)}
                        disabled={!selectedEventoId}
                    >
                        <option value="">-- Elige una Prueba --</option>
                        {pruebas.map(pr => (
                            <option key={pr.id} value={pr.id}>{pr.nombre}</option>
                        ))}
                    </select>
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button 
                        className="btn-admin-secondary" 
                        onClick={loadAuditData}
                        disabled={!selectedPruebaId || loading}
                    >
                        <RefreshCw size={16} className={loading ? 'spin' : ''} />
                        Actualizar
                    </button>
                </div>
            </div>

            <div className="section-content">
                {loading ? (
                    <div className="loader-container"><div className="loader"></div></div>
                ) : eventoPruebaMetaData ? (
                    <ProgressionAudit 
                        eventoPrueba={eventoPruebaMetaData} 
                        auditData={auditData} 
                    />
                ) : (
                    <div className="empty-state-card glass-effect">
                        <p>Selecciona un evento y una prueba para auditar el progreso de los atletas.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProgressionAuditPage;
