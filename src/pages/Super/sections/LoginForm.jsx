import React, { useState } from 'react';
import { Save, Eye, EyeOff } from 'lucide-react';

const LoginForm = ({ initialData, clubes, onCancel, onSubmit, onChange, saving, isEditing }) => {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    
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
                                    <div style={{ position: 'relative' }}>
                                        <input 
                                            className="admin-input"
                                            type={showPassword ? "text" : "password"} 
                                            name="password"
                                            value={initialData.password} 
                                            onChange={(e) => onChange('password', e.target.value)} 
                                            required 
                                            minLength="6"
                                            style={{ paddingRight: '2.5rem' }}
                                        />
                                        <button 
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                            title={showPassword ? "Ocultar" : "Mostrar"}
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Confirmar Contraseña *</label>
                                    <div style={{ position: 'relative' }}>
                                        <input 
                                            className="admin-input"
                                            type={showConfirmPassword ? "text" : "password"} 
                                            name="confirmPassword"
                                            value={initialData.confirmPassword} 
                                            onChange={(e) => onChange('confirmPassword', e.target.value)} 
                                            required 
                                            minLength="6"
                                            style={{ paddingRight: '2.5rem' }}
                                        />
                                        <button 
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                            title={showConfirmPassword ? "Ocultar" : "Mostrar"}
                                        >
                                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
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
                                <div style={{ position: 'relative' }}>
                                    <input 
                                        className="admin-input"
                                        type={showPassword ? "text" : "password"} 
                                        name="newPassword"
                                        value={initialData.newPassword} 
                                        onChange={(e) => onChange('newPassword', e.target.value)} 
                                        required 
                                        minLength="6"
                                        autoFocus
                                        style={{ paddingRight: '2.5rem' }}
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                        title={showPassword ? "Ocultar" : "Mostrar"}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Confirmar Nueva Contraseña *</label>
                                <div style={{ position: 'relative' }}>
                                    <input 
                                        className="admin-input"
                                        type={showConfirmPassword ? "text" : "password"} 
                                        name="confirmNewPassword"
                                        value={initialData.confirmNewPassword} 
                                        onChange={(e) => onChange('confirmNewPassword', e.target.value)} 
                                        required 
                                        minLength="6"
                                        style={{ paddingRight: '2.5rem' }}
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                        title={showConfirmPassword ? "Ocultar" : "Mostrar"}
                                    >
                                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
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
