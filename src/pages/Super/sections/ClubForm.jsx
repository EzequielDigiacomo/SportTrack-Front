import React from 'react';
import { Save } from 'lucide-react';

const ClubForm = ({ initialData, onCancel, onSubmit, onChange, saving, isEditing }) => {
    return (
        <div className="club-form-container fade-in">
            <div className="admin-form-card glass-effect">
                <form onSubmit={onSubmit} className="admin-grid-form">
                    <div className="form-section">
                        <h4>Datos Identificatorios</h4>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Nombre Institucional *</label>
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
                                <label>Sigla / Acrónimo</label>
                                <input 
                                    className="admin-input"
                                    type="text" 
                                    name="sigla"
                                    value={initialData.sigla} 
                                    onChange={(e) => onChange('sigla', e.target.value)} 
                                    maxLength="10"
                                    placeholder="Eje: CFD, CNS..."
                                />
                            </div>
                        </div>
                    </div>

                    <div className="form-section">
                        <h4>Información de Contacto</h4>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Email Oficial</label>
                                <input 
                                    className="admin-input"
                                    type="email" 
                                    name="email"
                                    value={initialData.email} 
                                    onChange={(e) => onChange('email', e.target.value)} 
                                />
                            </div>
                            <div className="form-group">
                                <label>Teléfono</label>
                                <input 
                                    className="admin-input"
                                    type="text" 
                                    name="telefono"
                                    value={initialData.telefono} 
                                    onChange={(e) => onChange('telefono', e.target.value)} 
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Ubicación / Sede</label>
                            <input 
                                className="admin-input"
                                type="text" 
                                name="ubicacion"
                                value={initialData.ubicacion} 
                                onChange={(e) => onChange('ubicacion', e.target.value)} 
                                placeholder="Ciudad, Provincia..."
                            />
                        </div>
                    </div>

                    <div className="form-footer-actions">
                        <button type="button" className="btn-admin-secondary" onClick={onCancel}>Cancelar</button>
                        <button type="submit" className="btn-admin-primary" disabled={saving}>
                            <Save size={18} /> {saving ? 'Guardando...' : (isEditing ? 'Actualizar Club' : 'Registrar Club')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ClubForm;
