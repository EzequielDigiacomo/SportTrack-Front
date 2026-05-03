import React, { useState } from 'react';
import { Save, Eye, EyeOff, User } from 'lucide-react';

const ROLES_JUEZ = ['Largador', 'Cronometrista', 'JuezControl'];

const LoginForm = ({ initialData, clubes, onCancel, onSubmit, onChange, saving, isEditing }) => {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const isJuezRole = ROLES_JUEZ.includes(initialData.rol);
    
    return (
        <div className="login-form-container fade-in">
            <div className="admin-form-card glass-effect">
                <form onSubmit={onSubmit} className="admin-grid-form">
                    {!isEditing ? (
                        <>
                            {/* ── 1. Rol y Permisos (primero — condiciona el resto del form) ── */}
                            <div className="form-section">
                                <h4>Rol y Permisos</h4>
                                <div className="form-group">
                                    <label>Tipo de Usuario / Rol *</label>
                                    <select 
                                        className="admin-select"
                                        name="rol"
                                        value={initialData.rol} 
                                        onChange={(e) => onChange('rol', e.target.value)}
                                        required
                                    >
                                        <option value="Club">Club (Representante)</option>
                                        <option value="Largador">Juez: Largador</option>
                                        <option value="Cronometrista">Juez: Cronometrista</option>
                                        <option value="JuezControl">Juez de Control</option>
                                        <option value="Admin">Administrador (Acceso Total)</option>
                                    </select>
                                </div>

                                {initialData.rol === 'Club' && (
                                    <div className="form-group fade-in">
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
                                )}
                            </div>

                            {/* ── 2. Credenciales de Acceso ── */}
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


                            {/* Datos personales — solo visible cuando se elige un rol de juez */}
                            {isJuezRole && (
                                <div className="form-section fade-in" style={{ gridColumn: '1 / -1', borderTop: '1px solid rgba(59,130,246,0.15)', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
                                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <User size={16} style={{ color: '#3b82f6' }} />
                                        Datos Personales del Juez
                                        <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--color-text-dim)', marginLeft: '0.5rem' }}>
                                            para identificación y trazabilidad de acciones
                                        </span>
                                    </h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1rem' }}>
                                        <div className="form-group">
                                            <label>Nombre *</label>
                                            <input 
                                                className="admin-input"
                                                type="text"
                                                name="nombre"
                                                value={initialData.nombre || ''}
                                                onChange={(e) => onChange('nombre', e.target.value)}
                                                placeholder="ej: Juan"
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Apellido *</label>
                                            <input 
                                                className="admin-input"
                                                type="text"
                                                name="apellido"
                                                value={initialData.apellido || ''}
                                                onChange={(e) => onChange('apellido', e.target.value)}
                                                placeholder="ej: Pérez"
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>DNI / Documento</label>
                                            <input 
                                                className="admin-input"
                                                type="text"
                                                name="dni"
                                                value={initialData.dni || ''}
                                                onChange={(e) => onChange('dni', e.target.value)}
                                                placeholder="ej: 30123456"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Teléfono</label>
                                            <input 
                                                className="admin-input"
                                                type="tel"
                                                name="telefono"
                                                value={initialData.telefono || ''}
                                                onChange={(e) => onChange('telefono', e.target.value)}
                                                placeholder="ej: +54 11 1234-5678"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="form-section full-width">
                            <h4>Actualizar Contraseña para <span style={{color:'#ffdd00', textShadow:'0 0 10px rgba(255,221,0,0.3)'}}>{initialData.username}</span>
                            {initialData.nombre && (
                                <span style={{ fontSize: '0.9rem', fontWeight: 400, color: '#94a3b8', marginLeft: '0.5rem' }}>
                                    ({initialData.nombre} {initialData.apellido})
                                </span>
                            )}
                            </h4>
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
