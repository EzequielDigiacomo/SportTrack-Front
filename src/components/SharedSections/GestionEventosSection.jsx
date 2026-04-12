import React, { useState, useEffect } from 'react';
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
        fechaFinInscripciones: '',
        ubicacion: '',
        descripcion: '',
        estado: 'Programado',
        inscripcionesHabilitadas: true
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
            ubicacion: form.ubicacion,
            fechaFinInscripciones: form.fechaFinInscripciones || null,
            estado: form.estado
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
                fechaFinInscripciones: '',
                ubicacion: '',
                descripcion: '',
                estado: 'Programado',
                inscripcionesHabilitadas: true
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
            fechaFinInscripciones: evento.fechaFinInscripciones ? evento.fechaFinInscripciones.substring(0, 10) : '',
            ubicacion: evento.ubicacion || '',
            descripcion: evento.descripcion || '',
            estado: evento.estado || 'Programado',
            inscripcionesHabilitadas: evento.inscripcionesAbiertas || true
        });
        setView('editar');
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
                    <button className="btn-admin-primary" onClick={() => setView('crear')}>+ Nuevo Evento</button>
                )}
                {view !== 'lista' && (
                    <button className="btn-admin-secondary" onClick={() => setView('lista')}>← Volver a la lista</button>
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
                                                {ev.inscripcionesAbiertas ? '✅ Abiertas' : '🔒 Cerradas'}
                                            </span>
                                        </td>
                                        <td>{estadoBadge(ev.estado)}</td>
                                        <td className="actions-cell">
                                            <button 
                                                className="btn-admin-primary" 
                                                onClick={() => handleOpenDashboard(ev)}
                                                style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', marginRight: '0.5rem' }}
                                            >
                                                ⚙️ Dirigir Carrera
                                            </button>
                                            <button 
                                                className="btn-admin-secondary" 
                                                onClick={() => handleEdit(ev)}
                                                style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                                            >
                                                ✏️ Editar
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
                                <label>Fecha del Evento *</label>
                                <input type="date" name="fecha" value={form.fecha} onChange={handleChange} required />
                            </div>
                            <div className="form-field">
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
                        </div>

                        <div className="pruebas-preview glass-effect">
                            <h4>⚙️ Configuración de Pruebas</h4>
                            <p className="hint-text">Después de crear el evento, podrás agregar las pruebas específicas (K1 500m Sub-16, C2 1000m Mayores, etc.) desde el panel de gestión.</p>
                            <div className="prueba-chips">
                                <span className="chip">K1 · K2 · K4</span>
                                <span className="chip">C1 · C2</span>
                                <span className="chip">200m · 500m · 1000m</span>
                                <span className="chip inactive">+ Configurar después</span>
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
                                <p style={{ margin: '0.5rem 0 0 0', color: 'var(--color-text-dim)' }}>
                                    📅 {new Date(selectedEvento.fecha).toLocaleDateString('es-AR')} | 📍 {selectedEvento.ubicacion || 'Sin ubicación'}
                                </p>
                            </div>

                            <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
                                <div className="dashboard-card glass-effect clickable" onClick={handleOpenConfig}>
                                    <div className="card-icon">📅</div>
                                    <h3>1. Armar Schedule</h3>
                                    <p className="card-label">Crear pruebas y horarios para que los clubes inscriban a sus atletas.</p>
                                </div>
                                <div className="dashboard-card glass-effect clickable" onClick={() => setActiveSubView('startlist')}>
                                    <div className="card-icon">📋</div>
                                    <h3>2. Start List</h3>
                                    <p className="card-label">Cerrar inscripciones, armar series y sortear carriles aleatoriamente.</p>
                                </div>
                                <div className="dashboard-card glass-effect clickable" onClick={() => setActiveSubView('resultados')}>
                                    <div className="card-icon">🏅</div>
                                    <h3>3. Result List</h3>
                                    <p className="card-label">Cargar tiempos oficiales al cruzar la meta y publicarlos en vivo.</p>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div>
                            <button className="btn-admin-secondary mb-md" onClick={() => setActiveSubView(null)}>
                                ← Volver al Menú de {selectedEvento.nombre}
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
