import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, ArrowLeft } from 'lucide-react';
import AuthService from '../../../services/AuthService';
import api from '../../../services/api';
import FederacionService from '../../../services/FederacionService';
import SaaSService from '../../../services/SaaSService';
import { ENDPOINTS } from '../../../utils/constants';
import ConfirmDialog from '../../../components/Common/ConfirmDialog';
import LoginGrid from './LoginGrid';
import LoginForm from './LoginForm';
import { useAlert } from '../../../hooks/useAlert';
import { useAuth } from '../../../context/AuthContext';
import {
    withFederationScope,
    clubBelongsToFederation,
    filterClubesByFederation,
    getUserFederationId,
    pick,
    resolveScopeFederationId,
    getUsuarioFederationName,
} from '../../../utils/apiHelpers';
import { isSuperAdminUser, isFederationAdminUser } from '../../../utils/authHelpers';
import {
    canAccessControlesLive,
    canAccessDashboardClub,
    normalizePlan,
} from '../../../utils/planHelpers';
import '../../../components/SharedSections/AdminSections.css';

const ROLES_JUEZ = ['Largador', 'Cronometrista', 'JuezControl'];
const DEFAULT_ROL = 'Admin';

const enrichFederacionesWithPlan = (federacionesData, saasStatus, planes) => {
    const saasByFedId = Object.fromEntries(
        (saasStatus || []).map(s => [String(pick(s, 'clubId', 'ClubId')), s])
    );
    const planesById = Object.fromEntries(
        (planes || []).map(p => [String(pick(p, 'id', 'Id')), p])
    );

    return (federacionesData || []).map(f => {
        const fedId = pick(f, 'id', 'Id', 'idFederacion', 'IdFederacion');
        const saas = saasByFedId[String(fedId)] || {};
        const planSaaSId = pick(saas, 'planSaaSId', 'PlanSaaSId');
        const planNombre = pick(saas, 'planNombre', 'PlanNombre') || 'Sin plan';
        const planRaw = planSaaSId != null ? planesById[String(planSaaSId)] : null;
        const plan = normalizePlan(planRaw || { id: planSaaSId, nombre: planNombre });

        return {
            ...f,
            id: fedId,
            nombre: pick(f, 'nombre', 'Nombre') || f.nombre,
            planSaaSId,
            planNombre: plan?.nombre || planNombre,
            plan,
            accesoControlesLive: canAccessControlesLive(plan),
            accesoDashboardClub: canAccessDashboardClub(plan),
        };
    });
};

const GestionLoginsSection = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const params = new URLSearchParams(location.search);
    const fedIdFromUrl = params.get('fedId');

    const isSuper = isSuperAdminUser(user);
    const isFedAdmin = isFederationAdminUser(user);

    const [clubes, setClubes] = useState([]);
    const [federaciones, setFederaciones] = useState([]);
    const scopeFedId = useMemo(
        () => resolveScopeFederationId({ fedIdFromUrl, user, clubes }),
        [fedIdFromUrl, user, clubes]
    );
    const effectiveFedId = scopeFedId || fedIdFromUrl || null;

    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('lista');
    const [selectedUser, setSelectedUser] = useState(null);
    const [form, setForm] = useState({
        username: '', password: '', confirmPassword: '', email: '', clubId: '',
        federacionId: '', rol: 'Club', newPassword: '', confirmNewPassword: '',
        nombre: '', apellido: '', dni: '', telefono: '',
    });
    const [saving, setSaving] = useState(false);
    const { alert: msg, showAlert } = useAlert();

    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'warning',
        onConfirm: null,
    });

    const loadData = async () => {
        try {
            setLoading(true);
            const clubesUrl = withFederationScope(ENDPOINTS.CLUBES, effectiveFedId);
            const [usersRes, clubesRes, federacionesData, saasStatus, planes] = await Promise.all([
                AuthService.getUsuarios(),
                api.get(clubesUrl),
                FederacionService.getAll().catch(() => []),
                SaaSService.getClubesStatus().catch(() => []),
                SaaSService.getPlanes().catch(() => []),
            ]);
            const enrichedFeds = enrichFederacionesWithPlan(federacionesData, saasStatus, planes);
            setUsuarios(usersRes);
            setClubes(clubesRes.data || []);
            setFederaciones(
                effectiveFedId
                    ? enrichedFeds.filter(f => String(f.id) === String(effectiveFedId))
                    : enrichedFeds
            );
        } catch (e) {
            showAlert('error', 'Error al cargar datos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [effectiveFedId]);

    const handleOpenCrear = () => {
        const fed = federaciones.find(f => String(f.id) === String(effectiveFedId));
        const plan = fed?.plan ?? (!isSuper ? normalizePlan(user?.plan) : null);
        const defaultRol = canAccessDashboardClub(plan) ? 'Club' : DEFAULT_ROL;
        setForm({
            username: '', password: '', confirmPassword: '', email: '', clubId: '',
            federacionId: effectiveFedId || '',
            rol: defaultRol, newPassword: '', confirmNewPassword: '',
            nombre: '', apellido: '', dni: '', telefono: '',
        });
        setView('crear');
    };

    const handleOpenEditar = (loginUser) => {
        setSelectedUser(loginUser);
        setForm({
            username: loginUser.username,
            newPassword: '', confirmNewPassword: '',
            nombre: loginUser.nombre || '', apellido: loginUser.apellido || '',
        });
        setView('editar');
    };

    const handleOpenEditarPerfil = (loginUser) => {
        setSelectedUser(loginUser);
        setForm({
            username: loginUser.username,
            email: loginUser.email || '',
            nombre: loginUser.nombre || '',
            apellido: loginUser.apellido || '',
            dni: loginUser.dni || '',
            telefono: loginUser.telefono || '',
        });
        setView('editarPerfil');
    };

    const handleFieldChange = (name, value) => {
        setForm(prev => {
            const next = { ...prev, [name]: value };
            if (name === 'federacionId') {
                next.clubId = '';
                const fed = federaciones.find(f => String(f.id) === String(value));
                if (ROLES_JUEZ.includes(next.rol) && !fed?.accesoControlesLive) {
                    next.rol = fed?.accesoDashboardClub ? 'Club' : DEFAULT_ROL;
                } else if (next.rol === 'Club' && !fed?.accesoDashboardClub) {
                    next.rol = DEFAULT_ROL;
                }
            }
            return next;
        });
    };

    const resolvePlanForForm = () => {
        const fedId = form.federacionId || effectiveFedId;
        if (fedId) {
            const fed = federaciones.find(f => String(f.id) === String(fedId));
            return fed?.plan ?? null;
        }
        if (!isSuper) return normalizePlan(user?.plan);
        return null;
    };

    const resolveFederacionIdForRegister = () => {
        if (form.federacionId) return parseInt(form.federacionId);
        if (effectiveFedId) return parseInt(effectiveFedId);
        return getUserFederationId(user) || undefined;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (view === 'editar') {
            if (form.newPassword !== form.confirmNewPassword) {
                showAlert('error', 'Las contraseñas no coinciden');
                return;
            }
        } else if (view === 'crear') {
            if (form.password !== form.confirmPassword) {
                showAlert('error', 'Las contraseñas no coinciden');
                return;
            }
            if (form.rol === 'Club' && !form.clubId) {
                showAlert('error', 'Seleccioná el club al que vincular esta credencial.');
                return;
            }
            if (form.rol === 'Club') {
                const fedId = form.federacionId || effectiveFedId;
                if (isSuper && !fedId) {
                    showAlert('error', 'Seleccioná la federación antes de crear un login Club.');
                    return;
                }
                if (!canAccessDashboardClub(resolvePlanForForm())) {
                    showAlert('error', 'El plan de la federación no incluye dashboard/login Club (desde Profesional).');
                    return;
                }
            }
            if (ROLES_JUEZ.includes(form.rol)) {
                const fedId = form.federacionId || effectiveFedId;
                if (isSuper && !fedId) {
                    showAlert('error', 'Seleccioná la federación antes de crear un usuario juez.');
                    return;
                }
                if (!canAccessControlesLive(resolvePlanForForm())) {
                    showAlert('error', 'La federación no tiene plan con consolas de juez (Ecosistema SportTrack o Pack Dúo).');
                    return;
                }
            }
        }

        setSaving(true);
        try {
            if (view === 'editar') {
                await AuthService.updatePassword(selectedUser.id, form.newPassword);
                showAlert('success', 'Contraseña actualizada correctamente');
            } else if (view === 'editarPerfil') {
                await AuthService.updatePerfil(selectedUser.id, {
                    nombre: form.nombre,
                    apellido: form.apellido,
                    dni: form.dni,
                    telefono: form.telefono,
                    email: form.email,
                });
                showAlert('success', 'Perfil actualizado correctamente');
            } else {
                await AuthService.register({
                    username: form.username,
                    password: form.password,
                    email: form.email,
                    telefono: form.telefono,
                    nombre: form.nombre,
                    apellido: form.apellido,
                    dni: form.dni,
                    clubId: form.clubId ? parseInt(form.clubId) : null,
                    federacionId: resolveFederacionIdForRegister(),
                    rol: form.rol,
                });
                showAlert('success', 'Usuario creado exitosamente');
            }
            setView('lista');
            loadData();
        } catch (err) {
            showAlert('error', 'Error: ' + (err.response?.data?.message || err.message));
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActivo = async (loginUser) => {
        const accion = loginUser.activo ? 'deshabilitar' : 'habilitar';
        setConfirmDialog({
            isOpen: true,
            title: loginUser.activo ? 'Deshabilitar Cuenta' : 'Habilitar Cuenta',
            message: `¿Confirmar ${accion} la cuenta de "${loginUser.username}"?`,
            type: loginUser.activo ? 'warning' : 'info',
            onConfirm: async () => {
                try {
                    await AuthService.toggleActivo(loginUser.id);
                    setUsuarios(prev => prev.map(u => u.id === loginUser.id ? { ...u, activo: !u.activo } : u));
                    showAlert('success', `Cuenta "${loginUser.username}" ${loginUser.activo ? 'deshabilitada' : 'habilitada'} correctamente.`);
                } catch (err) {
                    showAlert('error', 'Error al cambiar el estado: ' + (err.response?.data?.message || err.message));
                }
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
            },
        });
    };

    const usuariosConFederacion = useMemo(
        () => usuarios.map(u => ({
            ...u,
            federacionNombre: getUsuarioFederationName(u, clubes, federaciones),
        })),
        [usuarios, clubes, federaciones]
    );

    const filteredUsuarios = usuariosConFederacion.filter(u => {
        if (!effectiveFedId) return true;
        const userFedId = pick(u, 'federacionId', 'FederacionId');
        if (userFedId) {
            return String(userFedId) === String(effectiveFedId);
        }
        if (u.clubId) {
            const userClub = clubes.find(c => String(pick(c, 'id', 'Id')) === String(u.clubId));
            return userClub && clubBelongsToFederation(userClub, effectiveFedId);
        }
        return false;
    });

    const clubsForForm = useMemo(() => {
        const fedFilter = form.federacionId || effectiveFedId;
        return filterClubesByFederation(clubes, fedFilter);
    }, [clubes, form.federacionId, effectiveFedId]);

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
                        <h1 style={{ margin: 0 }}>Gestión de Logins</h1>
                        <p className="section-subtitle" style={{ margin: '0.2rem 0 0 0' }}>
                            Administrá las credenciales y vinculalas a los clubes de la federación.
                        </p>
                    </div>
                </div>
                {view === 'lista' && (
                    <button className="btn-admin-primary" onClick={handleOpenCrear}>
                        <Plus size={20} /> Nueva Credencial
                    </button>
                )}
            </div>

            {view === 'lista' ? (
                loading ? <div className="loader-container"><div className="loader"></div></div> : (
                    <LoginGrid
                        usuarios={filteredUsuarios}
                        onEditPassword={handleOpenEditar}
                        onEditProfile={handleOpenEditarPerfil}
                        onToggleActivo={handleToggleActivo}
                        showFederation={isSuper && !effectiveFedId}
                    />
                )
            ) : (
                <LoginForm
                    initialData={form}
                    clubes={clubsForForm}
                    federaciones={federaciones}
                    effectiveFedId={effectiveFedId}
                    saving={saving}
                    isEditing={view === 'editar'}
                    isEditingProfile={view === 'editarPerfil'}
                    showFederationSelect={isSuper && !effectiveFedId}
                    showClubSelect={(isSuper || isFedAdmin) && form.rol === 'Club'}
                    onCancel={() => setView('lista')}
                    onSubmit={handleSubmit}
                    onChange={handleFieldChange}
                />
            )}

            {confirmDialog.isOpen && (
                <ConfirmDialog
                    isOpen={confirmDialog.isOpen}
                    onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                    onConfirm={confirmDialog.onConfirm}
                    title={confirmDialog.title}
                    message={confirmDialog.message}
                    type={confirmDialog.type}
                />
            )}
        </div>
    );
};

export default GestionLoginsSection;
