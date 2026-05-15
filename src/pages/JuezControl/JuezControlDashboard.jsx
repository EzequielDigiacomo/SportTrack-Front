import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import GestionResultadosSection from '../../components/SharedSections/GestionResultadosSection';
import './JuezControl.css';

const JuezControlDashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isVisible, setIsVisible] = React.useState(true);
    const [isExiting, setIsExiting] = React.useState(false);

    // Ocultar automáticamente la leyenda después de 10 segundos con transición
    React.useEffect(() => {
        const timer = setTimeout(() => {
            handleClose();
        }, 10000);
        return () => clearTimeout(timer);
    }, []);

    const handleClose = () => {
        setIsExiting(true);
        setTimeout(() => setIsVisible(false), 500);
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login', { replace: true });
    };

    return (
        <div className="jc-layout">
            {/* ── Content ─────────────────────────────────────────── */}
            <main className="jc-main">
                <div className="jc-content-inner">
                    {/* Info banner con auto-ocultado y transición */}
                    {isVisible && (
                        <div className={`jc-info-banner fade-in ${isExiting ? 'jc-banner-exit' : ''}`} style={{ position: 'relative' }}>
                            <span className="jc-info-icon">ℹ️</span>
                            <p>
                                Acceso de <strong>Juez de Control</strong>: podés consultar el cronograma,
                                ver la grilla de largada de cada serie, registrar y validar resultados oficiales.
                                La carga manual de tiempos solo está disponible para administradores.
                            </p>
                            <button 
                                onClick={handleClose}
                                style={{ 
                                    position: 'absolute', 
                                    top: '8px', 
                                    right: '8px', 
                                    background: 'none', 
                                    border: 'none', 
                                    color: 'white', 
                                    opacity: 0.5,
                                    cursor: 'pointer',
                                    fontSize: '12px'
                                }}
                            >
                                ✕
                            </button>
                        </div>
                    )}

                    {/* Main section — Start List + Resultados */}
                    <GestionResultadosSection
                        viewMode="resultados"
                        defaultTab="startList"
                        isEmbedded={true}
                    />
                </div>
            </main>
        </div>
    );
};

export default JuezControlDashboard;
