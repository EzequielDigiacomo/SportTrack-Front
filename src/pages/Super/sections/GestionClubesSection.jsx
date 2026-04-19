import { Users, Edit2, Plus, X, ArrowLeft } from 'lucide-react';
import api from '../../../services/api';
import { ENDPOINTS } from '../../../utils/constants';
import React, { useState, useEffect } from 'react';
import '../../../components/SharedSections/AdminSections.css';

const GestionClubesSection = () => {
    const [clubes, setClubes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ nombre: '', sigla: '', email: '', telefono: '', ubicacion: '' });

    useEffect(() => { loadClubes(); }, []);

    const loadClubes = async () => {
        try {
            const res = await api.get(ENDPOINTS.CLUBES);
            setClubes(res.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post(ENDPOINTS.CLUBES, form);
            setShowForm(false);
            setForm({ nombre: '', sigla: '', email: '', telefono: '', ubicacion: '' });
            loadClubes();
        } catch (err) { alert('Error: ' + err.message); }
    };

    return (
        <div className="admin-section fade-in">
            <div className="admin-section-header">
                <div>
                    <h2>Clubes Registrados</h2>
                    <p className="section-desc">Administrá los clubes habilitados en el sistema</p>
                </div>
                <button className={`btn-admin-${showForm ? 'secondary' : 'primary'}`} onClick={() => setShowForm(!showForm)}>
                    {showForm ? <><X size={18} /> Cancelar</> : <><Plus size={18} /> Agregar Club</>}
                </button>
            </div>

            {showForm && (
                <div className="create-event-form glass-effect fade-in">
                    <h3>Nuevo Club</h3>
                    <form onSubmit={handleSubmit}>
                        <div className="form-grid">
                            <div className="form-field"><label>Nombre *</label><input type="text" name="nombre" value={form.nombre} onChange={handleChange} required /></div>
                            <div className="form-field"><label>Sigla</label><input type="text" name="sigla" value={form.sigla} onChange={handleChange} maxLength="10" /></div>
                            <div className="form-field"><label>Email</label><input type="email" name="email" value={form.email} onChange={handleChange} /></div>
                            <div className="form-field"><label>Teléfono</label><input type="text" name="telefono" value={form.telefono} onChange={handleChange} /></div>
                            <div className="form-field full-width"><label>Ubicación</label><input type="text" name="ubicacion" value={form.ubicacion} onChange={handleChange} placeholder="Ciudad, Provincia" /></div>
                        </div>
                        <button type="submit" className="btn-submit-admin">Guardar Club</button>
                    </form>
                </div>
            )}

            <div className="admin-table-wrapper glass-effect">
                {loading ? <div className="loader-row"><div className="loader"></div></div> : (
                    <table className="admin-table">
                        <thead>
                            <tr><th>Club</th><th>Sigla</th><th>Email</th><th>Ubicación</th><th>Acciones</th></tr>
                        </thead>
                        <tbody>
                            {clubes.length ? clubes.map(c => (
                                <tr key={c.id}>
                                    <td><strong>{c.nombre}</strong></td>
                                    <td><span className="sigla-tag">{c.sigla || '—'}</span></td>
                                    <td>{c.email || '—'}</td>
                                    <td>{c.ubicacion || '—'}</td>
                                    <td className="actions-cell">
                                        <button className="btn-icon-admin primary" title="Editar"><Edit2 size={16} /></button>
                                        <button className="btn-icon-admin" title="Ver Atletas"><Users size={16} /></button>
                                    </td>
                                </tr>
                            )) : <tr><td colSpan="5" className="empty-row">No hay clubes registrados</td></tr>}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default GestionClubesSection;
