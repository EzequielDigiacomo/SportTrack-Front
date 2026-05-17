import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SaaSService from '../../../services/SaaSService';
import { 
    Cloud, 
    Plus,
    Users,
    Shield,
    Calendar,
    Check,
    Settings,
    ArrowRight,
    Search,
    BarChart3,
    Edit3,
    X,
    Trash2,
    Info,
    Mail,
    Phone,
    MapPin,
    XCircle,
    Building2,
    Power,
    UserCircle,
    Lock,
    Activity,
    Eye,
    EyeOff
} from 'lucide-react';
import './SaaSManagement.css';

const SaaSManagement = () => {
    const navigate = useNavigate();
    const [planes, setPlanes] = useState([]);
    const [clubesStatus, setClubesStatus] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingStatus, setLoadingStatus] = useState(true);
    const [asignandoPlanId, setAsignandoPlanId] = useState(null);
    const [selectedFedId, setSelectedFedId] = useState(null);
    const [filter, setFilter] = useState('');
    
    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        nombre: '',
        sigla: '',
        email: '',
        telefono: '',
        direccion: '',
        ubicacion: '',
        activo: true,
        frecuenciaPago: 'Mensual',
        fechaAltaPlan: '',
        fechaVencimientoPlan: '',
        bloqueadoPorFaltaDePago: false,
        adminUsername: '',
        adminEmail: '',
        adminPassword: ''
    });
    const [showPassword, setShowPassword] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        setLoadingStatus(true);
        try {
            const [planesData, clubesData] = await Promise.all([
                SaaSService.getPlanes(),
                SaaSService.getClubesStatus()
            ]);
            
            const planesMapeados = planesData.map(p => {
                let color = 'var(--color-text-secondary)';
                const nombre = p.nombre.toLowerCase();
                if (nombre.includes('oro')) color = '#FFD700';
                if (nombre.includes('plata')) color = '#E0E0E0';
                if (nombre.includes('bronce')) color = '#CD7F32';
                return { ...p, color };
            });
            
            setPlanes(planesMapeados);
            setClubesStatus(clubesData);
        } catch (error) {
            console.error("Error fetching SaaS data:", error);
        } finally {
            setLoading(false);
            setLoadingStatus(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAsignarPlan = async (clubId, planId) => {
        setAsignandoPlanId(clubId);
        try {
            await SaaSService.asignarPlan(clubId, planId);
            await fetchData();
        } catch (err) {
            console.error("Error al asignar plan", err);
        } finally {
            setAsignandoPlanId(null);
        }
    };

    const handleToggleActivo = async (clubId) => {
        try {
            await SaaSService.toggleClubActivo(clubId);
            await fetchData();
        } catch (err) {
            console.error("Error al cambiar estado", err);
        }
    };

    const handleOpenCreate = () => {
        setIsEditing(false);
        setFormData({ 
            nombre: '', sigla: '', email: '', telefono: '', direccion: '', ubicacion: '', activo: true,
            frecuenciaPago: 'Mensual', fechaAltaPlan: '', fechaVencimientoPlan: '', bloqueadoPorFaltaDePago: false,
            adminUsername: '', adminEmail: '', adminPassword: ''
        });
        setShowPassword(false);
        setShowModal(true);
    };

    const handleOpenEdit = (fed) => {
        setIsEditing(true);
        setFormData({
            nombre: fed.clubNombre,
            sigla: fed.sigla || '',
            email: fed.email || '',
            telefono: fed.telefono || '',
            direccion: fed.direccion || '',
            ubicacion: fed.ubicacion || '',
            activo: fed.activo,
            frecuenciaPago: fed.frecuenciaPago || 'Mensual',
            fechaAltaPlan: fed.fechaAltaPlan ? fed.fechaAltaPlan.split('T')[0] : '',
            fechaVencimientoPlan: fed.fechaVencimientoPlan ? fed.fechaVencimientoPlan.split('T')[0] : '',
            bloqueadoPorFaltaDePago: fed.bloqueadoPorFaltaDePago || false,
            adminUsername: '', // No se edita por aquí por seguridad
            adminPassword: ''
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                // Para editar solo enviamos los datos del club
                const { adminUsername, adminPassword, ...clubData } = formData;
                await SaaSService.updateFederacion(selectedFedId, clubData);
            } else {
                await SaaSService.createFederacion(formData);
            }
            setShowModal(false);
            await fetchData();
        } catch (err) {
            console.error("Error saving federation", err);
            const errorMsg = err.response?.data?.message || "Error desconocido al guardar la federación.";
            alert(errorMsg);
        }
    };

    const handleDelete = async () => {
        if (window.confirm("¿Estás seguro de eliminar esta federación? Se perderán todos sus datos asociados.")) {
            try {
                await SaaSService.deleteFederacion(selectedFedId);
                setSelectedFedId(null);
                await fetchData();
            } catch (err) {
                console.error("Error deleting federation", err);
            }
        }
    };

    const selectedFed = clubesStatus.find(f => f.clubId === selectedFedId);

    const filteredFederaciones = clubesStatus.filter(f => 
        f.clubNombre.toLowerCase().includes(filter.toLowerCase())
    );

    const ProgressBar = ({ current, max, label }) => {
        const percentage = max === -1 ? 5 : Math.min(100, (current / max) * 100);
        const isFull = max !== -1 && current >= max;
        const isWarning = max !== -1 && current >= max * 0.9;
        
        return (
            <div className="saas-progress-item">
                <div className="progress-info">
                    <span className="label">{label}</span>
                    <span className="values">{current} / {max === -1 ? '∞' : max}</span>
                </div>
                <div className="progress-track">
                    <div 
                        className={`progress-fill ${isFull ? 'bg-danger' : isWarning ? 'bg-warning' : 'bg-success'}`}
                        style={{ width: `${percentage}%` }}
                    />
                </div>
            </div>
        );
    };

    return (
        <div className="saas-management fade-in">
            {/* Header */}
            <div className="section-header-row mb-3">
                <div className="title-group">
                    <h2><Cloud size={24} /> Panel de Suscripciones SaaS</h2>
                    <p className="section-desc">Administración central de federaciones y clubes afiliados.</p>
                </div>
                <div className="header-actions">
                    <button className="btn-admin-primary" onClick={handleOpenCreate}>
                        <Plus size={16} /> Nueva Federación
                    </button>
                </div>
            </div>

            <div className="saas-main-layout">
                {/* Mobile View */}
                <div className="saas-mobile-list">
                    {loadingStatus ? (
                        <div className="loader-row"><div className="loader"></div></div>
                    ) : filteredFederaciones.map(fed => {
                        const planColor = planes.find(p => p.id === fed.planSaaSId)?.color;
                        return (
                            <div 
                                key={fed.clubId} 
                                className={`admin-native-card glass-effect mb-sm ${selectedFedId === fed.clubId ? 'is-selected' : ''}`}
                                onClick={() => setSelectedFedId(fed.clubId)}
                            >
                                <div className="card-accent-bar" style={{ background: planColor || 'var(--color-primary)' }} />
                                <div className="card-content">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <h4>{fed.clubNombre}</h4>
                                        <ArrowRight size={16} className="text-muted" />
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                                        <span className="fed-plan-badge" data-plan={fed.planNombre?.toLowerCase()}>
                                            {fed.planNombre}
                                        </span>
                                        {fed.planAlDia ? (
                                            <span className="badge success">Al día</span>
                                        ) : (
                                            <span className="badge danger">Excedido</span>
                                        )}
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        <p style={{ margin: 0 }}><Users size={14} className="text-primary" /> <strong>{fed.atletasRegistrados}</strong> Atletas</p>
                                        <p style={{ margin: 0 }}><Building2 size={14} className="text-secondary" /> <strong>{fed.clubesAfiliadosCount}</strong> Clubes</p>
                                    </div>
                                </div>
                                <div className="card-actions-row">
                                    <button 
                                        className={`btn-quick-toggle ${fed.activo ? 'is-active' : 'is-suspended'}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleToggleActivo(fed.clubId);
                                        }}
                                        style={{
                                            backgroundColor: fed.activo ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                            color: fed.activo ? '#10B981' : '#EF4444',
                                            border: `1px solid ${fed.activo ? '#10B98166' : '#EF444466'}`,
                                            borderRadius: '6px', padding: '6px 12px', fontSize: '0.75rem', fontWeight: '700'
                                        }}
                                    >
                                        <Power size={14} style={{ marginRight: '6px' }} />
                                        {fed.activo ? 'ACTIVA' : 'SUSPENDIDA'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Desktop View Table */}
                <div className={`saas-list-container saas-desktop-table glass-effect ${selectedFedId ? 'has-selection' : ''}`}>
                    <div className="list-toolbar">
                        <div className="search-box-saas glass-effect">
                            <Search size={18} />
                            <input 
                                type="text" 
                                placeholder="Buscar federación..." 
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="table-responsive">
                        <table className="saas-admin-table">
                            <thead>
                                <tr>
                                    <th>Federación</th>
                                    <th>Plan</th>
                                    <th>Estado</th>
                                    <th className="text-center">Atletas</th>
                                    <th className="text-center">Clubes</th>
                                    <th>Suscripción / Vence</th>
                                    <th className="text-center">Acceso</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {loadingStatus ? (
                                    <tr><td colSpan="8"><div className="loader-row"><div className="loader"></div></div></td></tr>
                                ) : filteredFederaciones.map(fed => {
                                    const planColor = planes.find(p => p.id === fed.planSaaSId)?.color;
                                    return (
                                        <tr 
                                            key={fed.clubId} 
                                            className={`${selectedFedId === fed.clubId ? 'is-selected' : ''} ${!fed.planAlDia ? 'row-warning' : ''}`}
                                            onClick={() => setSelectedFedId(fed.clubId)}
                                        >
                                            <td data-label="Federación">
                                                <div className="fed-cell-name">
                                                    <div className={`status-dot ${fed.activo ? 'active' : 'inactive'}`} />
                                                    <span>{fed.clubNombre}</span>
                                                </div>
                                            </td>
                                            <td data-label="Plan">
                                                <span className="fed-plan-badge" data-plan={fed.planNombre?.toLowerCase()}>
                                                    {fed.planNombre}
                                                </span>
                                            </td>
                                            <td data-label="Estado" style={{ whiteSpace: 'nowrap', minWidth: '100px' }}>
                                                {fed.planAlDia ? (
                                                    <span className="badge success">Al día</span>
                                                ) : (
                                                    <span className="badge danger">Excedido</span>
                                                )}
                                            </td>
                                            <td data-label="Atletas" className="text-center font-bold">{fed.atletasRegistrados}</td>
                                            <td data-label="Clubes" className="text-center">
                                                <span className="club-count-badge">
                                                    {fed.clubesAfiliadosCount}
                                                </span>
                                            </td>
                                            <td data-label="Suscripción / Vence">
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <span className="badge" style={{
                                                        padding: '2px 8px',
                                                        fontSize: '0.65rem',
                                                        backgroundColor: fed.bloqueadoPorFaltaDePago ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                                        color: fed.bloqueadoPorFaltaDePago ? '#EF4444' : '#10B981',
                                                        border: `1px solid ${fed.bloqueadoPorFaltaDePago ? '#EF4444' : '#10B981'}`,
                                                        borderRadius: '4px',
                                                        width: 'fit-content',
                                                        fontWeight: 'bold'
                                                    }}>
                                                        {fed.bloqueadoPorFaltaDePago ? 'Bloqueado 🛑' : (fed.frecuenciaPago || 'Mensual')}
                                                    </span>
                                                    {fed.fechaVencimientoPlan ? (
                                                        <span style={{ 
                                                            fontSize: '0.75rem', 
                                                            fontWeight: '500',
                                                            color: new Date(fed.fechaVencimientoPlan) < new Date() ? '#EF4444' : 'var(--color-text-secondary)' 
                                                        }}>
                                                            Vence: {new Date(fed.fechaVencimientoPlan).toLocaleDateString()}
                                                        </span>
                                                    ) : (
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>Sin fecha</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td data-label="Acceso" className="text-center">
                                                <button 
                                                    className={`btn-quick-toggle ${fed.activo ? 'is-active' : 'is-suspended'}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleToggleActivo(fed.clubId);
                                                    }}
                                                    title={fed.activo ? 'Suspender acceso' : 'Habilitar acceso'}
                                                    style={{
                                                        backgroundColor: fed.activo ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                        color: fed.activo ? '#10B981' : '#EF4444',
                                                        border: `1px solid ${fed.activo ? '#10B98166' : '#EF444466'}`,
                                                        borderRadius: '6px',
                                                        padding: '4px 10px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        fontSize: '0.7rem',
                                                        fontWeight: '600',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s ease',
                                                        width: '90px',
                                                        justifyContent: 'center'
                                                    }}
                                                >
                                                    <Power size={12} />
                                                    <span>{fed.activo ? 'ACTIVA' : 'SUSPENS.'}</span>
                                                </button>
                                            </td>
                                            <td>
                                                <ArrowRight size={18} className="arrow-icon" />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right Side: Detail Panel */}
                <div className={`saas-detail-panel glass-effect ${selectedFedId ? 'is-visible' : ''}`}>
                    {selectedFed ? (
                        <div className="detail-content fade-in">
                            <div className="detail-header">
                                <div className="header-top">
                                    <button className="btn-close-detail" onClick={() => setSelectedFedId(null)}><X size={20} /></button>
                                    <div className="fed-main-title">
                                        <h3>{selectedFed.clubNombre}</h3>
                                        <div className="fed-tags">
                                            <span className={`tag-status ${selectedFed.activo ? 'active' : 'inactive'}`}>
                                                {selectedFed.activo ? 'Habilitada' : 'Suspendida'}
                                            </span>
                                            <span className="tag-id">ID: #{selectedFed.clubId}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="header-actions-mini">
                                    <button className="btn-mini-action" onClick={() => handleOpenEdit(selectedFed)}>
                                        <Edit3 size={14} /> Editar Datos
                                    </button>
                                    <button className="btn-mini-action danger" onClick={handleDelete}>
                                        <Trash2 size={14} /> Eliminar
                                    </button>
                                </div>
                            </div>

                            {/* Contact Info */}
                            <div className="detail-info-grid">
                                <div className="info-item">
                                    <Mail size={14} />
                                    <span>{selectedFed.email || 'Sin email'}</span>
                                </div>
                                <div className="info-item">
                                    <Phone size={14} />
                                    <span>{selectedFed.telefono || 'Sin teléfono'}</span>
                                </div>
                                <div className="info-item">
                                    <MapPin size={14} />
                                    <span>{selectedFed.direccion || 'Sin dirección'}</span>
                                </div>
                            </div>

                            <div className="detail-stats-cards">
                                <div className="detail-card">
                                    <BarChart3 size={20} />
                                    <div className="card-info">
                                        <label>Consumo Atletas (Global)</label>
                                        <ProgressBar 
                                            current={selectedFed.atletasRegistrados} 
                                            max={selectedFed.maxAtletas} 
                                            label="" 
                                        />
                                    </div>
                                </div>

                                <div className="detail-card">
                                    <Building2 size={20} />
                                    <div className="card-info">
                                        <label>Clubes Afiliados</label>
                                        <div className="stat-value-large">{selectedFed.clubesAfiliadosCount} <span>Entidades</span></div>
                                    </div>
                                </div>

                                <div className="detail-card">
                                    <Calendar size={20} />
                                    <div className="card-info">
                                        <label>Torneos Activos</label>
                                        <ProgressBar 
                                            current={selectedFed.torneosActivosCount} 
                                            max={selectedFed.maxTorneos} 
                                            label="" 
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="detail-section">
                                <h4><Activity size={16} /> Acciones Rápidas</h4>
                                <div className="quick-actions-row">
                                    <button 
                                        className="btn-action-primary"
                                        onClick={() => navigate(`/super/federacion/${selectedFed.clubId}`)}
                                    >
                                        <Eye size={16} /> Ver Dashboard Federación
                                    </button>
                                </div>
                            </div>

                            <div className="detail-section">
                                <h4><Settings size={16} /> Configuración SaaS</h4>
                                <div className="admin-controls-vertical">
                                    <div className="control-field">
                                        <label>Plan de Suscripción</label>
                                        <select 
                                            value={selectedFed.planSaaSId || 1} 
                                            onChange={(e) => handleAsignarPlan(selectedFed.clubId, parseInt(e.target.value))}
                                            disabled={asignandoPlanId === selectedFed.clubId}
                                        >
                                            {planes.map(p => (
                                                <option key={p.id} value={p.id}>{p.nombre}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="control-field" style={{ marginTop: '12px' }}>
                                        <label>Frecuencia de Pago</label>
                                        <div style={{ fontWeight: '600', color: 'var(--color-text)', padding: '6px 0' }}>
                                            {selectedFed.frecuenciaPago || 'Mensual'}
                                        </div>
                                    </div>
                                    <div className="control-field" style={{ marginTop: '12px' }}>
                                        <label>Inicio de Suscripción</label>
                                        <div style={{ fontWeight: '600', color: 'var(--color-text)', padding: '6px 0' }}>
                                            {selectedFed.fechaAltaPlan ? new Date(selectedFed.fechaAltaPlan).toLocaleDateString() : 'Sin fecha'}
                                        </div>
                                    </div>
                                    <div className="control-field" style={{ marginTop: '12px' }}>
                                        <label>Vencimiento de Suscripción</label>
                                        <div style={{ 
                                            fontWeight: '600', 
                                            padding: '6px 0',
                                            color: selectedFed.fechaVencimientoPlan && new Date(selectedFed.fechaVencimientoPlan) < new Date() ? '#EF4444' : 'var(--color-text)' 
                                        }}>
                                            {selectedFed.fechaVencimientoPlan ? new Date(selectedFed.fechaVencimientoPlan).toLocaleDateString() : 'Sin fecha'}
                                        </div>
                                    </div>
                                    <div className="control-field" style={{ marginTop: '12px' }}>
                                        <label>Estado de Pago / Acceso</label>
                                        <div style={{ 
                                            fontWeight: '700', 
                                            padding: '6px 0',
                                            color: selectedFed.bloqueadoPorFaltaDePago ? '#EF4444' : '#10B981' 
                                        }}>
                                            {selectedFed.bloqueadoPorFaltaDePago ? '🛑 Suspendido por Falta de Pago' : '✅ Habilitado (Al día)'}
                                        </div>
                                    </div>
                                    <div className="control-field">
                                        <label>Control de Acceso</label>
                                        <button 
                                            className={`btn-toggle-saas-premium ${selectedFed.activo ? 'is-active' : 'is-inactive'}`}
                                            onClick={() => handleToggleActivo(selectedFed.clubId)}
                                            style={{
                                                width: '100%',
                                                padding: '12px',
                                                borderRadius: '10px',
                                                border: '1px solid',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '10px',
                                                fontWeight: 'bold',
                                                fontSize: '0.85rem',
                                                transition: 'all 0.3s ease',
                                                backgroundColor: selectedFed.activo ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                color: selectedFed.activo ? '#10B981' : '#EF4444',
                                                borderColor: selectedFed.activo ? '#10B98166' : '#EF444466',
                                                boxShadow: selectedFed.activo ? '0 0 15px rgba(16, 185, 129, 0.1)' : 'none'
                                            }}
                                        >
                                            {selectedFed.activo ? <Check size={18} /> : <XCircle size={18} />}
                                            {selectedFed.activo ? 'SUSPENDER ACCESO' : 'HABILITAR FEDERACIÓN'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="detail-section">
                                <h4><Calendar size={16} /> Torneos en Curso ({selectedFed.torneosActivosCount})</h4>
                                <div className="active-tournaments-mini">
                                    {Array.isArray(selectedFed.torneosActivos) && selectedFed.torneosActivos.length > 0 ? (
                                        selectedFed.torneosActivos.map(t => (
                                            <div key={t.id} className="t-row">
                                                <div className="t-info">
                                                    <span className="t-name">{t.nombre}</span>
                                                    <span className="t-date">{new Date(t.fecha).toLocaleDateString()}</span>
                                                </div>
                                                <span className={`t-pill ${t.estado.toLowerCase()}`}>{t.estado}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="no-tournaments">No hay torneos activos actualmente.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="detail-empty-state">
                            <Shield size={48} />
                            <p>Selecciona una federación para gestionar sus datos y suscripción.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Federation CRUD Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content glass-effect fade-in">
                        <div className="modal-header">
                            <h3>{isEditing ? 'Editar Federación' : 'Nueva Federación'}</h3>
                            <button className="btn-close" onClick={() => setShowModal(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-grid">
                                <div className="section-title-modal full-width">Información de la Entidad</div>
                                <div className="form-group">
                                    <label>Nombre de la Federación</label>
                                    <input 
                                        type="text" 
                                        required 
                                        value={formData.nombre}
                                        onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                                        placeholder="Ej: Federación Argentina de Canoas"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Sigla</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={formData.sigla}
                                        onChange={(e) => setFormData({...formData, sigla: e.target.value})}
                                        placeholder="Ej: FAC"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Email de Contacto</label>
                                    <div className="input-with-icon">
                                        <Mail size={16} />
                                        <input 
                                            type="email" 
                                            required
                                            value={formData.email}
                                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                                            placeholder="correo@federacion.com"
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Teléfono</label>
                                    <div className="input-with-icon">
                                        <Phone size={16} />
                                        <input 
                                            type="text" 
                                            required
                                            value={formData.telefono}
                                            onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                                            placeholder="+54 ..."
                                        />
                                    </div>
                                </div>
                                <div className="form-group full-width">
                                    <label>Dirección Física</label>
                                    <div className="input-with-icon">
                                        <MapPin size={16} />
                                        <input 
                                            type="text" 
                                            required
                                            value={formData.direccion}
                                            onChange={(e) => setFormData({...formData, direccion: e.target.value})}
                                            placeholder="Calle, Ciudad, Provincia"
                                        />
                                    </div>
                                </div>

                                <div className="section-title-modal full-width mt-3">Suscripción y Estado de Pago</div>
                                <div className="form-group">
                                    <label>Frecuencia de Pago</label>
                                    <select 
                                        className="admin-select"
                                        name="frecuenciaPago"
                                        value={formData.frecuenciaPago}
                                        onChange={(e) => setFormData({...formData, frecuenciaPago: e.target.value})}
                                    >
                                        <option value="Mensual">Mensual</option>
                                        <option value="Anual">Anual</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Fecha de Inicio</label>
                                    <div className="input-with-icon">
                                        <Calendar size={16} />
                                        <input 
                                            type="date" 
                                            name="fechaAltaPlan"
                                            value={formData.fechaAltaPlan}
                                            onChange={(e) => setFormData({...formData, fechaAltaPlan: e.target.value})}
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Fecha de Vencimiento</label>
                                    <div className="input-with-icon">
                                        <Calendar size={16} />
                                        <input 
                                            type="date" 
                                            name="fechaVencimientoPlan"
                                            value={formData.fechaVencimientoPlan}
                                            onChange={(e) => setFormData({...formData, fechaVencimientoPlan: e.target.value})}
                                        />
                                    </div>
                                </div>
                                <div className="form-group full-width" style={{ marginTop: '0.5rem' }}>
                                    <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', background: 'rgba(239, 68, 68, 0.05)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                                        <input 
                                            type="checkbox" 
                                            name="bloqueadoPorFaltaDePago"
                                            checked={formData.bloqueadoPorFaltaDePago}
                                            onChange={(e) => setFormData({...formData, bloqueadoPorFaltaDePago: e.target.checked})}
                                            style={{ width: '18px', height: '18px', accentColor: '#EF4444' }}
                                        />
                                        <span style={{ color: '#EF4444', fontWeight: 'bold' }}>Bloquear acceso a la federación por falta de pago</span>
                                    </label>
                                </div>

                                {!isEditing && (
                                    <>
                                        <div className="section-title-modal full-width mt-3">Cuenta de Administrador Inicial</div>
                                        <div className="form-group">
                                            <label>Usuario Admin</label>
                                            <div className="input-with-icon">
                                                <UserCircle size={16} />
                                                <input 
                                                    type="text" 
                                                    required={!isEditing}
                                                    value={formData.adminUsername}
                                                    onChange={(e) => setFormData({...formData, adminUsername: e.target.value})}
                                                    placeholder="admin_nombre"
                                                />
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label>Email del Administrador</label>
                                            <div className="input-with-icon">
                                                <Mail size={16} />
                                                <input 
                                                    type="email" 
                                                    required={!isEditing}
                                                    value={formData.adminEmail}
                                                    onChange={(e) => setFormData({...formData, adminEmail: e.target.value})}
                                                    placeholder="admin@ejemplo.com"
                                                />
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label>Contraseña</label>
                                            <div className="input-with-icon">
                                                <Lock size={16} />
                                                <input 
                                                    type={showPassword ? "text" : "password"} 
                                                    required={!isEditing}
                                                    value={formData.adminPassword}
                                                    onChange={(e) => setFormData({...formData, adminPassword: e.target.value})}
                                                    placeholder="••••••••"
                                                    className="password-input-modal"
                                                />
                                                <button 
                                                    type="button"
                                                    className="password-toggle-btn-modal"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                >
                                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn-admin-secondary" onClick={() => setShowModal(false)}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn-admin-primary">
                                    {isEditing ? 'Guardar Cambios' : 'Crear Federación y Admin'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SaaSManagement;
