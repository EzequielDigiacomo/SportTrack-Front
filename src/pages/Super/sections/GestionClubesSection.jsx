import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowLeft } from 'lucide-react';
import api from '../../../services/api';
import { ENDPOINTS } from '../../../utils/constants';
import ClubGrid from './ClubGrid';
import ClubForm from './ClubForm';
import { useAlert } from '../../../hooks/useAlert';
import '../../../components/SharedSections/AdminSections.css';

const GestionClubesSection = () => {
    const navigate = useNavigate();
    const [clubes, setClubes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('lista'); // 'lista', 'crear', 'editar'
    const [selectedClub, setSelectedClub] = useState(null);
    const [form, setForm] = useState({ nombre: '', sigla: '', email: '', telefono: '', ubicacion: '' });
    const [saving, setSaving] = useState(false);
    const { alert: msg, showAlert } = useAlert();

    useEffect(() => { loadClubes(); }, []);

    const loadClubes = async () => {
        try {
            const res = await api.get(ENDPOINTS.CLUBES);
            setClubes(res.data);
        } catch (e) { showAlert('error', 'Error al cargar clubes'); }
        finally { setLoading(false); }
    };

    const handleOpenCrear = () => {
        setForm({ nombre: '', sigla: '', email: '', telefono: '', ubicacion: '' });
        setView('crear');
    };

    const handleOpenEditar = (club) => {
        setSelectedClub(club);
        setForm({ ...club });
        setView('editar');
    };

    const handleFieldChange = (name, value) => {
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (view === 'editar') {
                await api.put(`${ENDPOINTS.CLUBES}/${selectedClub.id}`, form);
                showAlert('success', 'Club actualizado');
            } else {
                await api.post(ENDPOINTS.CLUBES, form);
                showAlert('success', 'Club registrado');
            }
            setView('lista');
            loadClubes();
        } catch (err) { showAlert('error', 'Error: ' + (err.response?.data?.message || err.message)); }
        finally { setSaving(false); }
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
                        <h1 className="gradient-text" style={{ margin: 0 }}>Clubes Federados</h1>
                        <p className="section-subtitle" style={{ margin: '0.2rem 0 0 0' }}>Gestión de instituciones habilitadas para competir.</p>
                    </div>
                </div>
                {view === 'lista' && (
                    <button className="btn-admin-primary" onClick={handleOpenCrear}>
                        <Plus size={20} /> Nuevo Club
                    </button>
                )}
            </div>

            {view === 'lista' ? (
                loading ? <div className="loader-container"><div className="loader"></div></div> : (
                    <ClubGrid 
                        clubes={clubes} 
                        onEdit={handleOpenEditar} 
                        onViewAtletas={(c) => console.log('Ver atletas de', c.nombre)} 
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
                />
            )}
        </div>
    );
};

export default GestionClubesSection;
