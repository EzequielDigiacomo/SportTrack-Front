import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdminSidebar from './AdminSidebar';
import ThemeToggle from '../Common/ThemeToggle';
import useUnreadMessages from '../../hooks/useUnreadMessages';
import { filterAdminNavItems } from '../../config/adminNavItems';
import {
    LogOut,
    ArrowLeft,
    Menu,
    ShieldCheck
} from 'lucide-react';
import logo from '../../assets/logo-sporttrack.png';
import '../../pages/Super/AdminDashboard.css';
import '../../pages/Judges/Judges.css';
import { STORAGE_KEYS } from '../../utils/constants';

const readSidebarPinned = () => {
    try {
        return localStorage.getItem(STORAGE_KEYS.SIDEBAR_PINNED) === 'true';
    } catch {
        return false;
    }
};

const JudgesLayout = ({ children }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { hasUnread } = useUnreadMessages(true);
    const roleStr = (user?.rol || user?.Rol || user?.role || '').toLowerCase();
    const isSuper = roleStr === 'superadmin' || user?.username === 'soporte_tecnico';
    const isAdmin = roleStr.includes('admin');
    const canSeeSidebar = isAdmin;
    const filteredNavItems = filterAdminNavItems(user, { hasUnread });

    const [isMobile, setIsMobile] = useState(
        () => typeof window !== 'undefined' && window.innerWidth <= 768
    );
    const [sidebarPinned, setSidebarPinned] = useState(readSidebarPinned);
    const isSidebarFixed = isSuper || (sidebarPinned && !isMobile);
    const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
        const mobile = typeof window !== 'undefined' && window.innerWidth <= 768;
        return (isSuper || readSidebarPinned()) && !mobile;
    });
    const timeoutRef = useRef(null);

    const closeSidebar = () => {
        if (isSidebarFixed) return;
        setIsSidebarOpen(false);
    };

    const handleMouseEnter = () => {
        if (isSidebarFixed) return;
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsSidebarOpen(true);
    };

    const isControlOrManual =
        location.pathname.includes('juez-control') ||
        location.pathname.includes('carga-manual') ||
        location.pathname.includes('control-tecnico');

    const handleMouseLeave = () => {
        if (isSidebarFixed) return;
        if (window.innerWidth > 768) {
            timeoutRef.current = setTimeout(() => setIsSidebarOpen(false), 800);
        }
    };

    const handleTogglePin = () => {
        setSidebarPinned((prev) => {
            const next = !prev;
            try {
                localStorage.setItem(STORAGE_KEYS.SIDEBAR_PINNED, String(next));
            } catch {
                /* ignore */
            }
            if (next) {
                if (timeoutRef.current) clearTimeout(timeoutRef.current);
                setIsSidebarOpen(true);
            }
            return next;
        });
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login', { replace: true });
    };

    const handleNavClick = () => {
        if (window.innerWidth <= 768 && !isSidebarFixed) closeSidebar();
    };

    useEffect(() => {
        const onResize = () => {
            const mobile = window.innerWidth <= 768;
            setIsMobile(mobile);
            if (mobile) setIsSidebarOpen(false);
            else if (isSuper || readSidebarPinned()) setIsSidebarOpen(true);
        };
        window.addEventListener('resize', onResize);
        return () => {
            window.removeEventListener('resize', onResize);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [isSuper]);

    const getRoleName = () => {
        const path = location.pathname;
        if (path.includes('control-tecnico')) return 'Control técnico';
        if (path.includes('largador')) return roleStr.includes('controltecnico') ? 'Control técnico' : 'Largador';
        if (path.includes('llegada')) return roleStr.includes('controltecnico') ? 'Control técnico' : 'Cronometrista';
        if (path.includes('juez-control')) return 'Juez de Control';
        if (path.includes('carga-manual')) return 'Carga Manual';
        return 'Módulo Jueces';
    };

    const handleBack = () => {
        if (roleStr.includes('controltecnico')) {
            if (location.pathname !== '/control-tecnico') {
                navigate('/control-tecnico');
            }
            return;
        }
        if (location.pathname.includes('carga-manual')) {
            navigate('/jueces');
            return;
        }
        if (location.pathname.startsWith('/juez-control')) {
            navigate(isAdmin ? '/jueces' : '/');
            return;
        }
        if (location.pathname === '/jueces') navigate('/');
        else navigate('/jueces');
    };

    const handleMenuClick = () => {
        if (canSeeSidebar) {
            if (isSidebarFixed) {
                setIsSidebarOpen(true);
            } else {
                setIsSidebarOpen((open) => !open);
            }
            return;
        }
        navigate('/');
    };

    const controlNavbar = (
        <header className="judges-top-header glass-effect control-panel-navbar">
            <div className="header-left-group">
                <button
                    type="button"
                    className="btn-judges-back"
                    onClick={handleBack}
                    title="Volver"
                >
                    <ArrowLeft size={24} />
                </button>
                <button
                    type="button"
                    className="btn-judges-menu"
                    onClick={handleMenuClick}
                    title={canSeeSidebar ? 'Abrir menú' : 'Inicio'}
                >
                    <Menu size={24} />
                </button>
                <div className="judges-header-brand-group">
                    <ShieldCheck size={20} className="header-shield-icon" />
                    <div className="judges-mobile-brand-text">
                        <span className="mobile-system-name">SportTrack</span>
                        <span className="mobile-role-label">{getRoleName()}</span>
                    </div>
                </div>
            </div>

            <div className="header-right-group">
                <ThemeToggle />
                <div className="mobile-user-pill">
                    <span>@{user?.username || 'user'}</span>
                </div>
                <button
                    type="button"
                    className="btn-judges-logout-new"
                    onClick={handleLogout}
                    title="Cerrar Sesión"
                >
                    <LogOut size={22} />
                </button>
            </div>
        </header>
    );

    return (
        <div className={`admin-layout ${!isSidebarOpen && !isSidebarFixed ? 'sidebar-collapsed' : ''} ${!canSeeSidebar ? 'no-sidebar' : ''}`}>
            {canSeeSidebar && (
                <>
                    {!isSidebarFixed && (
                        <div
                            className="sidebar-edge-sensor"
                            onMouseEnter={handleMouseEnter}
                            onClick={handleMouseEnter}
                        />
                    )}

                    {(isMobile || !isSidebarFixed) && !isControlOrManual && (
                        <button
                            className={`sidebar-trigger-favicon glass-effect ${isSidebarOpen ? 'active' : ''}`}
                            onClick={() => setIsSidebarOpen(true)}
                            title="Abrir menú"
                            aria-label="Abrir menú"
                        >
                            <Menu size={24} color="var(--color-primary-light)" />
                        </button>
                    )}

                    {!isControlOrManual && (
                        <div className={`top-right-actions ${isSidebarOpen ? 'active' : ''}`}>
                            <button type="button" className="super-quick-logout" onClick={handleLogout} title="Cerrar Sesión" aria-label="Cerrar Sesión">
                                <LogOut size={22} strokeWidth={2.25} />
                            </button>
                        </div>
                    )}

                    {isSidebarOpen && !isSidebarFixed && <div className="sidebar-overlay" onClick={closeSidebar} />}

                    <AdminSidebar
                        isOpen={isSidebarOpen || isSidebarFixed}
                        user={user}
                        logo={logo}
                        navItems={filteredNavItems}
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                        onClose={closeSidebar}
                        onLogout={handleLogout}
                        onNavClick={handleNavClick}
                        showPinToggle={!isSuper}
                        sidebarPinned={sidebarPinned}
                        onTogglePin={handleTogglePin}
                    />
                </>
            )}

            {isControlOrManual ? null : !canSeeSidebar ? (
                <header className="judges-top-header glass-effect">
                    <div className="header-left-group">
                        <button
                            type="button"
                            className="btn-judges-back"
                            onClick={handleBack}
                        >
                            <ArrowLeft size={24} />
                        </button>
                        <div className="judges-header-brand-group">
                            <ShieldCheck size={20} className="header-shield-icon" />
                            <div className="judges-mobile-brand-text">
                                <span className="mobile-system-name">SportTrack</span>
                                <span className="mobile-role-label">{getRoleName()}</span>
                            </div>
                        </div>
                    </div>

                    <div className="header-right-group">
                        <ThemeToggle />
                        <div className="mobile-user-pill">
                            <span>@{user?.username || 'user'}</span>
                        </div>
                        <button type="button" className="btn-judges-logout-new" onClick={handleLogout} title="Cerrar Sesión">
                            <LogOut size={22} />
                        </button>
                    </div>
                </header>
            ) : null}

            <main className="admin-main" style={!isAdmin ? { marginLeft: 0, width: '100%' } : {}}>
                {isControlOrManual ? (
                    controlNavbar
                ) : (
                    <div id="global-sync-bar-portal-target"></div>
                )}
                <div className={`admin-content-wrapper ${!isAdmin ? 'judges-content-mobile' : ''} ${isControlOrManual ? 'control-panel-content' : ''}`}>
                    {children}
                </div>
            </main>
        </div>
    );
};

export default JudgesLayout;
