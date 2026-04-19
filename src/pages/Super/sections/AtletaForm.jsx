import React from 'react';
import { Save, ArrowLeft } from 'lucide-react';

const AtletaForm = ({ 
    initialData, 
    clubes = [], 
    onCancel, 
    onSubmit, 
    onChange, 
    saving, 
    isEditing,
    hideClubSelect = false
}) => {
    return (
        <div className="atleta-form-container fade-in">
            <div className="admin-form-card glass-effect">
                <form onSubmit={onSubmit} className="admin-grid-form">
                    <div className="form-section">
                        <h4>Datos Personales</h4>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Nombre</label>
                                <input 
                                    className="admin-input"
                                    type="text" 
                                    name="nombre"
                                    value={initialData.nombre} 
                                    onChange={(e) => onChange('nombre', e.target.value)} 
                                    required 
                                />
                            </div>
                            <div className="form-group">
                                <label>Apellido</label>
                                <input 
                                    className="admin-input"
                                    type="text" 
                                    name="apellido"
                                    value={initialData.apellido} 
                                    onChange={(e) => onChange('apellido', e.target.value)} 
                                    required 
                                />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>DNI / Cédula</label>
                                <input 
                                    className="admin-input"
                                    type="text" 
                                    name="dni"
                                    value={initialData.dni} 
                                    onChange={(e) => onChange('dni', e.target.value)} 
                                    required 
                                />
                            </div>
                            <div className="form-group">
                                <label>Sexo</label>
                                <select 
                                    className="admin-select"
                                    name="sexoId"
                                    value={initialData.sexoId} 
                                    onChange={(e) => onChange('sexoId', parseInt(e.target.value))}
                                >
                                    <option value={1}>Masculino</option>
                                    <option value={2}>Femenino</option>
                                    <option value={3}>Mixto</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Fecha de Nacimiento</label>
                            <input 
                                className="admin-input"
                                type="date" 
                                name="fechaNacimiento"
                                value={initialData.fechaNacimiento} 
                                onChange={(e) => onChange('fechaNacimiento', e.target.value)} 
                                required 
                            />
                        </div>
                    </div>

                    <div className="form-section">
                        <h4>Contacto y Afiliación</h4>
                        <div className="form-group">
                            <label>Email</label>
                            <input 
                                className="admin-input"
                                type="email" 
                                name="email"
                                value={initialData.email} 
                                onChange={(e) => onChange('email', e.target.value)} 
                                placeholder="ejemplo@correo.com"
                            />
                        </div>
                        
                        {!hideClubSelect && (
                            <div className="form-group">
                                <label>Club / Entidad</label>
                                <select 
                                    className="admin-select"
                                    name="clubId"
                                    value={initialData.clubId} 
                                    onChange={(e) => onChange('clubId', e.target.value)}
                                    required
                                >
                                    <option value="">Seleccionar Club...</option>
                                    {clubes.map(club => (
                                        <option key={club.id} value={club.id}>{club.nombre}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="form-group">
                            <label>País / Nacionalidad</label>
                            <input 
                                className="admin-input"
                                type="text" 
                                name="pais"
                                value={initialData.pais || 'Ecuador'} 
                                onChange={(e) => onChange('pais', e.target.value)} 
                            />
                        </div>
                    </div>

                    <div className="form-footer-actions">
                        <button type="button" className="btn-admin-secondary" onClick={onCancel}>Cancelar</button>
                        <button type="submit" className="btn-admin-primary" disabled={saving}>
                            <Save size={18} /> {saving ? 'Guardando...' : (isEditing ? 'Actualizar Atleta' : 'Registrar Atleta')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


export default AtletaForm;
