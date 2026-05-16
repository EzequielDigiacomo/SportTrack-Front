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
import SupportService from '../../services/SupportService';
import { History, Clock, FileText, AlertCircle, User } from 'lucide-react';

const AdminHome = () => {
    const navigate = useNavigate();
    const { id } = useParams(); // ID de federación opcional para SuperAdmin
    const { user } = useAuth();
    const [stats, setStats] = useState({ eventos: 0, programados: 0, clubes: 0, atletas: 0 });
    const [globalStats, setGlobalStats] = useState(null);
    const [fedName, setFedName] = useState('');
    const [loading, setLoading] = useState(true);
    const [recentLogs, setRecentLogs] = useState([]);

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
                    
                    try {
                        const logs = await SupportService.getLogs({ limit: 8 });
                        setRecentLogs(logs);
                    } catch (logErr) {
                        console.error("Error cargando logs (no crítico):", logErr);
                        setRecentLogs([]);
                    }
                } else if (isSuper && id) {
                    // SuperAdmin viendo una federación específica → usar datos de SaaS
                    const clubesStatus = await SaaSService.getClubesStatus();
                    const fed = clubesStatus.find(f => String(f.clubId) === String(id));
                    if (fed) {
                        setFedName(fed.clubNombre);
                        setStats({
                            eventos: fed.torneosActivosCount || 0,
                            programados: 0,
                            clubes: fed.clubesAfiliadosCount || 0,
                            atletas: fed.atletasRegistrados || 0
                        });
                    }
                } else {
                    // Admin normal: cargar sus propios datos
                    const [eventosRaw, clubesData] = await Promise.all([
                        EventoService.getAll(),
                        ClubService.getAll()
                    ]);
                    const eventosData = isSuper ? eventosRaw : eventosRaw.filter(e => !e.nombre.toLowerCase().includes('control'));
                    const eventosProgramados = eventosData.filter(e => e.estado === 'Programado').length;
                    const subClubes = clubesData.filter(c => c.id !== user.clubId);
                    const totalAtletas = subClubes.reduce((acc, club) => acc + (club.cantidadAtletas || 0), 0);
                    setStats({
                        eventos: eventosData.length,
                        programados: eventosProgramados,
                        clubes: subClubes.length,
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

                <div className="dashboard-content-row">
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

                <div className="recent-activity-container glass-effect">
                    <div className="activity-header">
                        <div className="flex items-center gap-2">
                            <History size={22} className="text-blue-400" />
                            <h4>Últimos Movimientos</h4>
                        </div>
                        <p className="text-secondary text-sm">Monitoreo de actividad de administradores y clubes</p>
                    </div>

                    <div className="activity-table-wrapper">
                        <table className="activity-table">
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Usuario</th>
                                    <th>Módulo</th>
                                    <th>Acción</th>
                                    <th className="detail-cell">Detalles</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentLogs.length > 0 ? (
                                    recentLogs.map((log) => (
                                        <tr key={log.id} className="activity-row">
                                            <td className="time-cell">
                                                <Clock size={14} className="activity-time-icon mr-1 opacity-60" />
                                                <span className="time-text">
                                                    {new Date(log.fecha).toLocaleString('es-AR', {
                                                        day: '2-digit',
                                                        month: '2-digit',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                            </td>
                                            <td className="user-cell">
                                                <div className="user-pill">
                                                    <User size={12} className="mr-1" />
                                                    {log.usuario}
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`module-badge ${log.modulo?.toLowerCase()}`}>
                                                    <span className="hide-mobile">{log.modulo}</span>
                                                    <span className="show-mobile-inline">
                                                        {log.modulo === 'Atletas' ? 'ATL' : 
                                                         log.modulo === 'Eventos' ? 'EVE' : 
                                                         log.modulo === 'Clubes' ? 'CLU' : 
                                                         log.modulo === 'Auth' ? 'AUT' : 
                                                         log.modulo === 'SaaS' ? 'SAS' : 
                                                         log.modulo?.substring(0, 3).toUpperCase()}
                                                    </span>
                                                </span>
                                            </td>
                                            <td className="action-cell">
                                                <span className="action-text">
                                                    <span className="hide-mobile">{log.accion}</span>
                                                    <span className="show-mobile-inline">
                                                        {log.accion === 'LOGIN_SUCCESS' ? 'LGN_OK' : 
                                                         log.accion === 'LOGIN_BLOCKED' ? 'LGN_BLOK' : 
                                                         log.accion === 'ERROR_FATAL' ? 'ERR_FATAL' : 
                                                         log.accion === 'CREATE_ATHLETE' ? 'NEW_ATL' : 
                                                         log.accion === 'UPDATE_ATHLETE' ? 'UPD_ATL' : 
                                                         log.accion?.replace('ATHLETE', 'ATL').replace('SUCCESS', 'OK')}
                                                    </span>
                                                </span>
                                            </td>
                                            <td className="detail-cell">
                                                <div className="detail-content" title={log.detalle}>
                                                    {log.detalle?.length > 60 
                                                        ? log.detalle.substring(0, 60) + '...' 
                                                        : log.detalle}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="text-center py-8 opacity-50">
                                            No hay movimientos recientes registrados.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }

    // --- VISTA ADMIN (FEDERACIÓN) ---
    // Si el SuperAdmin está viendo una fed específica, agregamos el fedId como query param
    const navTo = (path) => {
        if (isViewingSpecificFed) {
            navigate(`${path}?fedId=${id}`);
        } else {
            navigate(path);
        }
    };

    const fedCards = [
        { 
            id: '/super/eventos', icon: <Calendar size={32} />, title: 'Eventos', color: 'var(--color-primary)',
            desc: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: '0.5rem' }}>
                    <span style={{ fontSize: '1rem' }}>Torneos Activos: <strong style={{ color: 'var(--color-primary-light)', fontSize: '1.4rem' }}>{stats.eventos}</strong></span>
                </div>
            ) 
        },
        { 
            id: '/super/clubes', icon: <Building2 size={32} />, title: 'Clubes Afiliados', color: 'var(--color-secondary)',
            desc: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: '0.5rem' }}>
                    <span style={{ fontSize: '1rem' }}>Clubes: <strong style={{ color: 'var(--color-secondary-light)', fontSize: '1.4rem' }}>{stats.clubes}</strong></span>
                    <span style={{ fontSize: '1rem' }}>Atletas: <strong style={{ color: '#10B981', fontSize: '1.4rem' }}>{stats.atletas}</strong></span>
                </div>
            ) 
        },
        { id: '/super/logins', icon: <Key size={32} />, title: 'Logins & Usuarios', desc: <span style={{ fontSize: '1rem' }}>Accesos para mis clubes</span>, color: '#10B981' },
        { id: '/super/atletas', icon: <Users size={32} />, title: 'Atletas', desc: <span style={{ fontSize: '1rem' }}>Nómina de mi federación</span>, color: 'var(--color-accent)' },
        { id: '/super/controles', icon: <Timer size={32} />, title: 'Controles Técnicos', desc: <span style={{ fontSize: '1rem' }}>Registros técnicos internos</span>, color: '#f59e0b' },
        { id: '/super/resultados', icon: <Timer size={32} />, title: 'Resultados', desc: <span style={{ fontSize: '1rem' }}>Cronometraje y validación</span>, color: 'var(--color-accent-orange)' },
    ];

    return (
        <div className="admin-home fade-in">
            <div className="admin-home-header">
                {isViewingSpecificFed && (
                    <button 
                        onClick={() => navigate('/super/saas')}
                        style={{ 
                            display: 'flex', alignItems: 'center', gap: '6px',
                            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                            color: 'var(--color-text-secondary)', borderRadius: '8px',
                            padding: '6px 12px', cursor: 'pointer', fontSize: '0.85rem',
                            marginBottom: '1rem'
                        }}
                    >
                        <ArrowLeft size={16} /> Volver a Suscripciones
                    </button>
                )}
                <h1 className="gradient-text">
                    {isViewingSpecificFed ? (fedName || `Federación #${id}`) : 'Panel de Federación'}
                </h1>
                <p className="admin-home-subtitle">
                    {isViewingSpecificFed 
                        ? `Vista de administración para esta federación.` 
                        : 'Gestiona tus clubes, atletas y eventos deportivos.'
                    }
                </p>
            </div>
            <div className="admin-home-grid">
                {fedCards.map(c => (
                    <div key={c.id} className="admin-home-card glass-effect" onClick={() => navTo(c.id)}>
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
