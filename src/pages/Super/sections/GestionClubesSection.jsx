import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, ArrowLeft, Building2, Link2, X } from 'lucide-react';
import api from '../../../services/api';
import { ENDPOINTS } from '../../../utils/constants';
import ClubGrid from './ClubGrid';
import ClubForm from './ClubForm';
import { useAlert } from '../../../hooks/useAlert';
import { useAuth } from '../../../context/AuthContext';
import '../../../components/SharedSections/AdminSections.css';

const GestionClubesSection = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    // fedId desde URL (SuperAdmin viendo una fed) o ClubId del propio Admin
    const fedId = new URLSearchParams(location.search).get('fedId') || user?.clubId;

    const [clubes, setClubes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('lista');
    const [selectedClub, setSelectedClub] = useState(null);
    const [form, setForm] = useState({ nombre: '', sigla: '', email: '', telefono: '', ubicacion: '' });
    const [saving, setSaving] = useState(false);
    const { alert: msg, showAlert } = useAlert();
    const [parentModal, setParentModal] = useState({ show: false, club: null, parentId: '' });
    const [showOrphans, setShowOrphans] = useState(false);
    const [planes, setPlanes] = useState([]);

    const federaciones = clubes.filter(c => !c.parentClubId); // Para el selector del modal

    useEffect(() => { 
        loadClubes(); 
        if (user?.rol === 'SuperAdmin') loadPlanes();
    }, [showOrphans]);

    const loadPlanes = async () => {
        try {
            const res = await api.get(ENDPOINTS.SAAS.PLANES);
            setPlanes(res.data);
        } catch (e) {
            console.error("Error loading plans:", e);
        }
    };

    const loadClubes = async () => {
        try {
            const res = await api.get(ENDPOINTS.CLUBES);
            const todos = res.data;
            const isSuper = user?.rol === 'SuperAdmin';

            // Si hay fedId (estamos "dentro" de una federación)
            if (fedId) {
                const filtrados = todos.filter(
                    c => String(c.parentClubId) === String(fedId)
                );
                setClubes(filtrados);
            } 
            // Si es SuperAdmin y no hay fedId
            else if (isSuper) {
                // Si showOrphans es true, mostramos TODO. Si es false, solo los que TIENEN padre.
                const filtrados = showOrphans 
                    ? todos 
                    : todos.filter(c => c.parentClubId !== null);
                setClubes(filtrados);
            }
            // Para un Admin normal sin fedId en URL, mostramos su propia jerarquía (excluyendo a la federación misma)
            else if (user?.clubId) {
                const filtrados = todos.filter(
                    c => String(c.parentClubId) === String(user.clubId)
                );
                setClubes(filtrados);
            }
            else {
                setClubes(todos);
            }
        } catch (e) { 
            console.error("Error loading clubs:", e);
            showAlert('error', 'Error al cargar clubes'); 
        } finally { 
            setLoading(false); 
        }
    };

    const handleOpenCrear = () => {
        // Al crear, seteamos parentClubId automáticamente con la federación actual
        setForm({ 
            nombre: '', 
            sigla: '', 
            email: '', 
            telefono: '', 
            ubicacion: '', 
            parentClubId: fedId ? parseInt(fedId) : null,
            planSaaSId: '',
            frecuenciaPago: 'Mensual',
            fechaAltaPlan: '',
            fechaVencimientoPlan: '',
            bloqueadoPorFaltaDePago: false
        });
        setView('crear');
    };

    const handleOpenEditar = (club) => {
        setSelectedClub(club);
        
        const formatDate = (dateStr) => {
            if (!dateStr) return '';
            return dateStr.split('T')[0];
        };

        setForm({ 
            ...club,
            fechaAltaPlan: formatDate(club.fechaAltaPlan),
            fechaVencimientoPlan: formatDate(club.fechaVencimientoPlan),
            bloqueadoPorFaltaDePago: club.bloqueadoPorFaltaDePago || false,
            frecuenciaPago: club.frecuenciaPago || 'Mensual',
            planSaaSId: club.planSaaSId || ''
        });
        setView('editar');
    };

    const handleFieldChange = (name, value) => {
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleAssignParent = async () => {
        if (!parentModal.parentId || !parentModal.club) return;
        setSaving(true);
        try {
            const club = parentModal.club;
            await api.put(`${ENDPOINTS.CLUBES}/${club.id}`, {
                ...club,
                parentClubId: parseInt(parentModal.parentId)
            });
            showAlert('success', `Club "${club.nombre}" vinculado correctamente.`);
            setParentModal({ show: false, club: null, parentId: '' });
            loadClubes();
        } catch (err) {
            showAlert('error', 'Error al vincular: ' + (err.response?.data?.message || err.message));
        } finally {
            setSaving(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (view === 'editar') {
                await api.put(`${ENDPOINTS.CLUBES}/${selectedClub.id}`, form);
                showAlert('success', 'Club actualizado');
            } else {
                // Aseguramos que parentClubId se envíe correctamente
                const payload = { ...form, parentClubId: fedId ? parseInt(fedId) : null };
                await api.post(ENDPOINTS.CLUBES, payload);
                showAlert('success', 'Club registrado correctamente en la federación.');
            }
            setView('lista');
            loadClubes();
        } catch (err) { showAlert('error', 'Error: ' + (err.response?.data?.message || err.message)); }
        finally { setSaving(false); }
    };

    return (
        <div className="admin-section-container fade-in">
            {msg && <div className={`alert-msg ${msg.type} fade-in`}>{msg.text}</div>}

            <div className="section-header-row mb-lg">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
                    <button 
                        className="btn-admin-secondary" 
                        onClick={() => view === 'lista' ? navigate(-1) : setView('lista')}
                        title="Volver"
                        style={{ padding: '0', width: '42px', height: '42px', borderRadius: '50%', flexShrink: 0 }}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="gradient-text" style={{ margin: 0 }}>
                            {fedId ? 'Clubes de la Federación' : 'Clubes Federados'}
                        </h1>
                        <p className="section-subtitle" style={{ margin: '0.2rem 0 0 0' }}>
                            {fedId 
                                ? `Mostrando solo los clubes afiliados a esta federación.`
                                : 'Gestión de instituciones habilitadas para competir.'
                            }
                        </p>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {user?.rol === 'SuperAdmin' && !fedId && view === 'lista' && (
                        <label className="flex-row gap-xs" style={{ cursor: 'pointer', fontSize: '0.9rem', color: 'var(--color-text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: '20px' }}>
                            <input 
                                type="checkbox" 
                                checked={showOrphans} 
                                onChange={e => setShowOrphans(e.target.checked)}
                            />
                            Ver instituciones sin federación
                        </label>
                    )}
                    {view === 'lista' && (
                        <button className="btn-admin-primary" onClick={handleOpenCrear}>
                            <Plus size={20} /> {fedId ? 'Nuevo Club Afiliado' : 'Nuevo Club'}
                        </button>
                    )}
                </div>
            </div>

            {view === 'lista' ? (
                loading ? <div className="loader-container"><div className="loader"></div></div> : (
                    <ClubGrid 
                        clubes={clubes} 
                        onEdit={handleOpenEditar} 
                        onViewAtletas={(c) => navigate(`/super/atletas?clubId=${c.id}&clubNombre=${encodeURIComponent(c.nombre)}`)}
                        onAssignParent={(club) => setParentModal({ show: true, club, parentId: '' })}
                    />
                )
            ) : (
                <ClubForm 
                    initialData={form}
                    saving={saving}
                    isEditing={view === 'editar'}
                    onCancel={() => setView('lista')}
                    onSubmit={handleSubmit}
                    onChange={handleFieldChange}
                    isSuperAdmin={user?.rol === 'SuperAdmin'}
                    planes={planes}
                />
            )}

            {/* MODAL VINCULAR A FEDERACIÓN */}
            {parentModal.show && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000, backdropFilter: 'blur(4px)'
                }}>
                    <div className="glass-effect" style={{
                        background: 'var(--color-surface)', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '420px',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <Link2 size={20} style={{ color: 'var(--color-accent-orange)' }} />
                                <h3 style={{ margin: 0 }}>Vincular a Federación</h3>
                            </div>
                            <button onClick={() => setParentModal({ show: false, club: null, parentId: '' })}
                                style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                            Mover el club <strong style={{ color: 'var(--color-text)' }}>{parentModal.club?.nombre}</strong> a una federación madre.
                        </p>
                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                                Seleccionar Federación
                            </label>
                            <select
                                className="admin-select"
                                value={parentModal.parentId}
                                onChange={e => setParentModal(prev => ({ ...prev, parentId: e.target.value }))}
                                style={{ width: '100%' }}
                            >
                                <option value="">-- Elegir Federación --</option>
                                {federaciones.map(f => (
                                    <option key={f.id} value={f.id}>{f.nombre}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ display: 'flex', gap: '0.8rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                            <button className="btn-admin-secondary"
                                onClick={() => setParentModal({ show: false, club: null, parentId: '' })}>
                                Cancelar
                            </button>
                            <button className="btn-admin-primary"
                                disabled={!parentModal.parentId || saving}
                                onClick={handleAssignParent}
                                style={{ background: 'var(--color-accent-orange)', borderColor: 'var(--color-accent-orange)' }}>
                                {saving ? 'Vinculando...' : 'Confirmar Vínculo'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GestionClubesSection;
