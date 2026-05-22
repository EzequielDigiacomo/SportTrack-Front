import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AtletaService from '../../services/AtletaService';
import EventoService from '../../services/EventoService';
import ClubService from '../../services/ClubService';
import InscripcionService from '../../services/InscripcionService';
import { PruebaService } from '../../services/ConfigService';
import AtletasSection from './sections/AtletasSection';
import EventosSection from './sections/EventosSection';
import ControlesSection from './sections/ControlesSection';
import PerfilClubSection from './sections/PerfilClubSection';
import PagosClubSection from './sections/PagosClubSection';
import GestionEventosSection from '../../components/SharedSections/GestionEventosSection';
import GestionResultadosSection from '../../components/SharedSections/GestionResultadosSection';
import { Users, Calendar, LayoutTemplate, Trophy, ArrowLeft, Info, Activity, Timer, DollarSign, ShieldAlert } from 'lucide-react';
import './Dashboard.css';
 
const ClubDashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const isRoot = location.pathname === '/club' || location.pathname === '/club/';
    const [clubName, setClubName] = useState('');
    const [stats, setStats] = useState({ athletes: 0, events: 0 });
    const [recentActivity, setRecentActivity] = useState([]);
    const [pagoAfiliacionAlDia, setPagoAfiliacionAlDia] = useState(true);
 
    useEffect(() => {
        if (!user) return;
        if (!isRoot) return;
        
        const loadDashboardData = async () => {
            try {
                // 1. Obtener eventos próximos primero
                const allProximos = await EventoService.getProximos();
                const proximos = user.rol === 'SuperAdmin' ? allProximos : allProximos.filter(e => !e.nombre.toLowerCase().includes('control'));
                const controles = allProximos.filter(e => e.nombre.toLowerCase().includes('control'));
                
                let activityItems = [];
                let athleteActivity = [];
                let inscriptionsActivity = [];
 
                if (user.clubId) {
                    // 2. Obtener datos del club
                    const clubData = await ClubService.getById(user.clubId);
                    setClubName(clubData.nombre || clubData.Nombre);
                    setPagoAfiliacionAlDia(clubData.pagoAfiliacionAlDia !== undefined ? clubData.pagoAfiliacionAlDia : clubData.PagoAfiliacionAlDia);
                    
                    // 3. Obtener total de atletas (para los contadores en cards)
                    const atletas = await AtletaService.getByClub(user.clubId);
                    setStats(prev => ({ ...prev, athletes: atletas.length }));
 
                    // 4. Actividad Reciente de Atletas
                    const sortedAtletas = [...atletas].sort((a,b) => b.id - a.id).slice(0, 3);
                    athleteActivity = sortedAtletas.map(a => ({
                        id: `atleta-${a.id}`,
                        tipo: 'Atleta',
                        titulo: 'Nuevo Atleta Registrado',
                        detalle: `${a.nombre} ${a.apellido}`,
                        fecha: 'Hoy',
                        icon: <Users size={16} />
                    }));
 
                    // 5. Cargar inscripciones del club para los eventos próximos
                    if (proximos.length > 0) {
                        try {
                            const results = await Promise.all(
                                proximos.map(async (evento) => {
                                    try {
                                        const [inscripciones, pruebas] = await Promise.all([
                                            InscripcionService.getByEventoAndClub(evento.id, user.clubId),
                                            PruebaService.getByEvento(evento.id)
                                        ]);
                                        return { evento, inscripciones, pruebas };
                                    } catch (e) {
                                        console.error(`Error loading inscriptions for event ${evento.id}`, e);
                                        return { evento, inscripciones: [], pruebas: [] };
                                    }
                                })
                            );
 
                            results.forEach(({ evento, inscripciones, pruebas }) => {
                                const pruebasMap = {};
                                pruebas.forEach(p => {
                                    pruebasMap[p.id] = p;
                                });
 
                                inscripciones.forEach(insc => {
                                    const epId = insc.eventoPruebaId || insc.EventoPruebaId;
                                    const pruebaInfo = pruebasMap[epId];
                                    
                                    const catNombre = pruebaInfo?.prueba?.categoria?.nombre || "Prueba";
                                    const boteTipo = pruebaInfo?.prueba?.bote?.tipo || "";
                                    const distDesc = pruebaInfo?.prueba?.distancia?.descripcion || "";
                                    const sexNombre = pruebaInfo?.prueba?.sexoNombre || pruebaInfo?.prueba?.sexo?.nombre || "";
                                    
                                    const pruebaStr = `${catNombre} ${boteTipo} ${distDesc} ${sexNombre}`.trim();
                                    const atletaNombre = insc.participanteNombreCompleto || insc.ParticipanteNombreCompleto || "Atleta";
                                    
                                    const fechaInsc = new Date(insc.fechaInscripcion || insc.FechaInscripcion);
                                    const fechaStr = isNaN(fechaInsc.getTime()) 
                                        ? 'Reciente' 
                                        : fechaInsc.toLocaleDateString();
 
                                    inscriptionsActivity.push({
                                        id: `inscripcion-${insc.id || insc.Id}`,
                                        tipo: 'Inscripcion',
                                        titulo: 'Atleta Inscrito a Regata',
                                        detalle: `${atletaNombre} inscrito en ${pruebaStr} (${evento.nombre})`,
                                        fecha: fechaStr,
                                        icon: <Trophy size={16} />,
                                        fechaSort: fechaInsc
                                    });
                                });
                            });
 
                            // Ordenar inscripciones por fecha más reciente
                            inscriptionsActivity.sort((a, b) => {
                                const dateA = a.fechaSort ? a.fechaSort.getTime() : 0;
                                const dateB = b.fechaSort ? b.fechaSort.getTime() : 0;
                                return dateB - dateA;
                            });
                        } catch (e) {
                            console.error("Error loading inscriptions activity", e);
                        }
                    }
                }
                
                setStats(prev => ({ 
                    ...prev, 
                    events: proximos.length,
                    controles: controles.length
                }));
                
                let eventActivity = [];
                if (proximos.length > 0) {
                    eventActivity = proximos.slice(0, 2).map(e => ({
                        id: `evento-${e.id}`,
                        tipo: 'Evento',
                        titulo: 'Evento Próximo',
                        detalle: e.nombre,
                        fecha: 'Inscripciones Abiertas',
                        icon: <Calendar size={16} />
                    }));
                }
 
                // Combinar actividades en orden de relevancia
                activityItems = [
                    ...inscriptionsActivity.slice(0, 4), // Mostrar hasta 4 inscripciones recientes
                    ...athleteActivity,
                    ...eventActivity
                ];
 
                setRecentActivity(activityItems);
                
            } catch (err) {
                console.error("Error loading dashboard stats:", err);
            }
        };
        
        loadDashboardData();
    }, [user, isRoot]);

    return (
        <div className="dashboard-page container">
            <div className="dashboard-header-inline" style={{ 
                alignItems: 'center',
                borderLeft: (user?.rol === 'Admin' && user?.plan) ? `6px solid ${user.plan.nombre.toLowerCase() === 'oro' ? '#FFD700' : user.plan.nombre.toLowerCase() === 'plata' ? '#E0E0E0' : '#CD7F32'}` : 'none',
                paddingLeft: (user?.rol === 'Admin' && user?.plan) ? '1.5rem' : '0',
                transition: 'all 0.3s ease'
            }}>
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
                        <h1 className="gradient-text" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                            {user?.rol === 'Admin' ? 'Panel de la Federación' : 'Panel del Club'} {clubName ? `"${clubName}"` : ''}
                            {(user?.rol === 'Admin' && user?.plan) && (
                                <span style={{ 
                                    fontSize: '0.7rem', 
                                    padding: '4px 12px', 
                                    borderRadius: '20px',
                                    border: '1px solid',
                                    color: user.plan.nombre.toLowerCase() === 'oro' ? '#FFD700' : user.plan.nombre.toLowerCase() === 'plata' ? '#E0E0E0' : '#CD7F32',
                                    backgroundColor: 'rgba(255,255,255,0.03)',
                                    boxShadow: `0 0 15px ${user.plan.nombre.toLowerCase() === 'oro' ? 'rgba(255, 215, 0, 0.2)' : user.plan.nombre.toLowerCase() === 'plata' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(205, 127, 50, 0.15)'}`,
                                    fontWeight: '900',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px'
                                }}>
                                    {user.plan.nombre}
                                </span>
                            )}
                        </h1>
                        <p className="dashboard-subtitle" style={{ margin: '0.2rem 0 0 0' }}>Gestión integral de suscripción y operaciones</p>
                    </div>
                </div>
            </div>

            {/* Premium Debtor Glassmorphic Warning Banner */}
            {!pagoAfiliacionAlDia && (
                <div className="debtor-warning-banner glass-effect fade-in" style={{
                    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.05) 100%)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    boxShadow: '0 0 25px rgba(239, 68, 68, 0.15), inset 0 0 12px rgba(239, 68, 68, 0.1)',
                    borderRadius: '16px',
                    padding: '1.25rem 1.5rem',
                    marginTop: '1.5rem',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.25rem',
                    backdropFilter: 'blur(12px)'
                }}>
                    <div style={{
                        background: 'rgba(239, 68, 68, 0.2)',
                        color: '#EF4444',
                        width: '46px',
                        height: '46px',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        border: '1px solid rgba(239, 68, 68, 0.3)'
                    }}>
                        <ShieldAlert size={24} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <h4 style={{ margin: 0, color: '#EF4444', fontSize: '1.05rem', fontWeight: 'bold' }}>
                            Afiliación Anual Vencida / Restringido
                        </h4>
                        <p style={{ margin: '4px 0 0 0', color: 'rgba(255, 255, 255, 0.75)', fontSize: '0.9rem', lineHeight: '1.4' }}>
                            Su club tiene la afiliación anual vencida. Por favor, regularice el pago con la Federación.
                            <strong> Las funciones de registro de nuevos atletas e inscripciones a regatas se encuentran temporalmente suspendidas.</strong>
                        </p>
                    </div>
                    <button 
                        className="btn-admin-primary" 
                        onClick={() => navigate('pagos')} 
                        style={{
                            background: 'rgba(239, 68, 68, 0.2)',
                            color: '#FFF',
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            fontWeight: '600',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: '0 4px 10px rgba(239, 68, 68, 0.1)'
                        }}
                    >
                        Ver Detalles
                    </button>
                </div>
            )}
 
            <div className="dashboard-content-area">
                <Routes>
                    <Route index element={<DashboardMenu navigate={navigate} stats={stats} recentActivity={recentActivity} user={user} pagoAfiliacionAlDia={pagoAfiliacionAlDia} />} />
                    <Route path="atletas" element={<AtletasSection pagoAfiliacionAlDia={pagoAfiliacionAlDia} />} />
                    <Route path="eventos" element={<EventosSection pagoAfiliacionAlDia={pagoAfiliacionAlDia} />} />
                    <Route path="controles" element={<ControlesSection />} />
                    <Route path="perfil" element={<PerfilClubSection />} />
                    <Route path="pagos" element={<PagosClubSection />} />
                    {/* <Route path="organizar/*" element={<GestionEventosSection />} /> */}
                    <Route path="resultados" element={<GestionResultadosSection />} />
                </Routes>
            </div>
        </div>
    );
};

const DashboardMenu = ({ navigate, stats, recentActivity, user, pagoAfiliacionAlDia }) => (
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
 
            <div className="dashboard-card glass-effect clickable" onClick={() => navigate('pagos')} style={{ 
                borderTop: pagoAfiliacionAlDia ? '2px solid #10B981' : '2px solid #EF4444',
                boxShadow: pagoAfiliacionAlDia ? 'none' : '0 0 15px rgba(239, 68, 68, 0.1)'
            }}>
                <div className="card-icon" style={{ color: pagoAfiliacionAlDia ? '#10B981' : '#EF4444' }}><DollarSign size={40} /></div>
                <h3>Estado de Pagos</h3>
                <p className="card-label">{pagoAfiliacionAlDia ? 'Afiliación Anual Al Día' : 'Afiliación Pendiente'}</p>
            </div>
 
            {/* user?.rol === 'Admin' && (
                <div className="dashboard-card glass-effect clickable" onClick={() => navigate('organizar')}>
                    <div className="card-icon" style={{ color: '#10B981' }}><LayoutTemplate size={40} /></div>
                    <h3>Organizar Evento</h3>
                    <p className="card-label">Crear y gestionar regatas</p>
                </div>
            ) */}
 
            <div className="dashboard-card glass-effect clickable" onClick={() => navigate('resultados')}>
                <div className="card-icon" style={{ color: 'var(--color-accent-orange)' }}><Trophy size={40} /></div>
                <h3>Resultados</h3>
                <p className="card-label">Carga de tiempos y Start List</p>
            </div>

            {user?.rol === 'Admin' && (
                <div className="dashboard-card glass-effect clickable" onClick={() => navigate('controles')} style={{ borderTop: '2px solid #f59e0b' }}>
                    <div className="card-icon" style={{ color: '#f59e0b' }}><Timer size={40} /></div>
                    <h3>Controles Técnicos</h3>
                    <p className="card-label">Panel de registros internos ({stats.controles || 0})</p>
                </div>
            )}
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
