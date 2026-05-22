import React, { useState, useEffect } from 'react';
import { 
    Building2, 
    Users, 
    Calendar, 
    History, 
    DollarSign, 
    Search, 
    CheckCircle2, 
    XCircle, 
    AlertCircle, 
    RefreshCw, 
    Check,
    CreditCard,
    Plus
} from 'lucide-react';
import api from '../../../services/api';
import { ENDPOINTS } from '../../../utils/constants';
import PagoService from '../../../services/PagoService';
import RegistrarPagoModal from '../../../components/SharedSections/RegistrarPagoModal';
import { useAlert } from '../../../hooks/useAlert';
import { useAuth } from '../../../context/AuthContext';
import '../../../components/SharedSections/AdminSections.css';

const GestionPagosSection = () => {
    const { user } = useAuth();
    const { alert: msg, showAlert } = useAlert();
    const [activeTab, setActiveTab] = useState('clubes');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Listas
    const [clubes, setClubes] = useState([]);
    const [atletas, setAtletas] = useState([]);
    const [inscripciones, setInscripciones] = useState([]);
    const [historial, setHistorial] = useState([]);

    // Filtros de Búsqueda
    const [searchClub, setSearchClub] = useState('');
    const [searchAtleta, setSearchAtleta] = useState('');
    const [searchInscripcion, setSearchInscripcion] = useState('');
    const [searchHistorial, setSearchHistorial] = useState('');
    const [selectedClubForBulk, setSelectedClubForBulk] = useState('');
    const [selectedClubForBulkAtletas, setSelectedClubForBulkAtletas] = useState('');
    
    // Filtro por Club para Búsqueda
    const [selectedClubFilterAtletas, setSelectedClubFilterAtletas] = useState('');
    const [selectedClubFilterInscripciones, setSelectedClubFilterInscripciones] = useState('');

    // Paginación
    const [currentPageAtletas, setCurrentPageAtletas] = useState(1);
    const [currentPageInscripciones, setCurrentPageInscripciones] = useState(1);
    const itemsPerPage = 9;

    useEffect(() => {
        setCurrentPageAtletas(1);
    }, [searchAtleta, selectedClubFilterAtletas]);

    useEffect(() => {
        setCurrentPageInscripciones(1);
    }, [searchInscripcion, selectedClubFilterInscripciones]);

    // Modal de Registro de Pago
    const [modalOpen, setModalOpen] = useState(false);
    const [modalData, setModalData] = useState({
        paymentType: '', // 'ClubAfiliacion', 'AtletaAfiliacion', 'InscripcionEvento'
        entityId: null,
        entityName: ''
    });

    useEffect(() => {
        loadAllData();
    }, [activeTab]);

    const loadAllData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                loadClubes(),
                loadAtletas(),
                loadInscripciones(),
                loadHistorial()
            ]);
        } catch (err) {
            console.error("Error loading payments data:", err);
            showAlert('error', 'Error al cargar datos de control de pagos.');
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            await loadAllData();
            showAlert('success', 'Datos actualizados en tiempo real.');
        } catch (err) {
            showAlert('error', 'Error al refrescar la información.');
        } finally {
            setRefreshing(false);
        }
    };

    const loadClubes = async () => {
        const res = await api.get(ENDPOINTS.CLUBES);
        // Filtrar según el rol (si es admin federativo, ve sub-clubes)
        const role = user?.rol?.trim().toLowerCase();
        const fedId = user?.clubId;
        if (role === 'admin' && fedId) {
            setClubes(res.data.filter(c => c.parentClubId === fedId || c.id === fedId));
        } else {
            setClubes(res.data);
        }
    };

    const loadAtletas = async () => {
        const res = await api.get(ENDPOINTS.PARTICIPANTES.BASE);
        // Filtrar atletas del propio club o federación
        const role = user?.rol?.trim().toLowerCase();
        const fedId = user?.clubId;
        if (role === 'admin' && fedId) {
            // Cargar todos los clubes para obtener los IDs pertenecientes a esta federación
            const resClubes = await api.get(ENDPOINTS.CLUBES);
            const affiliatedClubIds = resClubes.data
                .filter(c => c.parentClubId === fedId || c.id === fedId)
                .map(c => c.id);
            setAtletas(res.data.filter(a => affiliatedClubIds.includes(a.clubId)));
        } else {
            setAtletas(res.data);
        }
    };

    const loadInscripciones = async () => {
        const res = await api.get(ENDPOINTS.INSCRIPCIONES.BASE);
        const role = user?.rol?.trim().toLowerCase();
        const fedId = user?.clubId;
        if (role === 'admin' && fedId) {
            // Cargar todos los clubes para obtener los IDs de los clubes afiliados
            const resClubes = await api.get(ENDPOINTS.CLUBES);
            const affiliatedClubIds = resClubes.data
                .filter(c => c.parentClubId === fedId || c.id === fedId)
                .map(c => c.id);
            
            // Mapear nombres de club a IDs para buscar de forma robusta
            const clubNameToId = {};
            resClubes.data.forEach(c => {
                if (c.nombre) {
                    clubNameToId[c.nombre.toLowerCase().trim()] = c.id;
                }
            });

            // Filtrar inscripciones cuyos atletas pertenecen a clubes de esta federación
            setInscripciones(res.data.filter(i => {
                const clubName = i.clubNombre?.toLowerCase().trim();
                const clubId = clubNameToId[clubName];
                return affiliatedClubIds.includes(clubId);
            }));
        } else {
            setInscripciones(res.data);
        }
    };

    const loadHistorial = async () => {
        const data = await PagoService.getHistorial();
        setHistorial(data);
    };

    // Toggles directos
    const handleToggleClub = async (clubId, currentStatus) => {
        try {
            await PagoService.toggleClubStatus(clubId, !currentStatus);
            showAlert('success', `Estado del club actualizado.`);
            loadClubes();
            loadHistorial();
        } catch (err) {
            showAlert('error', 'Error al cambiar estado del club.');
        }
    };

    const handleToggleAtleta = async (atletaId, currentStatus) => {
        try {
            await PagoService.toggleAtletaStatus(atletaId, !currentStatus);
            showAlert('success', `Estado de afiliación del atleta actualizado.`);
            loadAtletas();
            loadHistorial();
        } catch (err) {
            showAlert('error', 'Error al cambiar estado del atleta.');
        }
    };

    const handleToggleInscripcion = async (inscripcionId, currentStatus) => {
        try {
            await PagoService.toggleInscripcionStatus(inscripcionId, !currentStatus);
            showAlert('success', `Estado de pago de inscripción actualizado.`);
            loadInscripciones();
            loadHistorial();
        } catch (err) {
            showAlert('error', 'Error al cambiar estado de inscripción.');
        }
    };

    const handleBulkToggleInscripciones = async (targetInscripciones, targetStatus) => {
        if (!targetInscripciones || targetInscripciones.length === 0) {
            showAlert('warning', 'No hay inscripciones para actualizar.');
            return;
        }
        setLoading(true);
        try {
            await Promise.all(
                targetInscripciones.map(ins => PagoService.toggleInscripcionStatus(ins.id, targetStatus))
            );
            showAlert('success', `Se actualizaron ${targetInscripciones.length} inscripciones exitosamente.`);
            await Promise.all([
                loadInscripciones(),
                loadHistorial()
            ]);
        } catch (err) {
            console.error("Error updating bulk inscriptions:", err);
            showAlert('error', 'Error al realizar la actualización masiva en lote.');
        } finally {
            setLoading(false);
        }
    };

    const uniqueClubsWithInscriptions = React.useMemo(() => {
        const unique = new Set();
        inscripciones.forEach(ins => {
            if (ins.clubNombre) unique.add(ins.clubNombre.trim());
        });
        return Array.from(unique).sort();
    }, [inscripciones]);

    const handleBulkToggleAtletas = async (targetAtletas, targetStatus) => {
        if (!targetAtletas || targetAtletas.length === 0) {
            showAlert('warning', 'No hay atletas para actualizar.');
            return;
        }
        setLoading(true);
        try {
            await Promise.all(
                targetAtletas.map(a => PagoService.toggleAtletaStatus(a.id, targetStatus))
            );
            showAlert('success', `Se actualizaron ${targetAtletas.length} atletas exitosamente.`);
            await Promise.all([
                loadAtletas(),
                loadHistorial()
            ]);
        } catch (err) {
            console.error("Error updating bulk athletes:", err);
            showAlert('error', 'Error al realizar la actualización masiva de atletas.');
        } finally {
            setLoading(false);
        }
    };

    const uniqueClubsWithAtletas = React.useMemo(() => {
        const unique = new Set();
        atletas.forEach(a => {
            if (a.clubNombre) unique.add(a.clubNombre.trim());
        });
        return Array.from(unique).sort();
    }, [atletas]);

    // Registrar pago formal
    const handleOpenRegistrar = (type, entityId, entityName) => {
        setModalData({
            paymentType: type,
            entityId,
            entityName
        });
        setModalOpen(true);
    };

    const handleConfirmPago = async (pagoPayload) => {
        try {
            await PagoService.registrarPago(pagoPayload);
            showAlert('success', 'Pago registrado formalmente. Se ha actualizado el estado de afiliación.');
            loadAllData();
        } catch (err) {
            showAlert('error', 'Error al registrar el pago: ' + (err.response?.data?.message || err.message));
        }
    };

    // Helpers
    const getHistorialTotal = () => {
        return historial.reduce((sum, item) => sum + item.monto, 0);
    };

    const getClubesDeudoresCount = () => {
        return clubes.filter(c => !c.pagoAfiliacionAlDia).length;
    };

    const getAtletasDeudoresCount = () => {
        return atletas.filter(a => !a.pagoAfiliacionAlDia).length;
    };

    const getInscripcionesPendientesCount = () => {
        return inscripciones.filter(i => !i.pagado).length;
    };

    // Filtrados de búsqueda
    const filteredClubes = clubes.filter(c => 
        c.nombre.toLowerCase().includes(searchClub.toLowerCase()) ||
        (c.sigla && c.sigla.toLowerCase().includes(searchClub.toLowerCase()))
    );

    const filteredAtletas = React.useMemo(() => {
        return atletas.filter(a => {
            const matchesClub = !selectedClubFilterAtletas || (a.clubNombre && a.clubNombre.trim() === selectedClubFilterAtletas.trim());
            const matchesSearch = !searchAtleta ||
                a.nombre.toLowerCase().includes(searchAtleta.toLowerCase()) ||
                a.apellido.toLowerCase().includes(searchAtleta.toLowerCase()) ||
                (a.dni && a.dni.toLowerCase().includes(searchAtleta.toLowerCase())) ||
                (a.clubNombre && a.clubNombre.toLowerCase().includes(searchAtleta.toLowerCase()));
            return matchesClub && matchesSearch;
        });
    }, [atletas, selectedClubFilterAtletas, searchAtleta]);

    const filteredInscripciones = React.useMemo(() => {
        return inscripciones.filter(i => {
            const matchesClub = !selectedClubFilterInscripciones || (i.clubNombre && i.clubNombre.trim() === selectedClubFilterInscripciones.trim());
            const matchesSearch = !searchInscripcion ||
                (i.participanteNombreCompleto && i.participanteNombreCompleto.toLowerCase().includes(searchInscripcion.toLowerCase())) ||
                (i.clubNombre && i.clubNombre.toLowerCase().includes(searchInscripcion.toLowerCase())) ||
                (i.eventoNombre && i.eventoNombre.toLowerCase().includes(searchInscripcion.toLowerCase()));
            return matchesClub && matchesSearch;
        });
    }, [inscripciones, selectedClubFilterInscripciones, searchInscripcion]);

    // Atletas Pagination
    const totalPagesAtletas = Math.max(1, Math.ceil(filteredAtletas.length / itemsPerPage));
    const paginatedAtletas = React.useMemo(() => {
        const start = (currentPageAtletas - 1) * itemsPerPage;
        return filteredAtletas.slice(start, start + itemsPerPage);
    }, [filteredAtletas, currentPageAtletas]);

    // Inscripciones Pagination
    const totalPagesInscripciones = Math.max(1, Math.ceil(filteredInscripciones.length / itemsPerPage));
    const paginatedInscripciones = React.useMemo(() => {
        const start = (currentPageInscripciones - 1) * itemsPerPage;
        return filteredInscripciones.slice(start, start + itemsPerPage);
    }, [filteredInscripciones, currentPageInscripciones]);

    const filteredHistorial = historial.filter(h => 
        (h.clubNombre && h.clubNombre.toLowerCase().includes(searchHistorial.toLowerCase())) ||
        (h.participanteNombre && h.participanteNombre.toLowerCase().includes(searchHistorial.toLowerCase())) ||
        (h.eventoNombre && h.eventoNombre.toLowerCase().includes(searchHistorial.toLowerCase())) ||
        (h.referencia && h.referencia.toLowerCase().includes(searchHistorial.toLowerCase())) ||
        (h.tipoPago && h.tipoPago.toLowerCase().includes(searchHistorial.toLowerCase()))
    );

    return (
        <div className="admin-section-container fade-in">
            {msg && <div className={`alert-msg ${msg.type} fade-in`}>{msg.text}</div>}

            {/* Header */}
            <div className="section-header-row mb-lg">
                <div>
                    <h1 className="gradient-text" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <CreditCard size={32} color="var(--color-primary-light)" /> Control de Pagos Manuales
                    </h1>
                    <p className="section-subtitle" style={{ margin: '0.2rem 0 0 0' }}>
                        Gestione afiliaciones de clubes, atletas e inscripciones a regatas sin pasarelas externas.
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

            {/* Stats Summary Panel */}
            <div className="stats-dashboard-grid" style={{ marginBottom: '2rem' }}>
                <div className="stat-card-premium">
                    <div className="stat-icon-bg green">
                        <DollarSign size={24} />
                    </div>
                    <div className="stat-info">
                        <h3>${getHistorialTotal().toLocaleString()}</h3>
                        <p>Total Caja Registrada</p>
                    </div>
                </div>

                <div className="stat-card-premium">
                    <div className="stat-icon-bg purple">
                        <Building2 size={24} />
                    </div>
                    <div className="stat-info">
                        <h3>{getClubesDeudoresCount()}</h3>
                        <p>Clubes Deudores (Anual)</p>
                    </div>
                </div>

                <div className="stat-card-premium">
                    <div className="stat-icon-bg blue">
                        <Users size={24} />
                    </div>
                    <div className="stat-info">
                        <h3>{getAtletasDeudoresCount()}</h3>
                        <p>Atletas Deudores</p>
                    </div>
                </div>

                <div className="stat-card-premium font-orange">
                    <div className="stat-icon-bg orange">
                        <Calendar size={24} />
                    </div>
                    <div className="stat-info">
                        <h3>{getInscripcionesPendientesCount()}</h3>
                        <p>Regatas Impagas</p>
                    </div>
                </div>
            </div>

            {/* Tabbed Navigation */}
            <div className="admin-tabs" style={{
                display: 'flex',
                gap: '1rem',
                borderBottom: '1px solid var(--color-surface-hover)',
                marginBottom: '1.5rem',
                paddingBottom: '0.5rem'
            }}>
                <button 
                    className={`tab-btn ${activeTab === 'clubes' ? 'active' : ''}`}
                    onClick={() => setActiveTab('clubes')}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: activeTab === 'clubes' ? 'var(--color-primary-light)' : 'var(--color-text-secondary)',
                        fontSize: '1rem',
                        fontWeight: 600,
                        padding: '0.5rem 1rem',
                        cursor: 'pointer',
                        borderBottom: activeTab === 'clubes' ? '3px solid var(--color-primary-light)' : '3px solid transparent',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}
                >
                    <Building2 size={18} /> Clubes Afiliados
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'atletas' ? 'active' : ''}`}
                    onClick={() => setActiveTab('atletas')}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: activeTab === 'atletas' ? 'var(--color-primary-light)' : 'var(--color-text-secondary)',
                        fontSize: '1rem',
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
                    <Users size={18} /> Atletas Federados
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'inscripciones' ? 'active' : ''}`}
                    onClick={() => setActiveTab('inscripciones')}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: activeTab === 'inscripciones' ? 'var(--color-primary-light)' : 'var(--color-text-secondary)',
                        fontSize: '1rem',
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
                    <Calendar size={18} /> Inscripciones Regatas
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'historial' ? 'active' : ''}`}
                    onClick={() => setActiveTab('historial')}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: activeTab === 'historial' ? 'var(--color-primary-light)' : 'var(--color-text-secondary)',
                        fontSize: '1rem',
                        fontWeight: 600,
                        padding: '0.5rem 1rem',
                        cursor: 'pointer',
                        borderBottom: activeTab === 'historial' ? '3px solid var(--color-primary-light)' : '3px solid transparent',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}
                >
                    <History size={18} /> Libro Diario / Historial
                </button>
            </div>

            {/* Loading Indicator */}
            {loading ? (
                <div className="loader-container" style={{ minHeight: '300px' }}>
                    <div className="loader"></div>
                </div>
            ) : (
                <div className="tab-content fade-in">

                    {/* CLUBES TAB */}
                    {activeTab === 'clubes' && (
                        <div>
                            {/* Search bar */}
                            <div className="search-bar-container mb-md" style={{ display: 'flex', gap: '1rem' }}>
                                <div style={{ position: 'relative', flex: 1 }}>
                                    <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-dim)' }} />
                                    <input 
                                        type="text" 
                                        placeholder="Buscar club por nombre o sigla..." 
                                        className="admin-input with-search-icon" 
                                        value={searchClub}
                                        onChange={e => setSearchClub(e.target.value)}
                                        style={{ paddingLeft: '2.5rem', width: '100%', boxSizing: 'border-box' }}
                                    />
                                </div>
                            </div>

                            <div className="admin-grid-card glass-effect" style={{ overflowX: 'auto', borderRadius: '16px' }}>
                                <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--color-surface-hover)', textAlign: 'left' }}>
                                            <th style={{ padding: '1rem' }}>Club</th>
                                            <th style={{ padding: '1rem' }}>Federación Madre</th>
                                            <th style={{ padding: '1rem' }}>Estado Afiliación</th>
                                            <th style={{ padding: '1rem' }}>Interruptor Rápido</th>
                                            <th style={{ padding: '1rem', textAlign: 'center' }}>Registrar Cobro</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredClubes.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-secondary)' }}>
                                                    No se encontraron clubes.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredClubes.map(club => (
                                                <tr key={club.id} style={{ borderBottom: '1px solid var(--color-surface-hover)' }}>
                                                    <td style={{ padding: '1rem' }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                            <strong>{club.nombre}</strong>
                                                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>{club.sigla || 'SIN SIGLA'}</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '1rem' }}>
                                                        {club.parentClubNombre || <span style={{ color: 'var(--color-primary-light)', fontWeight: 600 }}>Federación Raíz</span>}
                                                    </td>
                                                    <td style={{ padding: '1rem' }}>
                                                        <span className={`badge-pill ${club.pagoAfiliacionAlDia ? 'positive' : 'negative'}`} style={{
                                                            padding: '4px 10px',
                                                            borderRadius: '20px',
                                                            fontSize: '0.75rem',
                                                            fontWeight: 700,
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '0.35rem',
                                                            background: club.pagoAfiliacionAlDia ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                                                            color: club.pagoAfiliacionAlDia ? '#10B981' : '#EF4444',
                                                            boxShadow: club.pagoAfiliacionAlDia ? '0 0 10px rgba(16, 185, 129, 0.2)' : '0 0 10px rgba(239, 68, 68, 0.2)'
                                                        }}>
                                                            {club.pagoAfiliacionAlDia ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                                                            {club.pagoAfiliacionAlDia ? 'Al Día (Anual)' : 'Deudor'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '1rem' }}>
                                                        <label className="toggle-switch" style={{ display: 'inline-block', position: 'relative', width: '48px', height: '24px', cursor: 'pointer' }}>
                                                            <input 
                                                                type="checkbox" 
                                                                checked={club.pagoAfiliacionAlDia} 
                                                                onChange={() => handleToggleClub(club.id, club.pagoAfiliacionAlDia)}
                                                                style={{ opacity: 0, width: 0, height: 0 }}
                                                            />
                                                            <span className="slider" style={{
                                                                position: 'absolute',
                                                                cursor: 'pointer',
                                                                top: 0, left: 0, right: 0, bottom: 0,
                                                                background: club.pagoAfiliacionAlDia ? 'var(--color-primary)' : 'var(--color-surface-hover)',
                                                                borderRadius: '34px',
                                                                transition: '.3s',
                                                                boxShadow: club.pagoAfiliacionAlDia ? '0 0 8px var(--color-primary-light)' : 'none'
                                                            }}>
                                                                <span style={{
                                                                    position: 'absolute',
                                                                    content: '""',
                                                                    height: '16px', width: '16px',
                                                                    left: club.pagoAfiliacionAlDia ? '26px' : '4px',
                                                                    bottom: '4px',
                                                                    background: 'white',
                                                                    borderRadius: '50%',
                                                                    transition: '.3s'
                                                                }}></span>
                                                            </span>
                                                        </label>
                                                    </td>
                                                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                        <button 
                                                            className="btn-admin-primary"
                                                            onClick={() => handleOpenRegistrar('ClubAfiliacion', club.id, club.nombre)}
                                                            style={{
                                                                padding: '6px 12px',
                                                                fontSize: '0.8rem',
                                                                background: 'linear-gradient(135deg, #10B981, #059669)',
                                                                borderColor: 'transparent',
                                                                color: '#fff',
                                                                boxShadow: '0 4px 10px rgba(16, 185, 129, 0.2)'
                                                            }}
                                                        >
                                                            <Plus size={14} /> Registrar Recibo
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ATLETAS TAB */}
                    {activeTab === 'atletas' && (
                        <div>
                            {/* Search bar with Club Filter */}
                            <div className="search-bar-container mb-md" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                <div style={{ position: 'relative', flex: '2 1 300px' }}>
                                    <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-dim)' }} />
                                    <input 
                                        type="text" 
                                        placeholder="Buscar atleta por nombre, DNI..." 
                                        className="admin-input with-search-icon" 
                                        value={searchAtleta}
                                        onChange={e => setSearchAtleta(e.target.value)}
                                        style={{ paddingLeft: '2.5rem', width: '100%', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div style={{ position: 'relative', flex: '1 1 200px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Building2 size={18} style={{ color: 'var(--color-text-dim)', flexShrink: 0 }} />
                                    <select 
                                        className="admin-select"
                                        value={selectedClubFilterAtletas}
                                        onChange={e => setSelectedClubFilterAtletas(e.target.value)}
                                        style={{ width: '100%', padding: '0.6rem 1rem', fontSize: '0.9rem', borderRadius: '8px', border: '1px solid var(--color-surface-hover)', background: 'var(--color-surface)' }}
                                    >
                                        <option value="">Todos los Clubes</option>
                                        {uniqueClubsWithAtletas.map(club => (
                                            <option key={club} value={club}>{club}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Panel de Controles Masivos para Atletas (Todos y Por Clubes) */}
                            <div className="pagos-masivos-container">
                                {/* Lote Todo */}
                                <div className="pagos-masivos-card">
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                        <h4 className="pagos-masivos-title">
                                            <Users size={18} /> Master Switch (Todos)
                                        </h4>
                                        <p className="pagos-masivos-desc">
                                            Marcar todos los atletas como Al Día o Deudores
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <span className="pagos-masivos-status" style={{ color: (atletas.length > 0 && atletas.every(a => a.pagoAfiliacionAlDia)) ? 'var(--color-success)' : 'var(--color-error)' }}>
                                            {(atletas.length > 0 && atletas.every(a => a.pagoAfiliacionAlDia)) ? 'TODOS AL DÍA' : 'MORA PENDIENTE'}
                                        </span>
                                        <label className="toggle-switch" style={{ display: 'inline-block', position: 'relative', width: '48px', height: '24px', cursor: 'pointer' }}>
                                            <input 
                                                type="checkbox" 
                                                disabled={atletas.length === 0}
                                                checked={atletas.length > 0 && atletas.every(a => a.pagoAfiliacionAlDia)} 
                                                onChange={async () => {
                                                    const currentAllPaid = atletas.length > 0 && atletas.every(a => a.pagoAfiliacionAlDia);
                                                    await handleBulkToggleAtletas(atletas, !currentAllPaid);
                                                }}
                                                style={{ opacity: 0, width: 0, height: 0 }}
                                            />
                                            <span className="slider" style={{
                                                position: 'absolute',
                                                cursor: 'pointer',
                                                top: 0, left: 0, right: 0, bottom: 0,
                                                background: (atletas.length > 0 && atletas.every(a => a.pagoAfiliacionAlDia)) ? 'var(--color-primary)' : 'var(--color-surface-hover)',
                                                borderRadius: '34px',
                                                transition: '.3s',
                                                boxShadow: (atletas.length > 0 && atletas.every(a => a.pagoAfiliacionAlDia)) ? '0 0 8px var(--color-primary-light)' : 'none'
                                            }}>
                                                <span style={{
                                                    position: 'absolute',
                                                    content: '""',
                                                    height: '16px', width: '16px',
                                                    left: (atletas.length > 0 && atletas.every(a => a.pagoAfiliacionAlDia)) ? '26px' : '4px',
                                                    bottom: '4px',
                                                    background: 'white',
                                                    borderRadius: '50%',
                                                    transition: '.3s'
                                                }}></span>
                                            </span>
                                        </label>
                                    </div>
                                </div>

                                {/* Lote por Club */}
                                <div className="pagos-masivos-card">
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                                        <h4 className="pagos-masivos-title">
                                            <Building2 size={18} /> Switch por Club
                                        </h4>
                                        <select 
                                            className="admin-select"
                                            value={selectedClubForBulkAtletas}
                                            onChange={e => setSelectedClubForBulkAtletas(e.target.value)}
                                            style={{ padding: '6px 10px', fontSize: '0.85rem', width: '100%', borderRadius: '6px' }}
                                        >
                                            <option value="">Seleccionar Club...</option>
                                            {uniqueClubsWithAtletas.map(club => (
                                                <option key={club} value={club}>{club}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1.5rem' }}>
                                        <span className="pagos-masivos-status" style={{ color: (selectedClubForBulkAtletas && atletas.filter(a => a.clubNombre === selectedClubForBulkAtletas).every(a => a.pagoAfiliacionAlDia)) ? 'var(--color-success)' : 'var(--color-error)' }}>
                                            {(selectedClubForBulkAtletas && atletas.filter(a => a.clubNombre === selectedClubForBulkAtletas).every(a => a.pagoAfiliacionAlDia)) ? 'CLUB AL DÍA' : 'PENDIENTE'}
                                        </span>
                                        <label className="toggle-switch" style={{ display: 'inline-block', position: 'relative', width: '48px', height: '24px', cursor: selectedClubForBulkAtletas ? 'pointer' : 'not-allowed', opacity: selectedClubForBulkAtletas ? 1 : 0.5 }}>
                                            <input 
                                                type="checkbox" 
                                                disabled={!selectedClubForBulkAtletas}
                                                checked={selectedClubForBulkAtletas ? atletas.filter(a => a.clubNombre === selectedClubForBulkAtletas).every(a => a.pagoAfiliacionAlDia) : false} 
                                                onChange={async () => {
                                                    if (!selectedClubForBulkAtletas) return;
                                                    const targetAtletas = atletas.filter(a => a.clubNombre === selectedClubForBulkAtletas);
                                                    const currentClubPaid = targetAtletas.every(a => a.pagoAfiliacionAlDia);
                                                    await handleBulkToggleAtletas(targetAtletas, !currentClubPaid);
                                                }}
                                                style={{ opacity: 0, width: 0, height: 0 }}
                                            />
                                            <span className="slider" style={{
                                                position: 'absolute',
                                                cursor: selectedClubForBulkAtletas ? 'pointer' : 'not-allowed',
                                                top: 0, left: 0, right: 0, bottom: 0,
                                                background: (selectedClubForBulkAtletas && atletas.filter(a => a.clubNombre === selectedClubForBulkAtletas).every(a => a.pagoAfiliacionAlDia)) ? 'var(--color-primary)' : 'var(--color-surface-hover)',
                                                borderRadius: '34px',
                                                transition: '.3s',
                                                boxShadow: (selectedClubForBulkAtletas && atletas.filter(a => a.clubNombre === selectedClubForBulkAtletas).every(a => a.pagoAfiliacionAlDia)) ? '0 0 8px var(--color-primary-light)' : 'none'
                                            }}>
                                                <span style={{
                                                    position: 'absolute',
                                                    content: '""',
                                                    height: '16px', width: '16px',
                                                    left: (selectedClubForBulkAtletas && atletas.filter(a => a.clubNombre === selectedClubForBulkAtletas).every(a => a.pagoAfiliacionAlDia)) ? '26px' : '4px',
                                                    bottom: '4px',
                                                    background: 'white',
                                                    borderRadius: '50%',
                                                    transition: '.3s'
                                                }}></span>
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="admin-grid-card glass-effect" style={{ overflowX: 'auto', borderRadius: '16px', marginBottom: '1.5rem' }}>
                                <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--color-surface-hover)', textAlign: 'left' }}>
                                            <th style={{ padding: '1rem' }}>Atleta</th>
                                            <th style={{ padding: '1rem' }}>Club</th>
                                            <th style={{ padding: '1rem' }}>Estado de Cuota</th>
                                            <th style={{ padding: '1rem' }}>Interruptor Rápido</th>
                                            <th style={{ padding: '1rem', textAlign: 'center' }}>Registrar Cobro</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredAtletas.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-secondary)' }}>
                                                    No se encontraron atletas.
                                                </td>
                                            </tr>
                                        ) : (
                                            paginatedAtletas.map(atleta => (
                                                <tr key={atleta.id} style={{ borderBottom: '1px solid var(--color-surface-hover)' }}>
                                                    <td style={{ padding: '1rem' }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                            <strong>{atleta.nombre} {atleta.apellido}</strong>
                                                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>DNI: {atleta.dni}</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '1rem' }}>
                                                        {atleta.clubNombre || <span style={{ color: 'var(--color-text-dim)' }}>Sin Club</span>}
                                                    </td>
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
                                                            {atleta.pagoAfiliacionAlDia ? 'Al Día' : 'En Mora'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '1rem' }}>
                                                        <label className="toggle-switch" style={{ display: 'inline-block', position: 'relative', width: '48px', height: '24px', cursor: 'pointer' }}>
                                                            <input 
                                                                type="checkbox" 
                                                                checked={atleta.pagoAfiliacionAlDia} 
                                                                onChange={() => handleToggleAtleta(atleta.id, atleta.pagoAfiliacionAlDia)}
                                                                style={{ opacity: 0, width: 0, height: 0 }}
                                                            />
                                                            <span className="slider" style={{
                                                                position: 'absolute',
                                                                cursor: 'pointer',
                                                                top: 0, left: 0, right: 0, bottom: 0,
                                                                background: atleta.pagoAfiliacionAlDia ? 'var(--color-primary)' : 'var(--color-surface-hover)',
                                                                borderRadius: '34px',
                                                                transition: '.3s',
                                                                boxShadow: atleta.pagoAfiliacionAlDia ? '0 0 8px var(--color-primary-light)' : 'none'
                                                            }}>
                                                                <span style={{
                                                                    position: 'absolute',
                                                                    content: '""',
                                                                    height: '16px', width: '16px',
                                                                    left: atleta.pagoAfiliacionAlDia ? '26px' : '4px',
                                                                    bottom: '4px',
                                                                    background: 'white',
                                                                    borderRadius: '50%',
                                                                    transition: '.3s'
                                                                }}></span>
                                                            </span>
                                                        </label>
                                                    </td>
                                                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                        <button 
                                                            className="btn-admin-primary"
                                                            onClick={() => handleOpenRegistrar('AtletaAfiliacion', atleta.id, `${atleta.nombre} ${atleta.apellido}`)}
                                                            style={{
                                                                padding: '6px 12px',
                                                                fontSize: '0.8rem',
                                                                background: 'linear-gradient(135deg, #10B981, #059669)',
                                                                borderColor: 'transparent',
                                                                color: '#fff',
                                                                boxShadow: '0 4px 10px rgba(16, 185, 129, 0.2)'
                                                            }}
                                                        >
                                                            <Plus size={14} /> Registrar Recibo
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination Controls */}
                            {totalPagesAtletas > 1 && (
                                <div className="admin-pagination">
                                    <button 
                                        className="btn-pagination" 
                                        disabled={currentPageAtletas === 1} 
                                        onClick={() => setCurrentPageAtletas(p => Math.max(1, p - 1))}
                                    >
                                        Anterior
                                    </button>
                                    <span className="pagination-info">
                                        Página <strong>{currentPageAtletas}</strong> de {totalPagesAtletas}
                                    </span>
                                    <button 
                                        className="btn-pagination" 
                                        disabled={currentPageAtletas === totalPagesAtletas} 
                                        onClick={() => setCurrentPageAtletas(p => Math.min(totalPagesAtletas, p + 1))}
                                    >
                                        Siguiente
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* INSCRIPCIONES TAB */}
                    {activeTab === 'inscripciones' && (
                        <div>
                            {/* Search bar with Club Filter */}
                            <div className="search-bar-container mb-md" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                <div style={{ position: 'relative', flex: '2 1 300px' }}>
                                    <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-dim)' }} />
                                    <input 
                                        type="text" 
                                        placeholder="Buscar inscripción por atleta, club, evento..." 
                                        className="admin-input with-search-icon" 
                                        value={searchInscripcion}
                                        onChange={e => setSearchInscripcion(e.target.value)}
                                        style={{ paddingLeft: '2.5rem', width: '100%', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div style={{ position: 'relative', flex: '1 1 200px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Building2 size={18} style={{ color: 'var(--color-text-dim)', flexShrink: 0 }} />
                                    <select 
                                        className="admin-select"
                                        value={selectedClubFilterInscripciones}
                                        onChange={e => setSelectedClubFilterInscripciones(e.target.value)}
                                        style={{ width: '100%', padding: '0.6rem 1rem', fontSize: '0.9rem', borderRadius: '8px', border: '1px solid var(--color-surface-hover)', background: 'var(--color-surface)' }}
                                    >
                                        <option value="">Todos los Clubes</option>
                                        {uniqueClubsWithInscriptions.map(club => (
                                            <option key={club} value={club}>{club}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Panel de Controles Masivos (Todos y Por Clubes) */}
                            <div className="pagos-masivos-container">
                                {/* Lote Todo */}
                                <div className="pagos-masivos-card">
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                        <h4 className="pagos-masivos-title">
                                            <Calendar size={18} /> Master Switch (Todos)
                                        </h4>
                                        <p className="pagos-masivos-desc">
                                            Marcar todas las inscripciones como Pagadas o Impagas
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <span className="pagos-masivos-status" style={{ color: (inscripciones.length > 0 && inscripciones.every(i => i.pagado)) ? 'var(--color-success)' : 'var(--color-warning)' }}>
                                            {(inscripciones.length > 0 && inscripciones.every(i => i.pagado)) ? 'TODO PAGADO' : 'IMPAGO PENDIENTE'}
                                        </span>
                                        <label className="toggle-switch" style={{ display: 'inline-block', position: 'relative', width: '48px', height: '24px', cursor: 'pointer' }}>
                                            <input 
                                                type="checkbox" 
                                                disabled={inscripciones.length === 0}
                                                checked={inscripciones.length > 0 && inscripciones.every(i => i.pagado)} 
                                                onChange={async () => {
                                                    const currentAllPaid = inscripciones.length > 0 && inscripciones.every(i => i.pagado);
                                                    await handleBulkToggleInscripciones(inscripciones, !currentAllPaid);
                                                }}
                                                style={{ opacity: 0, width: 0, height: 0 }}
                                            />
                                            <span className="slider" style={{
                                                position: 'absolute',
                                                cursor: 'pointer',
                                                top: 0, left: 0, right: 0, bottom: 0,
                                                background: (inscripciones.length > 0 && inscripciones.every(i => i.pagado)) ? 'var(--color-primary)' : 'var(--color-surface-hover)',
                                                borderRadius: '34px',
                                                transition: '.3s',
                                                boxShadow: (inscripciones.length > 0 && inscripciones.every(i => i.pagado)) ? '0 0 8px var(--color-primary-light)' : 'none'
                                            }}>
                                                <span style={{
                                                    position: 'absolute',
                                                    content: '""',
                                                    height: '16px', width: '16px',
                                                    left: (inscripciones.length > 0 && inscripciones.every(i => i.pagado)) ? '26px' : '4px',
                                                    bottom: '4px',
                                                    background: 'white',
                                                    borderRadius: '50%',
                                                    transition: '.3s'
                                                }}></span>
                                            </span>
                                        </label>
                                    </div>
                                </div>

                                {/* Lote por Club */}
                                <div className="pagos-masivos-card">
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                                        <h4 className="pagos-masivos-title">
                                            <Building2 size={18} /> Switch por Club
                                        </h4>
                                        <select 
                                            className="admin-select"
                                            value={selectedClubForBulk}
                                            onChange={e => setSelectedClubForBulk(e.target.value)}
                                            style={{ padding: '6px 10px', fontSize: '0.85rem', width: '100%', borderRadius: '6px' }}
                                        >
                                            <option value="">Seleccionar Club...</option>
                                            {uniqueClubsWithInscriptions.map(club => (
                                                <option key={club} value={club}>{club}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1.5rem' }}>
                                        <span className="pagos-masivos-status" style={{ color: (selectedClubForBulk && inscripciones.filter(i => i.clubNombre === selectedClubForBulk).every(i => i.pagado)) ? 'var(--color-success)' : 'var(--color-warning)' }}>
                                            {(selectedClubForBulk && inscripciones.filter(i => i.clubNombre === selectedClubForBulk).every(i => i.pagado)) ? 'CLUB AL DÍA' : 'PENDIENTE'}
                                        </span>
                                        <label className="toggle-switch" style={{ display: 'inline-block', position: 'relative', width: '48px', height: '24px', cursor: selectedClubForBulk ? 'pointer' : 'not-allowed', opacity: selectedClubForBulk ? 1 : 0.5 }}>
                                            <input 
                                                type="checkbox" 
                                                disabled={!selectedClubForBulk}
                                                checked={selectedClubForBulk ? inscripciones.filter(i => i.clubNombre === selectedClubForBulk).every(i => i.pagado) : false} 
                                                onChange={async () => {
                                                    if (!selectedClubForBulk) return;
                                                    const targetInscripciones = inscripciones.filter(i => i.clubNombre === selectedClubForBulk);
                                                    const currentClubPaid = targetInscripciones.every(i => i.pagado);
                                                    await handleBulkToggleInscripciones(targetInscripciones, !currentClubPaid);
                                                }}
                                                style={{ opacity: 0, width: 0, height: 0 }}
                                            />
                                            <span className="slider" style={{
                                                position: 'absolute',
                                                cursor: selectedClubForBulk ? 'pointer' : 'not-allowed',
                                                top: 0, left: 0, right: 0, bottom: 0,
                                                background: (selectedClubForBulk && inscripciones.filter(i => i.clubNombre === selectedClubForBulk).every(i => i.pagado)) ? 'var(--color-primary)' : 'var(--color-surface-hover)',
                                                borderRadius: '34px',
                                                transition: '.3s',
                                                boxShadow: (selectedClubForBulk && inscripciones.filter(i => i.clubNombre === selectedClubForBulk).every(i => i.pagado)) ? '0 0 8px var(--color-primary-light)' : 'none'
                                            }}>
                                                <span style={{
                                                    position: 'absolute',
                                                    content: '""',
                                                    height: '16px', width: '16px',
                                                    left: (selectedClubForBulk && inscripciones.filter(i => i.clubNombre === selectedClubForBulk).every(i => i.pagado)) ? '26px' : '4px',
                                                    bottom: '4px',
                                                    background: 'white',
                                                    borderRadius: '50%',
                                                    transition: '.3s'
                                                }}></span>
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="admin-grid-card glass-effect" style={{ overflowX: 'auto', borderRadius: '16px', marginBottom: '1.5rem' }}>
                                <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--color-surface-hover)', textAlign: 'left' }}>
                                            <th style={{ padding: '1rem' }}>Competidor</th>
                                            <th style={{ padding: '1rem' }}>Regata / Categoría</th>
                                            <th style={{ padding: '1rem' }}>Estado Pago</th>
                                            <th style={{ padding: '1rem' }}>Interruptor Rápido</th>
                                            <th style={{ padding: '1rem', textAlign: 'center' }}>Registrar Cobro</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredInscripciones.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-secondary)' }}>
                                                    No se encontraron inscripciones impagas.
                                                </td>
                                            </tr>
                                        ) : (
                                            paginatedInscripciones.map(ins => (
                                                <tr key={ins.id} style={{ borderBottom: '1px solid var(--color-surface-hover)' }}>
                                                    <td style={{ padding: '1rem' }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                            <strong>{ins.participanteNombreCompleto || 'Tripulación Colectiva'}</strong>
                                                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>Club: {ins.clubNombre}</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '1rem' }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                            <strong>{ins.eventoNombre || 'Evento'}</strong>
                                                            <span style={{ fontSize: '0.75rem', color: 'var(--color-primary-light)' }}>Dorsal: #{ins.numeroCompetidor || 'PENDIENTE'}</span>
                                                        </div>
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
                                                            {ins.pagado ? 'Pagado' : 'Impago'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '1rem' }}>
                                                        <label className="toggle-switch" style={{ display: 'inline-block', position: 'relative', width: '48px', height: '24px', cursor: 'pointer' }}>
                                                            <input 
                                                                type="checkbox" 
                                                                checked={ins.pagado} 
                                                                onChange={() => handleToggleInscripcion(ins.id, ins.pagado)}
                                                                style={{ opacity: 0, width: 0, height: 0 }}
                                                            />
                                                            <span className="slider" style={{
                                                                position: 'absolute',
                                                                cursor: 'pointer',
                                                                top: 0, left: 0, right: 0, bottom: 0,
                                                                background: ins.pagado ? 'var(--color-primary)' : 'var(--color-surface-hover)',
                                                                borderRadius: '34px',
                                                                transition: '.3s',
                                                                boxShadow: ins.pagado ? '0 0 8px var(--color-primary-light)' : 'none'
                                                            }}>
                                                                <span style={{
                                                                    position: 'absolute',
                                                                    content: '""',
                                                                    height: '16px', width: '16px',
                                                                    left: ins.pagado ? '26px' : '4px',
                                                                    bottom: '4px',
                                                                    background: 'white',
                                                                    borderRadius: '50%',
                                                                    transition: '.3s'
                                                                }}></span>
                                                            </span>
                                                        </label>
                                                    </td>
                                                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                        <button 
                                                            className="btn-admin-primary"
                                                            onClick={() => handleOpenRegistrar('InscripcionEvento', ins.id, `${ins.participanteNombreCompleto || 'Atleta'} - Dorsal ${ins.numeroCompetidor || ''}`)}
                                                            style={{
                                                                padding: '6px 12px',
                                                                fontSize: '0.8rem',
                                                                background: 'linear-gradient(135deg, #10B981, #059669)',
                                                                borderColor: 'transparent',
                                                                color: '#fff',
                                                                boxShadow: '0 4px 10px rgba(16, 185, 129, 0.2)'
                                                            }}
                                                        >
                                                            <Plus size={14} /> Registrar Recibo
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination Controls */}
                            {totalPagesInscripciones > 1 && (
                                <div className="admin-pagination">
                                    <button 
                                        className="btn-pagination" 
                                        disabled={currentPageInscripciones === 1} 
                                        onClick={() => setCurrentPageInscripciones(p => Math.max(1, p - 1))}
                                    >
                                        Anterior
                                    </button>
                                    <span className="pagination-info">
                                        Página <strong>{currentPageInscripciones}</strong> de {totalPagesInscripciones}
                                    </span>
                                    <button 
                                        className="btn-pagination" 
                                        disabled={currentPageInscripciones === totalPagesInscripciones} 
                                        onClick={() => setCurrentPageInscripciones(p => Math.min(totalPagesInscripciones, p + 1))}
                                    >
                                        Siguiente
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                    {/* HISTORIAL TAB */}
                    {activeTab === 'historial' && (
                        <div>
                            {/* Search bar */}
                            <div className="search-bar-container mb-md" style={{ display: 'flex', gap: '1rem' }}>
                                <div style={{ position: 'relative', flex: 1 }}>
                                    <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-dim)' }} />
                                    <input 
                                        type="text" 
                                        placeholder="Buscar por referencia, beneficiario, tipo..." 
                                        className="admin-input with-search-icon" 
                                        value={searchHistorial}
                                        onChange={e => setSearchHistorial(e.target.value)}
                                        style={{ paddingLeft: '2.5rem', width: '100%', boxSizing: 'border-box' }}
                                    />
                                </div>
                            </div>

                            <div className="admin-grid-card glass-effect" style={{ overflowX: 'auto', borderRadius: '16px' }}>
                                <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--color-surface-hover)', textAlign: 'left' }}>
                                            <th style={{ padding: '1rem' }}>Fecha</th>
                                            <th style={{ padding: '1rem' }}>Tipo</th>
                                            <th style={{ padding: '1rem' }}>Destino / Beneficiario</th>
                                            <th style={{ padding: '1rem' }}>Monto ($)</th>
                                            <th style={{ padding: '1rem' }}>Referencia</th>
                                            <th style={{ padding: '1rem' }}>Auditor</th>
                                            <th style={{ padding: '1rem' }}>Notas</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredHistorial.length === 0 ? (
                                            <tr>
                                                <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-secondary)' }}>
                                                    Aún no hay transacciones en el Libro Diario.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredHistorial.map(pago => (
                                                <tr key={pago.id} style={{ borderBottom: '1px solid var(--color-surface-hover)' }}>
                                                    <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                                                        {new Date(pago.fechaPago).toLocaleString('es-AR')}
                                                    </td>
                                                    <td style={{ padding: '1rem' }}>
                                                        <span className={`badge-pill pago-tipo-${pago.tipoPago}`} style={{
                                                            fontSize: '0.75rem',
                                                            fontWeight: 700,
                                                            padding: '2px 8px',
                                                            borderRadius: '6px'
                                                        }}>
                                                            {pago.tipoPago === 'ClubAfiliacion' ? 'Club' : pago.tipoPago === 'AtletaAfiliacion' ? 'Atleta' : 'Regata'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '1rem' }}>
                                                        <strong>
                                                            {pago.tipoPago === 'ClubAfiliacion' ? pago.clubNombre :
                                                             pago.tipoPago === 'AtletaAfiliacion' ? pago.participanteNombre :
                                                             `${pago.eventoNombre || 'Evento'} (${pago.participanteNombre || 'Atleta'})`}
                                                        </strong>
                                                    </td>
                                                    <td style={{ padding: '1rem', color: 'var(--color-success)', fontWeight: 800 }}>
                                                        ${pago.monto.toLocaleString()}
                                                    </td>
                                                    <td style={{ padding: '1rem' }}>
                                                        <span style={{ fontFamily: 'monospace', background: 'var(--color-surface-hover)', padding: '2px 6px', borderRadius: '4px' }}>
                                                            {pago.referencia}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '1rem' }}>
                                                        <span className="user-pill">{pago.registradoPor || 'System'}</span>
                                                    </td>
                                                    <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--color-text-dim)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={pago.notas}>
                                                        {pago.notas || '-'}
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

            {/* Modal de Registro de Pago */}
            <RegistrarPagoModal 
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSubmit={handleConfirmPago}
                paymentType={modalData.paymentType}
                entityId={modalData.entityId}
                entityName={modalData.entityName}
            />
        </div>
    );
};

export default GestionPagosSection;
