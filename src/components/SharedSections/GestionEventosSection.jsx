import React, { useState, useEffect } from 'react';
import { 
    Globe, 
    Settings, 
    Edit2, 
    Trash2, 
    Plus, 
    ArrowLeft, 
    Calendar, 
    MapPin, 
    ClipboardList, 
    Trophy,
    UserCircle,
    Copy,
    ChevronRight,
    Lock,
    Unlock
} from 'lucide-react';
import EventoService from '../../services/EventoService';
import ConfigurarPruebasModal from './ConfigurarPruebasModal';
import GestionResultadosSection from './GestionResultadosSection';
import './AdminSections.css';

const GestionEventosSection = () => {
    const [eventos, setEventos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('lista'); // 'lista' | 'crear' | 'dashboard'
    const [selectedEvento, setSelectedEvento] = useState(null);
    const [activeSubView, setActiveSubView] = useState(null); // 'startlist' | 'resultados'
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [form, setForm] = useState({
        nombre: '',
        fecha: '',
        fechaFin: '',
        fechaFinInscripciones: '',
        ubicacion: '',
        descripcion: '',
        estado: 'Programado',
        inscripcionesHabilitadas: true,
        restringirSoloCategoriaPropia: false,
        permitirSub23EnSenior: false,
        permitirMasterBajarASenior: false,
        permitirCompletarK4: false,
        limitacionBotesAB: false
    });
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState(null);

    useEffect(() => {
        if (msg) {
            const timer = setTimeout(() => setMsg(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [msg]);

    useEffect(() => { loadEventos(); }, []);

    const loadEventos = async () => {
        try {
            const data = await EventoService.getAll();
            setEventos(data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleOpenDashboard = (evento) => {
        setSelectedEvento(evento);
        setActiveSubView(null);
        setView('dashboard');
    };

    const handleOpenConfig = () => {
        setShowConfigModal(true);
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        const payload = {
            nombre: form.nombre,
            fecha: form.fecha,
            fechaFin: form.fechaFin || null,
            ubicacion: form.ubicacion,
            fechaFinInscripciones: form.fechaFinInscripciones || null,
            estado: form.estado,
            inscripcionesHabilitadas: form.inscripcionesHabilitadas,
            restringirSoloCategoriaPropia: form.restringirSoloCategoriaPropia,
            permitirSub23EnSenior: form.permitirSub23EnSenior,
            permitirMasterBajarASenior: form.permitirMasterBajarASenior,
            permitirCompletarK4: form.permitirCompletarK4,
            limitacionBotesAB: form.limitacionBotesAB
        };
        try {
            if (view === 'editar' && selectedEvento) {
                await EventoService.update(selectedEvento.id, payload);
                setMsg({ type: 'success', text: '¡Evento actualizado exitosamente!' });
            } else {
                await EventoService.create(payload);
                setMsg({ type: 'success', text: '¡Evento creado exitosamente!' });
            }
            setForm({
                nombre: '',
                fecha: '',
                fechaFin: '',
                fechaFinInscripciones: '',
                ubicacion: '',
                descripcion: '',
                estado: 'Programado',
                inscripcionesHabilitadas: true,
                restringirSoloCategoriaPropia: false,
                permitirSub23EnSenior: false,
                permitirMasterBajarASenior: false,
                permitirCompletarK4: false,
                limitacionBotesAB: false
            });
            setView('lista');
            loadEventos();
        } catch (err) {
            setMsg({ type: 'error', text: 'Error al guardar el evento: ' + err.message });
            console.error("Error saving event:", err);
        } finally { setSaving(false); }
    };

    const handleEdit = (evento) => {
        setSelectedEvento(evento);
        setForm({
            nombre: evento.nombre || '',
            fecha: evento.fecha ? evento.fecha.substring(0, 10) : '',
            fechaFin: evento.fechaFin ? evento.fechaFin.substring(0, 10) : '',
            fechaFinInscripciones: evento.fechaFinInscripciones ? evento.fechaFinInscripciones.substring(0, 10) : '',
            ubicacion: evento.ubicacion || '',
            descripcion: evento.descripcion || '',
            estado: evento.estado || 'Programado',
            inscripcionesHabilitadas: evento.inscripcionesHabilitadas ?? true,
            restringirSoloCategoriaPropia: evento.restringirSoloCategoriaPropia || false,
            permitirSub23EnSenior: evento.permitirSub23EnSenior || false,
            permitirMasterBajarASenior: evento.permitirMasterBajarASenior || false,
            permitirCompletarK4: evento.permitirCompletarK4 || false,
            limitacionBotesAB: evento.limitacionBotesAB || false
        });
        setView('editar');
    };

    const handleCopyLiveLink = (id, nombre) => {
        const url = `${window.location.origin}/resultados/${id}`;
        navigator.clipboard.writeText(url);
        setMsg({ type: 'info', text: `¡Link de "${nombre}" copiado al portapapeles!` });
    };

    const handleDelete = async (evento) => {
        if (window.confirm(`¿Estás seguro de que deseas eliminar el evento "${evento.nombre}"? Esta acción no se puede deshacer.`)) {
            try {
                await EventoService.delete(evento.id);
                setMsg({ type: 'success', text: '¡Evento eliminado correctamente!' });
                loadEventos();
            } catch (err) {
                setMsg({ type: 'error', text: 'Error al eliminar el evento: ' + err.message });
            }
        }
    };

    const estadoBadge = (estado) => {
        const map = {
            'Programado': { color: '#60a5fa', label: 'Programado' },
            'EnCurso': { color: '#34d399', label: 'En Curso' },
            'Finalizado': { color: '#9ca3af', label: 'Finalizado' },
            'Cancelado': { color: '#f87171', label: 'Cancelado' },
        };
        const s = map[estado] || { color: '#9ca3af', label: estado };
        return <span className="estado-badge" style={{ background: s.color + '22', color: s.color, border: `1px solid ${s.color}55` }}>{s.label}</span>;
    };

    return (
        <div className="admin-section fade-in">
            <div className="admin-section-header">
                <div>
                    <h2>Gestión de Eventos</h2>
                    <p className="section-desc">Administrá todas las competencias del sistema</p>
                </div>
                {view === 'lista' && (
                    <button className="btn-admin-primary" onClick={() => setView('crear')}>
                        <Plus size={18} style={{ marginRight: '6px' }} /> Nuevo Evento
                    </button>
                )}
                {view !== 'lista' && (
                    <button className="btn-admin-secondary" onClick={() => setView('lista')}>
                        <ArrowLeft size={18} style={{ marginRight: '6px' }} /> Atrás
                    </button>
                )}
            </div>

            {msg && <div className={`alert-msg ${msg.type}`}>{msg.text}</div>}

            {view === 'lista' && (
                loading ? <div className="loader-row"><div className="loader"></div></div> : (
                    <div className="admin-table-wrapper glass-effect">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Evento</th>
                                    <th>Fecha</th>
                                    <th>Ubicación</th>
                                    <th>Inscripciones</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {eventos.length ? eventos.map(ev => (
                                    <tr key={ev.id}>
                                        <td><strong>{ev.nombre}</strong></td>
                                        <td>{new Date(ev.fecha).toLocaleDateString('es-AR')}</td>
                                        <td>{ev.ubicacion || '—'}</td>
                                        <td>
                                            <span className={`inscripciones-tag ${ev.inscripcionesAbiertas ? 'open' : 'closed'}`}>
                                                {ev.inscripcionesAbiertas ? <><Unlock size={14} /> Abiertas</> : <><Lock size={14} /> Cerradas</>}
                                            </span>
                                        </td>
                                        <td>{estadoBadge(ev.estado)}</td>
                                        <td className="actions-cell">
                                            <button 
                                                className="btn-icon-admin primary"
                                                onClick={() => handleCopyLiveLink(ev.id, ev.nombre)}
                                                title="Copiar Link de Live Results"
                                            >
                                                <Copy size={18} />
                                            </button>
                                            <button 
                                                className="btn-admin-primary" 
                                                onClick={() => handleOpenDashboard(ev)}
                                                title="Dirigir Carrera"
                                            >
                                                <Settings size={16} /> Dirigir
                                            </button>
                                            <button 
                                                className="btn-admin-secondary" 
                                                onClick={() => handleEdit(ev)}
                                                title="Editar"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button 
                                                className="btn-admin-danger" 
                                                onClick={() => handleDelete(ev)}
                                                title="Eliminar"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="6" className="empty-row">No hay eventos creados aún</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )
            )}

            {(view === 'crear' || view === 'editar') && (
                <div className="create-event-form glass-effect">
                    <h3>{view === 'editar' ? 'Editar Evento' : 'Nuevo Evento Deportivo'}</h3>
                    <form onSubmit={handleSubmit}>
                        <div className="form-grid">
                            <div className="form-field full-width">
                                <label>Nombre del Evento *</label>
                                <input type="text" name="nombre" value={form.nombre} onChange={handleChange}
                                    placeholder="Ej: Campeonato Nacional de Canotaje 2026" required />
                            </div>
                            <div className="form-field">
                                <label>Fecha de Inicio *</label>
                                <input type="date" name="fecha" value={form.fecha} onChange={handleChange} required />
                            </div>
                            <div className="form-field">
                                <label>Fecha de Fin (Opcional)</label>
                                <input type="date" name="fechaFin" value={form.fechaFin} onChange={handleChange} />
                            </div>
                            <div className="form-field full-width">
                                <label>Cierre de Inscripciones</label>
                                <input type="date" name="fechaFinInscripciones" value={form.fechaFinInscripciones} onChange={handleChange} />
                            </div>
                            <div className="form-field">
                                <label>Ubicación</label>
                                <input type="text" name="ubicacion" value={form.ubicacion} onChange={handleChange}
                                    placeholder="Ciudad, Provincia" />
                            </div>
                            <div className="form-field">
                                <label>Estado Inicial</label>
                                <select name="estado" value={form.estado} onChange={handleChange}>
                                    <option value="Programado">Programado</option>
                                    <option value="EnCurso">En Curso</option>
                                    <option value="Finalizado">Finalizado</option>
                                    <option value="Cancelado">Cancelado</option>
                                </select>
                            </div>
                            <div className="form-field full-width">
                                <label>Descripción / Observaciones</label>
                                <textarea name="descripcion" value={form.descripcion} onChange={handleChange} rows="3"
                                    placeholder="Detalles del evento, reglas especiales, categorías limitadas..." />
                            </div>
                            <div className="form-field full-width">
                                <label className="checkbox-label">
                                    <input type="checkbox" name="inscripcionesHabilitadas" checked={form.inscripcionesHabilitadas} onChange={handleChange} />
                                    <span>Habilitar inscripciones al crear el evento</span>
                                </label>
                            </div>

                            <div className="form-rules-container full-width">
                                <h4>Reglas de Competencia</h4>
                                <div className="rules-grid">
                                    <label className="checkbox-label rule-card">
                                        <input type="checkbox" name="restringirSoloCategoriaPropia" checked={form.restringirSoloCategoriaPropia} onChange={handleChange} />
                                        <div className="rule-info">
                                            <strong>Categoría Única</strong>
                                            <span>El atleta solo puede competir en su categoría oficial por edad.</span>
                                        </div>
                                    </label>
                                    <label className="checkbox-label rule-card">
                                        <input type="checkbox" name="permitirSub23EnSenior" checked={form.permitirSub23EnSenior} onChange={handleChange} />
                                        <div className="rule-info">
                                            <strong>Sub23 en Senior</strong>
                                            <span>Permitir que atletas Sub23 se inscriban tanto en su categoría como en Senior.</span>
                                        </div>
                                    </label>
                                    <label className="checkbox-label rule-card">
                                        <input type="checkbox" name="permitirMasterBajarASenior" checked={form.permitirMasterBajarASenior} onChange={handleChange} />
                                        <div className="rule-info">
                                            <strong>Master A en Senior</strong>
                                            <span>Permitir que atletas Master A bajen a competir en la categoría Senior.</span>
                                        </div>
                                    </label>
                                    <label className="checkbox-label rule-card">
                                        <input type="checkbox" name="permitirCompletarK4" checked={form.permitirCompletarK4} onChange={handleChange} />
                                        <div className="rule-info">
                                            <strong>Refuerzo en K4</strong>
                                            <span>Permitir completar un bote K4 con 1 atleta de la categoría inmediata inferior (ej: 3 Seniors + 1 Junior).</span>
                                        </div>
                                    </label>
                                    <label className="checkbox-label rule-card">
                                        <input type="checkbox" name="limitacionBotesAB" checked={form.limitacionBotesAB} onChange={handleChange} />
                                        <div className="rule-info">
                                            <strong>Límite de Botes A y B</strong>
                                            <span>Solo se permite inscribir un máximo de 2 botes por club en esta prueba. <em>(Si se desactiva, las inscripciones son ilimitadas).</em></span>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <button type="submit" className="btn-submit-admin" disabled={saving}>
                            {saving ? <><div className="loader-sm"></div> Guardando...</> : (view === 'editar' ? 'Actualizar Evento' : '🏅 Crear Evento')}
                        </button>
                    </form>
                </div>
            )}
            
            {view === 'dashboard' && (
                <div className="event-dashboard fade-in">
                    
                    {!activeSubView ? (
                        <>
                            <div className="event-dashboard-header glass-effect" style={{ padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem' }}>
                                <h2 style={{ margin: 0, color: 'var(--color-primary)' }}>{selectedEvento.nombre}</h2>
                                <p style={{ margin: '0.5rem 0 0 0', color: 'var(--color-text-dim)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Calendar size={16} /> {new Date(selectedEvento.fecha).toLocaleDateString('es-AR')} | <MapPin size={16} /> {selectedEvento.ubicacion || 'Sin ubicación'}
                                </p>
                            </div>

                            <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
                                <div className="dashboard-card glass-effect clickable" onClick={handleOpenConfig}>
                                    <div className="card-icon"><Calendar size={32} /></div>
                                    <h3>1. Armar Schedule</h3>
                                    <p className="card-label">Crear pruebas y horarios para que los clubes inscriban a sus atletas.</p>
                                </div>
                                <div className="dashboard-card glass-effect clickable" onClick={() => setActiveSubView('startlist')}>
                                    <div className="card-icon"><ClipboardList size={32} /></div>
                                    <h3>2. Start List</h3>
                                    <p className="card-label">Cerrar inscripciones, armar series y sortear carriles aleatoriamente.</p>
                                </div>
                                <div className="dashboard-card glass-effect clickable" onClick={() => setActiveSubView('resultados')}>
                                    <div className="card-icon"><Trophy size={32} /></div>
                                    <h3>3. Result List</h3>
                                    <p className="card-label">Cargar tiempos oficiales al cruzar la meta y publicarlos en vivo.</p>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div>
                            <button className="btn-admin-secondary mb-md" onClick={() => setActiveSubView(null)}>
                                <ArrowLeft size={16} /> Atrás
                            </button>
                            <GestionResultadosSection 
                                preselectedEventoId={selectedEvento.id} 
                                defaultTab={activeSubView === 'startlist' ? 'startList' : 'resultados'} 
                            />
                        </div>
                    )}
                </div>
            )}

            {showConfigModal && (
                <ConfigurarPruebasModal 
                    evento={selectedEvento} 
                    onClose={() => setShowConfigModal(false)} 
                    onRefresh={loadEventos}
                />
            )}
        </div>
    );
};

export default GestionEventosSection;
