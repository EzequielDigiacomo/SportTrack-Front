import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Calendar, MapPin, Timer, ArrowLeft, Plus, Users, ClipboardList, Trash2 } from 'lucide-react';
import EventoService from '../../../services/EventoService';
import { PruebaService } from '../../../services/ConfigService';
import { useAuth } from '../../../context/AuthContext';
import { isControlTecnicoEvent, isControlTecnicoRole, isJudgeAdmin } from '../../../utils/controlTecnico';
import { resolveScopeFederationId } from '../../../utils/apiHelpers';
import ConfirmDialog from '../../../components/Common/ConfirmDialog';
import InscripcionAtletaModal from './InscripcionAtletaModal';
import GestionResultadosSection from '../../../components/SharedSections/GestionResultadosSection';
import { getUserFacingError } from '../../../utils/userFacingError';
import '../../../components/SharedSections/AdminSections.css';
import './Sections.css';

const BOTE_LABEL = { 1: 'K1', 2: 'K2', 3: 'K4', 4: 'C1', 5: 'C2' };
const DIST_LABEL = { 1: '200m', 5: '500m', 6: '1000m', 8: '2000m', 9: '3000m' };
const SEX_LABEL = { 1: 'Masc', 2: 'Fem', 3: 'Mixto' };

const emptyForm = () => ({
    controlNombreExtra: '',
    controlBote: '',
    controlDist: '',
    controlSex: '',
    controlFecha: new Date().toISOString().substring(0, 10),
});

const ControlesSection = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const isOperator = isControlTecnicoRole(user);
    const canDelete = isOperator || isJudgeAdmin(user);
    const [controles, setControles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('lista');
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [selectedControl, setSelectedControl] = useState(null);
    const [showInscripcion, setShowInscripcion] = useState(false);
    const [validationErrors, setValidationErrors] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState({ show: false, control: null });

    const fedIdFromUrl = new URLSearchParams(window.location.search).get('fedId');
    const scopeFedId = resolveScopeFederationId({ fedIdFromUrl, user, clubes: [] });

    useEffect(() => {
        loadControles();
    }, []);

    const loadControles = async () => {
        setLoading(true);
        try {
            const data = scopeFedId
                ? await EventoService.getAll(scopeFedId, { asFederation: true })
                : await EventoService.getAll();
            setControles((data || []).filter(isControlTecnicoEvent));
        } catch (error) {
            console.error('Error cargando controles:', error);
        } finally {
            setLoading(false);
        }
    };

    const requestDelete = (control, e) => {
        if (e) e.stopPropagation();
        setDeleteConfirm({ show: true, control });
    };

    const confirmDelete = async () => {
        const control = deleteConfirm.control;
        if (!control?.id) return;
        setSaving(true);
        try {
            await EventoService.delete(control.id);
            setDeleteConfirm({ show: false, control: null });
            if (selectedControl?.id === control.id) {
                setSelectedControl(null);
                setView('lista');
            }
            await loadControles();
        } catch (err) {
            setDeleteConfirm({ show: false, control: null });
            setValidationErrors({
                title: 'No se pudo eliminar',
                list: [getUserFacingError(err, 'No se pudo eliminar el control.')],
            });
        } finally {
            setSaving(false);
        }
    };

    const handleFieldChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleCreate = async () => {
        const missing = [];
        if (!form.controlBote) missing.push('Bote / Embarcación');
        if (!form.controlDist) missing.push('Distancia');
        if (!form.controlSex) missing.push('Rama (Sexo)');
        if (!form.controlFecha) missing.push('Fecha del Control');
        if (missing.length > 0) {
            setValidationErrors({ title: 'Faltan datos para el control', list: missing });
            return;
        }

        setSaving(true);
        try {
            const boteName = BOTE_LABEL[form.controlBote] || 'K1';
            const distName = DIST_LABEL[form.controlDist] || '500m';
            const sexName = SEX_LABEL[form.controlSex] || 'Masc';
            const extraName = form.controlNombreExtra ? ` - ${form.controlNombreExtra}` : '';

            const newEv = await EventoService.create({
                nombre: `Control ${distName} ${boteName} ${sexName}${extraName}`,
                fecha: form.controlFecha,
                fechaFin: form.controlFecha,
                estado: 'Programada',
                inscripcionesHabilitadas: true,
                federacionId: scopeFedId != null ? Number(scopeFedId) : (user?.federacionId || user?.FederacionId || null),
                clubId: null,
            });

            await PruebaService.assignToEvento(newEv.id, null, {
                categoriaId: 11,
                boteId: parseInt(form.controlBote, 10),
                distanciaId: parseInt(form.controlDist, 10),
                sexoId: parseInt(form.controlSex, 10),
                fechaHora: new Date(`${form.controlFecha}T08:00:00`).toISOString(),
            });

            setForm(emptyForm());
            setView('lista');
            await loadControles();
        } catch (err) {
            setValidationErrors({
                title: 'Error al crear control',
                list: [getUserFacingError(err, 'No se pudo crear el control. Revisá los datos e intentá de nuevo.')],
            });
        } finally {
            setSaving(false);
        }
    };

    const estadoBadge = (estado) => {
        const map = {
            Programado: { color: '#60a5fa', label: 'Programado' },
            Programada: { color: '#60a5fa', label: 'Programado' },
            EnCurso: { color: '#34d399', label: 'En Curso' },
            Finalizado: { color: '#9ca3af', label: 'Finalizado' },
            Finalizada: { color: '#9ca3af', label: 'Finalizado' },
            Cancelado: { color: '#f87171', label: 'Cancelado' },
        };
        const s = map[estado] || { color: '#9ca3af', label: estado };
        return (
            <span className="estado-badge" style={{ background: s.color + '22', color: s.color, border: `1px solid ${s.color}55` }}>
                {s.label}
            </span>
        );
    };

    return (
        <div className="section-container fade-in">
            {view === 'gestionar' && selectedControl ? (
                <div className="fade-in">
                    <div className="section-header" style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: '1.5rem' }}>
                        <button
                            className="btn-admin-secondary"
                            onClick={() => { setSelectedControl(null); setView('lista'); }}
                            style={{ padding: 0, width: 42, height: 42, borderRadius: '50%' }}
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h2 style={{ margin: 0 }}>{selectedControl.nombre}</h2>
                            <p className="subtitle">Inscribí atletas de club y armá la start list</p>
                        </div>
                        <button
                            type="button"
                            className="btn-admin-primary"
                            style={{ marginLeft: 'auto' }}
                            onClick={() => navigate('/jueces/largador')}
                        >
                            <Timer size={18} /> Cronometrar
                        </button>
                        {canDelete && (
                            <button
                                type="button"
                                className="btn-admin-secondary"
                                style={{ color: '#ef4444', borderColor: '#ef4444' }}
                                onClick={(e) => requestDelete(selectedControl, e)}
                            >
                                <Trash2 size={18} /> Eliminar
                            </button>
                        )}
                    </div>
                    <div className="dashboard-grid dashboard-grid-3col" style={{ marginBottom: '1.5rem' }}>
                        <div className="dashboard-card glass-effect clickable" onClick={() => setShowInscripcion(true)}>
                            <div className="card-icon"><Users size={32} /></div>
                            <h3>1. Inscribir atletas</h3>
                            <p>Atletas con club asignado (más adelante: solo selección SIGDEF).</p>
                        </div>
                        <div className="dashboard-card glass-effect">
                            <div className="card-icon"><ClipboardList size={32} /></div>
                            <h3>2. Start list</h3>
                            <p>Cerrá inscripciones, armá series y sorteá carriles (hasta 9 botes).</p>
                        </div>
                    </div>
                    <GestionResultadosSection
                        preselectedEventoId={selectedControl.id}
                        defaultTab="startList"
                        isEmbedded
                        viewMode="startlist"
                    />
                    {showInscripcion && (
                        <InscripcionAtletaModal
                            evento={selectedControl}
                            modoAdmin
                            onClose={() => setShowInscripcion(false)}
                        />
                    )}
                </div>
            ) : view === 'crear' ? (
                <>
                    <div className="section-header-row" style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
                        <button
                            className="btn-admin-secondary"
                            onClick={() => setView('lista')}
                            style={{ padding: 0, width: 42, height: 42, borderRadius: '50%' }}
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <h2 style={{ margin: 0 }}>Nuevo Control Técnico</h2>
                    </div>
                    <div className="admin-form-card glass-effect" style={{ maxWidth: 600, margin: '0 auto' }}>
                        <div className="admin-grid-form" style={{ padding: '2rem' }}>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label>Nombre extra (opcional)</label>
                                <input
                                    type="text"
                                    className="admin-input"
                                    placeholder="Ej: Tanda Mañana"
                                    value={form.controlNombreExtra}
                                    onChange={(e) => handleFieldChange('controlNombreExtra', e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label>Bote / Embarcación</label>
                                <select className="admin-select" value={form.controlBote} onChange={(e) => handleFieldChange('controlBote', e.target.value)}>
                                    <option value="">Seleccionar...</option>
                                    <option value="1">K1</option>
                                    <option value="2">K2</option>
                                    <option value="3">K4</option>
                                    <option value="4">C1</option>
                                    <option value="5">C2</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Distancia</label>
                                <select className="admin-select" value={form.controlDist} onChange={(e) => handleFieldChange('controlDist', e.target.value)}>
                                    <option value="">Seleccionar...</option>
                                    <option value="1">200m</option>
                                    <option value="5">500m</option>
                                    <option value="6">1000m</option>
                                    <option value="8">2000m</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Rama (Sexo)</label>
                                <select className="admin-select" value={form.controlSex} onChange={(e) => handleFieldChange('controlSex', e.target.value)}>
                                    <option value="">Seleccionar...</option>
                                    <option value="1">Masculino</option>
                                    <option value="2">Femenino</option>
                                    <option value="3">Mixto</option>
                                </select>
                            </div>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label>Fecha del Control</label>
                                <input
                                    type="date"
                                    className="admin-input"
                                    value={form.controlFecha}
                                    onChange={(e) => handleFieldChange('controlFecha', e.target.value)}
                                />
                            </div>
                            <div className="form-footer-actions mt-lg">
                                <button type="button" className="btn-admin-secondary" onClick={() => setView('lista')}>Cancelar</button>
                                <button type="button" className="btn-admin-primary" disabled={saving} onClick={handleCreate}>
                                    {saving ? 'Creando...' : 'Crear Control'}
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <>
                    <div className="section-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                            <button
                                className="btn-admin-secondary"
                                onClick={() => (isOperator ? navigate('/control-tecnico') : navigate(-1))}
                                title="Volver"
                                style={{ padding: 0, width: 42, height: 42, borderRadius: '50%', flexShrink: 0 }}
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                                <div className="icon-box" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: 10, borderRadius: 12 }}>
                                    <Timer size={32} />
                                </div>
                                <div>
                                    <h2>Controles Técnicos</h2>
                                    <p className="subtitle">Historial y gestión de controles internos de la federación</p>
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {isOperator && (
                                <button type="button" className="btn-admin-secondary" onClick={() => navigate('/jueces/largador')}>
                                    <Timer size={18} /> Cronometrar
                                </button>
                            )}
                            <button type="button" className="btn-admin-primary" onClick={() => setView('crear')}>
                                <Plus size={20} /> Nuevo Control
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="loader-container"><div className="loader"></div></div>
                    ) : controles.length > 0 ? (
                        <div className="eventos-grid">
                            {controles.map((control) => (
                                <div
                                    key={control.id}
                                    className="evento-card glass-effect animate-card"
                                    style={{ borderTop: '4px solid #f59e0b', cursor: 'pointer' }}
                                    onClick={() => { setSelectedControl(control); setView('gestionar'); }}
                                >
                                    <div className="evento-badge" style={{ background: '#f59e0b' }}>Control Técnico</div>
                                    <h3>{control.nombre}</h3>
                                    <p className="evento-date">
                                        <Calendar size={14} style={{ marginRight: 6 }} /> {new Date(control.fecha).toLocaleDateString()}
                                    </p>
                                    <p className="evento-location">
                                        <MapPin size={14} style={{ marginRight: 6 }} /> {control.ubicacion || 'Sin ubicación'}
                                    </p>
                                    <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                                        {estadoBadge(control.estado)}
                                        {canDelete && (
                                            <button
                                                type="button"
                                                className="btn-admin-secondary"
                                                style={{ color: '#ef4444', borderColor: '#ef444455', padding: '6px 10px' }}
                                                onClick={(e) => requestDelete(control, e)}
                                                title="Eliminar control"
                                            >
                                                <Trash2 size={16} /> Eliminar
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-state">
                            <Activity size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                            <p>No se han registrado controles técnicos en esta federación</p>
                            <button type="button" className="btn-admin-primary" style={{ marginTop: '1rem' }} onClick={() => setView('crear')}>
                                <Plus size={18} /> Crear el primero
                            </button>
                        </div>
                    )}
                </>
            )}

            <ConfirmDialog
                isOpen={deleteConfirm.show}
                onClose={() => setDeleteConfirm({ show: false, control: null })}
                onConfirm={confirmDelete}
                title="Eliminar control técnico"
                message={`¿Eliminar "${deleteConfirm.control?.nombre}"? Se borran inscripciones, series y tiempos. Esta acción no se puede deshacer.`}
                type="danger"
                confirmText="Sí, eliminar"
                loading={saving}
            />

            <ConfirmDialog
                isOpen={!!validationErrors}
                onClose={() => setValidationErrors(null)}
                title={validationErrors?.title || 'Atención'}
                message={
                    <div style={{ textAlign: 'left' }}>
                        {validationErrors?.list?.length > 1 ? (
                            <>
                                <p>Revisá estos campos:</p>
                                <ul style={{ marginTop: 10, fontWeight: 'bold' }}>
                                    {validationErrors.list.map((err, i) => (
                                        <li key={i}>• {err}</li>
                                    ))}
                                </ul>
                            </>
                        ) : (
                            <p>{validationErrors?.list?.[0]}</p>
                        )}
                    </div>
                }
                type="warning"
                confirmText="Entendido"
                onConfirm={() => setValidationErrors(null)}
            />
        </div>
    );
};

export default ControlesSection;
