import React, { useState, useEffect } from 'react';
import AuthService from '../../../services/AuthService';
import api from '../../../services/api';
import { ENDPOINTS } from '../../../utils/constants';
import '../../../components/SharedSections/AdminSections.css';

const GestionLoginsSection = () => {
    const [usuarios, setUsuarios] = useState([]);
    const [clubes, setClubes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [showEditForm, setShowEditForm] = useState(false);
    const [form, setForm] = useState({ username: '', password: '', email: '', clubId: '' });
    const [editForm, setEditForm] = useState({ id: null, newPassword: '' });

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
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await AuthService.register({
                ...form,
                clubId: form.clubId ? parseInt(form.clubId) : null,
                rol: 'Club'
            });
            setShowForm(false);
            setForm({ username: '', password: '', email: '', clubId: '' });
            loadData();
            alert('¡Usuario creado con éxito!');
        } catch (err) {
            alert('Error: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            await AuthService.updatePassword(editForm.id, editForm.newPassword);
            setShowEditForm(false);
            setEditForm({ id: null, newPassword: '' });
            alert('¡Contraseña actualizada con éxito!');
        } catch (err) {
            alert('Error al actualizar contraseña: ' + (err.response?.data?.message || err.message));
        }
    };

    const openEditModal = (id) => {
        setEditForm({ id, newPassword: '' });
        setShowEditForm(true);
    };

    return (
        <div className="admin-section fade-in">
            <div className="admin-section-header">
                <div>
                    <h2>Gestión de Logins (Credenciales)</h2>
                    <p className="section-desc">Crea y administra los accesos para los clubes del sistema</p>
                </div>
                {!showEditForm && (
                    <button className="btn-admin-primary" onClick={() => setShowForm(!showForm)}>
                        {showForm ? 'Cancelar' : '+ Crear Credencial'}
                    </button>
                )}
            </div>

            {showForm && (
                <div className="create-event-form glass-effect fade-in">
                    <h3>Nueva Credencial de Club</h3>
                    <form onSubmit={handleSubmit}>
                        <div className="form-grid">
                            <div className="form-field">
                                <label>Usuario *</label>
                                <input type="text" name="username" value={form.username} onChange={handleChange} required />
                            </div>
                            <div className="form-field">
                                <label>Email *</label>
                                <input type="email" name="email" value={form.email} onChange={handleChange} required />
                            </div>
                            <div className="form-field">
                                <label>Contraseña *</label>
                                <input type="password" name="password" value={form.password} onChange={handleChange} required minLength="6" />
                            </div>
                            <div className="form-field">
                                <label>Club Asociado</label>
                                <select name="clubId" value={form.clubId} onChange={handleChange} required>
                                    <option value="">Seleccionar Club...</option>
                                    {clubes.map(c => (
                                        <option key={c.id} value={c.id}>{c.nombre}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <button type="submit" className="btn-submit-admin">Guardar Usuario</button>
                    </form>
                </div>
            )}

            {showEditForm && (
                <div className="create-event-form glass-effect fade-in">
                    <h3>Actualizar Contraseña</h3>
                    <form onSubmit={handleEditSubmit}>
                        <div className="form-grid">
                            <div className="form-field full-width">
                                <label>Nueva Contraseña *</label>
                                <input type="password" name="newPassword" value={editForm.newPassword} onChange={e => setEditForm({ ...editForm, newPassword: e.target.value })} required minLength="6" />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                            <button type="submit" className="btn-submit-admin">Actualizar</button>
                            <button type="button" className="btn-admin-secondary" onClick={() => setShowEditForm(false)}>Cancelar</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="admin-table-wrapper glass-effect">
                {loading ? <div className="loader-row"><div className="loader"></div></div> : (
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Usuario</th>
                                <th>Email</th>
                                <th>Rol</th>
                                <th>Club Asociado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {usuarios.length ? usuarios.map(u => (
                                <tr key={u.id}>
                                    <td><strong>{u.username}</strong></td>
                                    <td>{u.email || '—'}</td>
                                    <td><span className="count-badge">{u.rol}</span></td>
                                    <td>{u.clubNombre || '—'}</td>
                                    <td className="actions-cell">
                                        <button className="btn-icon-admin" title="Cambiar Contraseña" onClick={() => openEditModal(u.id)}>🔑</button>
                                    </td>
                                </tr>
                            )) : <tr><td colSpan="5" className="empty-row">No hay usuarios registrados</td></tr>}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default GestionLoginsSection;
