import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, ArrowLeft } from 'lucide-react';
import api from '../../../services/api';
import AuthService from '../../../services/AuthService';
import FederacionService from '../../../services/FederacionService';
import SaaSService from '../../../services/SaaSService';
import { ENDPOINTS } from '../../../utils/constants';
import ClubGrid from './ClubGrid';
import ClubForm from './ClubForm';
import { useAlert } from '../../../hooks/useAlert';
import { useAuth } from '../../../context/AuthContext';
import {
    withFederationScope,
    clubBelongsToFederation,
    pick,
    resolveScopeFederationId,
} from '../../../utils/apiHelpers';
import { isSuperAdminUser } from '../../../utils/authHelpers';
import {
    canAccessDashboardClub,
    extractPlanFromUser,
    normalizePlan,
} from '../../../utils/planHelpers';
import '../../../components/SharedSections/AdminSections.css';

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
            planNombre: plan?.nombre || planNombre,
            plan,
            accesoDashboardClub: canAccessDashboardClub(plan),
        };
    });
};

const GestionClubesSection = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const fedIdFromUrl = new URLSearchParams(location.search).get('fedId');
    const [clubes, setClubes] = useState([]);
    const [federaciones, setFederaciones] = useState([]);
    const scopeFedId = useMemo(
        () => resolveScopeFederationId({ fedIdFromUrl, user, clubes }),
        [fedIdFromUrl, user, clubes]
    );
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('lista');
    const [selectedClub, setSelectedClub] = useState(null);
    const [form, setForm] = useState({
        nombre: '', sigla: '', siglas: '', email: '', telefono: '',
        ubicacion: '', direccion: '', estadoMatricula: 0, federacionId: '',
        crearCuentaLogin: true, loginUsername: '', loginPassword: '', loginConfirmPassword: '',
    });
    const [saving, setSaving] = useState(false);
    const { alert: msg, showAlert } = useAlert();
    const [planes, setPlanes] = useState([]);

    const isSuper = isSuperAdminUser(user);

    const fedAllowsClubLogin = useCallback((federacionId) => {
        if (!isSuper) return canAccessDashboardClub(extractPlanFromUser(user));
        const fed = federaciones.find(f => String(f.id) === String(federacionId));
        if (fed && typeof fed.accesoDashboardClub === 'boolean') return fed.accesoDashboardClub;
        return canAccessDashboardClub(fed?.plan);
    }, [isSuper, user, federaciones]);

    const clubLoginAllowed = fedAllowsClubLogin(form.federacionId || scopeFedId);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const clubesUrl = withFederationScope(ENDPOINTS.CLUBES, scopeFedId);
            const [clubesRes, feds, saasStatus, planesData] = await Promise.all([
                api.get(clubesUrl),
                FederacionService.getAll(),
                SaaSService.getClubesStatus().catch(() => []),
                SaaSService.getPlanes().catch(() => []),
            ]);

            const todos = clubesRes.data || [];
            const enrichedFeds = enrichFederacionesWithPlan(feds, saasStatus, planesData);
            const visibleFeds = scopeFedId
                ? enrichedFeds.filter(fed => String(fed.id) === String(scopeFedId))
                : enrichedFeds;

            let filtrados = todos;
            if (scopeFedId) {
                filtrados = todos.filter(c => clubBelongsToFederation(c, scopeFedId));
            }

            if (planesData?.length) setPlanes(planesData);
            setFederaciones(visibleFeds);
            setClubes(filtrados);
        } catch (e) {
            console.error('Error loading clubs:', e);
            showAlert('error', 'Error al cargar clubes');
        } finally {
            setLoading(false);
        }
    }, [scopeFedId, showAlert]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleOpenCrear = () => {
        const initialFedId = scopeFedId ? parseInt(scopeFedId, 10) : '';
        setForm({
            nombre: '',
            sigla: '',
            siglas: '',
            email: '',
            telefono: '',
            ubicacion: '',
            direccion: '',
            estadoMatricula: 0,
            federacionId: initialFedId,
            planSaaSId: '',
            frecuenciaPago: 'Mensual',
            fechaAltaPlan: '',
            fechaVencimientoPlan: '',
            bloqueadoPorFaltaDePago: false,
            crearCuentaLogin: fedAllowsClubLogin(initialFedId),
            loginUsername: '',
            loginPassword: '',
            loginConfirmPassword: '',
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
        setForm(prev => {
            const next = { ...prev, [name]: value };
            if (name === 'federacionId') {
                next.crearCuentaLogin = fedAllowsClubLogin(value);
            }
            return next;
        });
    };

    const buildClubPayload = () => {
        const fedId = scopeFedId
            ? parseInt(scopeFedId, 10)
            : (form.federacionId ? parseInt(form.federacionId, 10) : null);

        return {
            nombre: form.nombre,
            sigla: form.sigla || form.siglas,
            email: form.email,
            telefono: form.telefono,
            direccion: form.direccion || form.ubicacion,
            ubicacion: form.ubicacion || form.direccion,
            activo: form.activo !== false,
            federacionId: fedId,
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
                if (!payload.federacionId) {
                    showAlert('error', 'Debe seleccionar una federación para el club.');
                    setSaving(false);
                    return;
                }

                const allowClubLogin = fedAllowsClubLogin(payload.federacionId);
                const shouldCreateLogin = allowClubLogin && form.crearCuentaLogin !== false;

                if (shouldCreateLogin) {
                    if (!form.loginUsername?.trim()) {
                        showAlert('error', 'Ingresá el usuario de acceso para el club.');
                        setSaving(false);
                        return;
                    }
                    if (!form.loginPassword || form.loginPassword.length < 6) {
                        showAlert('error', 'La contraseña debe tener al menos 6 caracteres.');
                        setSaving(false);
                        return;
                    }
                    if (form.loginPassword !== form.loginConfirmPassword) {
                        showAlert('error', 'Las contraseñas de acceso no coinciden.');
                        setSaving(false);
                        return;
                    }
                }

                const response = await api.post(ENDPOINTS.CLUBES, payload);
                const newClubId = pick(response.data, 'id', 'Id');

                if (shouldCreateLogin && newClubId) {
                    try {
                        const fedId = payload.federacionId
                            ?? pick(response.data, 'federacionId', 'FederacionId');
                        await AuthService.register({
                            username: form.loginUsername.trim(),
                            password: form.loginPassword,
                            email: form.email?.trim() || `${form.loginUsername.trim()}@sporttrack.local`,
                            telefono: form.telefono || undefined,
                            clubId: parseInt(newClubId, 10),
                            federacionId: fedId != null ? parseInt(fedId, 10) : undefined,
                            rol: 'Club',
                        });
                        showAlert('success', 'Club y cuenta de acceso creados correctamente.');
                    } catch (regErr) {
                        const msgText = regErr.response?.data?.message || regErr.message || '';
                        if (/no incluye dashboard\/login Club/i.test(msgText)) {
                            showAlert('success', 'Club creado. El login de club no aplica en este plan; se puede dar de alta si más adelante contratan SIGDEF Profesional o Pack Dúo.');
                        } else {
                            showAlert('error', `Club creado, pero falló la cuenta de acceso: ${msgText}. Podés vincularla desde Logins.`);
                        }
                    }
                } else if (!allowClubLogin) {
                    showAlert('success', 'Club creado. Este plan no incluye panel Club; queda cargado y el login se puede crear si más adelante pagan SIGDEF/Dúo Profesional o superior.');
                } else {
                    showAlert('success', 'Club registrado. Podés crear su login desde Gestión de Logins.');
                }
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
                    clubLoginAllowed={clubLoginAllowed}
                />
            )}
        </div>
    );
};

export default GestionClubesSection;
