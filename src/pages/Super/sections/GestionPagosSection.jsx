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
    Plus,
    ChevronDown,
    ChevronUp,
    MapPin
} from 'lucide-react';
import api from '../../../services/api';
import { ENDPOINTS } from '../../../utils/constants';
import PagoService from '../../../services/PagoService';
import EventoService from '../../../services/EventoService';
import RegistrarPagoModal from '../../../components/SharedSections/RegistrarPagoModal';
import { useAlert } from '../../../hooks/useAlert';
import { useAuth } from '../../../context/AuthContext';
import {
    getUserFederationId,
    filterClubesByFederation,
    getClubIdsForFederation,
    getClubFederationName,
} from '../../../utils/apiHelpers';
import { getUserFacingError } from '../../../utils/userFacingError';
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
    const nombre = (ins.participanteNombreCompleto || 'Tripulación Colectiva').trim().toLowerCase();
    const club = (ins.clubNombre || '').trim().toLowerCase();
    return `n-${nombre}|${club}`;
};

const agruparAtletasPorInscripciones = (lista = []) => {
    const map = new Map();
    lista.forEach((ins) => {
        const key = atletaInscripcionKey(ins);
        if (!map.has(key)) {
            map.set(key, {
                key,
                participanteId: ins.participanteId ?? ins.ParticipanteId ?? null,
                nombre: ins.participanteNombreCompleto || 'Tripulación Colectiva',
                clubNombre: ins.clubNombre || '',
                inscripciones: [],
            });
        }
        map.get(key).inscripciones.push(ins);
    });

    return Array.from(map.values())
        .map((row) => {
            const pruebas = [...new Set(row.inscripciones.map((i) => i.pruebaNombre).filter(Boolean))];
            return {
                ...row,
                pagado: row.inscripciones.length > 0 && row.inscripciones.every((i) => i.pagado),
                pruebasCount: pruebas.length || row.inscripciones.length,
                representativa: row.inscripciones[0],
            };
        })
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
};

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
    const [eventos, setEventos] = useState([]);
    const [historial, setHistorial] = useState([]);
    const [collapsedEventos, setCollapsedEventos] = useState(() => new Set());

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
    const itemsPerPage = 9;

    useEffect(() => {
        setCurrentPageAtletas(1);
    }, [searchAtleta, selectedClubFilterAtletas]);

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
                loadEventos(),
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
        const role = user?.rol?.trim().toLowerCase();
        const fedId = getUserFederationId(user);
        if (role === 'admin' && fedId) {
            setClubes(filterClubesByFederation(res.data, fedId));
        } else {
            setClubes(res.data);
        }
    };

    const loadAtletas = async () => {
        const res = await api.get(ENDPOINTS.PARTICIPANTES.BASE);
        const role = user?.rol?.trim().toLowerCase();
        const fedId = getUserFederationId(user);
        if (role === 'admin' && fedId) {
            const resClubes = await api.get(ENDPOINTS.CLUBES);
            const affiliatedClubIds = getClubIdsForFederation(resClubes.data, fedId);
            setAtletas(res.data.filter(a => affiliatedClubIds.includes(a.clubId)));
        } else {
            setAtletas(res.data);
        }
    };

    const loadInscripciones = async () => {
        const res = await api.get(ENDPOINTS.INSCRIPCIONES.BASE);
        const role = user?.rol?.trim().toLowerCase();
        const fedId = getUserFederationId(user);
        if (role === 'admin' && fedId) {
            const resClubes = await api.get(ENDPOINTS.CLUBES);
            const affiliatedClubIds = getClubIdsForFederation(resClubes.data, fedId);

            const clubNameToId = {};
            resClubes.data.forEach(c => {
                if (c.nombre) {
                    clubNameToId[c.nombre.toLowerCase().trim()] = c.id;
                }
            });

            setInscripciones(res.data.filter(i => {
                const clubName = i.clubNombre?.toLowerCase().trim();
                const clubId = clubNameToId[clubName];
                return affiliatedClubIds.includes(clubId);
            }));
        } else {
            setInscripciones(res.data);
        }
    };

    const loadEventos = async () => {
        try {
            const role = user?.rol?.trim().toLowerCase();
            const fedId = getUserFederationId(user);
            const data = (role === 'admin' && fedId)
                ? await EventoService.getAll(fedId, { asFederation: true })
                : await EventoService.getAll();
            setEventos(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error loading events for payment grouping:', err);
            setEventos([]);
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

    const handleBulkToggleInscripciones = async (targetInscripciones, targetStatus) => {
        if (!targetInscripciones || targetInscripciones.length === 0) {
            showAlert('warning', 'No hay inscripciones para actualizar.');
            return;
        }

        const uniquePorAtletaEvento = [];
        const seen = new Set();
        targetInscripciones.forEach((ins) => {
            const eventoKey = ins.eventoId ?? ins.eventoNombre ?? '';
            const key = `${eventoKey}|${atletaInscripcionKey(ins)}`;
            if (seen.has(key)) return;
            seen.add(key);
            uniquePorAtletaEvento.push(ins);
        });

        setLoading(true);
        try {
            await Promise.all(
                uniquePorAtletaEvento.map(ins => PagoService.toggleInscripcionStatus(ins.id, targetStatus))
            );
            showAlert('success', `Se actualizaron ${uniquePorAtletaEvento.length} inscripción(es) al evento.`);
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
            showAlert('error', getUserFacingError(err, 'No se pudo registrar el pago.'));
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
        const estadoPorAtletaEvento = new Map();
        inscripciones.forEach((i) => {
            const eventoKey = i.eventoId ?? i.eventoNombre ?? 'evento';
            const key = `${eventoKey}|${atletaInscripcionKey(i)}`;
            if (!estadoPorAtletaEvento.has(key)) estadoPorAtletaEvento.set(key, true);
            if (!i.pagado) estadoPorAtletaEvento.set(key, false);
        });
        return Array.from(estadoPorAtletaEvento.values()).filter((pagado) => !pagado).length;
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
                (i.eventoNombre && i.eventoNombre.toLowerCase().includes(searchInscripcion.toLowerCase())) ||
                (i.pruebaNombre && i.pruebaNombre.toLowerCase().includes(searchInscripcion.toLowerCase()));
            return matchesClub && matchesSearch;
        });
    }, [inscripciones, selectedClubFilterInscripciones, searchInscripcion]);

    const inscripcionesPorEvento = React.useMemo(() => {
        const eventosById = new Map();
        const eventosByNombre = new Map();
        eventos.forEach((ev) => {
            const id = ev.id ?? ev.Id;
            const nombre = (ev.nombre ?? ev.Nombre ?? '').trim();
            const fecha = ev.fecha ?? ev.Fecha ?? ev.fechaInicio ?? ev.FechaInicio;
            const catalog = {
                id,
                nombre,
                fecha,
                ubicacion: ev.ubicacion ?? ev.Ubicacion ?? null,
            };
            if (id != null) eventosById.set(Number(id), catalog);
            if (nombre) eventosByNombre.set(nombre.toLowerCase(), catalog);
        });

        const groups = new Map();
        filteredInscripciones.forEach((ins) => {
            const nombre = (ins.eventoNombre || 'Evento sin nombre').trim();
            const eventoIdRaw = ins.eventoId ?? ins.EventoId;
            const catalog = (eventoIdRaw != null ? eventosById.get(Number(eventoIdRaw)) : null)
                || eventosByNombre.get(nombre.toLowerCase())
                || null;
            const eventoId = eventoIdRaw ?? catalog?.id ?? null;
            const key = eventoId != null ? `id-${eventoId}` : `nombre-${nombre.toLowerCase()}`;

            if (!groups.has(key)) {
                groups.set(key, {
                    key,
                    eventoId,
                    nombre: catalog?.nombre || nombre,
                    fecha: ins.fechaEvento || ins.fechaInicioEvento || catalog?.fecha || null,
                    ubicacion: catalog?.ubicacion || null,
                    inscripciones: [],
                });
            }

            const group = groups.get(key);
            group.inscripciones.push(ins);
            const insFecha = ins.fechaEvento || ins.fechaInicioEvento;
            if (insFecha) group.fecha = insFecha;
            else if (!group.fecha && catalog?.fecha) group.fecha = catalog.fecha;
        });

        return Array.from(groups.values())
            .map((group) => ({
                ...group,
                atletas: agruparAtletasPorInscripciones(group.inscripciones),
            }))
            .sort((a, b) => {
                const diff = parseFechaMs(b.fecha) - parseFechaMs(a.fecha);
                if (diff !== 0) return diff;
                return a.nombre.localeCompare(b.nombre, 'es');
            });
    }, [filteredInscripciones, eventos]);

    const toggleEventoCollapsed = (key) => {
        setCollapsedEventos((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    // Atletas Pagination
    const totalPagesAtletas = Math.max(1, Math.ceil(filteredAtletas.length / itemsPerPage));
    const paginatedAtletas = React.useMemo(() => {
        const start = (currentPageAtletas - 1) * itemsPerPage;
        return filteredAtletas.slice(start, start + itemsPerPage);
    }, [filteredAtletas, currentPageAtletas]);

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
                        Gestione afiliaciones de clubes, atletas e inscripciones a eventos sin pasarelas externas.
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
                        <p>Inscripciones Impagas</p>
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
                    <Calendar size={18} /> Inscripciones a Eventos
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
                                            <th style={{ padding: '1rem' }}>Federación</th>
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
                                                        {getClubFederationName(club) || <span style={{ color: 'var(--color-accent-orange)', fontWeight: 600 }}>Sin federación</span>}
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
                                        placeholder="Buscar inscripción por atleta, club o evento..." 
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
                                            Marcar todas las inscripciones a eventos como Pagadas o Impagas
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

                            {inscripcionesPorEvento.length === 0 ? (
                                <div className="admin-grid-card glass-effect pagos-evento-empty">
                                    No se encontraron inscripciones.
                                </div>
                            ) : (
                                <div className="pagos-eventos-list">
                                    {inscripcionesPorEvento.map((grupo) => {
                                        const isCollapsed = collapsedEventos.has(grupo.key);
                                        const pagadas = grupo.atletas.filter(a => a.pagado).length;
                                        const pendientes = grupo.atletas.length - pagadas;
                                        const allPaid = grupo.atletas.length > 0 && pendientes === 0;
                                        const fechaLabel = formatFechaEvento(grupo.fecha);

                                        return (
                                            <article key={grupo.key} className="pagos-evento-card glass-effect">
                                                <header className="pagos-evento-card-header">
                                                    <button
                                                        type="button"
                                                        className="pagos-evento-card-toggle"
                                                        onClick={() => toggleEventoCollapsed(grupo.key)}
                                                        aria-expanded={!isCollapsed}
                                                    >
                                                        <span className="pagos-evento-card-title-wrap">
                                                            <span className="pagos-evento-card-icon">
                                                                <Calendar size={18} />
                                                            </span>
                                                            <span>
                                                                <h3 className="pagos-evento-card-title">{grupo.nombre}</h3>
                                                                <span className="pagos-evento-card-meta">
                                                                    {fechaLabel && (
                                                                        <span>
                                                                            <Calendar size={12} /> {fechaLabel}
                                                                        </span>
                                                                    )}
                                                                    {grupo.ubicacion && (
                                                                        <span>
                                                                            <MapPin size={12} /> {grupo.ubicacion}
                                                                        </span>
                                                                    )}
                                                                </span>
                                                            </span>
                                                        </span>
                                                        {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                                                    </button>

                                                    <div className="pagos-evento-card-aside">
                                                        <span className="pagos-evento-stat">
                                                            {grupo.atletas.length} insc.
                                                        </span>
                                                        <span className="pagos-evento-stat is-success">
                                                            {pagadas} pagadas
                                                        </span>
                                                        <span className={`pagos-evento-stat ${pendientes > 0 ? 'is-warning' : 'is-success'}`}>
                                                            {pendientes > 0 ? `${pendientes} impagas` : 'Al día'}
                                                        </span>
                                                        <label
                                                            className="toggle-switch"
                                                            title="Marcar todas las inscripciones de este evento"
                                                            onClick={(e) => e.stopPropagation()}
                                                            style={{ display: 'inline-block', position: 'relative', width: '48px', height: '24px', cursor: 'pointer' }}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={allPaid}
                                                                onChange={() => handleBulkToggleInscripciones(grupo.inscripciones, !allPaid)}
                                                                style={{ opacity: 0, width: 0, height: 0 }}
                                                            />
                                                            <span className="slider" style={{
                                                                position: 'absolute',
                                                                cursor: 'pointer',
                                                                top: 0, left: 0, right: 0, bottom: 0,
                                                                background: allPaid ? 'var(--color-primary)' : 'var(--color-surface-hover)',
                                                                borderRadius: '34px',
                                                                transition: '.3s',
                                                                boxShadow: allPaid ? '0 0 8px var(--color-primary-light)' : 'none'
                                                            }}>
                                                                <span style={{
                                                                    position: 'absolute',
                                                                    height: '16px', width: '16px',
                                                                    left: allPaid ? '26px' : '4px',
                                                                    bottom: '4px',
                                                                    background: 'white',
                                                                    borderRadius: '50%',
                                                                    transition: '.3s'
                                                                }}></span>
                                                            </span>
                                                        </label>
                                                    </div>
                                                </header>

                                                {!isCollapsed && (
                                                    <div className="pagos-evento-card-body">
                                                        <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                            <thead>
                                                                <tr style={{ borderBottom: '1px solid var(--color-surface-hover)', textAlign: 'left' }}>
                                                                    <th style={{ padding: '0.85rem 1rem' }}>Atleta</th>
                                                                    <th style={{ padding: '0.85rem 1rem' }}>Pruebas</th>
                                                                    <th style={{ padding: '0.85rem 1rem' }}>Estado Pago</th>
                                                                    <th style={{ padding: '0.85rem 1rem' }}>Interruptor</th>
                                                                    <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Registrar Cobro</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {grupo.atletas.map(atleta => (
                                                                    <tr key={atleta.key} style={{ borderBottom: '1px solid var(--color-surface-hover)' }}>
                                                                        <td style={{ padding: '0.85rem 1rem' }}>
                                                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                                <strong>{atleta.nombre}</strong>
                                                                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>Club: {atleta.clubNombre || '—'}</span>
                                                                            </div>
                                                                        </td>
                                                                        <td style={{ padding: '0.85rem 1rem' }}>
                                                                            <strong>{atleta.pruebasCount} {atleta.pruebasCount === 1 ? 'prueba' : 'pruebas'}</strong>
                                                                        </td>
                                                                        <td style={{ padding: '0.85rem 1rem' }}>
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
                                                                                {atleta.pagado ? 'Pagado' : 'Impago'}
                                                                            </span>
                                                                        </td>
                                                                        <td style={{ padding: '0.85rem 1rem' }}>
                                                                            <label className="toggle-switch" style={{ display: 'inline-block', position: 'relative', width: '48px', height: '24px', cursor: 'pointer' }}>
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={atleta.pagado}
                                                                                    onChange={() => handleBulkToggleInscripciones(atleta.inscripciones, !atleta.pagado)}
                                                                                    style={{ opacity: 0, width: 0, height: 0 }}
                                                                                />
                                                                                <span className="slider" style={{
                                                                                    position: 'absolute',
                                                                                    cursor: 'pointer',
                                                                                    top: 0, left: 0, right: 0, bottom: 0,
                                                                                    background: atleta.pagado ? 'var(--color-primary)' : 'var(--color-surface-hover)',
                                                                                    borderRadius: '34px',
                                                                                    transition: '.3s',
                                                                                    boxShadow: atleta.pagado ? '0 0 8px var(--color-primary-light)' : 'none'
                                                                                }}>
                                                                                    <span style={{
                                                                                        position: 'absolute',
                                                                                        height: '16px', width: '16px',
                                                                                        left: atleta.pagado ? '26px' : '4px',
                                                                                        bottom: '4px',
                                                                                        background: 'white',
                                                                                        borderRadius: '50%',
                                                                                        transition: '.3s'
                                                                                    }}></span>
                                                                                </span>
                                                                            </label>
                                                                        </td>
                                                                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                                                                            <button
                                                                                className="btn-admin-primary"
                                                                                onClick={() => handleOpenRegistrar(
                                                                                    'InscripcionEvento',
                                                                                    atleta.representativa.id,
                                                                                    `${atleta.nombre} — ${grupo.nombre}`
                                                                                )}
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
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </article>
                                        );
                                    })}
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
