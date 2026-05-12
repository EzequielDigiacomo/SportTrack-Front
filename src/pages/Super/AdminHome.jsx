import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
    Calendar, 
    Building2, 
    Key, 
    Users, 
    Timer, 
    ArrowLeft, 
    Globe, 
    TrendingUp, 
    Activity,
    ShieldCheck,
    Eye
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import EventoService from '../../services/EventoService';
import ClubService from '../../services/ClubService';
import SaaSService from '../../services/SaaSService';

const AdminHome = () => {
    const navigate = useNavigate();
    const { id } = useParams(); // ID de federación opcional para SuperAdmin
    const { user } = useAuth();
    const [stats, setStats] = useState({ eventos: 0, programados: 0, clubes: 0, atletas: 0 });
    const [globalStats, setGlobalStats] = useState(null);
    const [loading, setLoading] = useState(true);

    const role = user?.rol?.trim().toLowerCase();
    const isSuper = role === 'superadmin' || user?.username === 'soporte_tecnico';
    const isViewingSpecificFed = isSuper && id;

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                if (isSuper && !id) {
                    // Cargar métricas globales para SuperAdmin
                    const data = await SaaSService.getGlobalMetrics();
                    setGlobalStats(data);
                } else {
                    // Cargar estadísticas normales (para Admin o vista específica de SuperAdmin)
                    // NOTA: El backend ya debería filtrar automáticamente si no somos SuperAdmin
                    // Si somos SuperAdmin viendo una específica, el backend debería recibir el ID? 
                    // Por ahora usamos la lógica de filtrado jerárquico que pusimos en el backend.
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
                }
            } catch (err) {
                console.error("Error cargando dashboard", err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [isSuper, id]);

    if (loading) return <div className="loader-container"><div className="loader"></div></div>;

    // --- VISTA SUPERADMIN (GLOBAL) ---
    if (isSuper && !id && globalStats) {
        return (
            <div className="admin-home fade-in">
                <div className="admin-home-header">
                    <div>
                        <h1 className="gradient-text">Consola de Control Global</h1>
                        <p className="admin-home-subtitle">Métricas de rendimiento de toda la plataforma SportTrack</p>
                    </div>
                </div>

                <div className="stats-dashboard-grid">
                    <div className="stat-card-premium glass-effect">
                        <div className="stat-icon-bg purple"><Globe size={24} /></div>
                        <div className="stat-info">
                            <h3>{globalStats.totalFederaciones}</h3>
                            <p>Federaciones Activas</p>
                        </div>
                        <div className="stat-trend positive">+12% <TrendingUp size={14} /></div>
                    </div>
                    <div className="stat-card-premium glass-effect">
                        <div className="stat-icon-bg blue"><Building2 size={24} /></div>
                        <div className="stat-info">
                            <h3>{globalStats.totalClubesAfiliados}</h3>
                            <p>Clubes Afiliados</p>
                        </div>
                    </div>
                    <div className="stat-card-premium glass-effect">
                        <div className="stat-icon-bg green"><Users size={24} /></div>
                        <div className="stat-info">
                            <h3>{globalStats.totalAtletasGlobales}</h3>
                            <p>Atletas Totales</p>
                        </div>
                    </div>
                    <div className="stat-card-premium glass-effect">
                        <div className="stat-icon-bg orange"><Activity size={24} /></div>
                        <div className="stat-info">
                            <h3>{globalStats.torneosActivosGlobales}</h3>
                            <p>Torneos en Curso</p>
                        </div>
                    </div>
                </div>

                <div className="dashboard-content-row mt-4">
                    <div className="growth-chart-container glass-effect flex-2">
                        <div className="chart-header">
                            <h4>Crecimiento de la Red</h4>
                            <span className="badge-pill">Histórico 2024</span>
                        </div>
                        <div className="mock-chart-visual">
                            {globalStats.crecimientoMensual.map((item, idx) => (
                                <div key={idx} className="chart-bar-item">
                                    <div className="bar-fill" style={{ height: `${(item.cantidad / 30) * 100}%` }}>
                                        <span className="bar-tooltip">{item.cantidad}</span>
                                    </div>
                                    <span className="bar-label">{item.mes}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="top-entities-list glass-effect flex-1">
                        <h4>Top Federaciones</h4>
                        <div className="entities-list">
                            {globalStats.topFederaciones.map((fed, idx) => (
                                <div key={idx} className="entity-row">
                                    <div className="entity-rank">{idx + 1}</div>
                                    <div className="entity-name">
                                        <strong>{fed.nombre}</strong>
                                        <span>{fed.clubesCount} Clubes</span>
                                    </div>
                                    <ShieldCheck size={18} className="icon-verify" />
                                </div>
                            ))}
                        </div>
                        <button className="btn-view-all" onClick={() => navigate('/super/saas')}>Gestionar Federaciones</button>
                    </div>
                </div>
            </div>
        );
    }

    // --- VISTA ADMIN (FEDERACIÓN) ---
    const fedCards = [
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
            id: '/super/clubes', icon: <Building2 size={32} />, title: 'Mis Clubes', color: 'var(--color-secondary)',
            desc: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: '0.5rem' }}>
                    <span style={{ fontSize: '1rem' }}>Total: <strong style={{ color: 'var(--color-secondary-light)', fontSize: '1.4rem' }}>{stats.clubes}</strong></span>
                    <span style={{ fontSize: '1rem' }}>Atletas: <strong style={{ color: '#10B981', fontSize: '1.4rem' }}>{stats.atletas}</strong></span>
                </div>
            ) 
        },
        { id: '/super/logins', icon: <Key size={32} />, title: 'Logins & Usuarios', desc: <span style={{ fontSize: '1rem' }}>Accesos para mis clubes</span>, color: '#10B981' },
        { id: '/super/atletas', icon: <Users size={32} />, title: 'Atletas', desc: <span style={{ fontSize: '1rem' }}>Nómina de mi federación</span>, color: 'var(--color-accent)' },
        { id: '/super/resultados', icon: <Timer size={32} />, title: 'Resultados', desc: <span style={{ fontSize: '1rem' }}>Cronometraje y validación</span>, color: 'var(--color-accent-orange)' },
    ];

    return (
        <div className="admin-home fade-in">
            <div className="admin-home-header">
                <h1 className="gradient-text">Panel de Federación</h1>
                <p className="admin-home-subtitle">Gestiona tus clubes, atletas y eventos deportivos.</p>
            </div>
            <div className="admin-home-grid">
                {fedCards.map(c => (
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
