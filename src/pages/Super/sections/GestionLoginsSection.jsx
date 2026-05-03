import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowLeft } from 'lucide-react';
import AuthService from '../../../services/AuthService';
import api from '../../../services/api';
import { ENDPOINTS } from '../../../utils/constants';
import LoginGrid from './LoginGrid';
import LoginForm from './LoginForm';
import { useAlert } from '../../../hooks/useAlert';
import '../../../components/SharedSections/AdminSections.css';

const GestionLoginsSection = () => {
    const navigate = useNavigate();
    const [usuarios, setUsuarios] = useState([]);
    const [clubes, setClubes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('lista'); // 'lista', 'crear', 'editar'
    const [selectedUser, setSelectedUser] = useState(null);
    const [form, setForm] = useState({ username: '', password: '', confirmPassword: '', email: '', clubId: '', rol: 'Club', newPassword: '', confirmNewPassword: '', nombre: '', apellido: '', dni: '', telefono: '' });
    const [saving, setSaving] = useState(false);
    const { alert: msg, showAlert } = useAlert();

    useEffect(() => { 
        loadData(); 
    }, []);

    const loadData = async () => {
        try {
            const [usersRes, clubesRes] = await Promise.all([
                AuthService.getUsuarios(),
                api.get(ENDPOINTS.CLUBES)
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
        } else {
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
            } else {
                await AuthService.register({
                    ...form,
                    clubId: (form.rol === 'Club') ? (form.clubId ? parseInt(form.clubId) : null) : null
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
        if (!window.confirm(`¿Confirmar ${accion} la cuenta de "${user.username}"?`)) return;
        try {
            await AuthService.toggleActivo(user.id);
            // Actualizar estado local optimistamente
            setUsuarios(prev => prev.map(u => u.id === user.id ? { ...u, activo: !u.activo } : u));
            showAlert('success', `Cuenta "${user.username}" ${user.activo ? 'deshabilitada' : 'habilitada'} correctamente.`);
        } catch (err) {
            showAlert('error', 'Error al cambiar el estado: ' + (err.response?.data?.message || err.message));
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
                        usuarios={usuarios} 
                        onEditPassword={handleOpenEditar}
                        onToggleActivo={handleToggleActivo}
                    />
                )
            ) : (
                <LoginForm 
                    initialData={form}
                    clubes={clubes}
                    saving={saving}
                    isEditing={view === 'editar'}
                    onCancel={() => setView('lista')}
                    onSubmit={handleSubmit}
                    onChange={handleFieldChange}
                />
            )}
        </div>
    );
};

export default GestionLoginsSection;
