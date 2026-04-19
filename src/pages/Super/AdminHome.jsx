import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Building2, Key, Users, Timer } from 'lucide-react';

const AdminHome = () => {
    const navigate = useNavigate();
    
    const cards = [
        { id: '/super/eventos', icon: <Calendar size={32} />, title: 'Eventos', desc: 'Crear y gestionar competencias', color: 'var(--color-primary)' },
        { id: '/super/clubes', icon: <Building2 size={32} />, title: 'Clubes', desc: 'Administrar instituciones', color: 'var(--color-secondary)' },
        { id: '/super/logins', icon: <Key size={32} />, title: 'Logins & Accesos', desc: 'Usuarios para clubes', color: '#10B981' },
        { id: '/super/atletas', icon: <Users size={32} />, title: 'Atletas', desc: 'Nómina global del sistema', color: 'var(--color-accent)' },
        { id: '/super/resultados', icon: <Timer size={32} />, title: 'Resultados', desc: 'Cronometraje y validación', color: 'var(--color-accent-orange)' },
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

export default AdminHome;
