import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowLeft, Globe, Mail, Phone, Edit, Trash2, ShieldCheck, ShieldAlert, Award, X } from 'lucide-react';
import api from '../../../services/api';
import { useAlert } from '../../../hooks/useAlert';
import { useAuth } from '../../../context/AuthContext';
import '../../../components/SharedSections/AdminSections.css';

const GestionFederacionesSection = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { alert: msg, showAlert } = useAlert();

    const [federaciones, setFederaciones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('lista'); // 'lista', 'crear', 'editar'
    const [selectedFed, setSelectedFed] = useState(null);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // Formulario de creación
    const [createForm, setCreateForm] = useState({
        nombre: '',
        sigla: '',
        email: '',
        telefono: '',
        direccion: '',
        adminUsername: '',
        adminEmail: '',
        adminPassword: '',
        confirmAdminPassword: ''
    });

    // Formulario de edición
    const [editForm, setEditForm] = useState({
        nombre: '',
        cuit: '',
        email: '',
        telefono: '',
        direccion: '',
        bancoNombre: '',
        tipoCuenta: '',
        numeroCuenta: '',
        titularCuenta: '',
        emailCobro: ''
    });

    useEffect(() => {
        loadFederaciones();
    }, []);

    const loadFederaciones = async () => {
        try {
            setLoading(true);
            const res = await api.get('/Federaciones');
            setFederaciones(res.data || res || []);
        } catch (e) {
            console.error("Error loading federations:", e);
            showAlert('error', 'Error al cargar federaciones');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenCrear = () => {
        setCreateForm({
            nombre: '',
            sigla: '',
            email: '',
            telefono: '',
            direccion: '',
            adminUsername: '',
            adminEmail: '',
            adminPassword: '',
            confirmAdminPassword: ''
        });
        setView('crear');
    };

    const handleOpenEditar = (fed) => {
        setSelectedFed(fed);
        setEditForm({
            nombre: fed.nombre || '',
            cuit: fed.cuit || '',
            email: fed.email || '',
            telefono: fed.telefono || '',
            direccion: fed.direccion || '',
            bancoNombre: fed.bancoNombre || '',
            tipoCuenta: fed.tipoCuenta || '',
            numeroCuenta: fed.numeroCuenta || '',
            titularCuenta: fed.titularCuenta || '',
            emailCobro: fed.emailCobro || ''
        });
        setView('editar');
    };

    const handleToggleStatus = async (fed) => {
        try {
            await api.patch(`/saas/clubes/${fed.id}/toggle-activo`);
            showAlert('success', `Estado de ${fed.nombre} modificado correctamente.`);
            loadFederaciones();
        } catch (e) {
            console.error("Error toggling status:", e);
            showAlert('error', 'Error al modificar estado de la federación');
        }
    };

    const handleDeleteClick = (fed) => {
        setSelectedFed(fed);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!selectedFed) return;
        try {
            await api.delete(`/Federaciones/${selectedFed.id}`);
            showAlert('success', 'Federación eliminada correctamente.');
            setShowDeleteModal(false);
            setSelectedFed(null);
            loadFederaciones();
        } catch (e) {
            console.error("Error deleting federation:", e);
            showAlert('error', 'No se pudo eliminar la federación. Asegúrese de que no contenga clubes vinculados.');
            setShowDeleteModal(false);
        }
    };

    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        if (createForm.adminPassword !== createForm.confirmAdminPassword) {
            showAlert('error', 'Las contraseñas del administrador no coinciden.');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                nombre: createForm.nombre,
                sigla: createForm.sigla || createForm.nombre.substring(0, 3).toUpperCase(),
                email: createForm.email,
                telefono: createForm.telefono,
                direccion: createForm.direccion,
                adminUsername: createForm.adminUsername,
                adminEmail: createForm.adminEmail,
                adminPassword: createForm.adminPassword
            };
            await api.post('/saas/create-federacion', payload);
            showAlert('success', 'Federación y Administrador creados con éxito.');
            setView('lista');
            loadFederaciones();
        } catch (err) {
            console.error(err);
            showAlert('error', 'Error al crear federación: ' + (err.response?.data?.message || err.message));
        } finally {
            setSaving(false);
        }
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                ...editForm,
                idFederacion: selectedFed.id
            };
            await api.put(`/Federaciones/${selectedFed.id}`, payload);
            showAlert('success', 'Federación actualizada correctamente.');
            setView('lista');
            loadFederaciones();
        } catch (err) {
            console.error(err);
            showAlert('error', 'Error al actualizar: ' + (err.response?.data?.message || err.message));
        } finally {
            setSaving(false);
        }
    };

    const filteredFederaciones = federaciones.filter(f =>
        f.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (f.sigla && f.sigla.toLowerCase().includes(searchTerm.toLowerCase()))
    );

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
                            Gestión de Federaciones
                        </h1>
                        <p className="section-subtitle" style={{ margin: '0.2rem 0 0 0' }}>
                            Administración y aprovisionamiento de federaciones inquilinas.
                        </p>
                    </div>
                </div>
                {view === 'lista' && (
                    <button className="btn-admin-primary" onClick={handleOpenCrear}>
                        <Plus size={20} /> Nueva Federación
                    </button>
                )}
            </div>

            {view === 'lista' ? (
                loading ? (
                    <div className="loader-container"><div className="loader"></div></div>
                ) : (
                    <>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <input 
                                type="text"
                                className="admin-input"
                                placeholder="Buscar federaciones por nombre o sigla..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                style={{ width: '100%', maxWidth: '400px' }}
                            />
                        </div>

                        {filteredFederaciones.length === 0 ? (
                            <div className="no-data-card" style={{ padding: '3rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                                <p style={{ fontSize: '1.1rem', color: 'var(--color-text-secondary)' }}>No se encontraron federaciones</p>
                            </div>
                        ) : (
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                                gap: '1.5rem'
                            }}>
                                {filteredFederaciones.map(fed => (
                                    <div key={fed.id} className="glass-effect" style={{
                                        padding: '1.5rem',
                                        borderRadius: '16px',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between',
                                        minHeight: '220px',
                                        background: 'rgba(255,255,255,0.03)'
                                    }}>
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                                    <div style={{
                                                        width: '40px',
                                                        height: '40px',
                                                        borderRadius: '8px',
                                                        background: 'rgba(59, 130, 246, 0.15)',
                                                        color: '#60a5fa',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontWeight: 'bold'
                                                    }}>
                                                        {fed.sigla || 'FED'}
                                                    </div>
                                                    <div>
                                                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-text)' }}>{fed.nombre}</h3>
                                                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>ID: {fed.id}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <Mail size={14} />
                                                    <span>{fed.email || 'Sin email'}</span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <Phone size={14} />
                                                    <span>{fed.telefono || 'Sin teléfono'}</span>
                                                </div>
                                                {fed.direccion && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <Globe size={14} />
                                                        <span>{fed.direccion}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem' }}>
                                            <button 
                                                onClick={() => handleToggleStatus(fed)}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    color: fed.activo ? 'var(--color-accent)' : 'var(--color-error)',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.3rem',
                                                    fontWeight: 'bold',
                                                    fontSize: '0.85rem'
                                                }}
                                            >
                                                {fed.activo ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
                                                <span>{fed.activo ? 'Activo' : 'Suspendido'}</span>
                                            </button>

                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button 
                                                    className="btn-admin-secondary" 
                                                    onClick={() => handleOpenEditar(fed)}
                                                    style={{ padding: '0.4rem', borderRadius: '8px' }}
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button 
                                                    className="btn-admin-secondary" 
                                                    onClick={() => handleDeleteClick(fed)}
                                                    style={{ padding: '0.4rem', borderRadius: '8px', color: 'var(--color-error)' }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )
            ) : view === 'crear' ? (
                <form onSubmit={handleCreateSubmit} className="glass-effect" style={{ padding: '2rem', borderRadius: '16px' }}>
                    <h2 style={{ marginBottom: '1.5rem', marginTop: 0 }}>Alta de Federación e Inquilino SaaS</h2>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                        <div>
                            <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', marginBottom: '1rem', color: 'var(--color-accent)' }}>
                                Datos de la Federación
                            </h3>
                            <div className="form-group">
                                <label>Nombre de la Federación *</label>
                                <input 
                                    type="text" 
                                    className="admin-input" 
                                    required 
                                    value={createForm.nombre}
                                    onChange={e => setCreateForm(prev => ({ ...prev, nombre: e.target.value }))}
                                />
                            </div>
                            <div className="form-group">
                                <label>Sigla (e.g. FAF) *</label>
                                <input 
                                    type="text" 
                                    className="admin-input" 
                                    required 
                                    value={createForm.sigla}
                                    onChange={e => setCreateForm(prev => ({ ...prev, sigla: e.target.value }))}
                                />
                            </div>
                            <div className="form-group">
                                <label>Email Institucional *</label>
                                <input 
                                    type="email" 
                                    className="admin-input" 
                                    required 
                                    value={createForm.email}
                                    onChange={e => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                                />
                            </div>
                            <div className="form-group">
                                <label>Teléfono</label>
                                <input 
                                    type="text" 
                                    className="admin-input" 
                                    value={createForm.telefono}
                                    onChange={e => setCreateForm(prev => ({ ...prev, telefono: e.target.value }))}
                                />
                            </div>
                            <div className="form-group">
                                <label>Dirección/País</label>
                                <input 
                                    type="text" 
                                    className="admin-input" 
                                    value={createForm.direccion}
                                    onChange={e => setCreateForm(prev => ({ ...prev, direccion: e.target.value }))}
                                />
                            </div>
                        </div>

                        <div>
                            <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', marginBottom: '1rem', color: 'var(--color-accent-orange)' }}>
                                Cuenta Administrador Principal
                            </h3>
                            <div className="form-group">
                                <label>Nombre de Usuario *</label>
                                <input 
                                    type="text" 
                                    className="admin-input" 
                                    required 
                                    value={createForm.adminUsername}
                                    onChange={e => setCreateForm(prev => ({ ...prev, adminUsername: e.target.value }))}
                                />
                            </div>
                            <div className="form-group">
                                <label>Email de Administrador *</label>
                                <input 
                                    type="email" 
                                    className="admin-input" 
                                    required 
                                    value={createForm.adminEmail}
                                    onChange={e => setCreateForm(prev => ({ ...prev, adminEmail: e.target.value }))}
                                />
                            </div>
                            <div className="form-group">
                                <label>Contraseña *</label>
                                <input 
                                    type="password" 
                                    className="admin-input" 
                                    required 
                                    value={createForm.adminPassword}
                                    onChange={e => setCreateForm(prev => ({ ...prev, adminPassword: e.target.value }))}
                                />
                            </div>
                            <div className="form-group">
                                <label>Confirmar Contraseña *</label>
                                <input 
                                    type="password" 
                                    className="admin-input" 
                                    required 
                                    value={createForm.confirmAdminPassword}
                                    onChange={e => setCreateForm(prev => ({ ...prev, confirmAdminPassword: e.target.value }))}
                                />
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                        <button type="button" className="btn-admin-secondary" onClick={() => setView('lista')}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn-admin-primary" disabled={saving}>
                            {saving ? 'Registrando...' : 'Registrar Federación'}
                        </button>
                    </div>
                </form>
            ) : (
                <form onSubmit={handleEditSubmit} className="glass-effect" style={{ padding: '2rem', borderRadius: '16px' }}>
                    <h2 style={{ marginBottom: '1.5rem', marginTop: 0 }}>Editar Datos de la Federación</h2>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                        <div>
                            <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', marginBottom: '1rem', color: 'var(--color-accent)' }}>
                                Información General
                            </h3>
                            <div className="form-group">
                                <label>Nombre de la Federación *</label>
                                <input 
                                    type="text" 
                                    className="admin-input" 
                                    required 
                                    value={editForm.nombre}
                                    onChange={e => setEditForm(prev => ({ ...prev, nombre: e.target.value }))}
                                />
                            </div>
                            <div className="form-group">
                                <label>CUIT *</label>
                                <input 
                                    type="text" 
                                    className="admin-input" 
                                    required
                                    value={editForm.cuit}
                                    onChange={e => setEditForm(prev => ({ ...prev, cuit: e.target.value }))}
                                />
                            </div>
                            <div className="form-group">
                                <label>Email Institucional *</label>
                                <input 
                                    type="email" 
                                    className="admin-input" 
                                    required 
                                    value={editForm.email}
                                    onChange={e => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                                />
                            </div>
                            <div className="form-group">
                                <label>Teléfono</label>
                                <input 
                                    type="text" 
                                    className="admin-input" 
                                    value={editForm.telefono}
                                    onChange={e => setEditForm(prev => ({ ...prev, telefono: e.target.value }))}
                                />
                            </div>
                            <div className="form-group">
                                <label>Dirección</label>
                                <input 
                                    type="text" 
                                    className="admin-input" 
                                    value={editForm.direccion}
                                    onChange={e => setEditForm(prev => ({ ...prev, direccion: e.target.value }))}
                                />
                            </div>
                        </div>

                        <div>
                            <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', marginBottom: '1rem', color: 'var(--color-accent-orange)' }}>
                                Datos de Cobro y Cuenta Bancaria
                            </h3>
                            <div className="form-group">
                                <label>Nombre del Banco</label>
                                <input 
                                    type="text" 
                                    className="admin-input" 
                                    value={editForm.bancoNombre}
                                    onChange={e => setEditForm(prev => ({ ...prev, bancoNombre: e.target.value }))}
                                />
                            </div>
                            <div className="form-group">
                                <label>Tipo de Cuenta</label>
                                <input 
                                    type="text" 
                                    className="admin-input" 
                                    value={editForm.tipoCuenta}
                                    onChange={e => setEditForm(prev => ({ ...prev, tipoCuenta: e.target.value }))}
                                />
                            </div>
                            <div className="form-group">
                                <label>Número de Cuenta</label>
                                <input 
                                    type="text" 
                                    className="admin-input" 
                                    value={editForm.numeroCuenta}
                                    onChange={e => setEditForm(prev => ({ ...prev, numeroCuenta: e.target.value }))}
                                />
                            </div>
                            <div className="form-group">
                                <label>Titular de la Cuenta</label>
                                <input 
                                    type="text" 
                                    className="admin-input" 
                                    value={editForm.titularCuenta}
                                    onChange={e => setEditForm(prev => ({ ...prev, titularCuenta: e.target.value }))}
                                />
                            </div>
                            <div className="form-group">
                                <label>Email para Cobros MercadoPago/Notificaciones</label>
                                <input 
                                    type="email" 
                                    className="admin-input" 
                                    value={editForm.emailCobro}
                                    onChange={e => setEditForm(prev => ({ ...prev, emailCobro: e.target.value }))}
                                />
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                        <button type="button" className="btn-admin-secondary" onClick={() => setView('lista')}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn-admin-primary" disabled={saving}>
                            {saving ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </div>
                </form>
            )}

            {/* MODAL CONFIRMAR ELIMINACIÓN */}
            {showDeleteModal && selectedFed && (
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
                            <h3 style={{ margin: 0, color: 'var(--color-error)' }}>Confirmar Eliminación</h3>
                            <button onClick={() => setShowDeleteModal(false)}
                                style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <p style={{ color: 'var(--color-text)', lineHeight: '1.6', fontSize: '0.95rem' }}>
                            ¿Está seguro que desea eliminar la federación <strong>{selectedFed.nombre}</strong>?
                        </p>
                        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                            Esta acción eliminará de forma irreversible el inquilino y todo su historial.
                        </p>
                        <div style={{ display: 'flex', gap: '0.8rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                            <button className="btn-admin-secondary" onClick={() => setShowDeleteModal(false)}>
                                Cancelar
                            </button>
                            <button className="btn-admin-primary" onClick={confirmDelete} style={{ background: 'var(--color-error)', borderColor: 'var(--color-error)' }}>
                                Eliminar permanentemente
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GestionFederacionesSection;
