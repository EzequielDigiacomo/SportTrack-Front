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
    ArrowLeft
} from 'lucide-react';
import logo from '../../assets/logo-sporttrack.png';
import '../../pages/Super/AdminDashboard.css';

const NAV_ITEMS = [
    { id: 'inicio', path: '/super', icon: <LayoutDashboard size={20} />, label: 'Inicio Admin' },
    { id: 'atletas', path: '/super/atletas', icon: <Users size={20} />, label: 'Atletas' },
    { id: 'clubes', path: '/super/clubes', icon: <Building2 size={20} />, label: 'Clubes' },
    { id: 'eventos', path: '/super/eventos', icon: <Calendar size={20} />, label: 'Eventos' },
    { id: 'resultados', path: '/super/resultados', icon: <Timer size={20} />, label: 'Resultados' },
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

    const isAdmin = user?.rol === 'Admin';

    return (
        <div className={`admin-layout ${!isAdmin ? 'no-sidebar' : ''}`}>
            {isAdmin && (
                <>
                    <div
                        className="sidebar-edge-sensor"
                        onMouseEnter={handleMouseEnter}
                        onClick={handleMouseEnter}
                    />

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
                        navItems={NAV_ITEMS}
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                        onClose={closeSidebar}
                        onLogout={handleLogout}
                        onNavClick={handleNavClick}
                    />
                </>
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
