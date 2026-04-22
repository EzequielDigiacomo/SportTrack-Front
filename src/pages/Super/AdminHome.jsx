import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Building2, Key, Users, Timer, ArrowLeft } from 'lucide-react';
import EventoService from '../../services/EventoService';
import ClubService from '../../services/ClubService';

const AdminHome = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({ eventos: 0, programados: 0, clubes: 0, atletas: 0 });

    useEffect(() => {
        const loadStats = async () => {
            try {
                const [eventosData, clubesData] = await Promise.all([
                    EventoService.getAll(),
                    ClubService.getAll()
                ]);

                const eventosProgramados = eventosData.filter(e => e.estado === 'Programado').length;
                const totalAtletas = clubesData.reduce((acc, club) => acc + (club.cantidadAtletas || 0), 0);

                setStats({
                    eventos: eventosData.length,
                    programados: eventosProgramados,
                    clubes: clubesData.length,
                    atletas: totalAtletas
                });
            } catch (err) {
                console.error("Error cargando estadísticas", err);
            }
        };
        loadStats();
    }, []);
    
    const cards = [
        { 
            id: '/super/eventos', icon: <Calendar size={32} />, title: 'Eventos', color: 'var(--color-primary)',
            desc: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: '0.5rem' }}>
                    <span style={{ fontSize: '1rem' }}>Creados: <strong style={{ color: 'var(--color-primary-light)', fontSize: '1.4rem' }}>{stats.eventos}</strong></span>
                    <span style={{ fontSize: '1rem' }}>Sin competir: <strong style={{ color: 'var(--color-accent)', fontSize: '1.4rem' }}>{stats.programados}</strong></span>
                </div>
            ) 
        },
        { 
            id: '/super/clubes', icon: <Building2 size={32} />, title: 'Clubes', color: 'var(--color-secondary)',
            desc: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: '0.5rem' }}>
                    <span style={{ fontSize: '1rem' }}>Total: <strong style={{ color: 'var(--color-secondary-light)', fontSize: '1.4rem' }}>{stats.clubes}</strong></span>
                    <span style={{ fontSize: '1rem' }}>Atletas: <strong style={{ color: '#10B981', fontSize: '1.4rem' }}>{stats.atletas}</strong></span>
                </div>
            ) 
        },
        { id: '/super/logins', icon: <Key size={32} />, title: 'Logins & Accesos', desc: <span style={{ fontSize: '1rem' }}>Usuarios para clubes</span>, color: '#10B981' },
        { id: '/super/atletas', icon: <Users size={32} />, title: 'Atletas', desc: <span style={{ fontSize: '1rem' }}>Nómina global del sistema</span>, color: 'var(--color-accent)' },
        { id: '/super/resultados', icon: <Timer size={32} />, title: 'Resultados', desc: <span style={{ fontSize: '1rem' }}>Cronometraje y validación</span>, color: 'var(--color-accent-orange)' },
    ];

    return (
        <div className="admin-home fade-in">
            <div className="admin-home-header" style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', marginBottom: '2rem' }}>
                <button 
                    className="btn-admin-secondary" 
                    onClick={() => navigate(-1)}
                    title="Volver"
                    style={{ padding: '0', width: '42px', height: '42px', borderRadius: '50%', flexShrink: 0 }}
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="gradient-text" style={{ margin: 0 }}>Panel Federativo</h1>
                    <p className="admin-home-subtitle" style={{ margin: '0.2rem 0 0 0' }}>Bienvenido a tu centro de mando</p>
                </div>
            </div>
            <div className="admin-home-grid">
                {cards.map(c => (
                    <div key={c.id} className="admin-home-card glass-effect" onClick={() => navigate(c.id)}>
                        <div className="admin-home-card-icon" style={{ color: c.color }}>{c.icon}</div>
                        <h3>{c.title}</h3>
                        <div className="card-desc" style={{ color: 'var(--color-text-secondary)' }}>{c.desc}</div>
                        <span className="card-arrow">→</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AdminHome;

