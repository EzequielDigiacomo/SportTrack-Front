import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, ShieldCheck, Timer } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import GestionResultadosSection from '../../components/SharedSections/GestionResultadosSection';
import './JuezControl.css';

const JuezControlDashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/login', { replace: true });
    };

    return (
        <div className="jc-layout">
            {/* ── Top bar ─────────────────────────────────────────── */}
            <header className="jc-header">
                <div className="jc-header-brand">
                    <ShieldCheck size={22} className="jc-shield-icon" />
                    <div>
                        <span className="jc-brand-name">SportTrack</span>
                        <span className="jc-brand-sub">Panel de Control de Evento</span>
                    </div>
                </div>

                <div className="jc-header-center">
                    <Timer size={16} />
                    <span>Juez de Control</span>
                </div>

                <div className="jc-header-right">
                    <div className="jc-user-pill">
                        <span className="jc-role-badge">Juez</span>
                        <span className="jc-username">{user?.username || user?.nombre || 'Control'}</span>
                    </div>
                    <button className="jc-logout-btn" onClick={handleLogout} title="Cerrar sesión">
                        <LogOut size={18} />
                    </button>
                </div>
            </header>

            {/* ── Content ─────────────────────────────────────────── */}
            <main className="jc-main">
                <div className="jc-content-inner">
                    {/* Info banner */}
                    <div className="jc-info-banner fade-in">
                        <span className="jc-info-icon">ℹ️</span>
                        <p>
                            Acceso de <strong>Juez de Control</strong>: podés consultar el cronograma,
                            ver la grilla de largada de cada serie, registrar y validar resultados oficiales.
                            La carga manual de tiempos solo está disponible para administradores.
                        </p>
                    </div>

                    {/* Main section — Start List + Resultados, NO acceso a carga manual (viewMode tiempos) */}
                    <GestionResultadosSection
                        viewMode="resultados"
                        defaultTab="startList"
                        isEmbedded={false}
                    />
                </div>
            </main>
        </div>
    );
};

export default JuezControlDashboard;
