import React, { useState, useEffect, useMemo } from 'react';
import { Save, Eye, EyeOff, User } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import CustomSelect from '../../../components/Common/CustomSelect';
import { pick } from '../../../utils/apiHelpers';
import { isSuperAdminUser } from '../../../utils/authHelpers';
import {
    canAccessControlesLive,
    canAccessDashboardClub,
    normalizePlan,
} from '../../../utils/planHelpers';

const ROLES_JUEZ = ['Largador', 'Cronometrista', 'JuezControl'];
const DEFAULT_ROL = 'Admin';

const LoginForm = ({
    initialData,
    clubes = [],
    federaciones = [],
    effectiveFedId = null,
    onCancel,
    onSubmit,
    onChange,
    saving,
    isEditing,
    isEditingProfile,
    showFederationSelect = false,
    showClubSelect = false,
}) => {
    const { user } = useAuth();
    const isSuper = isSuperAdminUser(user);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const targetFedId = initialData.federacionId || effectiveFedId || '';

    const federationPlan = useMemo(() => {
        if (targetFedId) {
            const fed = federaciones.find(f => String(f.id) === String(targetFedId));
            if (fed?.plan) return normalizePlan(fed.plan);
            if (fed?.planSaaSId || fed?.planNombre) {
                return normalizePlan({
                    id: fed.planSaaSId,
                    nombre: fed.planNombre,
                });
            }
        }
        if (!isSuper) return normalizePlan(user?.plan);
        return null;
    }, [targetFedId, federaciones, isSuper, user?.plan]);

    const planForGates = federationPlan ?? (!isSuper ? normalizePlan(user?.plan) : null);

    const judgeRolesEnabled = isSuper
        ? (targetFedId ? canAccessControlesLive(federationPlan) : false)
        : canAccessControlesLive(planForGates);

    const clubRoleEnabled = isSuper
        ? (targetFedId ? canAccessDashboardClub(federationPlan) : false)
        : canAccessDashboardClub(planForGates);

    const needsFedFirst = !targetFedId && showFederationSelect;
    const judgeDisabledLabel = needsFedFirst
        ? '(Seleccioná federación primero)'
        : '(Exclusivo Ecosistema)';
    const clubDisabledLabel = needsFedFirst
        ? '(Seleccioná federación primero)'
        : '(Desde plan Profesional)';

    const isJuezRole = ROLES_JUEZ.includes(initialData.rol);
    const isClubRole = initialData.rol === 'Club';

    useEffect(() => {
        if (isEditing || isEditingProfile) return;
        if (isJuezRole && !judgeRolesEnabled) {
            onChange('rol', clubRoleEnabled ? 'Club' : DEFAULT_ROL);
            return;
        }
        if (isClubRole && !clubRoleEnabled) {
            onChange('rol', DEFAULT_ROL);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [judgeRolesEnabled, clubRoleEnabled, isJuezRole, isClubRole, isEditing, isEditingProfile]);
    
    return (
        <div className="login-form-container fade-in">
            <div className="admin-form-card glass-effect">
                <form onSubmit={onSubmit} className="admin-grid-form">
                    {!isEditing && !isEditingProfile ? (
                        <>
                            {/* ── 1. Rol y Permisos (primero — condiciona el resto del form) ── */}
                            <div className="form-section">
                                <h4>Rol y Permisos</h4>

                                {showFederationSelect && (
                                    <div className="form-group fade-in">
                                        <label>Federación *</label>
                                        <CustomSelect
                                            className="admin-select"
                                            name="federacionId"
                                            value={initialData.federacionId || ''}
                                            onChange={(val) => onChange('federacionId', val)}
                                            required
                                            placeholder="Seleccionar Federación..."
                                            options={federaciones.map(f => ({
                                                value: f.id,
                                                label: f.planNombre
                                                    ? `${f.nombre} — ${f.planNombre}`
                                                    : f.nombre,
                                            }))}
                                        />
                                        {targetFedId && federationPlan && (
                                            <small style={{ color: 'var(--color-text-dim)', fontSize: '0.75rem', display: 'block', marginTop: '0.35rem' }}>
                                                Plan: <strong>{federationPlan.nombre || 'Sin plan'}</strong>
                                                {clubRoleEnabled ? ' · Login Club OK' : ' · Sin login Club'}
                                                {judgeRolesEnabled
                                                    ? ' · Controles juez OK'
                                                    : ' · Sin Largador/Cronometrista/Juez de Control'}
                                            </small>
                                        )}
                                    </div>
                                )}

                                <div className="form-group">
                                    <label>Tipo de Usuario / Rol *</label>
                                    <CustomSelect 
                                        className="admin-select"
                                        name="rol"
                                        value={initialData.rol} 
                                        onChange={(val) => onChange('rol', val)}
                                        required={true}
                                        options={[
                                            { value: 'Admin', label: 'Administrador (Acceso Total)' },
                                            {
                                                value: 'Club',
                                                label: `Club (Representante) ${!clubRoleEnabled ? clubDisabledLabel : ''}`.trim(),
                                                disabled: !clubRoleEnabled,
                                            },
                                            { value: 'Largador', label: `Juez: Largador ${!judgeRolesEnabled ? judgeDisabledLabel : ''}`.trim(), disabled: !judgeRolesEnabled },
                                            { value: 'Cronometrista', label: `Juez: Cronometrista ${!judgeRolesEnabled ? judgeDisabledLabel : ''}`.trim(), disabled: !judgeRolesEnabled },
                                            { value: 'JuezControl', label: `Juez de Control ${!judgeRolesEnabled ? judgeDisabledLabel : ''}`.trim(), disabled: !judgeRolesEnabled },
                                        ]}
                                    />
                                </div>

                                {showClubSelect && (
                                    <div className="form-group fade-in">
                                        <label>Club a vincular *</label>
                                        <CustomSelect
                                            className="admin-select"
                                            name="clubId"
                                            value={initialData.clubId || ''}
                                            onChange={(val) => onChange('clubId', val)}
                                            required
                                            placeholder={clubes.length ? 'Seleccionar Club...' : 'No hay clubes en esta federación'}
                                            options={clubes.map(c => ({
                                                value: pick(c, 'id', 'Id'),
                                                label: c.nombre,
                                            }))}
                                        />
                                        {clubes.length === 0 && (
                                            <small style={{ color: 'var(--color-text-dim)', fontSize: '0.75rem' }}>
                                                Registrá primero un club en esa federación o elegí otra federación.
                                            </small>
                                        )}
                                    </div>
                                )}

                                {isSuper && initialData.rol !== 'Club' && (
                                    <div className="form-group fade-in">
                                        <label>Club asociado (opcional)</label>
                                        <CustomSelect
                                            className="admin-select"
                                            name="clubId"
                                            value={initialData.clubId || ''}
                                            onChange={(val) => onChange('clubId', val)}
                                            placeholder="Sin club específico"
                                            options={[
                                                { value: '', label: 'Sin club específico' },
                                                ...clubes.map(c => ({
                                                    value: pick(c, 'id', 'Id'),
                                                    label: c.nombre,
                                                })),
                                            ]}
                                        />
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


                            {/* Datos de Contacto */}
                            <div className="form-section fade-in" style={{ gridColumn: '1 / -1', borderTop: '1px solid rgba(59,130,246,0.15)', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
                                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <User size={16} style={{ color: '#3b82f6' }} />
                                    Datos de Contacto Adicional
                                    <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--color-text-dim)', marginLeft: '0.5rem' }}>
                                        (Opcional)
                                    </span>
                                </h4>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1rem' }}>
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
                        </>
                    ) : isEditing ? (
                        <div className="form-section full-width">
                            <h4>Actualizar Contraseña para <span style={{color:'#ffdd00', textShadow:'0 0 10px rgba(255,221,0,0.3)'}}>{initialData.username}</span>
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
                    ) : (
                        <div className="form-section full-width">
                            <h4>Editar Perfil de <span style={{color:'#ffdd00', textShadow:'0 0 10px rgba(255,221,0,0.3)'}}>{initialData.username}</span></h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1rem' }}>
                                <div className="form-group">
                                    <label>Email</label>
                                    <input className="admin-input" type="email" name="email" value={initialData.email || ''} onChange={(e) => onChange('email', e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Teléfono</label>
                                    <input className="admin-input" type="tel" name="telefono" value={initialData.telefono || ''} onChange={(e) => onChange('telefono', e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Email</label>
                                    <input className="admin-input" type="email" name="email" value={initialData.email || ''} onChange={(e) => onChange('email', e.target.value)} />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="form-footer-actions">
                        <button type="button" className="btn-admin-secondary" onClick={onCancel}>Cancelar</button>
                        <button type="submit" className="btn-admin-primary" disabled={saving}>
                            <Save size={18} /> {saving ? 'Guardando...' : (isEditing ? 'Actualizar Contraseña' : isEditingProfile ? 'Actualizar Perfil' : 'Crear Usuario')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LoginForm;
