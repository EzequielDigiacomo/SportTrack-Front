import React from 'react';
import { NavLink } from 'react-router-dom';
import { LogOut, X } from 'lucide-react';
import ThemeToggle from '../Common/ThemeToggle';

const AdminSidebar = ({ 
    isOpen, 
    onMouseEnter, 
    onMouseLeave, 
    onClose, 
    navItems, 
    user, 
    onLogout, 
    logo,
    onNavClick
}) => {
    return (
        <aside 
            className={`admin-sidebar glass-effect ${isOpen ? 'open' : ''}`}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <div className="sidebar-header-row">
                <div className="sidebar-brand">
                    <img src={logo} alt="Logo" className="brand-logo-img" />
                    <span className="brand-name gradient-text">SportTrack</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ThemeToggle />
                    <button className="sidebar-close-btn" onClick={onClose} aria-label="Cerrar menú">
                        <X size={20} />
                    </button>
                </div>
            </div>

            <div className="sidebar-user">
                <div className="user-avatar">{user?.username?.[0]?.toUpperCase() || 'A'}</div>
                <div className="user-info-text">
                    <p className="user-name">{user?.username}</p>
                    <div className="user-plan-status">
                        <p className="user-role" style={{ 
                            color: user?.plan?.nombre?.toLowerCase() === 'oro' ? '#FFD700' : 
                                   user?.plan?.nombre?.toLowerCase() === 'plata' ? '#E0E0E0' : 
                                   user?.plan?.nombre?.toLowerCase() === 'bronce' ? '#CD7F32' : 'var(--color-primary-light)',
                            fontWeight: 'bold',
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            margin: 0
                        }}>
                            {user?.rol === 'SuperAdmin' ? 'Super Administrador' : `Administrador ${user?.plan?.nombre || ''}`}
                        </p>
                        {user?.rol === 'Admin' && user?.fechaVencimientoPlan && (
                            <div style={{
                                marginTop: '8px',
                                padding: '6px 10px',
                                background: 'rgba(255, 255, 255, 0.04)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: '8px',
                                fontSize: '0.7rem',
                                width: '100%',
                                boxSizing: 'border-box'
                            }}>
                                <span style={{ display: 'block', color: 'var(--color-text-secondary)', fontWeight: '500', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Plan {user?.frecuenciaPago || 'Mensual'}
                                </span>
                                <span style={{ 
                                    display: 'block', 
                                    fontWeight: 'bold',
                                    color: new Date(user.fechaVencimientoPlan) < new Date() ? '#EF4444' : 'var(--color-primary-light)',
                                    marginTop: '2px'
                                }}>
                                    Vence: {new Date(user.fechaVencimientoPlan).toLocaleDateString()}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Removemos el badge anterior y dejamos la integración en el texto de arriba */}

            <nav className="sidebar-nav">
                {navItems.map(item => (
                    <NavLink
                        key={item.id}
                        to={item.isExternal || item.path.startsWith('/') ? item.path : (item.path === '' ? '/super' : `/super/${item.path}`)}
                        end={item.exact}
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                        onClick={onNavClick}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        <span className="nav-label">{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            <button className="sidebar-logout" onClick={onLogout}>
                <span className="nav-icon"><LogOut size={20} /></span>
                <span className="nav-label">Cerrar Sesión</span>
            </button>
        </aside>
    );
};

export default AdminSidebar;
