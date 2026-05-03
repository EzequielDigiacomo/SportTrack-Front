import React from 'react';
import { Key, Power, PowerOff } from 'lucide-react';

const ROL_LABEL = {
    'Admin':         { label: 'Admin',          color: '#ef4444' },
    'Club':          { label: 'Club',            color: '#22c55e' },
    'Largador':      { label: 'Largador',        color: '#f59e0b' },
    'Cronometrista': { label: 'Cronometrista',   color: '#3b82f6' },
    'JuezControl':   { label: 'Juez de Control', color: '#8b5cf6' },
};

// Roles que pueden ser desactivados (los jueces auxiliares, no Admin/Club)
const ROLES_TOGGLABLES = ['Largador', 'Cronometrista', 'JuezControl'];

const RolBadge = ({ rol }) => {
    const meta = ROL_LABEL[rol] || { label: rol, color: '#94a3b8' };
    return (
        <span style={{
            display: 'inline-block',
            fontSize: '0.7rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.4px',
            padding: '2px 8px',
            borderRadius: '10px',
            background: meta.color + '18',
            color: meta.color,
            border: `1px solid ${meta.color}44`,
        }}>
            {meta.label}
        </span>
    );
};

const EstadoBadge = ({ activo }) => (
    <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '0.68rem',
        fontWeight: 600,
        padding: '2px 7px',
        borderRadius: '10px',
        background: activo !== false ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
        color: activo !== false ? '#22c55e' : '#ef4444',
        border: `1px solid ${activo !== false ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
    }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
        {activo !== false ? 'Activa' : 'Inactiva'}
    </span>
);

const LoginGrid = ({ usuarios, onEditPassword, onToggleActivo }) => {
    return (
        <div className="login-grid-container fade-in">
            {/* Mobile View */}
            <div className="logins-mobile-list">
                {usuarios.map(u => (
                    <div key={u.id} className="admin-native-card glass-effect mb-sm" style={{ opacity: u.activo === false ? 0.6 : 1 }}>
                        <div className="card-accent-bar ecu-yellow" />
                        <div className="card-content">
                            <h4 className="flex-row gap-xs" style={{ flexWrap: 'wrap' }}>
                                {u.username}
                                <RolBadge rol={u.rol} />
                                <EstadoBadge activo={u.activo} />
                            </h4>
                            {(u.nombre || u.apellido) && (
                                <p style={{ margin: '2px 0', fontWeight: 600, color: '#e2e8f0', fontSize: '0.9rem' }}>
                                    👤 {[u.nombre, u.apellido].filter(Boolean).join(' ')}
                                    {u.dni && <span style={{ color: '#64748b', fontSize: '0.8rem', marginLeft: '0.5rem' }}>· DNI {u.dni}</span>}
                                </p>
                            )}
                            <p className="text-muted text-sm">📧 {u.email || 'Sin email'}</p>
                            {u.clubNombre && <p className="text-muted text-xs">🏟️ {u.clubNombre}</p>}
                            {u.telefono && <p className="text-muted text-xs">📞 {u.telefono}</p>}
                        </div>
                        <div className="card-actions-row">
                            <button className="btn-icon-view" onClick={() => onEditPassword(u)} title="Cambiar Contraseña">
                                <Key size={16} />
                            </button>
                            {ROLES_TOGGLABLES.includes(u.rol) && (
                                <button
                                    onClick={() => onToggleActivo(u)}
                                    title={u.activo === false ? 'Habilitar cuenta' : 'Deshabilitar cuenta'}
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        width: 32, height: 32, borderRadius: 8, cursor: 'pointer',
                                        border: u.activo === false ? '1px solid rgba(34,197,94,0.35)' : '1px solid rgba(239,68,68,0.35)',
                                        background: u.activo === false ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                                        color: u.activo === false ? '#22c55e' : '#ef4444',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    {u.activo === false ? <Power size={15} /> : <PowerOff size={15} />}
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Desktop View */}
            <div className="admin-table-wrapper logins-desktop-table glass-effect">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Estado</th>
                            <th>Usuario</th>
                            <th>Nombre Completo</th>
                            <th>Email</th>
                            <th>Rol</th>
                            <th>Club / Contacto</th>
                            <th style={{ width: '110px', textAlign: 'center' }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {usuarios.map(u => (
                            <tr key={u.id} style={{ opacity: u.activo === false ? 0.55 : 1, transition: 'opacity 0.3s' }}>
                                <td>
                                    <EstadoBadge activo={u.activo} />
                                </td>
                                <td style={{ fontWeight: 'bold', color: u.activo === false ? '#64748b' : 'inherit' }}>
                                    {u.username}
                                </td>
                                <td>
                                    {(u.nombre || u.apellido)
                                        ? <span style={{ color: '#e2e8f0' }}>{[u.nombre, u.apellido].filter(Boolean).join(' ')}</span>
                                        : <span style={{ color: '#475569' }}>—</span>
                                    }
                                    {u.dni && (
                                        <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b' }}>DNI: {u.dni}</span>
                                    )}
                                </td>
                                <td>{u.email || '—'}</td>
                                <td><RolBadge rol={u.rol} /></td>
                                <td>
                                    {u.clubNombre || '—'}
                                    {u.telefono && <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b' }}>📞 {u.telefono}</span>}
                                </td>
                                <td className="actions-cell" style={{ textAlign: 'center' }}>
                                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                                        <button
                                            className="btn-icon-view"
                                            onClick={() => onEditPassword(u)}
                                            title="Cambiar Contraseña"
                                        >
                                            <Key size={16} />
                                        </button>

                                        {ROLES_TOGGLABLES.includes(u.rol) && (
                                            <button
                                                onClick={() => onToggleActivo(u)}
                                                title={u.activo === false ? 'Habilitar cuenta' : 'Deshabilitar cuenta temporalmente'}
                                                style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    width: 32, height: 32, borderRadius: 8, cursor: 'pointer',
                                                    border: u.activo === false
                                                        ? '1px solid rgba(34,197,94,0.35)'
                                                        : '1px solid rgba(239,68,68,0.35)',
                                                    background: u.activo === false
                                                        ? 'rgba(34,197,94,0.08)'
                                                        : 'rgba(239,68,68,0.08)',
                                                    color: u.activo === false ? '#22c55e' : '#ef4444',
                                                    transition: 'all 0.2s',
                                                }}
                                            >
                                                {u.activo === false
                                                    ? <Power size={15} />
                                                    : <PowerOff size={15} />
                                                }
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default LoginGrid;
