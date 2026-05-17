import React from 'react';
import { Save } from 'lucide-react';

const ClubForm = ({ initialData, onCancel, onSubmit, onChange, saving, isEditing, isSuperAdmin, planes }) => {
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
                                    required
                                />
                            </div>
                        </div>
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
                                    {planes.map(p => (
                                        <option key={p.id} value={p.id}>{p.nombre} ({p.maxAtletas === -1 ? 'Ilimitado' : p.maxAtletas + ' atletas'})</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {isSuperAdmin && !initialData.parentClubId && (
                        <div className="form-section glass-effect" style={{ gridColumn: 'span 2', padding: '1.5rem', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', marginTop: '1rem' }}>
                            <h4 style={{ color: 'var(--color-primary-light)', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                💳 Suscripción y Estado de Pago
                            </h4>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Frecuencia de Pago</label>
                                    <select 
                                        className="admin-select"
                                        name="frecuenciaPago"
                                        value={initialData.frecuenciaPago || 'Mensual'}
                                        onChange={(e) => onChange('frecuenciaPago', e.target.value)}
                                    >
                                        <option value="Mensual">Plan Mensual</option>
                                        <option value="Anual">Plan Anual</option>
                                    </select>
                                </div>
                                <div className="form-group" style={{ display: 'flex', alignItems: 'center', height: '100%', marginTop: '1.8rem' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', userSelect: 'none', color: 'var(--color-text)' }}>
                                        <input 
                                            type="checkbox"
                                            name="bloqueadoPorFaltaDePago"
                                            checked={initialData.bloqueadoPorFaltaDePago || false}
                                            onChange={(e) => onChange('bloqueadoPorFaltaDePago', e.target.checked)}
                                            style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--color-accent-orange)' }}
                                        />
                                        <span style={{ fontWeight: '600', color: initialData.bloqueadoPorFaltaDePago ? '#EF4444' : 'var(--color-text)' }}>
                                            ⚠️ Auto-bloquear por Falta de Pago
                                        </span>
                                    </label>
                                </div>
                            </div>
                            <div className="form-row" style={{ marginTop: '1rem' }}>
                                <div className="form-group">
                                    <label>Fecha de Alta del Plan</label>
                                    <input 
                                        className="admin-input"
                                        type="date"
                                        name="fechaAltaPlan"
                                        value={initialData.fechaAltaPlan || ''}
                                        onChange={(e) => onChange('fechaAltaPlan', e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Fecha de Vencimiento</label>
                                    <input 
                                        className="admin-input"
                                        type="date"
                                        name="fechaVencimientoPlan"
                                        value={initialData.fechaVencimientoPlan || ''}
                                        onChange={(e) => onChange('fechaVencimientoPlan', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

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
                                    required
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
                                    required
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
                                required
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
