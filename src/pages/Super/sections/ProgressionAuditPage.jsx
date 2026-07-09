import React, { useState, useEffect } from 'react';
import ProgressionAudit from '../../../components/Common/ProgressionAudit';
import { FileText, RefreshCw, Calendar, Search } from 'lucide-react';
import EventoService from '../../../services/EventoService';
import { PruebaService } from '../../../services/ConfigService';
import FaseService from '../../../services/FaseService';
import InscripcionService from '../../../services/InscripcionService';
import { buildFactualProgression } from '../../../utils/ProgressionEngine';
import { formatPruebaName } from '../../../utils/pruebaLabelUtils';
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
            // Recargar pruebas para asegurar que tenemos el PlanProgresionAsignado más reciente
            const freshPruebas = await PruebaService.getByEvento(selectedEventoId);
            setPruebas((freshPruebas || []).sort((a,b) => new Date(a.fechaHora) - new Date(b.fechaHora)));

            const [inscs, fs, auditFromApi] = await Promise.all([
                InscripcionService.getByEventoPrueba(selectedPruebaId),
                FaseService.getByEventoPrueba(selectedPruebaId),
                FaseService.getProgresionAudit(selectedPruebaId).catch(() => null)
            ]);
            
            const pruebaSeleccionada = (freshPruebas || []).find(p => String(p.id) === String(selectedPruebaId));
            const planRaw = pruebaSeleccionada?.planProgresionAsignado || 'Sin Plan';
            const planLabel = planRaw.startsWith('Plan') ? planRaw : (planRaw.match(/^[A-G]\d$/) ? `Plan ${planRaw}` : planRaw);

            if (pruebaSeleccionada) {
                setEventoPruebaMetaData({
                    nombre: formatPruebaName(pruebaSeleccionada, { forceBuild: true }),
                    planProgresionAsignado: planLabel
                });
            }

            if (auditFromApi?.length) {
                setAuditData(auditFromApi.map(row => ({
                    atleta: row.atleta,
                    eliminatoria: row.eliminatoria || '—',
                    semifinal: row.semifinal || '—',
                    final: row.final || '—',
                    plan: row.plan ? (row.plan.startsWith('Plan') ? row.plan : `Plan ${row.plan}`) : planLabel
                })));
            } else {
                const traceData = buildFactualProgression(inscs || [], fs || []);
                setAuditData(traceData.map(row => ({ ...row, plan: planLabel })));
            }
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

            <div className="resultados-header-section admin-form-card glass-effect" style={{ padding: '1.5rem 2rem', marginBottom: '2.5rem' }}>
                <div className="admin-grid-form" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                    <div className="form-group">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Calendar size={14} className="text-primary" /> Evento
                        </label>
                        <select 
                            className="admin-select"
                            value={selectedEventoId}
                            onChange={(e) => setSelectedEventoId(e.target.value)}
                            style={{ borderLeft: '3px solid var(--color-primary)' }}
                        >
                            <option value="">-- Elige un Evento --</option>
                            {eventos.map(ev => (
                                <option key={ev.id} value={ev.id}>{ev.nombre}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Search size={14} className="text-secondary" /> Prueba / Categoría
                        </label>
                        <select 
                            className="admin-select"
                            value={selectedPruebaId}
                            onChange={(e) => setSelectedPruebaId(e.target.value)}
                            disabled={!selectedEventoId}
                            style={{ borderLeft: '3px solid var(--color-secondary)' }}
                        >
                            <option value="">-- Elige una Prueba --</option>
                            {pruebas.map(pr => (
                                <option key={pr.id} value={pr.id}>{formatPruebaName(pr, { forceBuild: true })}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <button 
                            className="btn-admin-secondary" 
                            onClick={loadAuditData}
                            disabled={!selectedPruebaId || loading}
                            style={{ width: '100%' }}
                        >
                            <RefreshCw size={16} className={loading ? 'spin' : ''} />
                            Actualizar
                        </button>
                    </div>
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
