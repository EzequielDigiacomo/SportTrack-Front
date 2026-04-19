import React from 'react';
import { Save } from 'lucide-react';

const LoginForm = ({ initialData, clubes, onCancel, onSubmit, onChange, saving, isEditing }) => {
    return (
        <div className="login-form-container fade-in">
            <div className="admin-form-card glass-effect">
                <form onSubmit={onSubmit} className="admin-grid-form">
                    {!isEditing ? (
                        <>
                            <div className="form-section">
                                <h4>Credenciales de Acceso</h4>
                                <div className="form-group">
                                    <label>Nombre de Usuario *</label>
                                    <input 
                                        className="admin-input"
                                        type="text" 
                                        name="username"
                                        value={initialData.username} 
                                        onChange={(e) => onChange('username', e.target.value)} 
                                        required 
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Email *</label>
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
                                    <label>Contraseña *</label>
                                    <input 
                                        className="admin-input"
                                        type="password" 
                                        name="password"
                                        value={initialData.password} 
                                        onChange={(e) => onChange('password', e.target.value)} 
                                        required 
                                        minLength="6"
                                    />
                                </div>
                            </div>

                            <div className="form-section">
                                <h4>Asignación de Club</h4>
                                <div className="form-group">
                                    <label>Club Correspondiente *</label>
                                    <select 
                                        className="admin-select"
                                        name="clubId"
                                        value={initialData.clubId} 
                                        onChange={(e) => onChange('clubId', e.target.value)}
                                        required
                                    >
                                        <option value="">Seleccionar Club...</option>
                                        {clubes.map(c => (
                                            <option key={c.id} value={c.id}>{c.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="form-section full-width">
                            <h4>Actualizar Contraseña para <span style={{color:'#ffdd00', textShadow:'0 0 10px rgba(255,221,0,0.3)'}}>{initialData.username}</span></h4>
                            <div className="form-group">
                                <label>Nueva Contraseña *</label>
                                <input 
                                    className="admin-input"
                                    type="password" 
                                    name="newPassword"
                                    value={initialData.newPassword} 
                                    onChange={(e) => onChange('newPassword', e.target.value)} 
                                    required 
                                    minLength="6"
                                    autoFocus
                                />
                            </div>
                        </div>
                    )}

                    <div className="form-footer-actions">
                        <button type="button" className="btn-admin-secondary" onClick={onCancel}>Cancelar</button>
                        <button type="submit" className="btn-admin-primary" disabled={saving}>
                            <Save size={18} /> {saving ? 'Guardando...' : (isEditing ? 'Actualizar Contraseña' : 'Crear Usuario')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LoginForm;
