import React from 'react';
import { NavLink } from 'react-router-dom';
import { LogOut, X } from 'lucide-react';

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
                <button className="sidebar-close-btn" onClick={onClose} aria-label="Cerrar menú">
                    <X size={20} />
                </button>
            </div>

            <div className="sidebar-user">
                <div className="user-avatar">{user?.username?.[0]?.toUpperCase() || 'A'}</div>
                <div className="user-info-text">
                    <p className="user-name">{user?.username}</p>
                    <p className="user-role">Administrador</p>
                </div>
            </div>

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
