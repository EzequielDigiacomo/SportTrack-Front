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
import timingSignalRService from '../../../services/TimingSignalRService';
import '../../../components/SharedSections/AdminSections.css';

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
    }, [user?.clubId]);

    const loadData = async () => {
        if (!user?.clubId) return;
        setLoading(true);
        try {
            // Fetch club info
            const club = await ClubService.getById(user.clubId);
            setClubInfo(club);
            setSolicitudEnviada(club?.solicitudPagoPendiente || club?.SolicitudPagoPendiente || false);

            // Fetch athletes of this club
            const athletesData = await AtletaService.getByClub(user.clubId);
            setAtletas(athletesData);

            // Fetch inscriptions and filter for this club
            const inscRes = await api.get(ENDPOINTS.INSCRIPCIONES.BASE);
            const clubInscripciones = inscRes.data.filter(i => {
                const athClubId = i.participanteClubId || (i.participante && i.participante.clubId);
                return athClubId === user.clubId || i.clubId === user.clubId;
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
        return inscripciones.filter(i => !i.pagado).length;
    };

    // Filter lists
    const filteredAtletas = atletas.filter(a => 
        a.nombre.toLowerCase().includes(searchAtleta.toLowerCase()) ||
        a.apellido.toLowerCase().includes(searchAtleta.toLowerCase()) ||
        (a.dni && a.dni.toLowerCase().includes(searchAtleta.toLowerCase()))
    );

    const filteredInscripciones = inscripciones.filter(i => 
        (i.participanteNombreCompleto && i.participanteNombreCompleto.toLowerCase().includes(searchInscripcion.toLowerCase())) ||
        (i.eventoNombre && i.eventoNombre.toLowerCase().includes(searchInscripcion.toLowerCase())) ||
        (i.pruebaNombre && i.pruebaNombre.toLowerCase().includes(searchInscripcion.toLowerCase()))
    );

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
                        Supervise su afiliación anual con la federación, las cuotas de sus atletas y las inscripciones a regatas.
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
                    <Calendar size={18} /> Pagos de Inscripción
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
                                        {clubInfo?.parentClubNombre || 'Federación Ecuatoriana'}
                                    </h4>
                                </div>
                                <div className="glass-effect" style={{ padding: '1.2rem', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                    <div>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Estado Administrativo</span>
                                        <h4 style={{ margin: '6px 0 0 0', fontSize: '1.15rem', color: isAlDia ? '#10B981' : '#EF4444' }}>
                                            {isAlDia ? '● Activo y Vigente' : '● Restringido por Pago'}
                                        </h4>
                                    </div>
                                    {!isAlDia && (
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
                                    )}
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
                            {/* Search bar */}
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

                            <div className="admin-grid-card glass-effect" style={{ overflowX: 'auto', borderRadius: '16px' }}>
                                <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', textAlign: 'left' }}>
                                            <th style={{ padding: '1rem' }}>Competidor</th>
                                            <th style={{ padding: '1rem' }}>Regata / Evento</th>
                                            <th style={{ padding: '1rem' }}>Prueba</th>
                                            <th style={{ padding: '1rem' }}>Nº Dorsal</th>
                                            <th style={{ padding: '1rem' }}>Estado de Pago</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredInscripciones.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-secondary)' }}>
                                                    No se encontraron inscripciones.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredInscripciones.map(ins => (
                                                <tr key={ins.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                                                    <td style={{ padding: '1rem' }}>
                                                        <strong>{ins.participanteNombreCompleto || 'Tripulación Colectiva'}</strong>
                                                    </td>
                                                    <td style={{ padding: '1rem' }}>
                                                        {ins.eventoNombre || 'Evento'}
                                                    </td>
                                                    <td style={{ padding: '1rem' }}>
                                                        {ins.pruebaNombre || '—'}
                                                    </td>
                                                    <td style={{ padding: '1rem' }}>
                                                        <span style={{ fontFamily: 'monospace', color: 'var(--color-primary-light)' }}>#{ins.numeroCompetidor || 'PENDIENTE'}</span>
                                                    </td>
                                                    <td style={{ padding: '1rem' }}>
                                                        <span className={`badge-pill ${ins.pagado ? 'positive' : 'warning'}`} style={{
                                                            padding: '4px 10px',
                                                            borderRadius: '20px',
                                                            fontSize: '0.75rem',
                                                            fontWeight: 700,
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '0.35rem',
                                                            background: ins.pagado ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                                                            color: ins.pagado ? '#10B981' : '#F59E0B',
                                                            boxShadow: ins.pagado ? '0 0 10px rgba(16, 185, 129, 0.2)' : '0 0 10px rgba(245, 158, 11, 0.2)'
                                                        }}>
                                                            {ins.pagado ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                                                            {ins.pagado ? 'Abonado' : 'Impago'}
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

                </div>
            )}
        </div>
    );
};

export default PagosClubSection;
