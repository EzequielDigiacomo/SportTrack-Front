import React from 'react';
import { ArrowLeft, Save } from 'lucide-react';

const EventForm = ({ initialData, onCancel, onSubmit, onChange, saving, isEditing }) => {
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
                        
                        <div className="checkbox-group-admin glass-effect mt-md">
                            <h5>Reglas Técnicas Federativas</h5>
                            <label className="admin-checkbox">
                                <input 
                                    type="checkbox" 
                                    checked={initialData.restringirSoloCategoriaPropia} 
                                    onChange={(e) => onChange('restringirSoloCategoriaPropia', e.target.checked)} 
                                />
                                <span>Solo permitir inscripción en categoría propia del atleta</span>
                            </label>
                            <label className="admin-checkbox">
                                <input 
                                    type="checkbox" 
                                    checked={initialData.permitirSub23EnSenior} 
                                    onChange={(e) => onChange('permitirSub23EnSenior', e.target.checked)} 
                                />
                                <span>Permitir atletas Sub23 en pruebas Senior</span>
                            </label>
                            <label className="admin-checkbox">
                                <input 
                                    type="checkbox" 
                                    checked={initialData.permitirMasterBajarASenior} 
                                    onChange={(e) => onChange('permitirMasterBajarASenior', e.target.checked)} 
                                />
                                <span>Permitir atletas Master en pruebas Senior</span>
                            </label>
                            <label className="admin-checkbox">
                                <input 
                                    type="checkbox" 
                                    checked={initialData.permitirCompletarK4} 
                                    onChange={(e) => onChange('permitirCompletarK4', e.target.checked)} 
                                />
                                <span>Permitir completar K4 con atletas de otras categorías</span>
                            </label>
                            <label className="admin-checkbox">
                                <input 
                                    type="checkbox" 
                                    checked={initialData.limitacionBotesAB} 
                                    onChange={(e) => onChange('limitacionBotesAB', e.target.checked)} 
                                />
                                <span>Limitación de Clubes (Máximo 2 botes por prueba: A y B)</span>
                            </label>
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
