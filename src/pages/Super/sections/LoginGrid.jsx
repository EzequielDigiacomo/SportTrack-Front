import React, { useEffect, useMemo, useState } from 'react';
import { Key, Power, PowerOff, Mail, Phone, Building2, Edit, Trash2, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';

const PAGE_SIZE = 10;

const getLoginRole = (u) => u?.rol || u?.rolFederacion || u?.RolFederacion || '';

const ROL_LABEL = {
    'Admin':         { label: 'Admin',          color: '#ef4444' },
    'Club':          { label: 'Club',            color: '#22c55e' },
    'Largador':      { label: 'Largador',        color: '#f59e0b' },
    'Cronometrista': { label: 'Cronometrista',   color: '#3b82f6' },
    'JuezControl':   { label: 'Juez de Control', color: '#8b5cf6' },
    'ControlTecnico': { label: 'Control técnico', color: '#14b8a6' },
};

// Roles que pueden ser desactivados (los jueces auxiliares, no Admin/Club)
const ROLES_TOGGLABLES = ['Largador', 'Cronometrista', 'JuezControl', 'ControlTecnico'];

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

const getSortValue = (u, key) => {
    switch (key) {
        case 'username':
            return (u.username || '').toLowerCase();
        case 'federacionNombre':
            return (u.federacionNombre || '').toLowerCase();
        case 'clubNombre':
            return (u.clubNombre || '').toLowerCase();
        case 'rol': {
            const rol = getLoginRole(u);
            return (ROL_LABEL[rol]?.label || rol || '').toLowerCase();
        }
        default:
            return '';
    }
};

const PROTECTED_ROLES = ['SuperAdmin', 'soporte_tecnico'];

const canDeleteLogin = (u, currentUserId, currentUsername) => {
    const rol = getLoginRole(u);
    if (PROTECTED_ROLES.some((r) => r.toLowerCase() === rol.toLowerCase())) return false;
    if (currentUserId != null && String(u.id) === String(currentUserId)) return false;
    if (currentUsername && u.username?.toLowerCase() === currentUsername.toLowerCase()) return false;
    return true;
};

const LoginGrid = ({ usuarios, onEditPassword, onEditProfile, onToggleActivo, onDelete, currentUserId, currentUsername, showFederation = false }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState({ key: 'username', direction: 'asc' });
    const totalPages = Math.max(1, Math.ceil((usuarios?.length || 0) / PAGE_SIZE));

    const requestSort = (key) => {
        setSortConfig((prev) => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
        }));
        setCurrentPage(1);
    };

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return <ArrowUpDown size={14} />;
        return sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [usuarios]);

    useEffect(() => {
        if (currentPage > totalPages) setCurrentPage(totalPages);
    }, [currentPage, totalPages]);

    const sortedUsuarios = useMemo(() => {
        const list = [...(usuarios || [])];
        list.sort((a, b) => {
            const aVal = getSortValue(a, sortConfig.key);
            const bVal = getSortValue(b, sortConfig.key);
            const cmp = aVal.localeCompare(bVal, 'es', { sensitivity: 'base' });
            return sortConfig.direction === 'asc' ? cmp : -cmp;
        });
        return list;
    }, [usuarios, sortConfig]);

    const pageUsuarios = useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE;
        return sortedUsuarios.slice(start, start + PAGE_SIZE);
    }, [sortedUsuarios, currentPage]);

    const pagination = (usuarios?.length || 0) > PAGE_SIZE && (
        <div className="admin-pagination">
            <button
                type="button"
                className="btn-pagination"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
            >
                Anterior
            </button>
            <span className="pagination-info">
                Página <strong>{currentPage}</strong> de {totalPages}
            </span>
            <button
                type="button"
                className="btn-pagination"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
            >
                Siguiente
            </button>
        </div>
    );

    return (
        <div className="login-grid-container fade-in">
            {/* Mobile View */}
            <div className="logins-mobile-list">
                {pageUsuarios.map(u => (
                    <div key={u.id} className="admin-native-card glass-effect mb-sm" style={{ opacity: u.activo === false ? 0.6 : 1 }}>
                        <div className="card-accent-bar ecu-yellow" />
                        <div className="card-content">
                            <h4>
                                {u.username}
                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                    <RolBadge rol={getLoginRole(u)} />
                                    <EstadoBadge activo={u.activo} />
                                </div>
                            </h4>
                            
                            <p><Mail size={14} className="text-secondary" /> {u.email || 'Sin email'}</p>
                            {u.clubNombre ? (
                                <p>
                                    <Building2 size={14} className="text-accent" /> {u.clubNombre}
                                </p>
                            ) : (
                                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                                    <Building2 size={14} className="text-secondary" /> (Sin institución)
                                </p>
                            )}
                            {showFederation && (
                                <p style={{ fontSize: '0.85rem' }}>
                                    Federación: {u.federacionNombre || '—'}
                                </p>
                            )}
                            {u.telefono && <p><Phone size={14} style={{ color: '#ec4899' }} /> {u.telefono}</p>}
                        </div>
                        <div className="card-actions-row">
                            <button className="btn-icon-view" onClick={() => onEditProfile(u)} title="Editar Perfil">
                                <Edit size={16} />
                            </button>
                            <button className="btn-icon-view" onClick={() => onEditPassword(u)} title="Cambiar Contraseña">
                                <Key size={16} />
                            </button>
                            {ROLES_TOGGLABLES.includes(getLoginRole(u)) && (
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
                            {onDelete && canDeleteLogin(u, currentUserId, currentUsername) && (
                                <button
                                    className="btn-icon-delete"
                                    onClick={() => onDelete(u)}
                                    title="Eliminar credencial"
                                >
                                    <Trash2 size={16} />
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
                            <th className="sortable login-col-usuario" onClick={() => requestSort('username')}>
                                Usuario <span className="sort-icon">{getSortIcon('username')}</span>
                            </th>
                            {showFederation && (
                                <th className="sortable login-col-federacion" onClick={() => requestSort('federacionNombre')}>
                                    Federación <span className="sort-icon">{getSortIcon('federacionNombre')}</span>
                                </th>
                            )}
                            <th className="sortable login-col-institucion" onClick={() => requestSort('clubNombre')}>
                                Institución a la que pertenece <span className="sort-icon">{getSortIcon('clubNombre')}</span>
                            </th>
                            <th className="login-col-email">Email</th>
                            <th className="sortable login-col-rol" onClick={() => requestSort('rol')}>
                                Rol <span className="sort-icon">{getSortIcon('rol')}</span>
                            </th>
                            <th className="login-col-acciones">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pageUsuarios.map(u => (
                            <tr key={u.id} style={{ opacity: u.activo === false ? 0.55 : 1, transition: 'opacity 0.3s' }}>
                                <td>
                                    <EstadoBadge activo={u.activo} />
                                </td>
                                <td style={{ fontWeight: 'bold', color: u.activo === false ? '#64748b' : 'inherit' }} className="login-col-usuario">
                                    {u.username}
                                </td>
                                {showFederation && (
                                    <td className="login-col-federacion">
                                        <span className="chip chip-ecu-yellow" style={{ fontSize: '0.75rem' }}>
                                            {u.federacionNombre || '—'}
                                        </span>
                                    </td>
                                )}
                                <td className="login-col-institucion">
                                    {u.clubNombre ? (
                                        <span style={{ fontWeight: '800' }}>{u.clubNombre}</span>
                                    ) : (
                                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>(Sin institución)</span>
                                    )}
                                    {u.telefono && <span className="login-grid-meta-sub"><Phone size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> {u.telefono}</span>}
                                </td>
                                <td className="login-col-email">{u.email || '—'}</td>
                                <td className="login-col-rol"><RolBadge rol={getLoginRole(u)} /></td>
                                <td className="actions-cell login-col-acciones">
                                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                                        <button
                                            className="btn-icon-view"
                                            onClick={() => onEditProfile(u)}
                                            title="Editar Perfil"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button
                                            className="btn-icon-view"
                                            onClick={() => onEditPassword(u)}
                                            title="Cambiar Contraseña"
                                        >
                                            <Key size={16} />
                                        </button>

                                        {ROLES_TOGGLABLES.includes(getLoginRole(u)) && (
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
                                        {onDelete && canDeleteLogin(u, currentUserId, currentUsername) && (
                                            <button
                                                className="btn-icon-delete"
                                                onClick={() => onDelete(u)}
                                                title="Eliminar credencial"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {pagination}
        </div>
    );
};

export default LoginGrid;
