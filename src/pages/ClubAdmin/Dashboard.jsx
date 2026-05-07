import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Users, Calendar, LayoutTemplate, Trophy, ArrowLeft, Info } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AtletaService from '../../services/AtletaService';
import EventoService from '../../services/EventoService';
import ClubService from '../../services/ClubService';
import AtletasSection from './sections/AtletasSection';
import EventosSection from './sections/EventosSection';
import PerfilClubSection from './sections/PerfilClubSection';
import GestionEventosSection from '../../components/SharedSections/GestionEventosSection';
import GestionResultadosSection from '../../components/SharedSections/GestionResultadosSection';
import './Dashboard.css';

const ClubDashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const isRoot = location.pathname === '/club' || location.pathname === '/club/';
    const [clubName, setClubName] = useState('');
    const [stats, setStats] = useState({ athletes: 0, events: 0 });

    useEffect(() => {
        if (!user) return;
        
        const loadDashboardData = async () => {
            try {
                // 1. Obtener nombre del club (si no está en el token)
                if (user.clubId) {
                    const clubData = await ClubService.getById(user.clubId);
                    setClubName(clubData.nombre || clubData.Nombre);
                    
                    // 2. Obtener total de atletas
                    const atletas = await AtletaService.getByClub(user.clubId);
                    setStats(prev => ({ ...prev, athletes: atletas.length }));
                }
                
                // 3. Obtener eventos próximos
                const proximos = await EventoService.getProximos();
                setStats(prev => ({ ...prev, events: proximos.length }));
                
            } catch (err) {
                console.error("Error loading dashboard stats:", err);
            }
        };
        
        loadDashboardData();
    }, [user]);

    return (
        <div className="dashboard-page container">
            <div className="dashboard-header-inline" style={{ alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
                    {!isRoot && (
                        <button 
                            className="btn-admin-secondary" 
                            onClick={() => navigate('/club')}
                            title="Volver al inicio del panel"
                            style={{ 
                                padding: '0', 
                                width: '42px', 
                                height: '42px', 
                                borderRadius: '50%',
                                flexShrink: 0
                            }}
                        >
                            <ArrowLeft size={20} />
                        </button>
                    )}
                    <div>
                        <h1 className="gradient-text" style={{ margin: 0 }}>
                            Panel del Club {clubName ? `"${clubName}"` : ''}
                        </h1>
                        <p className="dashboard-subtitle" style={{ margin: '0.2rem 0 0 0' }}>Bienvenido a tu centro de mando</p>
                    </div>
                </div>
            </div>

            <div className="dashboard-content-area">
                <Routes>
                    <Route index element={<DashboardMenu navigate={navigate} stats={stats} />} />
                    <Route path="atletas" element={<AtletasSection />} />
                    <Route path="eventos" element={<EventosSection />} />
                    <Route path="perfil" element={<PerfilClubSection />} />
                    <Route path="organizar/*" element={<GestionEventosSection />} />
                    <Route path="resultados" element={<GestionResultadosSection />} />
                </Routes>
            </div>
        </div>
    );
};

const DashboardMenu = ({ navigate, stats }) => (
    <div className="dashboard-menu-container fade-in">
        <div className="stats-bar glass-effect mb-xl">
            <div className="stat-item">
                <span className="stat-value">{stats.athletes}</span>
                <span className="stat-label">Atletas Registrados</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
                <span className="stat-value">{stats.events}</span>
                <span className="stat-label">Eventos Próximos</span>
            </div>
        </div>

        <div className="dashboard-grid">
            <div className="dashboard-card glass-effect clickable" onClick={() => navigate('atletas')}>
                <div className="card-icon" style={{ color: 'var(--color-primary)' }}><Users size={40} /></div>
                <h3>Atletas</h3>
                <p className="card-label">Gestiona tu nómina ({stats.athletes})</p>
            </div>

            <div className="dashboard-card glass-effect clickable" onClick={() => navigate('eventos')}>
                <div className="card-icon" style={{ color: 'var(--color-secondary)' }}><Calendar size={40} /></div>
                <h3>Inscripciones</h3>
                <p className="card-label">{stats.events} eventos disponibles</p>
            </div>

            <div className="dashboard-card glass-effect clickable" onClick={() => navigate('organizar')}>
                <div className="card-icon" style={{ color: '#10B981' }}><LayoutTemplate size={40} /></div>
                <h3>Organizar Evento</h3>
                <p className="card-label">Crear y gestionar regatas</p>
            </div>

            <div className="dashboard-card glass-effect clickable" onClick={() => navigate('resultados')}>
                <div className="card-icon" style={{ color: 'var(--color-accent-orange)' }}><Trophy size={40} /></div>
                <h3>Resultados</h3>
                <p className="card-label">Carga de tiempos y Start List</p>
            </div>
        </div>
    </div>
);

export default ClubDashboard;
