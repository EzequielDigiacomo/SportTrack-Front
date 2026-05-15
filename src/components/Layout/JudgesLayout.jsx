import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdminSidebar from './AdminSidebar';
import {
    LayoutDashboard,
    Calendar,
    Building2,
    Users,
    Timer,
    LogOut,
    ArrowLeft,
    Menu
} from 'lucide-react';
import logo from '../../assets/logo-sporttrack.png';
import '../../pages/Super/AdminDashboard.css';

const NAV_ITEMS = [
    { id: 'inicio', path: '/super', icon: <LayoutDashboard size={20} />, label: 'Inicio Admin' },
    { id: 'atletas', path: '/super/atletas', icon: <Users size={20} />, label: 'Atletas' },
    { id: 'clubes', path: '/super/clubes', icon: <Building2 size={20} />, label: 'Clubes' },
    { id: 'eventos', path: '/super/eventos', icon: <Calendar size={20} />, label: 'Eventos' },
    { id: 'resultados', path: '/super/resultados', icon: <Timer size={20} />, label: 'Resultados' },
    { id: 'control', path: '/juez-control', icon: <Users size={20} />, label: 'Panel de Control' },
    { id: 'jueces', path: '/jueces', icon: <Timer size={20} />, label: 'Módulo Jueces', exact: true },
];

const JudgesLayout = ({ children }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const timeoutRef = useRef(null);
    const inactivityRef = useRef(null);

    const closeSidebar = () => setIsSidebarOpen(false);

    const resetInactivity = () => {
        if (inactivityRef.current) clearTimeout(inactivityRef.current);
        inactivityRef.current = setTimeout(closeSidebar, 5000);
    };

    const handleMouseEnter = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsSidebarOpen(true);
        resetInactivity();
    };

    const handleMouseLeave = () => {
        timeoutRef.current = setTimeout(() => setIsSidebarOpen(false), 800);
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login', { replace: true });
    };

    const handleNavClick = () => {
        if (window.innerWidth <= 768) closeSidebar();
    };

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (inactivityRef.current) clearTimeout(inactivityRef.current);
        };
    }, []);

    const roleStr = (user?.rol || user?.Rol || user?.role || '').toLowerCase();
    const isAdmin = roleStr.includes('admin');
    // canSeeSidebar solo para admins reales. Jueces (incluyendo Control) usan el nav simplificado.
    const canSeeSidebar = isAdmin;

    const getRoleName = () => {
        const path = location.pathname;
        if (path.includes('largador')) return 'Largador';
        if (path.includes('llegada')) return 'Cronometrista';
        if (path.includes('juez-control')) return 'Juez de Control';
        return 'Módulo Jueces';
    };

    return (
        <div className={`admin-layout ${!isSidebarOpen ? 'sidebar-collapsed' : ''} ${!canSeeSidebar ? 'no-sidebar' : ''}`}>
            {canSeeSidebar ? (
                <>
                    <div
                        className="sidebar-edge-sensor"
                        onMouseEnter={handleMouseEnter}
                        onClick={handleMouseEnter}
                    />

                    <button 
                        className={`sidebar-trigger-favicon glass-effect ${isSidebarOpen ? 'active' : ''}`}
                        onClick={() => setIsSidebarOpen(true)}
                        title="Abrir menú"
                    >
                        <Menu size={24} color="var(--color-primary-light)" />
                    </button>

                    {/* Quick Actions (Top Right) */}
                    <div className={`top-right-actions ${isSidebarOpen ? 'active' : ''}`}>
                        <button className="super-quick-logout glass-effect" onClick={handleLogout} title="Cerrar Sesión">
                            <LogOut size={20} color="var(--color-error)" />
                        </button>
                    </div>

                    {/* Mobile Overlay */}
                    {isSidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar} />}

                    <AdminSidebar
                        isOpen={isSidebarOpen}
                        user={user}
                        logo={logo}
                        navItems={NAV_ITEMS.filter(item => {
                            const isBronce = user?.plan?.nombre?.toLowerCase() === 'bronce';
                            if (isBronce && ['control', 'jueces'].includes(item.id)) return false;
                            if (roleStr.includes('admin')) return true;
                            return ['control', 'jueces'].includes(item.id);
                        })}
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                        onClose={closeSidebar}
                        onLogout={handleLogout}
                        onNavClick={handleNavClick}
                    />
                </>
            ) : (
                /* Header exclusivo para móviles (Largador/Cronometrista) */
                /* Juez de Control usa su propio header restaurado */
                !location.pathname.startsWith('/juez-control') && (
                    <header className="judges-mobile-header glass-effect">
                        <div className="header-left-group">
                            <button 
                                className="btn-judges-back" 
                                onClick={() => {
                                    if (location.pathname === '/jueces') navigate('/');
                                    else navigate('/jueces');
                                }}
                            >
                                <ArrowLeft size={24} />
                            </button>
                            <div className="judges-mobile-brand">
                                <span className="mobile-role-name">{getRoleName()}</span>
                                <span className="mobile-user-name">@{user?.username || 'user'}</span>
                            </div>
                        </div>
                        
                        <button className="btn-judges-logout" onClick={handleLogout}>
                            <LogOut size={24} />
                        </button>
                    </header>
                )
            )}

            <main className="admin-main" style={!isAdmin ? { marginLeft: 0, width: '100%' } : {}}>
                <div className="admin-content-wrapper" style={!isAdmin ? { padding: '1rem' } : {}}>
                    {children}
                </div>
            </main>
        </div>
    );
};

export default JudgesLayout;
