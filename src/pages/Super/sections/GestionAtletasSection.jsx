import React, { useState, useEffect } from 'react';
import AtletaService from '../../../services/AtletaService';
import ClubService from '../../../services/ClubService';
import '../../../components/SharedSections/AdminSections.css';

const GestionAtletasSection = () => {
    const [atletas, setAtletas] = useState([]);
    const [clubes, setClubes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('lista'); // 'lista' | 'crear' | 'editar'
    const [selectedAtleta, setSelectedAtleta] = useState(null);
    const [form, setForm] = useState({
        nombre: '',
        apellido: '',
        dni: '',
        email: '',
        fechaNacimiento: '',
        sexoId: 1,
        clubId: '',
        pais: 'Argentina'
    });
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [atletasData, clubesData] = await Promise.all([
                AtletaService.getAll(),
                ClubService.getAll()
            ]);
            setAtletas(atletasData);
            setClubes(clubesData);
        } catch (error) {
            console.error('Error cargando datos:', error);
            setMsg({ type: 'error', text: 'Error al cargar los datos del sistema.' });
        } finally {
            setLoading(false);
        }
    };

    const handleOpenCrear = () => {
        setForm({
            nombre: '',
            apellido: '',
            dni: '',
            email: '',
            fechaNacimiento: '',
            sexoId: 1,
            clubId: '',
            pais: 'Argentina'
        });
        setView('crear');
    };

    const handleOpenEditar = (atleta) => {
        setSelectedAtleta(atleta);
        setForm({
            nombre: atleta.nombre || '',
            apellido: atleta.apellido || '',
            dni: atleta.dni || '',
            email: atleta.email || '',
            fechaNacimiento: atleta.fechaNacimiento ? atleta.fechaNacimiento.substring(0, 10) : '',
            sexoId: atleta.sexoId || 1,
            clubId: atleta.clubId || '',
            pais: atleta.pais || 'Argentina'
        });
        setView('editar');
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (view === 'editar') {
                await AtletaService.update(selectedAtleta.id, form);
                setMsg({ type: 'success', text: 'Atleta actualizado correctamente.' });
            } else {
                await AtletaService.create(form);
                setMsg({ type: 'success', text: 'Atleta registrado exitosamente.' });
            }
            setView('lista');
            loadData();
        } catch (error) {
            setMsg({ type: 'error', text: 'Error: ' + (error.response?.data?.message || error.message) });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Estás seguro de eliminar este atleta del sistema?')) return;
        try {
            await AtletaService.delete(id);
            setMsg({ type: 'success', text: 'Atleta eliminado.' });
            loadData();
        } catch (error) {
            setMsg({ type: 'error', text: 'No se pudo eliminar el atleta.' });
        }
    };

    return (
        <div className="admin-section fade-in">
            <div className="admin-section-header">
                <div>
                    <h2>Nómina de Atletas</h2>
                    <p className="section-desc">Gestión global de atletas y sus representatividades de club.</p>
                </div>
                {view === 'lista' ? (
                    <button className="btn-admin-primary" onClick={handleOpenCrear}>+ Nuevo Atleta</button>
                ) : (
                    <button className="btn-admin-secondary" onClick={() => setView('lista')}>← Volver a la lista</button>
                )}
            </div>

            {msg && <div className={`alert-msg ${msg.type}`} style={{marginBottom: '1rem'}}>{msg.text}</div>}

            {view === 'lista' ? (
                loading ? <div className="loader-container"><div className="loader"></div></div> : (
                    <div className="admin-table-wrapper glass-effect">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Nombre Completo</th>
                                    <th>DNI</th>
                                    <th>Club</th>
                                    <th>Sex / Edad</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {atletas.length > 0 ? atletas.map(atleta => (
                                    <tr key={atleta.id}>
                                        <td>
                                            <div style={{fontWeight: 'bold'}}>{atleta.nombre} {atleta.apellido}</div>
                                            <div style={{fontSize: '0.8rem', color: 'var(--color-text-dim)'}}>{atleta.email || 'Sin email'}</div>
                                        </td>
                                        <td>{atleta.dni || '—'}</td>
                                        <td>
                                            <span className="chip" style={{background: 'rgba(0,150,255,0.1)', color: '#0096ff'}}>
                                                {atleta.clubNombre || 'Independiente'}
                                            </span>
                                        </td>
                                        <td>{atleta.sexoNombre?.[0]} / {atleta.edad}a</td>
                                        <td className="actions-cell">
                                            <button className="btn-admin-secondary" onClick={() => handleOpenEditar(atleta)} style={{padding: '0.4rem 0.6rem', fontSize: '0.8rem', marginRight: '0.5rem'}}>✏️</button>
                                            <button className="btn-admin-danger" onClick={() => handleDelete(atleta.id)} style={{padding: '0.4rem 0.6rem', fontSize: '0.8rem'}}>🗑️</button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="5" className="empty-row">No hay atletas registrados en el sistema.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )
            ) : (
                <div className="create-event-form glass-effect">
                    <h3>{view === 'editar' ? 'Editar Atleta' : 'Registrar Nuevo Atleta'}</h3>
                    <form onSubmit={handleSubmit}>
                        <div className="form-grid">
                            <div className="form-field">
                                <label>Nombre *</label>
                                <input type="text" name="nombre" value={form.nombre} onChange={handleChange} required />
                            </div>
                            <div className="form-field">
                                <label>Apellido *</label>
                                <input type="text" name="apellido" value={form.apellido} onChange={handleChange} required />
                            </div>
                            <div className="form-field">
                                <label>DNI / Documento *</label>
                                <input type="text" name="dni" value={form.dni} onChange={handleChange} required />
                            </div>
                            <div className="form-field">
                                <label>Email</label>
                                <input type="email" name="email" value={form.email} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>Club / Representación *</label>
                                <select name="clubId" value={form.clubId} onChange={handleChange} required>
                                    <option value="">-- Seleccionar Club --</option>
                                    {clubes.map(c => (
                                        <option key={c.id} value={c.id}>{c.nombre} ({c.sigla})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-field">
                                <label>Fecha de Nacimiento *</label>
                                <input type="date" name="fechaNacimiento" value={form.fechaNacimiento} onChange={handleChange} required />
                            </div>
                            <div className="form-field">
                                <label>Sexo *</label>
                                <select name="sexoId" value={form.sexoId} onChange={handleChange} required>
                                    <option value={1}>Masculino</option>
                                    <option value={2}>Femenino</option>
                                    <option value={3}>Mixto</option>
                                </select>
                            </div>
                        </div>
                        <button type="submit" className="btn-submit-admin" disabled={saving}>
                            {saving ? 'Guardando...' : (view === 'editar' ? 'Actualizar Atleta' : 'Confirmar Registro')}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default GestionAtletasSection;
