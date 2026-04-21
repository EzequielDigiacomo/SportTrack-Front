import { ArrowLeft, Save } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const EventForm = ({ initialData, onCancel, onSubmit, onChange, saving, isEditing, clubes = [] }) => {
    const { user } = useAuth();
    const isAdmin = user?.rol === 'Admin';
    return (
        <div className="event-form-container fade-in">
            <div className="section-header-row" style={{ marginBottom: '2rem' }}>
                <button className="btn-admin-secondary" onClick={onCancel}>
                    <ArrowLeft size={18} style={{ marginRight: '6px' }} /> Volver
                </button>
                <h2>{isEditing ? 'Editar Evento' : 'Nuevo Evento'}</h2>
            </div>

            <div className="admin-form-card glass-effect">
                <form onSubmit={onSubmit} className="admin-grid-form">
                    <div className="form-section">
                        <h4>Información Básica</h4>
                        <div className="form-group">
                            <label>Nombre del Evento</label>
                            <input 
                                type="text" 
                                value={initialData.nombre} 
                                onChange={(e) => onChange('nombre', e.target.value)} 
                                required 
                                placeholder="Ej: Regata Nacional de Canotaje"
                            />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Fecha de Inicio</label>
                                <input 
                                    type="date" 
                                    value={initialData.fecha} 
                                    onChange={(e) => onChange('fecha', e.target.value)} 
                                    required 
                                />
                            </div>
                            <div className="form-group">
                                <label>Fecha de Finalización</label>
                                <input 
                                    type="date" 
                                    value={initialData.fechaFin} 
                                    onChange={(e) => onChange('fechaFin', e.target.value)} 
                                    required 
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Ubicación / Pista</label>
                            <input 
                                type="text" 
                                value={initialData.ubicacion} 
                                onChange={(e) => onChange('ubicacion', e.target.value)} 
                                placeholder="Ej: Lago San Pablo, Imbabura"
                            />
                        </div>

                        {isAdmin && (
                            <div className="form-group">
                                <label>Organizador (Club / Federación)</label>
                                <select 
                                    value={initialData.clubId} 
                                    onChange={(e) => onChange('clubId', e.target.value)}
                                >
                                    <option value="">Federación</option>
                                    {clubes.map(c => (
                                        <option key={c.id} value={c.id}>{c.nombre}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    <div className="form-section">
                        <h4>Reglas y Estado</h4>
                        <div className="form-group">
                            <label>Estado del Evento</label>
                            <select 
                                value={initialData.estado} 
                                onChange={(e) => onChange('estado', e.target.value)}
                            >
                                <option value="Programado">Programado</option>
                                <option value="EnCurso">En Curso</option>
                                <option value="Finalizado">Finalizado</option>
                                <option value="Cancelado">Cancelado</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Fin de Inscripciones</label>
                            <input 
                                type="date" 
                                value={initialData.fechaFinInscripciones} 
                                onChange={(e) => onChange('fechaFinInscripciones', e.target.value)} 
                            />
                        </div>
                        
                        <div className="form-rules-container glass-effect mt-md">
                            <h4>Reglas Técnicas Federativas</h4>
                            <div className="rules-grid">
                                <label className="checkbox-label rule-card">
                                    <input 
                                        type="checkbox" 
                                        checked={initialData.restringirSoloCategoriaPropia} 
                                        onChange={(e) => onChange('restringirSoloCategoriaPropia', e.target.checked)} 
                                    />
                                    <div className="rule-info">
                                        <strong>Solo permitir inscripción en categoría propia del atleta</strong>
                                    </div>
                                </label>
                                <label className="checkbox-label rule-card">
                                    <input 
                                        type="checkbox" 
                                        checked={initialData.permitirSub23EnSenior} 
                                        onChange={(e) => onChange('permitirSub23EnSenior', e.target.checked)} 
                                    />
                                    <div className="rule-info">
                                        <strong>Permitir atletas Sub23 en pruebas Senior</strong>
                                    </div>
                                </label>
                                <label className="checkbox-label rule-card">
                                    <input 
                                        type="checkbox" 
                                        checked={initialData.permitirMasterBajarASenior} 
                                        onChange={(e) => onChange('permitirMasterBajarASenior', e.target.checked)} 
                                    />
                                    <div className="rule-info">
                                        <strong>Permitir atletas Master en pruebas Senior</strong>
                                    </div>
                                </label>
                                <label className="checkbox-label rule-card">
                                    <input 
                                        type="checkbox" 
                                        checked={initialData.permitirCompletarK4} 
                                        onChange={(e) => onChange('permitirCompletarK4', e.target.checked)} 
                                    />
                                    <div className="rule-info">
                                        <strong>Permitir completar K4 con atletas de otras categorías</strong>
                                    </div>
                                </label>
                                <label className="checkbox-label rule-card">
                                    <input 
                                        type="checkbox" 
                                        checked={initialData.limitacionBotesAB} 
                                        onChange={(e) => onChange('limitacionBotesAB', e.target.checked)} 
                                    />
                                    <div className="rule-info">
                                        <strong>Limitación de Clubes (Máximo 2 botes por prueba: A y B)</strong>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="form-footer-actions">
                        <button type="button" className="btn-admin-secondary" onClick={onCancel}>Cancelar</button>
                        <button type="submit" className="btn-admin-primary" disabled={saving}>
                            <Save size={18} /> {saving ? 'Guardando...' : (isEditing ? 'Actualizar Evento' : 'Crear Evento')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


export default EventForm;
