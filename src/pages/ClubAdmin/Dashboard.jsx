import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Users, Calendar, LayoutTemplate, Trophy, ArrowLeft, Info, Activity } from 'lucide-react';
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
    const [recentActivity, setRecentActivity] = useState([]);

    useEffect(() => {
        if (!user) return;
        
        const loadDashboardData = async () => {
            try {
                // 1. Obtener nombre del club
                let activityItems = [];

                if (user.clubId) {
                    const clubData = await ClubService.getById(user.clubId);
                    setClubName(clubData.nombre || clubData.Nombre);
                    
                    // 2. Obtener total de atletas (para los contadores en cards)
                    const atletas = await AtletaService.getByClub(user.clubId);
                    setStats(prev => ({ ...prev, athletes: atletas.length }));

                    // 3. Simular Actividad Reciente (Atletas)
                    const sortedAtletas = [...atletas].sort((a,b) => b.id - a.id).slice(0, 3);
                    const athleteActivity = sortedAtletas.map(a => ({
                        id: `atleta-${a.id}`,
                        tipo: 'Atleta',
                        titulo: 'Nuevo Atleta Registrado',
                        detalle: `${a.nombre} ${a.apellido}`,
                        fecha: 'Hoy',
                        icon: <Users size={16} />
                    }));
                    activityItems = [...athleteActivity];
                }
                
                // 4. Obtener eventos próximos (Filtrando controles para clubes)
                const allProximos = await EventoService.getProximos();
                const proximos = user.rol === 'Admin' ? allProximos : allProximos.filter(e => !e.nombre.toLowerCase().includes('control'));
                setStats(prev => ({ ...prev, events: proximos.length }));
                
                if (proximos.length > 0) {
                    const eventActivity = proximos.slice(0, 2).map(e => ({
                        id: `evento-${e.id}`,
                        tipo: 'Evento',
                        titulo: 'Evento Próximo',
                        detalle: e.nombre,
                        fecha: 'Inscripciones Abiertas',
                        icon: <Calendar size={16} />
                    }));
                    activityItems = [...activityItems, ...eventActivity];
                }

                setRecentActivity(activityItems);
                
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
                    <Route index element={<DashboardMenu navigate={navigate} stats={stats} recentActivity={recentActivity} />} />
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

const DashboardMenu = ({ navigate, stats, recentActivity }) => (
    <div className="dashboard-menu-container fade-in">
        <div className="dashboard-grid mb-xl">
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

        <div className="recent-activity-panel glass-effect">
            <div className="panel-header">
                <Activity size={20} className="text-primary" />
                <h3>Últimos Movimientos</h3>
            </div>
            <div className="activity-list">
                {recentActivity.length > 0 ? (
                    recentActivity.map((act, idx) => (
                        <div key={act.id} className="activity-item">
                            <div className={`activity-icon-small ${act.tipo.toLowerCase()}`}>
                                {act.icon}
                            </div>
                            <div className="activity-info">
                                <div className="activity-title-row">
                                    <span className="act-title">{act.titulo}</span>
                                    <span className="act-date">{act.fecha}</span>
                                </div>
                                <p className="act-detail">{act.detalle}</p>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="empty-activity">No hay movimientos recientes registrados</div>
                )}
            </div>
        </div>
    </div>
);

export default ClubDashboard;
