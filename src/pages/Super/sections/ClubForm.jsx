import React from 'react';
import { Save } from 'lucide-react';

const ESTADO_MATRICULA_OPTIONS = [
    { value: 0, label: 'Pendiente' },
    { value: 1, label: 'Pagado (Al Día)' },
    { value: 2, label: 'Vencido' },
    { value: 3, label: 'Parcial' },
];

const ClubForm = ({ initialData, onCancel, onSubmit, onChange, saving, isEditing, isSuperAdmin, planes, federaciones = [], showFederationSelect = false }) => {
    return (
        <div className="club-form-container fade-in">
            <div className="admin-form-card glass-effect">
                <form onSubmit={onSubmit} className="admin-grid-form">

                    {/* SECCIÓN: DATOS IDENTIFICATORIOS */}
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
                                    value={initialData.sigla || initialData.siglas || ''} 
                                    onChange={(e) => { onChange('sigla', e.target.value); onChange('siglas', e.target.value); }}
                                    maxLength="10"
                                    placeholder="Eje: CFD, CNS..."
                                />
                            </div>
                        </div>
                        {showFederationSelect && (
                            <div className="form-group" style={{ marginTop: '1rem' }}>
                                <label>Federación *</label>
                                <select
                                    className="admin-select"
                                    name="federacionId"
                                    value={initialData.federacionId || ''}
                                    onChange={(e) => onChange('federacionId', e.target.value ? parseInt(e.target.value) : '')}
                                    required
                                >
                                    <option value="">Seleccionar Federación</option>
                                    {federaciones.map(f => (
                                        <option key={f.id} value={f.id}>{f.nombre}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        {isSuperAdmin && (
                            <div className="form-group" style={{ marginTop: '1rem' }}>
                                <label>Plan SaaS contratado</label>
                                <select 
                                    className="admin-select"
                                    name="planSaaSId"
                                    value={initialData.planSaaSId || ''}
                                    onChange={(e) => onChange('planSaaSId', e.target.value ? parseInt(e.target.value) : null)}
                                >
                                    <option value="">-- Seleccionar Plan --</option>
                                    {planes && planes.map(p => (
                                        <option key={p.id} value={p.id}>{p.nombre} ({p.maxAtletas === -1 ? 'Ilimitado' : p.maxAtletas + ' atletas'})</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* SECCIÓN: INFORMACIÓN DE CONTACTO */}
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
                            <label>Ubicación / Sede / Dirección</label>
                            <input 
                                className="admin-input"
                                type="text" 
                                name="ubicacion"
                                value={initialData.ubicacion || initialData.direccion || ''} 
                                onChange={(e) => { onChange('ubicacion', e.target.value); onChange('direccion', e.target.value); }}
                                placeholder="Ciudad, Provincia..."
                            />
                        </div>
                    </div>

                    {/* SECCIÓN: ESTADO ADMINISTRATIVO */}
                    <div className="form-section">
                        <h4>Estado Administrativo</h4>
                        <div className="form-group">
                            <label>Estado de Matrícula (Federación)</label>
                            <select 
                                className="admin-select"
                                name="estadoMatricula"
                                value={initialData.estadoMatricula ?? 0}
                                onChange={(e) => onChange('estadoMatricula', parseInt(e.target.value))}
                            >
                                {ESTADO_MATRICULA_OPTIONS.map(o => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
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
