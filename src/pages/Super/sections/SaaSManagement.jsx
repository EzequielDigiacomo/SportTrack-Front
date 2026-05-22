import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SaaSService from '../../../services/SaaSService';
import ConfirmDialog from '../../../components/Common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
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
    const { addToast } = useToast();
    const [planes, setPlanes] = useState([]);
    const [clubesStatus, setClubesStatus] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingStatus, setLoadingStatus] = useState(true);
    const [asignandoPlanId, setAsignandoPlanId] = useState(null);
    const [selectedFedId, setSelectedFedId] = useState(null);
    const [filter, setFilter] = useState('');
    
    // Confirm Dialog State
    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'warning',
        onConfirm: null
    });
    
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

    const checkIsEffectiveActive = (fed) => {
        if (!fed) return false;
        const isExpired = fed.fechaVencimientoPlan && new Date(fed.fechaVencimientoPlan) < new Date();
        return fed.activo && !fed.bloqueadoPorFaltaDePago && !isExpired;
    };

    const getEstadoFinanciero = (fed) => {
        if (!fed) return { text: 'Desconocido', className: 'badge danger' };
        if (fed.bloqueadoPorFaltaDePago) {
            return { text: 'Bloqueado', className: 'badge danger' };
        }
        const isExpired = fed.fechaVencimientoPlan && new Date(fed.fechaVencimientoPlan) < new Date();
        if (isExpired) {
            return { text: 'Vencido', className: 'badge danger' };
        }
        if (!fed.planAlDia) {
            return { text: 'Excedido', className: 'badge danger' };
        }
        return { text: 'Al día', className: 'badge success' };
    };

    const getAccessButtonLabel = (fed, isDesktop = false) => {
        if (!fed) return isDesktop ? 'SUSPENS.' : 'SUSPENDIDA';
        if (fed.bloqueadoPorFaltaDePago) return 'BLOQUEADA';
        const isExpired = fed.fechaVencimientoPlan && new Date(fed.fechaVencimientoPlan) < new Date();
        if (isExpired) return 'VENCIDA';
        if (!fed.activo) return isDesktop ? 'SUSPENS.' : 'SUSPENDIDA';
        return 'ACTIVA';
    };

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

    const handleUpdateInlineField = async (clubId, fieldName, value) => {
        const fed = clubesStatus.find(f => f.clubId === clubId);
        if (!fed) return;

        const updatedFed = {
            ...fed,
            [fieldName]: value
        };

        if (fieldName === 'frecuenciaPago' || fieldName === 'fechaAltaPlan') {
            const freq = fieldName === 'frecuenciaPago' ? value : fed.frecuenciaPago;
            const alta = fieldName === 'fechaAltaPlan' ? value : fed.fechaAltaPlan;

            if (alta) {
                const altaDate = new Date(alta);
                if (!isNaN(altaDate.getTime())) {
                    const vencDate = new Date(altaDate);
                    if (freq === 'Anual') {
                        vencDate.setFullYear(vencDate.getFullYear() + 1);
                    } else {
                        vencDate.setMonth(vencDate.getMonth() + 1);
                    }
                    updatedFed.fechaVencimientoPlan = vencDate.toISOString().split('T')[0];
                }
            }
        }

        const clubData = {
            nombre: updatedFed.clubNombre,
            sigla: updatedFed.sigla || '',
            email: updatedFed.email || '',
            telefono: updatedFed.telefono || '',
            direccion: updatedFed.direccion || '',
            ubicacion: updatedFed.ubicacion || '',
            activo: updatedFed.activo,
            frecuenciaPago: updatedFed.frecuenciaPago || 'Mensual',
            fechaAltaPlan: updatedFed.fechaAltaPlan ? updatedFed.fechaAltaPlan.split('T')[0] : null,
            fechaVencimientoPlan: updatedFed.fechaVencimientoPlan ? updatedFed.fechaVencimientoPlan.split('T')[0] : null,
            bloqueadoPorFaltaDePago: updatedFed.bloqueadoPorFaltaDePago || false
        };

        try {
            await SaaSService.updateFederacion(clubId, clubData);
            await fetchData();
            addToast("Configuración SaaS de la federación actualizada con éxito", "success");
        } catch (err) {
            console.error("Error updating inline field", err);
            addToast("Error al actualizar la configuración SaaS de la federación.", "error");
        }
    };
    
    const handleRenovarPlan = async (clubId) => {
        const fed = clubesStatus.find(f => f.clubId === clubId);
        if (!fed) return;

        // 1. Determine baseline date: if expired (or no date), start from today. If future, extend current expiration.
        let baseDate = new Date();
        if (fed.fechaVencimientoPlan) {
            const currentVenc = new Date(fed.fechaVencimientoPlan);
            if (!isNaN(currentVenc.getTime()) && currentVenc > baseDate) {
                baseDate = currentVenc;
            }
        }

        // 2. Add period based on frequency
        const freq = fed.frecuenciaPago || 'Mensual';
        const nextDate = new Date(baseDate);
        if (freq === 'Anual') {
            nextDate.setFullYear(nextDate.getFullYear() + 1);
        } else {
            nextDate.setMonth(nextDate.getMonth() + 1);
        }

        const newVencimiento = nextDate.toISOString().split('T')[0];

        // 3. Prepare updated data
        const clubData = {
            nombre: fed.clubNombre,
            sigla: fed.sigla || '',
            email: fed.email || '',
            telefono: fed.telefono || '',
            direccion: fed.direccion || '',
            ubicacion: fed.ubicacion || '',
            activo: true, // Re-habilitar acceso
            frecuenciaPago: freq,
            fechaAltaPlan: new Date().toISOString().split('T')[0], // La fecha de pago es hoy
            fechaVencimientoPlan: newVencimiento,
            bloqueadoPorFaltaDePago: false // Desbloqueado por pago al día
        };

        setConfirmDialog({
            isOpen: true,
            title: 'Confirmar Renovación',
            message: `¿Confirmar renovación del Plan ${fed.planNombre} (${freq})?\nNuevo vencimiento estimado: ${new Date(newVencimiento).toLocaleDateString()}`,
            type: 'success',
            icon: <Calendar size={32} />,
            onConfirm: async () => {
                try {
                    await SaaSService.updateFederacion(clubId, clubData);
                    await fetchData();
                    addToast(`Plan ${fed.planNombre} renovado con éxito`, "success");
                } catch (err) {
                    console.error("Error al renovar plan:", err);
                    addToast("Error al renovar el plan.", "error");
                }
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
            }
        });
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

    const handleModalSaaSChange = (field, value) => {
        let updatedFields = {
            ...formData,
            [field]: value
        };

        if (field === 'frecuenciaPago' || field === 'fechaAltaPlan') {
            const freq = field === 'frecuenciaPago' ? value : formData.frecuenciaPago;
            const alta = field === 'fechaAltaPlan' ? value : formData.fechaAltaPlan;

            if (alta) {
                const altaDate = new Date(alta);
                if (!isNaN(altaDate.getTime())) {
                    const vencDate = new Date(altaDate);
                    if (freq === 'Anual') {
                        vencDate.setFullYear(vencDate.getFullYear() + 1);
                    } else {
                        vencDate.setMonth(vencDate.getMonth() + 1);
                    }
                    updatedFields.fechaVencimientoPlan = vencDate.toISOString().split('T')[0];
                }
            }
        }

        setFormData(updatedFields);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                // Para editar solo enviamos los datos del club
                const { adminUsername, adminPassword, ...clubData } = formData;
                await SaaSService.updateFederacion(selectedFedId, clubData);
                addToast("Federación actualizada con éxito", "success");
            } else {
                await SaaSService.createFederacion(formData);
                addToast("Federación creada con éxito junto a su cuenta administradora", "success");
            }
            setShowModal(false);
            await fetchData();
        } catch (err) {
            console.error("Error saving federation", err);
            const errorMsg = err.response?.data?.message || "Error desconocido al guardar la federación.";
            addToast(errorMsg, "error");
        }
    };

    const handleDelete = async () => {
        setConfirmDialog({
            isOpen: true,
            title: 'Eliminar Federación',
            message: '¿Estás seguro de eliminar esta federación? Se perderán permanentemente todos sus clubes, atletas y datos asociados. Esta acción no se puede deshacer.',
            type: 'danger',
            onConfirm: async () => {
                try {
                    await SaaSService.deleteFederacion(selectedFedId);
                    setSelectedFedId(null);
                    await fetchData();
                    addToast("Federación eliminada permanentemente", "success");
                } catch (err) {
                    console.error("Error deleting federation", err);
                    addToast("Error al eliminar la federación", "error");
                }
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
            }
        });
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
                                        {(() => {
                                            const est = getEstadoFinanciero(fed);
                                            return <span className={est.className}>{est.text}</span>;
                                        })()}
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        <p style={{ margin: 0 }}><Users size={14} className="text-primary" /> <strong>{fed.atletasRegistrados}</strong> Atletas</p>
                                        <p style={{ margin: 0 }}><Building2 size={14} className="text-secondary" /> <strong>{fed.clubesAfiliadosCount}</strong> Clubes</p>
                                    </div>
                                </div>
                                <div className="card-actions-row">
                                    {(() => {
                                        const isEffActive = checkIsEffectiveActive(fed);
                                        const label = getAccessButtonLabel(fed, false);
                                        return (
                                            <button 
                                                className={`btn-quick-toggle ${isEffActive ? 'is-active' : 'is-suspended'}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleToggleActivo(fed.clubId);
                                                }}
                                                style={{
                                                    backgroundColor: isEffActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                    color: isEffActive ? '#10B981' : '#EF4444',
                                                    border: `1px solid ${isEffActive ? '#10B98166' : '#EF444466'}`,
                                                    borderRadius: '6px', padding: '6px 12px', fontSize: '0.75rem', fontWeight: '700'
                                                }}
                                            >
                                                <Power size={14} style={{ marginRight: '6px' }} />
                                                {label}
                                            </button>
                                        );
                                    })()}
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
                                            className={`${selectedFedId === fed.clubId ? 'is-selected' : ''} ${!fed.planAlDia || !checkIsEffectiveActive(fed) ? 'row-warning' : ''}`}
                                            onClick={() => setSelectedFedId(fed.clubId)}
                                        >
                                            <td data-label="Federación">
                                                <div className="fed-cell-name">
                                                    <div className={`status-dot ${checkIsEffectiveActive(fed) ? 'active' : 'inactive'}`} />
                                                    <span>{fed.clubNombre} {fed.sigla && `(${fed.sigla})`}</span>
                                                </div>
                                            </td>
                                            <td data-label="Plan">
                                                <span className="fed-plan-badge" data-plan={fed.planNombre?.toLowerCase()}>
                                                    {fed.planNombre}
                                                </span>
                                            </td>
                                            <td data-label="Estado" style={{ whiteSpace: 'nowrap', minWidth: '100px' }}>
                                                {(() => {
                                                    const est = getEstadoFinanciero(fed);
                                                    return <span className={est.className}>{est.text}</span>;
                                                })()}
                                            </td>
                                            <td data-label="Atletas" className="text-center font-bold">{fed.atletasRegistrados}</td>
                                            <td data-label="Clubes" className="text-center">
                                                <span className="club-count-badge">
                                                    {fed.clubesAfiliadosCount}
                                                </span>
                                            </td>
                                            <td data-label="Suscripción / Vence">
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    {(() => {
                                                        const isExpired = fed.fechaVencimientoPlan && new Date(fed.fechaVencimientoPlan) < new Date();
                                                        const isBlocked = fed.bloqueadoPorFaltaDePago || isExpired;
                                                        return (
                                                            <span className="badge" style={{
                                                                padding: '2px 8px',
                                                                fontSize: '0.65rem',
                                                                backgroundColor: isBlocked ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                                                color: isBlocked ? '#EF4444' : '#10B981',
                                                                border: `1px solid ${isBlocked ? '#EF4444' : '#10B981'}`,
                                                                borderRadius: '4px',
                                                                width: 'fit-content',
                                                                fontWeight: 'bold',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '4px'
                                                            }}>
                                                                {fed.bloqueadoPorFaltaDePago ? (
                                                                    <>
                                                                        <XCircle size={10} /> Bloqueado
                                                                    </>
                                                                ) : isExpired ? (
                                                                    <>
                                                                        <XCircle size={10} /> Vencido
                                                                    </>
                                                                ) : (
                                                                    fed.frecuenciaPago || 'Mensual'
                                                                )}
                                                            </span>
                                                        );
                                                    })()}
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
                                                {(() => {
                                                    const isEffActive = checkIsEffectiveActive(fed);
                                                    const label = getAccessButtonLabel(fed, true);
                                                    return (
                                                        <button 
                                                            className={`btn-quick-toggle ${isEffActive ? 'is-active' : 'is-suspended'}`}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleToggleActivo(fed.clubId);
                                                            }}
                                                            title={isEffActive ? 'Suspender acceso' : 'Habilitar acceso'}
                                                            style={{
                                                                backgroundColor: isEffActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                                color: isEffActive ? '#10B981' : '#EF4444',
                                                                border: `1px solid ${isEffActive ? '#10B98166' : '#EF444466'}`,
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
                                                            <span>{label}</span>
                                                        </button>
                                                    );
                                                })()}
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
                                <div className="detail-header-row">
                                    <div className="fed-main-title">
                                        <h3>{selectedFed.clubNombre} {selectedFed.sigla && `(${selectedFed.sigla})`}</h3>
                                        <div className="fed-tags">
                                            {(() => {
                                                const isEffActive = checkIsEffectiveActive(selectedFed);
                                                const isExpired = selectedFed.fechaVencimientoPlan && new Date(selectedFed.fechaVencimientoPlan) < new Date();
                                                let tagText = 'Suspendida';
                                                if (selectedFed.bloqueadoPorFaltaDePago) tagText = 'Bloqueada (Pago)';
                                                else if (isExpired) tagText = 'Suscripción Vencida';
                                                else if (selectedFed.activo) tagText = 'Habilitada';
                                                return (
                                                    <span className={`tag-status ${isEffActive ? 'active' : 'inactive'}`}>
                                                        {tagText}
                                                    </span>
                                                );
                                            })()}
                                            <span className="tag-id">ID: #{selectedFed.clubId}</span>
                                        </div>
                                    </div>
                                    <button className="btn-close-detail" onClick={() => setSelectedFedId(null)}><X size={20} /></button>
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
                                <div className="quick-actions-row" style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                                    <button 
                                        className="btn-action-primary"
                                        onClick={() => navigate(`/super/federacion/${selectedFed.clubId}`)}
                                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                    >
                                        <Eye size={16} /> Ver Dashboard Federación
                                    </button>
                                    <button 
                                        className="btn-action-success"
                                        onClick={() => handleRenovarPlan(selectedFed.clubId)}
                                        style={{ 
                                            width: '100%',
                                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                            color: 'white',
                                            border: 'none',
                                            padding: '10px 16px',
                                            borderRadius: '8px',
                                            fontWeight: 'bold',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
                                            transition: 'all 0.2s ease',
                                            textTransform: 'uppercase',
                                            fontSize: '0.8rem',
                                            letterSpacing: '0.5px'
                                        }}
                                    >
                                        <Check size={16} /> Renovar Plan Actual ({selectedFed.frecuenciaPago || 'Mensual'})
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
                                    <div className="control-field">
                                        <label>Frecuencia de Pago</label>
                                        <select 
                                            value={selectedFed.frecuenciaPago || 'Mensual'} 
                                            onChange={(e) => handleUpdateInlineField(selectedFed.clubId, 'frecuenciaPago', e.target.value)}
                                        >
                                            <option value="Mensual">Mensual</option>
                                            <option value="Anual">Anual</option>
                                        </select>
                                    </div>
                                    <div className="control-field">
                                        <label>Inicio de Suscripción</label>
                                        <input 
                                            type="date"
                                            value={selectedFed.fechaAltaPlan ? selectedFed.fechaAltaPlan.split('T')[0] : ''}
                                            onChange={(e) => handleUpdateInlineField(selectedFed.clubId, 'fechaAltaPlan', e.target.value)}
                                        />
                                    </div>
                                    <div className="control-field">
                                        <label>Vencimiento de Suscripción</label>
                                        <input 
                                            type="date"
                                            value={selectedFed.fechaVencimientoPlan ? selectedFed.fechaVencimientoPlan.split('T')[0] : ''}
                                            onChange={(e) => handleUpdateInlineField(selectedFed.clubId, 'fechaVencimientoPlan', e.target.value)}
                                        />
                                    </div>
                                    <div className="control-field">
                                        <label>Estado de Pago / Acceso</label>
                                        <select 
                                            value={selectedFed.bloqueadoPorFaltaDePago ? 'Bloqueado' : 'AlDia'} 
                                            onChange={(e) => handleUpdateInlineField(selectedFed.clubId, 'bloqueadoPorFaltaDePago', e.target.value === 'Bloqueado')}
                                            style={{
                                                color: selectedFed.bloqueadoPorFaltaDePago ? '#EF4444' : '#10B981',
                                                fontWeight: 'bold'
                                            }}
                                        >
                                             <option value="AlDia" style={{ color: '#10B981' }}>Habilitado (Al día)</option>
                                             <option value="Bloqueado" style={{ color: '#EF4444' }}>Suspendido por Falta de Pago</option>
                                        </select>
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
                                        {(() => {
                                            const isEffActive = checkIsEffectiveActive(selectedFed);
                                            const isExpired = selectedFed.fechaVencimientoPlan && new Date(selectedFed.fechaVencimientoPlan) < new Date();
                                            if (selectedFed.activo && !isEffActive) {
                                                return (
                                                    <div style={{
                                                        marginTop: '10px',
                                                        padding: '10px',
                                                        borderRadius: '8px',
                                                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                                        color: '#EF4444',
                                                        fontSize: '0.75rem',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px',
                                                        fontWeight: '500'
                                                    }}>
                                                        <XCircle size={14} style={{ flexShrink: 0 }} />
                                                        <span>
                                                            {selectedFed.bloqueadoPorFaltaDePago 
                                                                ? "El acceso está bloqueado manualmente por falta de pago." 
                                                                : "El acceso está suspendido automáticamente porque la suscripción ha vencido."}
                                                        </span>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()}
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
                    <div className="modal-content fade-in">
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
                                        onChange={(e) => handleModalSaaSChange('frecuenciaPago', e.target.value)}
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
                                            onChange={(e) => handleModalSaaSChange('fechaAltaPlan', e.target.value)}
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

            {confirmDialog.isOpen && (
                <ConfirmDialog
                    isOpen={confirmDialog.isOpen}
                    onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                    onConfirm={confirmDialog.onConfirm}
                    title={confirmDialog.title}
                    message={confirmDialog.message}
                    type={confirmDialog.type}
                    icon={confirmDialog.icon}
                />
            )}
        </div>
    );
};

export default SaaSManagement;
