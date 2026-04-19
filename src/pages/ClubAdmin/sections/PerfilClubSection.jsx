import React, { useState, useEffect } from 'react';
import { Save, Building2 } from 'lucide-react';
import ClubService from '../../../services/ClubService';
import { useAuth } from '../../../context/AuthContext';
import './Sections.css';

const PerfilClubSection = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState(null);
    const [form, setForm] = useState({
        nombre: '',
        sigla: '',
        email: '',
        telefono: '',
        direccion: '',
        ubicacion: ''
    });

    useEffect(() => {
        const loadClub = async () => {
            if (!user?.clubId) return;
            try {
                const club = await ClubService.getById(user.clubId);
                setForm({
                    nombre: club.nombre || '',
                    sigla: club.sigla || '',
                    email: club.email || '',
                    telefono: club.telefono || '',
                    direccion: club.direccion || '',
                    ubicacion: club.ubicacion || ''
                });
            } catch (err) {
                console.error("Error cargando club", err);
                setMsg({ type: 'error', text: 'Error al cargar los datos del club.' });
            } finally {
                setLoading(false);
            }
        };
        loadClub();
    }, [user?.clubId]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user?.clubId) return;
        setSaving(true);
        try {
            await ClubService.update(user.clubId, form);
            setMsg({ type: 'success', text: '¡Información del club actualizada con éxito!' });
            setTimeout(() => setMsg(null), 4000);
        } catch (err) {
            setMsg({ type: 'error', text: 'Error al actualizar: ' + err.message });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="loader-container"><div className="loader"></div></div>;
    }

    return (
        <div className="section-container fade-in">
            <div className="section-header">
                <div>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Building2 size={24} color="var(--color-primary-light)" /> Perfil del Club
                    </h2>
                    <p className="subtitle">Modifica la información de contacto e identidad de tu institución</p>
                </div>
            </div>

            {msg && <div className={`alert-msg ${msg.type}`} style={{ marginBottom: '20px' }}>{msg.text}</div>}

            <div className="form-card glass-effect max-w-700">
                <form onSubmit={handleSubmit} className="atleta-form">
                    <div className="form-row">
                        <div className="form-group">
                            <label>Nombre del Club</label>
                            <input 
                                type="text" 
                                name="nombre" 
                                value={form.nombre} 
                                onChange={handleChange} 
                                required 
                                placeholder="Ej: Club de Regatas..."
                            />
                        </div>
                        <div className="form-group">
                            <label>Sigla o Abreviatura</label>
                            <input 
                                type="text" 
                                name="sigla" 
                                value={form.sigla} 
                                onChange={handleChange} 
                                placeholder="Ej: CRR" 
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Correo Electrónico (Contacto Oficial)</label>
                            <input 
                                type="email" 
                                name="email" 
                                value={form.email} 
                                onChange={handleChange} 
                                placeholder="contacto@club.com" 
                            />
                        </div>
                        <div className="form-group">
                            <label>Teléfono Mánager/Sede</label>
                            <input 
                                type="text" 
                                name="telefono" 
                                value={form.telefono} 
                                onChange={handleChange} 
                                placeholder="+54 9 11 ..." 
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Dirección (Sede Social/Deportiva)</label>
                            <input 
                                type="text" 
                                name="direccion" 
                                value={form.direccion} 
                                onChange={handleChange} 
                                placeholder="Calle 123, Ciudad..." 
                            />
                        </div>
                        <div className="form-group">
                            <label>Ubicación Geográfica (Provincia/País)</label>
                            <input 
                                type="text" 
                                name="ubicacion" 
                                value={form.ubicacion} 
                                onChange={handleChange} 
                                placeholder="Ej: Buenos Aires, Argentina" 
                            />
                        </div>
                    </div>

                    <button type="submit" className="btn-submit" disabled={saving} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginTop: '1rem' }}>
                        {saving ? <div className="loader-sm"></div> : <Save size={18} />} 
                        {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default PerfilClubSection;
