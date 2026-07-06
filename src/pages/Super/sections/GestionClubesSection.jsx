import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, ArrowLeft, Link2, X } from 'lucide-react';
import api from '../../../services/api';
import FederacionService from '../../../services/FederacionService';
import { ENDPOINTS } from '../../../utils/constants';
import ClubGrid from './ClubGrid';
import ClubForm from './ClubForm';
import { useAlert } from '../../../hooks/useAlert';
import { useAuth } from '../../../context/AuthContext';
import {
    withFederationScope,
    clubBelongsToFederation,
    isClubWithoutFederation,
    pick,
    resolveScopeFederationId,
} from '../../../utils/apiHelpers';
import { isSuperAdminUser } from '../../../utils/authHelpers';
import '../../../components/SharedSections/AdminSections.css';

const GestionClubesSection = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const fedIdFromUrl = new URLSearchParams(location.search).get('fedId');
    const [clubes, setClubes] = useState([]);
    const scopeFedId = resolveScopeFederationId({ fedIdFromUrl, user, clubes });
    const [federaciones, setFederaciones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('lista');
    const [selectedClub, setSelectedClub] = useState(null);
    const [form, setForm] = useState({
        nombre: '', sigla: '', siglas: '', email: '', telefono: '',
        ubicacion: '', direccion: '', estadoMatricula: 0, federacionId: '',
    });
    const [saving, setSaving] = useState(false);
    const { alert: msg, showAlert } = useAlert();
    const [assignFedModal, setAssignFedModal] = useState({ show: false, club: null, federacionId: '' });
    const [showOrphans, setShowOrphans] = useState(false);
    const [planes, setPlanes] = useState([]);

    const isSuper = isSuperAdminUser(user);

    useEffect(() => {
        loadData();
        if (isSuper) loadPlanes();
    }, [showOrphans, scopeFedId]);

    const loadPlanes = async () => {
        try {
            const res = await api.get(ENDPOINTS.SAAS.PLANES);
            setPlanes(res.data);
        } catch (e) {
            console.error('Error loading plans:', e);
        }
    };

    const loadData = async () => {
        try {
            setLoading(true);
            const clubesUrl = withFederationScope(ENDPOINTS.CLUBES, scopeFedId);
            const [clubesRes, feds] = await Promise.all([
                api.get(clubesUrl),
                FederacionService.getAll(),
            ]);

            const todos = clubesRes.data || [];
            const visibleFeds = scopeFedId
                ? feds.filter(f => String(f.id) === String(scopeFedId))
                : feds;

            let filtrados = todos;
            if (scopeFedId) {
                filtrados = todos.filter(c => clubBelongsToFederation(c, scopeFedId));
            } else if (isSuper) {
                filtrados = showOrphans
                    ? todos.filter(c => isClubWithoutFederation(c))
                    : todos.filter(c => !isClubWithoutFederation(c));
            }

            setFederaciones(visibleFeds);
            setClubes(filtrados);
        } catch (e) {
            console.error('Error loading clubs:', e);
            showAlert('error', 'Error al cargar clubes');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenCrear = () => {
        setForm({
            nombre: '',
            sigla: '',
            siglas: '',
            email: '',
            telefono: '',
            ubicacion: '',
            direccion: '',
            estadoMatricula: 0,
            federacionId: scopeFedId ? parseInt(scopeFedId) : '',
            planSaaSId: '',
            frecuenciaPago: 'Mensual',
            fechaAltaPlan: '',
            fechaVencimientoPlan: '',
            bloqueadoPorFaltaDePago: false,
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
            federacionId: pick(club, 'federacionId', 'FederacionId', 'idFederacion') || '',
            fechaAltaPlan: formatDate(club.fechaAltaPlan),
            fechaVencimientoPlan: formatDate(club.fechaVencimientoPlan),
            bloqueadoPorFaltaDePago: club.bloqueadoPorFaltaDePago || false,
            frecuenciaPago: club.frecuenciaPago || 'Mensual',
            planSaaSId: club.planSaaSId || '',
        });
        setView('editar');
    };

    const handleFieldChange = (name, value) => {
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleAssignFederation = async () => {
        if (!assignFedModal.federacionId || !assignFedModal.club) return;
        setSaving(true);
        try {
            const club = assignFedModal.club;
            const clubId = pick(club, 'id', 'Id');
            await api.put(`${ENDPOINTS.CLUBES}/${clubId}`, {
                nombre: club.nombre,
                sigla: club.sigla,
                email: club.email,
                telefono: club.telefono,
                direccion: club.direccion,
                ubicacion: club.ubicacion,
                activo: club.activo !== false,
                federacionId: parseInt(assignFedModal.federacionId),
            });
            showAlert('success', `Club "${club.nombre}" vinculado correctamente.`);
            setAssignFedModal({ show: false, club: null, federacionId: '' });
            loadData();
        } catch (err) {
            showAlert('error', 'Error al vincular: ' + (err.response?.data?.message || err.message));
        } finally {
            setSaving(false);
        }
    };

    const buildClubPayload = () => {
        const fedId = scopeFedId
            ? parseInt(scopeFedId)
            : (form.federacionId ? parseInt(form.federacionId) : null);

        return {
            nombre: form.nombre,
            sigla: form.sigla || form.siglas,
            email: form.email,
            telefono: form.telefono,
            direccion: form.direccion || form.ubicacion,
            ubicacion: form.ubicacion || form.direccion,
            activo: form.activo !== false,
            federacionId: fedId,
            planSaaSId: form.planSaaSId || null,
            frecuenciaPago: form.frecuenciaPago,
            fechaAltaPlan: form.fechaAltaPlan || null,
            fechaVencimientoPlan: form.fechaVencimientoPlan || null,
            bloqueadoPorFaltaDePago: form.bloqueadoPorFaltaDePago || false,
        };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = buildClubPayload();
            if (view === 'editar') {
                const clubId = pick(selectedClub, 'id', 'Id');
                await api.put(`${ENDPOINTS.CLUBES}/${clubId}`, payload);
                showAlert('success', 'Club actualizado');
            } else {
                if (!payload.federacionId && isSuper) {
                    showAlert('error', 'Debe seleccionar una federación para el club.');
                    setSaving(false);
                    return;
                }
                await api.post(ENDPOINTS.CLUBES, payload);
                showAlert('success', 'Club registrado correctamente en la federación.');
            }
            setView('lista');
            loadData();
        } catch (err) {
            showAlert('error', 'Error: ' + (err.response?.data?.message || err.message));
        } finally {
            setSaving(false);
        }
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
                            {scopeFedId ? 'Clubes de la Federación' : 'Clubes Federados'}
                        </h1>
                        <p className="section-subtitle" style={{ margin: '0.2rem 0 0 0' }}>
                            {scopeFedId
                                ? 'Mostrando solo los clubes afiliados a esta federación.'
                                : 'Gestión de instituciones habilitadas para competir.'
                            }
                        </p>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {isSuper && !scopeFedId && view === 'lista' && (
                        <label className="flex-row gap-xs" style={{ cursor: 'pointer', fontSize: '0.9rem', color: 'var(--color-text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: '20px' }}>
                            <input
                                type="checkbox"
                                checked={showOrphans}
                                onChange={e => setShowOrphans(e.target.checked)}
                            />
                            Ver clubes sin federación
                        </label>
                    )}
                    {view === 'lista' && (
                        <button className="btn-admin-primary" onClick={handleOpenCrear}>
                            <Plus size={20} /> {scopeFedId ? 'Nuevo Club Afiliado' : 'Nuevo Club'}
                        </button>
                    )}
                </div>
            </div>

            {view === 'lista' ? (
                loading ? <div className="loader-container"><div className="loader"></div></div> : (
                    <ClubGrid
                        clubes={clubes}
                        showFederation={!scopeFedId}
                        onEdit={handleOpenEditar}
                        onViewAtletas={(c) => navigate(`/super/atletas?clubId=${pick(c, 'id', 'Id')}&clubNombre=${encodeURIComponent(c.nombre)}${scopeFedId ? `&fedId=${scopeFedId}` : ''}`)}
                        onAssignParent={(club) => setAssignFedModal({ show: true, club, federacionId: '' })}
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
                    isSuperAdmin={isSuper}
                    planes={planes}
                    federaciones={federaciones}
                    showFederationSelect={isSuper && !scopeFedId && view === 'crear'}
                />
            )}

            {assignFedModal.show && (
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
                            <button onClick={() => setAssignFedModal({ show: false, club: null, federacionId: '' })}
                                style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                            Asignar el club <strong style={{ color: 'var(--color-text)' }}>{assignFedModal.club?.nombre}</strong> a una federación.
                        </p>
                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                                Seleccionar Federación
                            </label>
                            <select
                                className="admin-select"
                                value={assignFedModal.federacionId}
                                onChange={e => setAssignFedModal(prev => ({ ...prev, federacionId: e.target.value }))}
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
                                onClick={() => setAssignFedModal({ show: false, club: null, federacionId: '' })}>
                                Cancelar
                            </button>
                            <button className="btn-admin-primary"
                                disabled={!assignFedModal.federacionId || saving}
                                onClick={handleAssignFederation}
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
