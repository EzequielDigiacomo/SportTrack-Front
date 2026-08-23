import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LogOut, X, Pin, PinOff } from 'lucide-react';
import ThemeToggle from '../Common/ThemeToggle';

const getRoleLabel = (user) => {
    if (user?.rol === 'SuperAdmin') return 'Super Administrador';
    if (user?.rol === 'Admin') {
        const planName = user?.plan?.nombre?.trim();
        return planName ? `Administrador ${planName}` : 'Administrador';
    }
    return user?.rol || 'Usuario';
};

const AdminSidebar = ({
    isOpen, 
    onMouseEnter, 
    onMouseLeave, 
    onClose, 
    navItems, 
    user, 
    onLogout, 
    logo,
    onNavClick,
    showPinToggle = false,
    sidebarPinned = false,
    onTogglePin,
}) => {
    const location = useLocation();
    const adminBase = location.pathname.startsWith('/admin') ? '/admin' : '/super';

    const resolveNavPath = (item) => {
        if (item.isExternal || item.path.startsWith('/')) return item.path;
        if (item.path === '') return adminBase;
        return `${adminBase}/${item.path}`;
    };

    return (
        <aside 
            className={`admin-sidebar glass-effect ${isOpen ? 'open' : ''} ${sidebarPinned ? 'is-pinned' : ''}`}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <div className="sidebar-header-row">
                <div className="sidebar-brand">
                    <img src={logo} alt="Logo" className="brand-logo-img" />
                    <span className="brand-name gradient-text">SportTrack</span>
                </div>
                <div className="sidebar-header-actions">
                    {showPinToggle && (
                        <button
                            type="button"
                            className={`sidebar-pin-btn ${sidebarPinned ? 'active' : ''}`}
                            onClick={onTogglePin}
                            title={sidebarPinned ? 'Desfijar menú' : 'Fijar menú'}
                            aria-label={sidebarPinned ? 'Desfijar menú' : 'Fijar menú'}
                            aria-pressed={sidebarPinned}
                        >
                            {sidebarPinned ? <PinOff size={16} /> : <Pin size={16} />}
                        </button>
                    )}
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
                    <p className="user-role">{getRoleLabel(user)}</p>
                </div>
            </div>

            <nav className="sidebar-nav">
                {navItems.map(item => (
                    <NavLink
                        key={item.id}
                        to={resolveNavPath(item)}
                        end={item.exact}
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                        onClick={onNavClick}
                    >
                        <span className="nav-icon nav-icon-with-dot">
                            {item.icon}
                            {item.showDot && <span className="nav-unread-dot" aria-label="Mensajes sin leer" />}
                        </span>
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
