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
    Eye,
    CreditCard,
    ChevronDown,
    ChevronUp,
    DownloadCloud
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import EventoService from '../../services/EventoService';
import ClubService from '../../services/ClubService';
import AtletaService from '../../services/AtletaService';
import SaaSService from '../../services/SaaSService';
import SupportService from '../../services/SupportService';
import { History, Clock, FileText, AlertCircle, User, AlertTriangle, Trophy, CheckCircle2, XCircle } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import ConfirmDialog from '../../components/Common/ConfirmDialog';
import ProgressionAudit from '../../components/Common/ProgressionAudit';
import FederacionService from '../../services/FederacionService';
import {
    getClubFederationId,
    clubBelongsToFederation,
    resolveScopeFederationId,
    getEventFederationId,
    eventBelongsToFederation,
} from '../../utils/apiHelpers';
import { formatAuditAction, formatAuditDetail } from '../../utils/auditHelpers';
import { isSuperAdminUser } from '../../utils/authHelpers';

const AdminHome = () => {
    const navigate = useNavigate();
    const { id } = useParams(); // ID de federación opcional para SuperAdmin
    const { user } = useAuth();
    const [stats, setStats] = useState({ eventos: 0, programados: 0, clubes: 0, atletas: 0 });
    const [globalStats, setGlobalStats] = useState(null);
    const [fedName, setFedName] = useState('');
    const [scopeFedId, setScopeFedId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [recentLogs, setRecentLogs] = useState([]);
    const [fedEvents, setFedEvents] = useState([]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedDay, setSelectedDay] = useState(null);
    const [isCalendarMinimized, setIsCalendarMinimized] = useState(false);

    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState('agenda');
    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'warning',
        onConfirm: null
    });

    const role = user?.rol?.trim().toLowerCase();
    const isSuper = isSuperAdminUser(user);
    const isViewingSpecificFed = isSuper && id;

    const loadData = async () => {
        setLoading(true);
        try {
            if (isSuper && !id) {
                const [metricsData, logs, events, saasInfo, allClubs, federaciones] = await Promise.all([
                    SaaSService.getGlobalMetrics().catch(() => ({})),
                    SupportService.getLogs({ limit: 8 }).catch(() => []),
                    EventoService.getAll().catch(() => []),
                    SaaSService.getClubesStatus().catch(() => []),
                    ClubService.getAll().catch(() => []),
                    FederacionService.getAll().catch(() => []),
                ]);
                setGlobalStats({
                    ...metricsData,
                    uncompletedEvents: events.filter(e => e.estado !== 'Finalizado'),
                    saasExpirations: saasInfo.filter(s => s.fechaVencimientoPlan),
                    saasInfo: saasInfo,
                    allClubs,
                    federaciones,
                });
                setRecentLogs(logs);
            } else if (isSuper && id) {
                const [clubesStatus, events, allClubs, federaciones] = await Promise.all([
                    SaaSService.getClubesStatus().catch(() => []),
                    EventoService.getAll().catch(() => []),
                    ClubService.getAll().catch(() => []),
                    FederacionService.getAll().catch(() => []),
                ]);

                setGlobalStats(prev => ({
                    ...prev,
                    allClubs,
                    federaciones,
                }));

                const fedFromApi = federaciones.find(f => String(f.id) === String(id));
                const fedFromSaas = clubesStatus.find(f => String(f.clubId) === String(id));
                if (fedFromApi) {
                    setFedName(fedFromApi.nombre);
                } else if (fedFromSaas) {
                    setFedName(fedFromSaas.clubNombre);
                }
                if (fedFromSaas) {
                    setStats({
                        eventos: fedFromSaas.torneosActivosCount || 0,
                        programados: 0,
                        clubes: fedFromSaas.clubesAfiliadosCount || 0,
                        atletas: fedFromSaas.atletasRegistrados || 0
                    });
                }

                const targetFedId = Number(id);
                const myEvents = events.filter(e => {
                    if (e.estado === 'Finalizado') return false;
                    return eventBelongsToFederation(e, allClubs, targetFedId);
                });
                setFedEvents(myEvents);
            } else {
                const [eventosRaw, clubesData, federaciones, atletasData] = await Promise.all([
                    EventoService.getAll(),
                    ClubService.getAll(),
                    FederacionService.getAll().catch(() => []),
                    AtletaService.getAll().catch(() => []),
                ]);

                setGlobalStats(prev => ({
                    ...prev,
                    allClubs: clubesData,
                    federaciones,
                }));

                const targetFedId = resolveScopeFederationId({ user, clubes: clubesData });
                setScopeFedId(targetFedId);

                const subClubes = targetFedId
                    ? clubesData.filter(c => clubBelongsToFederation(c, targetFedId))
                    : clubesData;

                const myEvents = eventosRaw.filter(e => {
                    if (!isSuper && e.nombre?.toLowerCase().includes('control')) return false;
                    if (e.estado === 'Finalizado') return false;
                    return eventBelongsToFederation(e, clubesData, targetFedId, {
                        trustApiScope: !isSuper,
                    });
                });
                setFedEvents(myEvents);

                const atletasList = Array.isArray(atletasData) ? atletasData : [];
                setStats({
                    eventos: myEvents.length,
                    programados: myEvents.filter(e => e.estado === 'Programado').length,
                    clubes: subClubes.length,
                    atletas: atletasList.length,
                });
            }
        } catch (err) {
            console.error("Error cargando dashboard", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [isSuper, id]);

    const handleRenovarPlan = async (clubId) => {
        if (!globalStats?.saasInfo) return;
        const fed = globalStats.saasInfo.find(f => f.clubId === clubId);
        if (!fed) return;

        let baseDate = new Date();
        if (fed.fechaVencimientoPlan) {
            const currentVenc = new Date(fed.fechaVencimientoPlan);
            if (!isNaN(currentVenc.getTime()) && currentVenc > baseDate) {
                baseDate = currentVenc;
            }
        }

        const freq = fed.frecuenciaPago || 'Mensual';
        const nextDate = new Date(baseDate);
        if (freq === 'Anual') {
            nextDate.setFullYear(nextDate.getFullYear() + 1);
        } else {
            nextDate.setMonth(nextDate.getMonth() + 1);
        }

        const newVencimiento = nextDate.toISOString().split('T')[0];

        const clubData = {
            nombre: fed.clubNombre,
            sigla: fed.sigla || '',
            email: fed.email || '',
            telefono: fed.telefono || '',
            direccion: fed.direccion || '',
            ubicacion: fed.ubicacion || '',
            activo: true,
            frecuenciaPago: freq,
            fechaAltaPlan: new Date().toISOString().split('T')[0],
            fechaVencimientoPlan: newVencimiento,
            bloqueadoPorFaltaDePago: false
        };

        setConfirmDialog({
            isOpen: true,
            title: 'Confirmar Renovación Rápida',
            message: `¿Confirmar la renovación del Plan ${fed.planNombre} (${freq}) para la federación "${fed.clubNombre}"?\n\nNuevo vencimiento estimado: ${new Date(newVencimiento).toLocaleDateString()}`,
            type: 'success',
            icon: <Calendar size={32} />,
            onConfirm: async () => {
                try {
                    await SaaSService.updateFederacion(clubId, clubData);
                    addToast(`Plan ${fed.planNombre} de ${fed.clubNombre} renovado con éxito`, "success");
                    await loadData();
                } catch (err) {
                    console.error("Error al renovar plan:", err);
                    addToast("Error al renovar el plan.", "error");
                }
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
            }
        });
    };


    // --- PALETAS DE COLORES PARA FEDERACIONES (Para SuperAdmin) ---
    const FEDERATION_PALETTES = [
        {
            name: 'Orange',
            primary: '#f97316',
            primaryRgb: '249, 115, 22',
            lightBg: 'rgba(249, 115, 22, 0.06)',
            border: 'rgba(249, 115, 22, 0.3)',
            hover: 'rgba(249, 115, 22, 0.12)',
            text: '#ea580c'
        },
        {
            name: 'Red',
            primary: '#ef4444',
            primaryRgb: '239, 68, 68',
            lightBg: 'rgba(239, 68, 68, 0.06)',
            border: 'rgba(239, 68, 68, 0.3)',
            hover: 'rgba(239, 68, 68, 0.12)',
            text: '#dc2626'
        },
        {
            name: 'Blue',
            primary: '#3b82f6',
            primaryRgb: '59, 130, 246',
            lightBg: 'rgba(59, 130, 246, 0.06)',
            border: 'rgba(59, 130, 246, 0.3)',
            hover: 'rgba(59, 130, 246, 0.12)',
            text: '#2563eb'
        },
        {
            name: 'Green',
            primary: '#22c55e',
            primaryRgb: '34, 197, 94',
            lightBg: 'rgba(34, 197, 94, 0.06)',
            border: 'rgba(34, 197, 94, 0.3)',
            hover: 'rgba(34, 197, 94, 0.12)',
            text: '#16a34a'
        },
        {
            name: 'Purple',
            primary: '#a855f7',
            primaryRgb: '168, 85, 247',
            lightBg: 'rgba(168, 85, 247, 0.06)',
            border: 'rgba(168, 85, 247, 0.3)',
            hover: 'rgba(168, 85, 247, 0.12)',
            text: '#9333ea'
        },
        {
            name: 'Teal',
            primary: '#06b6d4',
            primaryRgb: '6, 182, 212',
            lightBg: 'rgba(6, 182, 212, 0.06)',
            border: 'rgba(6, 182, 212, 0.3)',
            hover: 'rgba(6, 182, 212, 0.12)',
            text: '#0891b2'
        },
        {
            name: 'Pink',
            primary: '#ec4899',
            primaryRgb: '236, 72, 153',
            lightBg: 'rgba(236, 72, 153, 0.06)',
            border: 'rgba(236, 72, 153, 0.3)',
            hover: 'rgba(236, 72, 153, 0.12)',
            text: '#db2777'
        },
        {
            name: 'Amber',
            primary: '#f59e0b',
            primaryRgb: '245, 158, 11',
            lightBg: 'rgba(245, 158, 11, 0.06)',
            border: 'rgba(245, 158, 11, 0.3)',
            hover: 'rgba(245, 158, 11, 0.12)',
            text: '#d97706'
        }
    ];

    const federationColorMap = React.useMemo(() => {
        const map = {};
        const feds = globalStats?.federaciones || [];
        [...feds].sort((a, b) => a.id - b.id).forEach((fed, idx) => {
            map[fed.id] = FEDERATION_PALETTES[idx % FEDERATION_PALETTES.length];
        });
        return map;
    }, [globalStats?.federaciones]);

    const getFederationPalette = (fedId) => {
        if (!fedId) return FEDERATION_PALETTES[0];
        return federationColorMap[fedId] || FEDERATION_PALETTES[0];
    };

    const getFederationIdForClub = (clubId) => {
        if (!globalStats?.allClubs) return clubId;
        const club = globalStats.allClubs.find(c => c.id === clubId);
        if (!club) return clubId;
        return getClubFederationId(club) || clubId;
    };

    const getFederationIdByName = (nombre) => {
        const feds = globalStats?.federaciones || [];
        const fed = feds.find(f => f.nombre.toLowerCase().trim() === nombre.toLowerCase().trim());
        return fed ? fed.id : null;
    };

    if (loading) return <div className="loader-container"><div className="loader"></div></div>;

    // --- VISTA SUPERADMIN (GLOBAL) ---
    if (isSuper && !id && globalStats) {
        const currentYear = new Date().getFullYear();
        const totalDays = new Date(currentYear, selectedMonth + 1, 0).getDate();
        const startOffset = new Date(currentYear, selectedMonth, 1).getDay();

        const dayCells = [];
        for (let i = 0; i < startOffset; i++) {
            dayCells.push(null);
        }
        for (let d = 1; d <= totalDays; d++) {
            dayCells.push(d);
        }

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

                <div className="dashboard-content-row" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="annual-calendar-container glass-effect" style={{ padding: '1.5rem', borderRadius: '20px', minHeight: isCalendarMinimized ? 'auto' : '420px', display: 'flex', flexDirection: 'column', width: '100%' }}>
                        <div className="chart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isCalendarMinimized ? '0' : '1.2rem' }}>
                            <div>
                                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Calendar size={18} style={{ color: 'var(--color-accent-orange)' }} /> Planificador Anual de Operaciones
                                </h4>
                                {!isCalendarMinimized && (
                                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: '0.2rem 0 0 0' }}>Monitoreo de vencimientos SaaS y eventos deportivos en tiempo real</p>
                                )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span className="badge-pill" style={{ background: 'rgba(var(--color-accent-orange-rgb), 0.15)', color: 'var(--color-accent-orange)', fontWeight: 800 }}>Año {new Date().getFullYear()}</span>
                                <button 
                                    onClick={() => setIsCalendarMinimized(!isCalendarMinimized)}
                                    style={{
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: '8px',
                                        padding: '6px 12px',
                                        color: 'var(--color-text-primary)',
                                        cursor: 'pointer',
                                        fontSize: '0.8rem',
                                        fontWeight: '600',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        transition: 'all 0.2s'
                                    }}
                                    title={isCalendarMinimized ? "Maximizar Calendario" : "Minimizar Calendario"}
                                >
                                    {isCalendarMinimized ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                                    {isCalendarMinimized ? "Mostrar" : "Minimizar"}
                                </button>
                            </div>
                        </div>

                        {/* Selector de Meses Horizontal */}
                        {!isCalendarMinimized && (
                            <>
                        <div className="months-pills-row" style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.6rem', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', scrollbarWidth: 'none' }}>
                            {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((name, idx) => {
                                const currentYear = new Date().getFullYear();
                                const monthExpirations = (globalStats.saasExpirations || []).filter(item => {
                                    const d = new Date(item.fechaVencimientoPlan);
                                    return d.getMonth() === idx && d.getFullYear() === currentYear;
                                });
                                const monthEvents = (globalStats.uncompletedEvents || []).filter(item => {
                                    const d = new Date(item.fecha);
                                    return d.getMonth() === idx && d.getFullYear() === currentYear;
                                });

                                const isSelected = selectedMonth === idx;
                                const hasActivity = monthExpirations.length > 0 || monthEvents.length > 0;

                                return (
                                    <button
                                        key={idx}
                                        onClick={() => {
                                            setSelectedMonth(idx);
                                            setSelectedDay(null);
                                        }}
                                        style={{
                                            background: isSelected 
                                                ? 'linear-gradient(135deg, var(--color-accent-orange), #f97316)' 
                                                : 'rgba(255,255,255,0.02)',
                                            border: isSelected 
                                                ? '1px solid var(--color-accent-orange)' 
                                                : '1px solid var(--color-border)',
                                            color: isSelected ? '#ffffff' : 'var(--color-text-secondary)',
                                            borderRadius: '20px',
                                            padding: '6px 14px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            whiteSpace: 'nowrap',
                                            fontWeight: isSelected ? 800 : 600,
                                            fontSize: '0.8rem',
                                            transition: 'all 0.2s',
                                            boxShadow: isSelected ? '0 4px 12px rgba(249,115,22,0.2)' : 'none'
                                        }}
                                    >
                                        <span>{name}</span>
                                        {hasActivity && (
                                            <div style={{ display: 'flex', gap: '2px' }}>
                                                {monthExpirations.length > 0 && (
                                                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: isSelected ? '#ffffff' : '#f97316' }} />
                                                )}
                                                {monthEvents.length > 0 && (
                                                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: isSelected ? '#ffffff' : '#3b82f6' }} />
                                                )}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        
                        <div className="calendar-layout" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', flex: 1 }}>
                            {/* Calendario Mensual de Días */}
                            {(() => {
                                const currentYear = new Date().getFullYear();
                                const mExps = (globalStats.saasExpirations || []).filter(item => {
                                    const d = new Date(item.fechaVencimientoPlan);
                                    return d.getMonth() === selectedMonth && d.getFullYear() === currentYear;
                                });
                                const mEvts = (globalStats.uncompletedEvents || []).filter(item => {
                                    const d = new Date(item.fecha);
                                    return d.getMonth() === selectedMonth && d.getFullYear() === currentYear;
                                });

                                return (
                                    <div className="calendar-days-grid-container" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', flex: 1.3 }}>
                                        {/* Cabecera L-D */}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', textAlign: 'center', fontWeight: 800, fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                                            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(wd => (
                                                <div key={wd} style={{ paddingBottom: '0.2rem' }}>{wd}</div>
                                            ))}
                                        </div>
                                        {/* Celdas de Días */}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
                                            {dayCells.map((day, idx) => {
                                                if (day === null) {
                                                    return <div key={`empty-${idx}`} style={{ aspectRatio: '1' }} />;
                                                }

                                                // Calcular actividades para este día específico
                                                const dayExps = mExps.filter(e => new Date(e.fechaVencimientoPlan).getDate() === day);
                                                const dayEvts = mEvts.filter(e => new Date(e.fecha).getDate() === day);
                                                const hasExps = dayExps.length > 0;
                                                const hasEvts = dayEvts.length > 0;

                                                // Reunir los IDs de las federaciones involucradas hoy
                                                const fedIdsOnDay = new Set();
                                                dayExps.forEach(e => { if (e.clubId) fedIdsOnDay.add(e.clubId); });
                                                dayEvts.forEach(e => {
                                                    const parentFedId = getFederationIdForClub(e.clubId);
                                                    if (parentFedId) fedIdsOnDay.add(parentFedId);
                                                });
                                                
                                                const uniqueFeds = Array.from(fedIdsOnDay);

                                                const isDaySelected = selectedDay === day;
                                                
                                                let cellBg = 'var(--color-calendar-cell-bg)';
                                                let borderStyle = '1px solid var(--color-calendar-cell-border)';
                                                let textColor = 'var(--color-text-primary)';
                                                
                                                if (isDaySelected) {
                                                    cellBg = 'linear-gradient(135deg, var(--color-accent-orange), #f97316)';
                                                    borderStyle = '1px solid var(--color-accent-orange)';
                                                    textColor = '#ffffff';
                                                } else if (uniqueFeds.length === 1) {
                                                    const palette = getFederationPalette(uniqueFeds[0]);
                                                    cellBg = palette.lightBg;
                                                    borderStyle = `2px solid ${palette.border}`;
                                                    textColor = palette.text;
                                                } else if (uniqueFeds.length > 1) {
                                                    cellBg = 'rgba(168, 85, 247, 0.08)';
                                                    borderStyle = '2px solid rgba(168, 85, 247, 0.5)';
                                                    textColor = '#a855f7';
                                                }

                                                const dayTitle = [
                                                    hasExps ? `Vencimientos (${dayExps.length}): ${dayExps.map(e => e.clubNombre).join(', ')}` : null,
                                                    hasEvts ? dayEvts.map(e => e.nombre).join(', ') : null
                                                ].filter(Boolean).join(' | ');

                                                return (
                                                    <button
                                                        key={`day-${day}`}
                                                        onClick={() => setSelectedDay(isDaySelected ? null : day)}
                                                        title={dayTitle || `Día ${day}`}
                                                        style={{
                                                            aspectRatio: '1',
                                                            background: cellBg,
                                                            border: borderStyle,
                                                            color: textColor,
                                                            borderRadius: '50%',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            position: 'relative',
                                                            fontWeight: (hasExps || hasEvts || isDaySelected) ? 800 : 500,
                                                            fontSize: '0.85rem',
                                                            transition: 'all 0.2s',
                                                            boxShadow: isDaySelected ? '0 4px 12px rgba(249,115,22,0.3)' : 'none'
                                                        }}
                                                        className="day-cell"
                                                    >
                                                        <span>{day}</span>
                                                        {!isDaySelected && uniqueFeds.length > 0 && (
                                                            <div style={{ display: 'flex', gap: '2px', position: 'absolute', bottom: '4px' }}>
                                                                {uniqueFeds.map(fedId => {
                                                                    const palette = getFederationPalette(fedId);
                                                                    return (
                                                                        <span 
                                                                            key={fedId} 
                                                                            style={{ 
                                                                                width: '5px', 
                                                                                height: '5px', 
                                                                                borderRadius: '50%', 
                                                                                backgroundColor: palette.primary 
                                                                            }} 
                                                                        />
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Detalle del Mes/Día Seleccionado */}
                            <div className="selected-month-details" style={{ display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '1rem', height: '350px', maxHeight: '380px', overflowY: 'auto', flex: 1 }}>
                                {/* Selector de Pestañas */}
                                <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.8rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                                    <button 
                                        onClick={() => setActiveTab('agenda')}
                                        className={`saas-tab-btn ${activeTab === 'agenda' ? 'active' : ''}`}
                                    >
                                        <Calendar size={13} /> Agenda
                                    </button>
                                    <button 
                                        onClick={() => setActiveTab('saas')}
                                        className={`saas-tab-btn ${activeTab === 'saas' ? 'active' : ''}`}
                                    >
                                        <CreditCard size={13} /> SaaS
                                    </button>
                                    <button 
                                        onClick={() => setActiveTab('auditoria')}
                                        className={`saas-tab-btn ${activeTab === 'auditoria' ? 'active' : ''}`}
                                    >
                                        <FileText size={13} /> Auditoría
                                    </button>
                                </div>

                                {activeTab === 'auditoria' ? (
                                    <div style={{ padding: '0.5rem', overflowY: 'auto' }}>
                                        <ProgressionAudit eventoPrueba={{ nombre: 'K1 1000m Men', planProgresionAsignado: 'Plan D2' }} />
                                    </div>
                                ) : activeTab === 'agenda' ? (
                                    <>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem', paddingBottom: '0.4rem' }}>
                                            <h5 style={{ margin: 0, fontWeight: 800, color: 'var(--color-text-primary)', fontSize: '0.9rem' }}>
                                                {selectedDay !== null 
                                                    ? `Agenda del día ${selectedDay}` 
                                                    : `Agenda de ${['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][selectedMonth]}`
                                                }
                                            </h5>
                                            {selectedDay !== null && (
                                                <button 
                                                    onClick={() => setSelectedDay(null)}
                                                    style={{ background: 'none', border: 'none', color: 'var(--color-accent-orange)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, padding: 0 }}
                                                >
                                                    Ver todo el mes
                                                </button>
                                            )}
                                        </div>

                                        {(() => {
                                            const currentYear = new Date().getFullYear();
                                            let mExps = (globalStats.saasExpirations || []).filter(item => {
                                                const d = new Date(item.fechaVencimientoPlan);
                                                return d.getMonth() === selectedMonth && d.getFullYear() === currentYear;
                                            });
                                            let mEvts = (globalStats.uncompletedEvents || []).filter(item => {
                                                const d = new Date(item.fecha);
                                                return d.getMonth() === selectedMonth && d.getFullYear() === currentYear;
                                            });

                                            if (selectedDay !== null) {
                                                mExps = mExps.filter(item => new Date(item.fechaVencimientoPlan).getDate() === selectedDay);
                                                mEvts = mEvts.filter(item => new Date(item.fecha).getDate() === selectedDay);
                                            }

                                            if (mExps.length === 0 && mEvts.length === 0) {
                                                return (
                                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-dim)', gap: '0.5rem', padding: '2rem 0' }}>
                                                        <Calendar size={32} style={{ opacity: 0.3 }} />
                                                        <span style={{ fontSize: '0.8rem' }}>
                                                            {selectedDay !== null ? `Sin actividades para el día ${selectedDay}` : 'Sin actividades planificadas'}
                                                        </span>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                                    {/* Sección Vencimientos */}
                                                    {mExps.length > 0 && (
                                                        <div>
                                                            <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-text-secondary)', letterSpacing: '0.5px', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem' }}>
                                                                <AlertTriangle size={14} style={{ color: 'var(--color-accent-orange)' }} /> Vencimientos SaaS ({mExps.length})
                                                            </span>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                                                {mExps.map((exp, idx) => {
                                                                    const dateObj = new Date(exp.fechaVencimientoPlan);
                                                                    const formattedDate = dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
                                                                    const palette = getFederationPalette(exp.clubId);
                                                                    return (
                                                                        <div key={idx} style={{ padding: '0.5rem', background: palette.lightBg, border: `1px solid ${palette.border}`, borderLeft: `4px solid ${palette.primary}`, borderRadius: '8px', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                            <div>
                                                                                <strong style={{ color: 'var(--color-text-primary)' }}>{exp.clubNombre}</strong>
                                                                                <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--color-text-dim)' }}>
                                                                                    Plan {exp.planNombre || 'Activo'} ({exp.frecuenciaPago || 'Mensual'})
                                                                                </span>
                                                                            </div>
                                                                            <span style={{ background: palette.primary, color: '#fff', fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px' }}>{formattedDate}</span>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Sección Eventos */}
                                                    {mEvts.length > 0 && (
                                                        <div>
                                                            <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-text-secondary)', letterSpacing: '0.5px', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem' }}>
                                                                <Trophy size={14} style={{ color: '#eab308' }} /> Eventos Activos ({mEvts.length})
                                                            </span>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                                                {mEvts.map((evt, idx) => {
                                                                    const dateObj = new Date(evt.fecha);
                                                                    const formattedDate = dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
                                                                    const parentFedId = getFederationIdForClub(evt.clubId);
                                                                    const palette = getFederationPalette(parentFedId);
                                                                    return (
                                                                        <div key={idx} style={{ padding: '0.5rem', background: palette.lightBg, border: `1px solid ${palette.border}`, borderLeft: `4px solid ${palette.primary}`, borderRadius: '8px', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                            <div>
                                                                                <strong style={{ color: 'var(--color-text-primary)' }}>{evt.nombre}</strong>
                                                                                <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--color-text-dim)' }}>
                                                                                    Org: {evt.clubNombre || 'Federación'}
                                                                                </span>
                                                                            </div>
                                                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                                                                                <span style={{ background: palette.primary, color: '#fff', fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px' }}>{formattedDate}</span>
                                                                                <span style={{ fontSize: '0.6rem', fontWeight: 700, color: evt.estado === 'EnProgreso' ? '#22c55e' : palette.text }}>
                                                                                    {evt.estado === 'EnProgreso' ? 'En Curso' : 'Programado'}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </>
                                ) : (
                                    /* Tab 2: SaaS View */
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                                            <h5 style={{ margin: 0, fontWeight: 800, color: 'var(--color-text-primary)', fontSize: '0.9rem' }}>Suscripciones</h5>
                                            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)' }}>{globalStats.saasInfo?.length || 0} Federaciones</span>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                            {globalStats.saasInfo && globalStats.saasInfo.length > 0 ? (
                                                globalStats.saasInfo.map((fed) => {
                                                    const palette = getFederationPalette(fed.clubId);
                                                    
                                                    // Determine billing status
                                                    let billingText = 'Al Día';
                                                    let billingIcon = <CheckCircle2 size={12} />;
                                                    let statusBadgeStyle = { background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#22c55e' };
                                                    
                                                    if (fed.bloqueadoPorFaltaDePago || !fed.activo) {
                                                        billingText = 'Bloqueado';
                                                        billingIcon = <XCircle size={12} />;
                                                        statusBadgeStyle = { background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444' };
                                                    } else if (fed.fechaVencimientoPlan) {
                                                        const isExpired = new Date() > new Date(fed.fechaVencimientoPlan);
                                                        if (isExpired) {
                                                            billingText = 'Vencido';
                                                            billingIcon = <AlertTriangle size={12} />;
                                                            statusBadgeStyle = { background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#f59e0b' };
                                                        }
                                                    }

                                                    // Plan Tier badge style
                                                    const pNombre = (fed.planNombre || 'Activo').toLowerCase();
                                                    let planColor = '#CD7F32'; // Bronce
                                                    let planBg = 'rgba(205, 127, 50, 0.1)';
                                                    let planBorder = 'rgba(205, 127, 50, 0.3)';
                                                    
                                                    if (pNombre.includes('oro')) {
                                                        planColor = '#FFD700'; // Oro
                                                        planBg = 'rgba(255, 215, 0, 0.15)';
                                                        planBorder = 'rgba(255, 215, 0, 0.4)';
                                                    } else if (pNombre.includes('plata')) {
                                                        planColor = '#E0E0E0'; // Plata
                                                        planBg = 'rgba(224, 224, 224, 0.15)';
                                                        planBorder = 'rgba(224, 224, 224, 0.4)';
                                                    }

                                                    const planBadgeStyle = {
                                                        background: planBg,
                                                        border: `1px solid ${planBorder}`,
                                                        color: planColor,
                                                        fontSize: '0.65rem',
                                                        fontWeight: 800,
                                                        padding: '2px 6px',
                                                        borderRadius: '6px',
                                                        textTransform: 'uppercase',
                                                        boxShadow: pNombre.includes('oro') ? '0 0 6px rgba(255,215,0,0.2)' : 'none'
                                                    };

                                                    const formattedExpDate = fed.fechaVencimientoPlan 
                                                        ? new Date(fed.fechaVencimientoPlan).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) 
                                                        : 'Sin exp';

                                                    return (
                                                        <div key={fed.clubId} className="saas-fed-row" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: palette.primary }} />
                                                                    <strong style={{ color: 'var(--color-text-primary)', fontSize: '0.8rem' }}>{fed.clubNombre}</strong>
                                                                </div>
                                                                <span style={planBadgeStyle}>{fed.planNombre || 'Sin Plan'}</span>
                                                            </div>

                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                                                    <span style={{
                                                                        ...statusBadgeStyle,
                                                                        fontSize: '0.65rem',
                                                                        fontWeight: 700,
                                                                        padding: '2px 6px',
                                                                        borderRadius: '6px',
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        gap: '4px'
                                                                    }}>
                                                                        {billingIcon} {billingText}
                                                                    </span>
                                                                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)' }}>
                                                                        {formattedExpDate}
                                                                    </span>
                                                                </div>

                                                                <button
                                                                    onClick={() => handleRenovarPlan(fed.clubId)}
                                                                    className="btn-renovar-quick"
                                                                >
                                                                    Renovar
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-dim)', gap: '0.5rem', padding: '2rem 0' }}>
                                                    <CreditCard size={32} style={{ opacity: 0.3 }} />
                                                    <span style={{ fontSize: '0.8rem' }}>No se encontraron federaciones</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        </>
                        )}
                    </div>

                    <div className="top-entities-list glass-effect" style={{ width: '100%', padding: '1.5rem', borderRadius: '20px', border: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                            <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Top Federaciones</h4>
                            <button className="btn-view-all" style={{ margin: 0, padding: '6px 14px', fontSize: '0.8rem' }} onClick={() => navigate('/super/saas')}>Gestionar Federaciones</button>
                        </div>
                        <div className="entities-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                            {(globalStats.topFederaciones || []).map((fed, idx) => {
                                const fedId = getFederationIdByName(fed.nombre);
                                const palette = getFederationPalette(fedId);
                                return (
                                    <div key={idx} className="entity-row" style={{ margin: 0, borderLeft: `4px solid ${palette.primary}`, background: palette.lightBg }}>
                                        <div className="entity-rank" style={{ background: palette.primary, color: '#ffffff' }}>{idx + 1}</div>
                                        <div className="entity-name">
                                            <strong style={{ color: 'var(--color-text-primary)' }}>{fed.nombre}</strong>
                                            <span style={{ color: 'var(--color-text-secondary)' }}>{fed.clubesCount} Clubes</span>
                                        </div>
                                        <ShieldCheck size={18} style={{ color: palette.primary }} />
                                    </div>
                                );
                            })}
                        </div>
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
                                                    <span className="hide-mobile">{formatAuditAction(log.accion)}</span>
                                                    <span className="show-mobile-inline">
                                                        {log.accion === 'LOGIN_SUCCESS' ? 'LGN_OK' : 
                                                         log.accion === 'LOGIN_FAILED' ? 'LGN_FAIL' :
                                                         log.accion === 'LOGIN_BLOCKED' ? 'LGN_BLOK' : 
                                                         log.accion === 'ERROR_FATAL' ? 'ERR_FATAL' : 
                                                         log.accion === 'CREATE_ATHLETE' ? 'NEW_ATL' : 
                                                         log.accion === 'UPDATE_ATHLETE' ? 'UPD_ATL' : 
                                                         log.accion?.replace('ATHLETE', 'ATL').replace('SUCCESS', 'OK')}
                                                    </span>
                                                </span>
                                            </td>
                                            <td className="detail-cell">
                                                <div className="detail-content" title={formatAuditDetail(log)}>
                                                    {(() => {
                                                        const detail = formatAuditDetail(log);
                                                        return detail.length > 60 ? detail.substring(0, 60) + '...' : detail;
                                                    })()}
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

                <style>{`
                    .saas-tab-btn {
                        background: none;
                        border: none;
                        color: var(--color-text-dim);
                        padding: 6px 12px;
                        border-radius: 20px;
                        cursor: pointer;
                        font-size: 0.75rem;
                        font-weight: 800;
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        display: flex;
                        align-items: center;
                        gap: 6px;
                    }
                    .saas-tab-btn:hover {
                        color: var(--color-text);
                        background: rgba(255, 255, 255, 0.05);
                    }
                    .saas-tab-btn.active {
                        background: linear-gradient(135deg, rgba(249, 115, 22, 0.2), rgba(249, 115, 22, 0.05));
                        border: 1px solid rgba(249, 115, 22, 0.3);
                        color: var(--color-accent-orange);
                        box-shadow: 0 4px 12px rgba(249, 115, 22, 0.15);
                    }
                    .btn-renovar-quick {
                        background: rgba(34, 197, 94, 0.1);
                        border: 1px solid rgba(34, 197, 94, 0.3);
                        color: #22c55e;
                        border-radius: 8px;
                        padding: 4px 8px;
                        font-size: 0.72rem;
                        font-weight: 800;
                        cursor: pointer;
                        transition: all 0.2s ease-in-out;
                        display: flex;
                        align-items: center;
                        gap: 4px;
                    }
                    .btn-renovar-quick:hover {
                        background: #22c55e;
                        color: #ffffff;
                        box-shadow: 0 0 10px rgba(34, 197, 94, 0.4);
                        transform: translateY(-1px);
                    }
                    .btn-renovar-quick:active {
                        transform: translateY(0);
                    }
                    .saas-fed-row {
                        padding: 0.6rem 0.8rem;
                        background: rgba(255, 255, 255, 0.02);
                        border: 1px solid var(--color-border);
                        border-radius: 12px;
                        transition: all 0.2s ease;
                    }
                    .saas-fed-row:hover {
                        background: rgba(255, 255, 255, 0.04);
                        border-color: rgba(255, 255, 255, 0.15);
                    }
                `}</style>

                {confirmDialog.isOpen && (
                    <ConfirmDialog
                        isOpen={confirmDialog.isOpen}
                        title={confirmDialog.title}
                        message={confirmDialog.message}
                        type={confirmDialog.type}
                        icon={confirmDialog.icon}
                        onConfirm={confirmDialog.onConfirm}
                        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                    />
                )}
            </div>
        );
    }

    // --- VISTA ADMIN (FEDERACIÓN) ---
    // Si el SuperAdmin está viendo una fed específica, agregamos el fedId como query param
    const navTo = (path) => {
        if (isViewingSpecificFed) {
            navigate(`${path}?fedId=${id}`);
        } else if (scopeFedId) {
            navigate(`${path}?fedId=${scopeFedId}`);
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
                </div>
            ) 
        },
        { id: '/super/logins', icon: <Key size={32} />, title: 'Logins & Usuarios', desc: <span style={{ fontSize: '1rem' }}>Accesos para mis clubes</span>, color: '#10B981' },
        { 
            id: '/super/atletas', icon: <Users size={32} />, title: 'Atletas', color: 'var(--color-accent)',
            desc: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: '0.5rem' }}>
                    <span style={{ fontSize: '1rem' }}>Atletas: <strong style={{ color: 'var(--color-accent)', fontSize: '1.4rem' }}>{stats.atletas}</strong></span>
                </div>
            ) 
        },
        { id: '/super/controles', icon: <Timer size={32} />, title: 'Controles Técnicos', desc: <span style={{ fontSize: '1rem' }}>Registros técnicos internos</span>, color: '#f59e0b' },
        { id: '/super/resultados', icon: <Timer size={32} />, title: 'Resultados', desc: <span style={{ fontSize: '1rem' }}>Cronometraje y validación</span>, color: 'var(--color-accent-orange)' },
    ];

    return (
        <div className="admin-home fade-in">
            <div className="admin-home-header">
                {isViewingSpecificFed && (
                    <button 
                        onClick={() => navigate(-1)}
                        style={{ 
                            display: 'flex', alignItems: 'center', gap: '6px',
                            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                            color: 'var(--color-text-secondary)', borderRadius: '8px',
                            padding: '6px 12px', cursor: 'pointer', fontSize: '0.85rem',
                            marginBottom: '1rem'
                        }}
                    >
                        <ArrowLeft size={16} /> Volver
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
            {/* Planificador Anual Interactivo (Brandeado con los colores de la Federación) */}
            {(() => {
                const targetFedId = isViewingSpecificFed
                    ? Number(id)
                    : Number(scopeFedId || user?.federacionId || user?.FederacionId || 0);
                const palette = getFederationPalette(targetFedId);

                const currentYear = new Date().getFullYear();
                const totalDays = new Date(currentYear, selectedMonth + 1, 0).getDate();
                const startOffset = new Date(currentYear, selectedMonth, 1).getDay();

                const dayCells = [];
                for (let i = 0; i < startOffset; i++) {
                    dayCells.push(null);
                }
                for (let i = 1; i <= totalDays; i++) {
                    dayCells.push(i);
                }

                const mEvts = fedEvents.filter(item => {
                    const d = new Date(item.fecha);
                    return d.getMonth() === selectedMonth && d.getFullYear() === currentYear;
                });

                return (
                    <div className="dashboard-content-row" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem', marginBottom: '2rem', width: '100%' }}>
                        <div className="calendar-card glass-effect" style={{ width: '100%', padding: isCalendarMinimized ? '1.2rem 1.5rem' : '1.5rem', borderRadius: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isCalendarMinimized ? '0' : '1.2rem', flexWrap: 'wrap', gap: '1rem' }}>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Calendar size={20} style={{ color: palette.primary }} />
                                        Planificador Operativo de Torneos
                                    </h4>
                                    {!isCalendarMinimized && (
                                        <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                                            Monitoreo y agenda de competiciones oficiales de tu federación
                                        </p>
                                    )}
                                </div>
                                
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    {!isCalendarMinimized && (
                                        <div className="months-pills-row" style={{ display: 'flex', gap: '4px', overflowX: 'auto', padding: '4px', background: 'var(--color-bg-primary)', borderRadius: '10px', maxWidth: '100%' }}>
                                            {['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'].map((mName, idx) => (
                                                <button
                                                    key={mName}
                                                    onClick={() => {
                                                        setSelectedMonth(idx);
                                                        setSelectedDay(null);
                                                    }}
                                                    style={{
                                                        border: 'none',
                                                        background: selectedMonth === idx ? palette.primary : 'none',
                                                        color: selectedMonth === idx ? '#fff' : 'var(--color-text-secondary)',
                                                        padding: '4px 10px',
                                                        borderRadius: '6px',
                                                        cursor: 'pointer',
                                                        fontWeight: selectedMonth === idx ? 800 : 500,
                                                        fontSize: '0.75rem',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    {mName}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    
                                    <button 
                                        onClick={() => setIsCalendarMinimized(!isCalendarMinimized)}
                                        style={{
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid var(--color-border)',
                                            borderRadius: '8px',
                                            padding: '6px 12px',
                                            color: 'var(--color-text-primary)',
                                            cursor: 'pointer',
                                            fontSize: '0.8rem',
                                            fontWeight: '600',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            transition: 'all 0.2s'
                                        }}
                                        title={isCalendarMinimized ? "Maximizar Calendario" : "Minimizar Calendario"}
                                    >
                                        {isCalendarMinimized ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                                        {isCalendarMinimized ? "Mostrar" : "Minimizar"}
                                    </button>
                                </div>
                            </div>

                            {!isCalendarMinimized && (
                                <div className="calendar-agenda-split" style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                                {/* Grilla Calendario */}
                                <div className="calendar-days-grid-container" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', flex: 1.3 }}>
                                    {/* Cabecera L-D */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', textAlign: 'center', fontWeight: 800, fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                                        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(wd => (
                                            <div key={wd} style={{ paddingBottom: '0.2rem' }}>{wd}</div>
                                        ))}
                                    </div>
                                    {/* Celdas de Días */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
                                        {dayCells.map((day, idx) => {
                                            if (day === null) {
                                                return <div key={`empty-${idx}`} style={{ aspectRatio: '1' }} />;
                                            }

                                            // Calcular eventos para este día
                                            const dayEvts = mEvts.filter(e => new Date(e.fecha).getDate() === day);
                                            const hasEvts = dayEvts.length > 0;
                                            const isDaySelected = selectedDay === day;
                                            
                                            let cellBg = 'var(--color-calendar-cell-bg)';
                                            let borderStyle = '1px solid var(--color-calendar-cell-border)';
                                            let textColor = 'var(--color-text-primary)';
                                            
                                            if (isDaySelected) {
                                                cellBg = `linear-gradient(135deg, ${palette.primary}, ${palette.text})`;
                                                borderStyle = `1px solid ${palette.primary}`;
                                                textColor = '#ffffff';
                                            } else if (hasEvts) {
                                                cellBg = palette.lightBg;
                                                borderStyle = `2px solid ${palette.border}`;
                                                textColor = palette.text;
                                            }

                                            const dayTitle = hasEvts 
                                                ? dayEvts.map(e => e.nombre).join(', ') 
                                                : `Día ${day}`;

                                            return (
                                                <button
                                                    key={`day-${day}`}
                                                    onClick={() => setSelectedDay(isDaySelected ? null : day)}
                                                    title={dayTitle}
                                                    style={{
                                                        aspectRatio: '1',
                                                        background: cellBg,
                                                        border: borderStyle,
                                                        color: textColor,
                                                        borderRadius: '50%',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        position: 'relative',
                                                        fontWeight: (hasEvts || isDaySelected) ? 800 : 500,
                                                        fontSize: '0.85rem',
                                                        transition: 'all 0.2s',
                                                        boxShadow: isDaySelected ? `0 4px 12px ${palette.hover}` : 'none'
                                                    }}
                                                    className="day-cell"
                                                >
                                                    <span>{day}</span>
                                                    {!isDaySelected && hasEvts && (
                                                        <div style={{ display: 'flex', gap: '2px', position: 'absolute', bottom: '4px' }}>
                                                            <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: palette.primary }} />
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Detalle del Mes/Día Seleccionado */}
                                <div className="selected-month-details" style={{ display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '1rem', maxHeight: '310px', overflowY: 'auto', flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.4rem' }}>
                                        <h5 style={{ margin: 0, fontWeight: 800, color: 'var(--color-text-primary)', fontSize: '0.9rem' }}>
                                            {selectedDay !== null 
                                                ? `Eventos del día ${selectedDay}` 
                                                : `Eventos de ${['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][selectedMonth]}`
                                            }
                                        </h5>
                                        {selectedDay !== null && (
                                            <button 
                                                onClick={() => setSelectedDay(null)}
                                                style={{ background: 'none', border: 'none', color: palette.primary, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, padding: 0 }}
                                            >
                                                Ver todo el mes
                                            </button>
                                        )}
                                    </div>

                                    {(() => {
                                        let dayFilteredEvts = mEvts;
                                        if (selectedDay !== null) {
                                            dayFilteredEvts = mEvts.filter(item => new Date(item.fecha).getDate() === selectedDay);
                                        }

                                        if (dayFilteredEvts.length === 0) {
                                            return (
                                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-dim)', gap: '0.5rem', padding: '2rem 0' }}>
                                                    <Calendar size={32} style={{ opacity: 0.3 }} />
                                                    <span style={{ fontSize: '0.8rem' }}>
                                                        {selectedDay !== null ? `Sin torneos para el día ${selectedDay}` : 'Sin torneos planificados'}
                                                    </span>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                                {dayFilteredEvts.map((evt, idx) => {
                                                    const dateObj = new Date(evt.fecha);
                                                    const formattedDate = dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
                                                    return (
                                                        <div key={idx} style={{ padding: '0.6rem', background: palette.lightBg, border: `1px solid ${palette.border}`, borderLeft: `4px solid ${palette.primary}`, borderRadius: '8px', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <div>
                                                                <strong style={{ color: 'var(--color-text-primary)' }}>{evt.nombre}</strong>
                                                                <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--color-text-dim)', marginTop: '2px' }}>
                                                                    Lugar: {evt.lugar || 'Por definir'} | Club: {evt.clubNombre || 'Federación'}
                                                                </span>
                                                            </div>
                                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                                                <span style={{ background: palette.primary, color: '#fff', fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px' }}>{formattedDate}</span>
                                                                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: evt.estado === 'EnProgreso' ? '#22c55e' : palette.text }}>
                                                                    {evt.estado === 'EnProgreso' ? 'En Curso' : 'Programado'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                            )}
                        </div>
                    </div>
                );
            })()}

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
