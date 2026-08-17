import React, { useState, useEffect } from 'react';
import { 
    Building2, 
    Users, 
    Calendar, 
    DollarSign, 
    Search, 
    CheckCircle2, 
    AlertCircle, 
    RefreshCw, 
    CreditCard,
    ShieldAlert,
    Award
} from 'lucide-react';
import api from '../../../services/api';
import { ENDPOINTS } from '../../../utils/constants';
import AtletaService from '../../../services/AtletaService';
import ClubService from '../../../services/ClubService';
import { useAuth } from '../../../context/AuthContext';
import { useAlert } from '../../../hooks/useAlert';
import { matchesSearch } from '../../../utils/authHelpers';
import timingSignalRService from '../../../services/TimingSignalRService';
import { getClubFederationName } from '../../../utils/apiHelpers';
import '../../../components/SharedSections/AdminSections.css';

const parseFechaMs = (value) => {
    if (!value) return 0;
    const t = new Date(value).getTime();
    return Number.isNaN(t) ? 0 : t;
};

const formatFechaEvento = (value) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
};

const atletaInscripcionKey = (ins) => {
    const pid = ins.participanteId ?? ins.ParticipanteId;
    if (pid != null && pid !== 0) return `p-${pid}`;
    const nombre = (ins.participanteNombreCompleto || ins.ParticipanteNombreCompleto || 'Tripulación Colectiva').trim().toLowerCase();
    return `n-${nombre}`;
};

const agruparAtletasPorInscripciones = (lista = []) => {
    const map = new Map();
    lista.forEach((ins) => {
        const key = atletaInscripcionKey(ins);
        if (!map.has(key)) {
            map.set(key, {
                key,
                nombre: ins.participanteNombreCompleto || ins.ParticipanteNombreCompleto || 'Tripulación Colectiva',
                inscripciones: [],
            });
        }
        map.get(key).inscripciones.push(ins);
    });
    return Array.from(map.values())
        .map((row) => {
            const pruebas = [...new Set(row.inscripciones.map((i) => i.pruebaNombre || i.PruebaNombre).filter(Boolean))];
            return {
                ...row,
                pagado: row.inscripciones.length > 0 && row.inscripciones.every((i) => i.pagado || i.Pagado),
                pruebasCount: pruebas.length || row.inscripciones.length,
            };
        })
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
};

const PagosClubSection = () => {
    const { user } = useAuth();
    const { alert: msg, showAlert } = useAlert();
    const [activeTab, setActiveTab] = useState('afiliacion');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [sendingSolicitud, setSendingSolicitud] = useState(false);
    const [solicitudEnviada, setSolicitudEnviada] = useState(false);

    // Data states
    const [clubInfo, setClubInfo] = useState(null);
    const [atletas, setAtletas] = useState([]);
    const [inscripciones, setInscripciones] = useState([]);

    // Search filters
    const [searchAtleta, setSearchAtleta] = useState('');
    const [searchInscripcion, setSearchInscripcion] = useState('');

    useEffect(() => {
        loadData();
    }, [user?.clubId, user?.ClubId]);

    const loadData = async () => {
        const clubId = user?.clubId ?? user?.ClubId;
        if (!clubId) return;
        setLoading(true);
        try {
            // Fetch club info
            const club = await ClubService.getById(clubId);
            setClubInfo(club);
            setSolicitudEnviada(club?.solicitudPagoPendiente || club?.SolicitudPagoPendiente || false);

            // Fetch athletes of this club
            const athletesData = await AtletaService.getByClub(clubId);
            setAtletas(athletesData);

            // Fetch inscriptions and filter for this club
            const inscRes = await api.get(ENDPOINTS.INSCRIPCIONES.BASE);
            const clubInscripciones = inscRes.data.filter(i => {
                const athClubId = i.participanteClubId || (i.participante && i.participante.clubId);
                return athClubId === clubId || i.clubId === clubId;
            });
            setInscripciones(clubInscripciones);
        } catch (err) {
            console.error("Error loading club payment data:", err);
            showAlert('error', 'Error al cargar los datos de pagos del club.');
        } finally {
            setLoading(false);
        }
    };

    const handleSolicitarPago = async () => {
        setSendingSolicitud(true);
        try {
            // 1. Persistir la solicitud en la base de datos
            await api.put(`/pagos/clubes/${user.clubId}/solicitar-pago`, true, {
                headers: { 'Content-Type': 'application/json' }
            });

            // 2. Notificar en tiempo real mediante WebSockets
            await timingSignalRService.connect();
            const clubNombre = clubInfo?.nombre || user?.username || 'Club';
            const clubId = user?.clubId || 0;
            
            await timingSignalRService.requestPaymentStatusChange(clubNombre, clubId);
            
            setSolicitudEnviada(true);
            showAlert('success', 'Solicitud de cambio de estado de pago enviada a la federación.');
        } catch (err) {
            console.error("Error al enviar la solicitud:", err.response || err);
            showAlert('error', 'Error al enviar la solicitud de cambio de pago. Revisa la consola para más detalles.');
        } finally {
            setSendingSolicitud(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            await loadData();
            showAlert('success', 'Información de pagos actualizada.');
        } catch (err) {
            showAlert('error', 'Error al actualizar.');
        } finally {
            setRefreshing(false);
        }
    };

    // Derived statistics
    const getAtletasDeudoresCount = () => {
        return atletas.filter(a => !a.pagoAfiliacionAlDia).length;
    };

    const getInscripcionesPendientesCount = () => {
        const estadoPorAtletaEvento = new Map();
        inscripciones.forEach((i) => {
            const eventoKey = i.eventoId ?? i.eventoNombre ?? i.EventoNombre ?? 'evento';
            const key = `${eventoKey}|${atletaInscripcionKey(i)}`;
            if (!estadoPorAtletaEvento.has(key)) estadoPorAtletaEvento.set(key, true);
            if (!(i.pagado || i.Pagado)) estadoPorAtletaEvento.set(key, false);
        });
        return Array.from(estadoPorAtletaEvento.values()).filter((pagado) => !pagado).length;
    };

    // Filter lists
    const filteredAtletas = atletas.filter((a) =>
        matchesSearch(
            searchAtleta,
            a.nombre ?? a.Nombre,
            a.apellido ?? a.Apellido,
            a.dni ?? a.Dni ?? a.documento ?? a.Documento,
        )
    );

    const filteredInscripciones = inscripciones.filter((i) =>
        matchesSearch(
            searchInscripcion,
            i.participanteNombreCompleto ?? i.ParticipanteNombreCompleto,
            i.eventoNombre ?? i.EventoNombre,
            i.pruebaNombre ?? i.PruebaNombre,
        )
    );

    const inscripcionesPorEvento = React.useMemo(() => {
        const groups = new Map();
        filteredInscripciones.forEach((ins) => {
            const nombre = (ins.eventoNombre || ins.EventoNombre || 'Evento sin nombre').trim();
            const eventoId = ins.eventoId ?? ins.EventoId ?? null;
            const key = eventoId != null ? `id-${eventoId}` : `nombre-${nombre.toLowerCase()}`;
            if (!groups.has(key)) {
                groups.set(key, {
                    key,
                    nombre,
                    fecha: ins.fechaEvento || ins.fechaInicioEvento || ins.FechaEvento || null,
                    inscripciones: [],
                });
            }
            const group = groups.get(key);
            group.inscripciones.push(ins);
            const insFecha = ins.fechaEvento || ins.fechaInicioEvento || ins.FechaEvento;
            if (insFecha) group.fecha = insFecha;
        });
        return Array.from(groups.values())
            .map((group) => ({ ...group, atletas: agruparAtletasPorInscripciones(group.inscripciones) }))
            .sort((a, b) => {
                const diff = parseFechaMs(b.fecha) - parseFechaMs(a.fecha);
                if (diff !== 0) return diff;
                return a.nombre.localeCompare(b.nombre, 'es');
            });
    }, [filteredInscripciones]);

    const isAlDia = clubInfo?.pagoAfiliacionAlDia || clubInfo?.PagoAfiliacionAlDia;

    return (
        <div className="admin-section-container fade-in">
            {msg && <div className={`alert-msg ${msg.type} fade-in`}>{msg.text}</div>}

            {/* Header */}
            <div className="section-header-row mb-lg">
                <div>
                    <h1 className="gradient-text" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <CreditCard size={32} color="var(--color-primary-light)" /> Estado de Pagos del Club
                    </h1>
                    <p className="section-subtitle" style={{ margin: '0.2rem 0 0 0' }}>
                        Supervise su afiliación anual con la federación, las cuotas de sus atletas y las inscripciones a eventos.
                    </p>
                </div>
                <button 
                    className="btn-admin-secondary" 
                    onClick={handleRefresh} 
                    disabled={refreshing}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
                    {refreshing ? 'Actualizando...' : 'Refrescar'}
                </button>
            </div>

            {/* Stats Dashboard Grid */}
            <div className="stats-dashboard-grid" style={{ marginBottom: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.2rem' }}>
                {/* Affiliation Card */}
                <div className={`stat-card-premium glass-effect`} style={{
                    position: 'relative',
                    overflow: 'hidden',
                    border: isAlDia ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(239, 68, 68, 0.25)',
                    boxShadow: isAlDia ? '0 0 20px rgba(16, 185, 129, 0.05)' : '0 0 20px rgba(239, 68, 68, 0.05)',
                }}>
                    <div className="stat-icon-bg" style={{
                        background: isAlDia ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: isAlDia ? '#10B981' : '#EF4444'
                    }}>
                        {isAlDia ? <CheckCircle2 size={24} /> : <ShieldAlert size={24} />}
                    </div>
                    <div className="stat-info">
                        <h3 style={{ color: isAlDia ? '#10B981' : '#EF4444', margin: 0 }}>
                            {isAlDia ? 'Al Día' : 'Con Deuda'}
                        </h3>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                            Afiliación Anual del Club
                        </p>
                    </div>
                </div>

                {/* Athletes Debt Card */}
                <div className="stat-card-premium glass-effect" style={{
                    border: getAtletasDeudoresCount() > 0 ? '1px solid rgba(245, 158, 11, 0.25)' : '1px solid rgba(255,255,255,0.05)'
                }}>
                    <div className="stat-icon-bg" style={{
                        background: getAtletasDeudoresCount() > 0 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(255,255,255,0.05)',
                        color: getAtletasDeudoresCount() > 0 ? '#F59E0B' : 'var(--color-text-secondary)'
                    }}>
                        <Users size={24} />
                    </div>
                    <div className="stat-info">
                        <h3 style={{ margin: 0 }}>{getAtletasDeudoresCount()}</h3>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                            Atletas con Deuda
                        </p>
                    </div>
                </div>

                {/* Inscriptions Pending Card */}
                <div className="stat-card-premium glass-effect" style={{
                    border: getInscripcionesPendientesCount() > 0 ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid rgba(255,255,255,0.05)'
                }}>
                    <div className="stat-icon-bg" style={{
                        background: getInscripcionesPendientesCount() > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.05)',
                        color: getInscripcionesPendientesCount() > 0 ? '#EF4444' : 'var(--color-text-secondary)'
                    }}>
                        <Calendar size={24} />
                    </div>
                    <div className="stat-info">
                        <h3 style={{ margin: 0 }}>{getInscripcionesPendientesCount()}</h3>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                            Inscripciones Impagas
                        </p>
                    </div>
                </div>
            </div>

            {/* Tabbed Navigation */}
            <div className="admin-tabs" style={{
                display: 'flex',
                gap: '1rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                marginBottom: '1.5rem',
                paddingBottom: '0.5rem'
            }}>
                <button 
                    className={`tab-btn ${activeTab === 'afiliacion' ? 'active' : ''}`}
                    onClick={() => setActiveTab('afiliacion')}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: activeTab === 'afiliacion' ? 'var(--color-primary-light)' : 'var(--color-text-secondary)',
                        fontSize: '1.05rem',
                        fontWeight: 600,
                        padding: '0.5rem 1rem',
                        cursor: 'pointer',
                        borderBottom: activeTab === 'afiliacion' ? '3px solid var(--color-primary-light)' : '3px solid transparent',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}
                >
                    <Building2 size={18} /> Afiliación Anual
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'atletas' ? 'active' : ''}`}
                    onClick={() => setActiveTab('atletas')}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: activeTab === 'atletas' ? 'var(--color-primary-light)' : 'var(--color-text-secondary)',
                        fontSize: '1.05rem',
                        fontWeight: 600,
                        padding: '0.5rem 1rem',
                        cursor: 'pointer',
                        borderBottom: activeTab === 'atletas' ? '3px solid var(--color-primary-light)' : '3px solid transparent',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}
                >
                    <Users size={18} /> Cuotas de Atletas
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'inscripciones' ? 'active' : ''}`}
                    onClick={() => setActiveTab('inscripciones')}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: activeTab === 'inscripciones' ? 'var(--color-primary-light)' : 'var(--color-text-secondary)',
                        fontSize: '1.05rem',
                        fontWeight: 600,
                        padding: '0.5rem 1rem',
                        cursor: 'pointer',
                        borderBottom: activeTab === 'inscripciones' ? '3px solid var(--color-primary-light)' : '3px solid transparent',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}
                >
                    <Calendar size={18} /> Inscripciones a Eventos
                </button>
            </div>

            {loading ? (
                <div className="loader-container" style={{ minHeight: '200px' }}>
                    <div className="loader"></div>
                </div>
            ) : (
                <div className="tab-content fade-in">
                    
                    {/* TAB 1: AFILIACION ANUAL */}
                    {activeTab === 'afiliacion' && (
                        <div className="glass-effect" style={{
                            padding: '2rem',
                            borderRadius: '16px',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1.5rem'
                        }}>
                            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                <div style={{
                                    width: '80px',
                                    height: '80px',
                                    borderRadius: '50%',
                                    background: isAlDia ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                    color: isAlDia ? '#10B981' : '#EF4444',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: isAlDia ? '0 0 30px rgba(16, 185, 129, 0.15)' : '0 0 30px rgba(239, 68, 68, 0.15)',
                                    border: isAlDia ? '2px solid rgba(16, 185, 129, 0.2)' : '2px solid rgba(239, 68, 68, 0.2)'
                                }}>
                                    {isAlDia ? <CheckCircle2 size={40} /> : <ShieldAlert size={40} />}
                                </div>
                                <div style={{ flex: 1, minWidth: '240px' }}>
                                    <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--color-text-primary)' }}>
                                        {isAlDia ? 'Club Habilitado y Federado' : 'Afiliación Expirada / Bloqueada'}
                                    </h2>
                                    <p style={{ margin: '0.4rem 0 0 0', color: 'var(--color-text-secondary)', fontSize: '0.95rem', lineHeight: '1.4' }}>
                                        {isAlDia 
                                            ? 'Su club se encuentra al día con la afiliación anual de la Federación. Cuenta con permisos completos para inscribir atletas en regatas y registrar nuevos deportistas.' 
                                            : 'Su club tiene la afiliación anual pendiente o vencida. Para desbloquear la inscripción a regatas y el registro de nuevos atletas, por favor póngase en contacto con la administración de la Federación para regularizar el cobro.'
                                        }
                                    </p>
                                </div>
                            </div>

                            <hr style={{ border: 'none', borderTop: '1px solid rgba(255, 255, 255, 0.05)', margin: '0.5rem 0' }} />

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
                                <div className="glass-effect" style={{ padding: '1.2rem', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Federación de Afiliación</span>
                                    <h4 style={{ margin: '6px 0 0 0', fontSize: '1.15rem', color: 'var(--color-text-primary)' }}>
                                        {getClubFederationName(clubInfo) || 'Sin federación asignada'}
                                    </h4>
                                </div>
                                <div className="glass-effect" style={{ padding: '1.2rem', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                    <div>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Estado Administrativo</span>
                                        <h4 style={{ margin: '6px 0 0 0', fontSize: '1.15rem', color: isAlDia ? '#10B981' : '#EF4444' }}>
                                            {isAlDia ? '● Activo y Vigente' : '● Restringido por Pago'}
                                        </h4>
                                    </div>
                                    {/* !isAlDia && (
                                        <button 
                                            className="btn-admin-primary" 
                                            onClick={handleSolicitarPago}
                                            disabled={sendingSolicitud || solicitudEnviada}
                                            style={{ 
                                                marginTop: '16px', 
                                                width: '100%', 
                                                padding: '10px 14px', 
                                                fontSize: '0.85rem',
                                                fontWeight: 600,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px',
                                                borderRadius: '8px',
                                                background: solicitudEnviada ? 'rgba(16, 185, 129, 0.15)' : 'var(--color-primary-light)',
                                                border: solicitudEnviada ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid transparent',
                                                color: solicitudEnviada ? '#10B981' : 'var(--color-background)',
                                                cursor: (sendingSolicitud || solicitudEnviada) ? 'not-allowed' : 'pointer',
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            <CreditCard size={16} />
                                            {sendingSolicitud ? 'Enviando...' : solicitudEnviada ? 'Solicitud Enviada ✓' : 'Solicitar Cambio de Estado a Pago'}
                                        </button>
                                    ) */}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: CUOTAS DE ATLETAS */}
                    {activeTab === 'atletas' && (
                        <div>
                            {/* Search bar */}
                            <div className="search-bar-container mb-md" style={{ display: 'flex', gap: '1rem' }}>
                                <div style={{ position: 'relative', flex: 1 }}>
                                    <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-dim)' }} />
                                    <input 
                                        type="text" 
                                        placeholder="Buscar atleta por nombre o DNI..." 
                                        className="admin-input with-search-icon" 
                                        value={searchAtleta}
                                        onChange={e => setSearchAtleta(e.target.value)}
                                        style={{ paddingLeft: '2.5rem', width: '100%', boxSizing: 'border-box' }}
                                    />
                                </div>
                            </div>

                            <div className="admin-grid-card glass-effect" style={{ overflowX: 'auto', borderRadius: '16px' }}>
                                <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', textAlign: 'left' }}>
                                            <th style={{ padding: '1rem' }}>Atleta</th>
                                            <th style={{ padding: '1rem' }}>DNI</th>
                                            <th style={{ padding: '1rem' }}>Categoría</th>
                                            <th style={{ padding: '1rem' }}>Estado de Pago</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredAtletas.length === 0 ? (
                                            <tr>
                                                <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-secondary)' }}>
                                                    No se encontraron atletas.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredAtletas.map(atleta => (
                                                <tr key={atleta.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                                                    <td style={{ padding: '1rem' }}>
                                                        <strong>{atleta.nombre} {atleta.apellido}</strong>
                                                    </td>
                                                    <td style={{ padding: '1rem' }}>{atleta.dni}</td>
                                                    <td style={{ padding: '1rem' }}>{atleta.categoriaNombre || 'Sin Categoría'}</td>
                                                    <td style={{ padding: '1rem' }}>
                                                        <span className={`badge-pill ${atleta.pagoAfiliacionAlDia ? 'positive' : 'negative'}`} style={{
                                                            padding: '4px 10px',
                                                            borderRadius: '20px',
                                                            fontSize: '0.75rem',
                                                            fontWeight: 700,
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '0.35rem',
                                                            background: atleta.pagoAfiliacionAlDia ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                                                            color: atleta.pagoAfiliacionAlDia ? '#10B981' : '#EF4444',
                                                            boxShadow: atleta.pagoAfiliacionAlDia ? '0 0 10px rgba(16, 185, 129, 0.2)' : '0 0 10px rgba(239, 68, 68, 0.2)'
                                                        }}>
                                                            {atleta.pagoAfiliacionAlDia ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                                                            {atleta.pagoAfiliacionAlDia ? 'Al Día' : 'Pendiente / En Mora'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: PAGOS DE INSCRIPCION */}
                    {activeTab === 'inscripciones' && (
                        <div>
                            <div className="search-bar-container mb-md" style={{ display: 'flex', gap: '1rem' }}>
                                <div style={{ position: 'relative', flex: 1 }}>
                                    <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-dim)' }} />
                                    <input 
                                        type="text" 
                                        placeholder="Buscar por atleta o evento..." 
                                        className="admin-input with-search-icon" 
                                        value={searchInscripcion}
                                        onChange={e => setSearchInscripcion(e.target.value)}
                                        style={{ paddingLeft: '2.5rem', width: '100%', boxSizing: 'border-box' }}
                                    />
                                </div>
                            </div>

                            {inscripcionesPorEvento.length === 0 ? (
                                <div className="admin-grid-card glass-effect pagos-evento-empty">
                                    No se encontraron inscripciones.
                                </div>
                            ) : (
                                <div className="pagos-eventos-list">
                                    {inscripcionesPorEvento.map((grupo) => {
                                        const pagadas = grupo.atletas.filter(a => a.pagado).length;
                                        const pendientes = grupo.atletas.length - pagadas;
                                        const fechaLabel = formatFechaEvento(grupo.fecha);
                                        return (
                                            <article key={grupo.key} className="pagos-evento-card glass-effect">
                                                <header className="pagos-evento-card-header">
                                                    <div className="pagos-evento-card-title-wrap">
                                                        <span className="pagos-evento-card-icon">
                                                            <Calendar size={18} />
                                                        </span>
                                                        <span>
                                                            <h3 className="pagos-evento-card-title">{grupo.nombre}</h3>
                                                            {fechaLabel && (
                                                                <span className="pagos-evento-card-meta">
                                                                    <span><Calendar size={12} /> {fechaLabel}</span>
                                                                </span>
                                                            )}
                                                        </span>
                                                    </div>
                                                    <div className="pagos-evento-card-aside">
                                                        <span className="pagos-evento-stat">{grupo.atletas.length} insc.</span>
                                                        <span className="pagos-evento-stat is-success">{pagadas} pagadas</span>
                                                        <span className={`pagos-evento-stat ${pendientes > 0 ? 'is-warning' : 'is-success'}`}>
                                                            {pendientes > 0 ? `${pendientes} impagas` : 'Al día'}
                                                        </span>
                                                    </div>
                                                </header>
                                                <div className="pagos-evento-card-body">
                                                    <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                        <thead>
                                                            <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', textAlign: 'left' }}>
                                                                <th style={{ padding: '1rem' }}>Atleta</th>
                                                                <th style={{ padding: '1rem' }}>Pruebas</th>
                                                                <th style={{ padding: '1rem' }}>Estado de Pago</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {grupo.atletas.map(atleta => (
                                                                <tr key={atleta.key} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                                                                    <td style={{ padding: '1rem' }}>
                                                                        <strong>{atleta.nombre}</strong>
                                                                    </td>
                                                                    <td style={{ padding: '1rem' }}>
                                                                        {atleta.pruebasCount} {atleta.pruebasCount === 1 ? 'prueba' : 'pruebas'}
                                                                    </td>
                                                                    <td style={{ padding: '1rem' }}>
                                                                        <span className={`badge-pill ${atleta.pagado ? 'positive' : 'warning'}`} style={{
                                                                            padding: '4px 10px',
                                                                            borderRadius: '20px',
                                                                            fontSize: '0.75rem',
                                                                            fontWeight: 700,
                                                                            display: 'inline-flex',
                                                                            alignItems: 'center',
                                                                            gap: '0.35rem',
                                                                            background: atleta.pagado ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                                                                            color: atleta.pagado ? '#10B981' : '#F59E0B',
                                                                            boxShadow: atleta.pagado ? '0 0 10px rgba(16, 185, 129, 0.2)' : '0 0 10px rgba(245, 158, 11, 0.2)'
                                                                        }}>
                                                                            {atleta.pagado ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                                                                            {atleta.pagado ? 'Abonado' : 'Impago'}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                </div>
            )}
        </div>
    );
};

export default PagosClubSection;
