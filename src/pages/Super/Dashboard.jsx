import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Routes, Route, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdminSidebar from '../../components/Layout/AdminSidebar';
import ThemeToggle from '../../components/Common/ThemeToggle';
import AdminHome from './AdminHome';
import GestionEventosSection from '../../components/SharedSections/GestionEventosSection';
import GestionClubesSection from './sections/GestionClubesSection';
import GestionLoginsSection from './sections/GestionLoginsSection';
import GestionAtletasSection from './sections/GestionAtletasSection';
import GestionResultadosSection from '../../components/SharedSections/GestionResultadosSection';
import ConfiguracionSection from './sections/ConfiguracionSection';
import SoporteSection from './sections/SoporteSection';
import BackupsSection from './sections/BackupsSection';
import SaaSManagement from './sections/SaaSManagement';
import ControlesSection from '../ClubAdmin/sections/ControlesSection';
import GestionPagosSection from './sections/GestionPagosSection';
import ProgressionAuditPage from './sections/ProgressionAuditPage';
import GestionFederacionesSection from './sections/GestionFederacionesSection';
import MensajesSection from '../Shared/MensajesSection';
import AudiencePeaksSection from './sections/AudiencePeaksSection';
import useUnreadMessages from '../../hooks/useUnreadMessages';
import { filterAdminNavItems } from '../../config/adminNavItems';
import { STORAGE_KEYS } from '../../utils/constants';
import { LogOut, Menu } from 'lucide-react';
import logo from '../../assets/logo-sporttrack.png';
import './AdminDashboard.css';
import RegistroInscripcionesSection from '../ClubAdmin/sections/RegistroInscripcionesSection';

const readSidebarPinned = () => {
    try {
        return localStorage.getItem(STORAGE_KEYS.SIDEBAR_PINNED) === 'true';
    } catch {
        return false;
    }
};

const SuperDashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const role = user?.rol?.trim().toLowerCase();
    const isSuper = role === 'superadmin' || user?.username === 'soporte_tecnico';
    const { hasUnread } = useUnreadMessages(true);
    const [isMobile, setIsMobile] = useState(
        () => typeof window !== 'undefined' && window.innerWidth <= 768
    );
    const [sidebarPinned, setSidebarPinned] = useState(readSidebarPinned);
    const isSidebarFixed = isSuper || (sidebarPinned && !isMobile);
    const [isSidebarOpen, setIsSidebarOpen] = useState(
        () => {
            const mobile = typeof window !== 'undefined' && window.innerWidth <= 768;
            return (isSuper || readSidebarPinned()) && !mobile;
        }
    );
    const timeoutRef = useRef(null);
    const inactivityRef = useRef(null);

    const closeSidebar = () => {
        if (isSidebarFixed) return;
        setIsSidebarOpen(false);
    };

    const resetInactivity = () => {
        // Removiendo auto-cierre por inactividad a pedido del usuario
    };

    const handleMouseEnter = () => {
        if (isSidebarFixed) return;
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsSidebarOpen(true);
        resetInactivity();
    };

    const handleMouseLeave = () => {
        if (isSidebarFixed) return;
        // En desktop se cierra al salir, en mobile es manual
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
        if (window.innerWidth <= 768) setIsSidebarOpen(false);
    };

    const filteredNavItems = filterAdminNavItems(user, { hasUnread });

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
            if (inactivityRef.current) clearTimeout(inactivityRef.current);
        };
    }, [isSuper]);

    return (
        <div className={`admin-layout ${!isSidebarOpen && !isSidebarFixed ? 'sidebar-collapsed' : ''}`}>
            {/* Edge Sensor for Sidebar */}
            {!isSidebarFixed && (
                <div 
                    className="sidebar-edge-sensor" 
                    onMouseEnter={handleMouseEnter}
                    onClick={handleMouseEnter}
                />
            )}

            {(isMobile || !isSidebarFixed) && (
                <button
                    type="button"
                    className={`sidebar-trigger-favicon glass-effect ${isSidebarOpen ? 'active' : ''}`}
                    onClick={() => setIsSidebarOpen(true)}
                    title="Abrir menú"
                    aria-label="Abrir menú"
                >
                    <Menu size={24} color="var(--color-primary-light)" />
                </button>
            )}

            {/* Quick Actions (Top Right) */}
            <div className={`top-right-actions ${isSidebarOpen ? 'active' : ''}`}>
                <button type="button" className="super-quick-logout" onClick={handleLogout} title="Cerrar Sesión" aria-label="Cerrar Sesión">
                    <LogOut size={22} strokeWidth={2.25} />
                </button>
            </div>

            {/* Mobile Overlay */}
            {isSidebarOpen && !isSidebarFixed && (
                <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)} />
            )}

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

            <main className="admin-main">
                <div className="admin-content-wrapper">
                    <Routes>
                        <Route index element={<AdminHome />} />
                        <Route path="eventos/*" element={<GestionEventosSection />} />
                        <Route path="controles" element={<ControlesSection />} />
                        <Route path="clubes" element={<GestionClubesSection />} />
                        <Route path="logins" element={<GestionLoginsSection />} />
                        <Route path="atletas" element={<GestionAtletasSection />} />
                        <Route path="registro-inscripciones" element={<RegistroInscripcionesSection modo="admin" />} />
                        <Route path="pagos" element={<GestionPagosSection />} />
                        <Route path="resultados" element={<GestionResultadosSection />} />
                        <Route path="auditoria" element={<ProgressionAuditPage />} />
                        <Route path="configuracion" element={<ConfiguracionSection />} />
                        <Route path="federaciones/*" element={<GestionFederacionesSection />} />
                        <Route path="mensajes" element={<MensajesSection modo={isSuper ? 'super' : 'admin'} />} />
                        <Route path="saas" element={<SaaSManagement />} />
                        <Route path="backups" element={<BackupsSection />} />
                        <Route path="audiencia" element={<AudiencePeaksSection />} />
                        <Route path="federacion/:id" element={<AdminHome />} />
                        <Route path="soporte" element={<SoporteSection />} />
                    </Routes>
                </div>
            </main>
        </div>
    );
};

const PlaceholderSection = ({ icon, title }) => (
    <div className="placeholder-section fade-in">
        <div className="placeholder-icon">{icon}</div>
        <h2>{title}</h2>
        <p>Esta sección está en desarrollo.</p>
    </div>
);

export default SuperDashboard;
