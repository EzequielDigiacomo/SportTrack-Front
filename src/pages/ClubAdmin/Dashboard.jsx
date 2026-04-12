import React from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import AtletasSection from './sections/AtletasSection';
import EventosSection from './sections/EventosSection';
import GestionEventosSection from '../../components/SharedSections/GestionEventosSection';
import GestionResultadosSection from '../../components/SharedSections/GestionResultadosSection';
import './Dashboard.css';

const ClubDashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const isRoot = location.pathname === '/club' || location.pathname === '/club/';

    return (
        <div className="dashboard-page container">
            <div className="dashboard-header-inline">
                <div>
                    <h1 className="gradient-text">Panel del Club</h1>
                    <p className="dashboard-subtitle">Bienvenido a tu centro de mando</p>
                </div>
                {!isRoot && (
                    <button className="btn-back" onClick={() => navigate('/club')}>
                        ← Volver al Inicio
                    </button>
                )}
            </div>

            <div className="dashboard-content-area">
                <Routes>
                    <Route index element={<DashboardMenu navigate={navigate} />} />
                    <Route path="atletas" element={<AtletasSection />} />
                    <Route path="eventos" element={<EventosSection />} />
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
            <div className="card-icon">👥</div>
            <h3>Atletas</h3>
            <p className="card-label">Gestiona tu nómina</p>
        </div>

        <div className="dashboard-card glass-effect clickable" onClick={() => navigate('eventos')}>
            <div className="card-icon">🚣</div>
            <h3>Eventos</h3>
            <p className="card-label">Inscripciones abiertas</p>
        </div>

        <div className="dashboard-card glass-effect clickable" onClick={() => navigate('organizar')}>
            <div className="card-icon">🏗️</div>
            <h3>Organizar Evento</h3>
            <p className="card-label">Creo y gestiono regatas</p>
        </div>

        <div className="dashboard-card glass-effect clickable" onClick={() => navigate('resultados')}>
            <div className="card-icon">🏅</div>
            <h3>Resultados</h3>
            <p className="card-label">Carga de resultados y Start List</p>
        </div>
    </div>
);

export default ClubDashboard;
