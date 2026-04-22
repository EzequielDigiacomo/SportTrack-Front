import React from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Users, Calendar, LayoutTemplate, Trophy, ArrowLeft } from 'lucide-react';
import AtletasSection from './sections/AtletasSection';
import EventosSection from './sections/EventosSection';
import PerfilClubSection from './sections/PerfilClubSection';
import GestionEventosSection from '../../components/SharedSections/GestionEventosSection';
import GestionResultadosSection from '../../components/SharedSections/GestionResultadosSection';
import './Dashboard.css';

const ClubDashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const isRoot = location.pathname === '/club' || location.pathname === '/club/';

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
                        <h1 className="gradient-text" style={{ margin: 0 }}>Panel del Club</h1>
                        <p className="dashboard-subtitle" style={{ margin: '0.2rem 0 0 0' }}>Bienvenido a tu centro de mando</p>
                    </div>
                </div>
            </div>

            <div className="dashboard-content-area">
                <Routes>
                    <Route index element={<DashboardMenu navigate={navigate} />} />
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

const DashboardMenu = ({ navigate }) => (
    <div className="dashboard-grid fade-in">
        <div className="dashboard-card glass-effect clickable" onClick={() => navigate('atletas')}>
            <div className="card-icon" style={{ color: 'var(--color-primary)' }}><Users size={40} /></div>
            <h3>Atletas</h3>
            <p className="card-label">Gestiona tu nómina</p>
        </div>

        <div className="dashboard-card glass-effect clickable" onClick={() => navigate('eventos')}>
            <div className="card-icon" style={{ color: 'var(--color-secondary)' }}><Calendar size={40} /></div>
            <h3>Eventos</h3>
            <p className="card-label">Inscripciones abiertas</p>
        </div>

        <div className="dashboard-card glass-effect clickable" onClick={() => navigate('organizar')}>
            <div className="card-icon" style={{ color: '#10B981' }}><LayoutTemplate size={40} /></div>
            <h3>Organizar Evento</h3>
            <p className="card-label">Creo y gestiono regatas</p>
        </div>

        <div className="dashboard-card glass-effect clickable" onClick={() => navigate('resultados')}>
            <div className="card-icon" style={{ color: 'var(--color-accent-orange)' }}><Trophy size={40} /></div>
            <h3>Resultados</h3>
            <p className="card-label">Carga de resultados y Start List</p>
        </div>
    </div>
);

export default ClubDashboard;
