import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, ArrowLeft } from 'lucide-react';
import AuthService from '../../../services/AuthService';
import api from '../../../services/api';
import { ENDPOINTS } from '../../../utils/constants';
import ConfirmDialog from '../../../components/Common/ConfirmDialog';
import LoginGrid from './LoginGrid';
import LoginForm from './LoginForm';
import { useAlert } from '../../../hooks/useAlert';
import { useAuth } from '../../../context/AuthContext';
import {
    withFederationScope,
    clubBelongsToFederation,
    pick,
    resolveScopeFederationId,
} from '../../../utils/apiHelpers';
import { isSuperAdminUser } from '../../../utils/authHelpers';
import '../../../components/SharedSections/AdminSections.css';

const GestionLoginsSection = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const params = new URLSearchParams(location.search);
    const fedIdFromUrl = params.get('fedId');
    const [clubes, setClubes] = useState([]);
    const scopeFedId = resolveScopeFederationId({ fedIdFromUrl, user, clubes });
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('lista'); // 'lista', 'crear', 'editar', 'editarPerfil'
    const [selectedUser, setSelectedUser] = useState(null);
    const [form, setForm] = useState({ username: '', password: '', confirmPassword: '', email: '', clubId: '', rol: 'Club', newPassword: '', confirmNewPassword: '', nombre: '', apellido: '', dni: '', telefono: '' });
    const [saving, setSaving] = useState(false);
    const { alert: msg, showAlert } = useAlert();
    
    // Confirm Dialog State
    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'warning',
        onConfirm: null
    });

    useEffect(() => { 
        loadData(); 
    }, []);

    const loadData = async () => {
        try {
            const clubesUrl = withFederationScope(ENDPOINTS.CLUBES, scopeFedId);
            const [usersRes, clubesRes] = await Promise.all([
                AuthService.getUsuarios(),
                api.get(clubesUrl)
            ]);
            setUsuarios(usersRes);
            setClubes(clubesRes.data);
        } catch (e) {
            showAlert('error', 'Error al cargar datos');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenCrear = () => {
        setForm({ username: '', password: '', confirmPassword: '', email: '', clubId: '', rol: 'Club', newPassword: '', confirmNewPassword: '', nombre: '', apellido: '', dni: '', telefono: '' });
        setView('crear');
    };

    const handleOpenEditar = (user) => {
        setSelectedUser(user);
        setForm({ username: user.username, newPassword: '', confirmNewPassword: '', nombre: user.nombre || '', apellido: user.apellido || '' });
        setView('editar');
    };

    const handleOpenEditarPerfil = (user) => {
        setSelectedUser(user);
        setForm({ username: user.username, email: user.email || '', nombre: user.nombre || '', apellido: user.apellido || '', dni: user.dni || '', telefono: user.telefono || '' });
        setView('editarPerfil');
    };

    const handleFieldChange = (name, value) => {
        setForm(prev => ({ ...prev, [name]: value }));
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
                    email: form.email
                });
                showAlert('success', 'Perfil actualizado correctamente');
            } else {
                let finalClubId = null;
                if (user?.rol === 'Admin') {
                    finalClubId = user.clubId || null;
                } else {
                    finalClubId = form.clubId ? parseInt(form.clubId) : null;
                }

                await AuthService.register({
                    ...form,
                    clubId: finalClubId,
                    federacionId: getUserFederationId(user) || (fedIdFromUrl ? parseInt(fedIdFromUrl) : undefined),
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

    const handleToggleActivo = async (user) => {
        const accion = user.activo ? 'deshabilitar' : 'habilitar';
        setConfirmDialog({
            isOpen: true,
            title: user.activo ? 'Deshabilitar Cuenta' : 'Habilitar Cuenta',
            message: `¿Confirmar ${accion} la cuenta de "${user.username}"?`,
            type: user.activo ? 'warning' : 'info',
            onConfirm: async () => {
                try {
                    await AuthService.toggleActivo(user.id);
                    // Actualizar estado local optimistamente
                    setUsuarios(prev => prev.map(u => u.id === user.id ? { ...u, activo: !u.activo } : u));
                    showAlert('success', `Cuenta "${user.username}" ${user.activo ? 'deshabilitada' : 'habilitada'} correctamente.`);
                } catch (err) {
                    showAlert('error', 'Error al cambiar el estado: ' + (err.response?.data?.message || err.message));
                }
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    // Filtrado de usuarios según la federación seleccionada en la URL (si viene del dashboard de una federación específica)
    const filteredUsuarios = usuarios.filter(u => {
        if (!fedIdFromUrl) return true;
        const targetFedId = parseInt(fedIdFromUrl);
        const userFedId = pick(u, 'federacionId', 'FederacionId');
        if (userFedId) {
            return String(userFedId) === String(targetFedId);
        }
        if (u.clubId) {
            const userClub = clubes.find(c => pick(c, 'id', 'Id') === u.clubId);
            return userClub && clubBelongsToFederation(userClub, targetFedId);
        }
        return false;
    });

    const filteredClubes = clubes.filter(c => {
        if (!fedIdFromUrl) return true;
        return clubBelongsToFederation(c, parseInt(fedIdFromUrl));
    });

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
                        <p className="section-subtitle" style={{ margin: '0.2rem 0 0 0' }}>Administrá las credenciales de acceso para los clubes.</p>
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
                    />
                )
            ) : (
                <LoginForm 
                    initialData={form}
                    clubes={filteredClubes}
                    saving={saving}
                    isEditing={view === 'editar'}
                    isEditingProfile={view === 'editarPerfil'}
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
