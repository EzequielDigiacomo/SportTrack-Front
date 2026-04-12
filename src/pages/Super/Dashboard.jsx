import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import GestionEventosSection from '../../components/SharedSections/GestionEventosSection';
import GestionClubesSection from './sections/GestionClubesSection';
import SimulacionSection from './sections/SimulacionSection';
import GestionLoginsSection from './sections/GestionLoginsSection';
import GestionAtletasSection from './sections/GestionAtletasSection';
import GestionResultadosSection from '../../components/SharedSections/GestionResultadosSection';
import './AdminDashboard.css';

const NAV_ITEMS = [
    { id: 'inicio', path: '', icon: '🏠', label: 'Inicio', exact: true },
    { id: 'eventos', path: 'eventos', icon: '📅', label: 'Eventos' },
    { id: 'clubes', path: 'clubes', icon: '🏛️', label: 'Clubes' },
    { id: 'logins', path: 'logins', icon: '🔑', label: 'Logins/Usuarios' },
    { id: 'atletas', path: 'atletas', icon: '👥', label: 'Atletas' },
    { id: 'simulacion', path: 'simulacion', icon: '🚀', label: 'Simulación' },
    { id: 'resultados', path: 'resultados', icon: '⏱️', label: 'Resultados' },
    { id: 'configuracion', path: 'configuracion', icon: '⚙️', label: 'Configuración' },
];

const SuperDashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => { logout(); navigate('/login', { replace: true }); };

    return (
        <div className="admin-layout">
            {/* SIDEBAR */}
            <aside className="admin-sidebar glass-effect">
                <div className="sidebar-brand">
                    <span className="brand-icon">🚣</span>
                    <span className="brand-name gradient-text">SportTrack</span>
                </div>
                <div className="sidebar-user">
                    <div className="user-avatar">{user?.username?.[0]?.toUpperCase() || 'A'}</div>
                    <div>
                        <p className="user-name">{user?.username}</p>
                        <p className="user-role">Administrador</p>
                    </div>
                </div>
                <nav className="sidebar-nav">
                    {NAV_ITEMS.map(item => (
                        <NavLink
                            key={item.id}
                            to={item.path === '' ? '/super' : `/super/${item.path}`}
                            end={item.exact}
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                        >
                            <span className="nav-icon">{item.icon}</span>
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>
                <button className="sidebar-logout" onClick={handleLogout}>⬅ Cerrar Sesión</button>
            </aside>

            {/* MAIN CONTENT */}
            <main className="admin-main">
                <div className="admin-content-wrapper">
                    <Routes>
                        <Route index element={<AdminHome />} />
                        <Route path="eventos/*" element={<GestionEventosSection />} />
                        <Route path="clubes" element={<GestionClubesSection />} />
                        <Route path="logins" element={<GestionLoginsSection />} />
                        <Route path="atletas" element={<GestionAtletasSection />} />
                        <Route path="simulacion" element={<SimulacionSection />} />
                        <Route path="resultados" element={<GestionResultadosSection />} />
                        <Route path="configuracion" element={<PlaceholderSection icon="⚙️" title="Configuración" desc="Tablas maestras: botes, distancias, categorías y sexos." />} />
                    </Routes>
                </div>
            </main>
        </div>
    );
};

const AdminHome = () => {
    const navigate = useNavigate();
    const cards = [
        { id: '/super/eventos', icon: '📅', title: 'Eventos', desc: 'Crear y gestionar competencias', color: 'var(--color-primary)' },
        { id: '/super/clubes', icon: '🏛️', title: 'Clubes', desc: 'Administrar instituciones', color: 'var(--color-secondary)' },
        { id: '/super/logins', icon: '🔑', title: 'Logins & Accesos', desc: 'Usuarios para clubes', color: '#10B981' },
        { id: '/super/atletas', icon: '👥', title: 'Atletas', desc: 'Nómina global del sistema', color: 'var(--color-accent)' },
        { id: '/super/resultados', icon: '⏱️', title: 'Resultados', desc: 'Cronometraje y validación', color: 'var(--color-accent-orange)' },
    ];
    return (
        <div className="admin-home fade-in">
            <h1>Panel Federativo</h1>
            <p className="admin-home-subtitle">Bienvenido al centro de control de SportTrack. Seleccioná un módulo para comenzar.</p>
            <div className="admin-home-grid">
                {cards.map(c => (
                    <div key={c.id} className="admin-home-card glass-effect" onClick={() => navigate(c.id)}>
                        <div className="admin-home-card-icon" style={{ color: c.color }}>{c.icon}</div>
                        <h3>{c.title}</h3>
                        <p>{c.desc}</p>
                        <span className="card-arrow">→</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const PlaceholderSection = ({ icon, title, desc }) => (
    <div className="placeholder-section fade-in">
        <div className="placeholder-icon">{icon}</div>
        <h2>{title}</h2>
        <p>{desc}</p>
        <span className="coming-soon-tag">Próximamente</span>
    </div>
);

export default SuperDashboard;
