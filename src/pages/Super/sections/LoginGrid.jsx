import { Key, Power, PowerOff, User, Mail, Phone, Building2 } from 'lucide-react';

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
        fontWeight: 800,
        padding: '3px 8px',
        borderRadius: '10px',
        background: activo !== false ? '#dcfce7' : '#fee2e2',
        color: activo !== false ? '#15803d' : '#b91c1c',
        border: `1px solid ${activo !== false ? '#15803d' : '#b91c1c'}`,
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
                            <h4>
                                {u.username}
                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                    <RolBadge rol={u.rol} />
                                    <EstadoBadge activo={u.activo} />
                                </div>
                            </h4>
                            
                            {(u.nombre || u.apellido) && (
                                <p style={{ fontWeight: 800, color: '#000000' }}>
                                    <User size={14} className="text-primary" /> {[u.nombre, u.apellido].filter(Boolean).join(' ')}
                                    {u.dni && <span style={{ color: '#000000', fontSize: '0.75rem', marginLeft: '0.5rem' }}>· DNI {u.dni}</span>}
                                </p>
                            )}
                            <p style={{ color: '#000000' }}><Mail size={14} className="text-secondary" /> {u.email || 'Sin email'}</p>
                            {u.clubNombre && <p style={{ color: '#000000' }}><Building2 size={14} className="text-accent" /> {u.clubNombre}</p>}
                            {u.telefono && <p style={{ color: '#000000' }}><Phone size={14} style={{ color: '#ec4899' }} /> {u.telefono}</p>}
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
                                        ? <span style={{ color: '#000000', fontWeight: '800' }}>{[u.nombre, u.apellido].filter(Boolean).join(' ')}</span>
                                        : <span style={{ color: '#94a3b8' }}>—</span>
                                    }
                                    {u.dni && (
                                        <span style={{ display: 'block', fontSize: '0.75rem', color: '#000000', fontWeight: '600' }}>DNI: {u.dni}</span>
                                    )}
                                </td>
                                <td>{u.email || '—'}</td>
                                <td><RolBadge rol={u.rol} /></td>
                                <td style={{ color: '#000000' }}>
                                    {u.clubNombre || '—'}
                                    {u.telefono && <span style={{ display: 'block', fontSize: '0.75rem', color: '#000000', fontWeight: '600' }}><Phone size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> {u.telefono}</span>}
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
