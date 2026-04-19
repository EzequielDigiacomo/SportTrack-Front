import React, { useState, useEffect } from 'react';
import { UserPlus, ArrowLeft } from 'lucide-react';
import AtletaService from '../../../services/AtletaService';
import { useAuth } from '../../../context/AuthContext';
import ConfirmDialog from '../../../components/Common/ConfirmDialog';
import SearchBox from '../../../components/Common/SearchBox';
import AtletaGrid from '../../Super/sections/AtletaGrid';
import AtletaForm from '../../Super/sections/AtletaForm';
import { useAlert } from '../../../hooks/useAlert';
import '../../../components/SharedSections/AdminSections.css';
import './Sections.css';

const AtletasSection = () => {
    const [atletas, setAtletas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('lista'); // 'lista', 'crear', 'editar'
    const [selectedAtleta, setSelectedAtleta] = useState(null);
    const [form, setForm] = useState({
        nombre: '',
        apellido: '',
        dni: '',
        email: '',
        fechaNacimiento: '',
        sexoId: 1,
        pais: 'Ecuador'
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'apellido', direction: 'asc' });
    const { user } = useAuth();
    const { alert: msg, showAlert } = useAlert();
    const [saving, setSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState({ show: false, id: null });

    useEffect(() => {
        loadAtletas();
    }, []);

    const loadAtletas = async () => {
        if (!user?.clubId) return setLoading(false);
        try {
            const data = await AtletaService.getByClub(user.clubId);
            setAtletas(data);
        } catch (error) {
            showAlert('error', 'Error al cargar atletas');
        } finally {
            setLoading(false);
        }
    };
 
    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    const handleOpenCrear = () => {
        setForm({ nombre: '', apellido: '', dni: '', email: '', fechaNacimiento: '', sexoId: 1, pais: 'Ecuador' });
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
            pais: atleta.pais || 'Ecuador'
        });
        setView('editar');
    };

    const handleFieldChange = (name, value) => {
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user?.clubId) {
            showAlert('error', 'Tu usuario no tiene un club asignado.');
            return;
        }

        setSaving(true);
        try {
            if (view === 'editar') {
                await AtletaService.update(selectedAtleta.id, { ...form, clubId: user.clubId });
                showAlert('success', 'Atleta actualizado correctamente');
            } else {
                await AtletaService.create({ ...form, clubId: user.clubId });
                showAlert('success', 'Atleta registrado exitosamente');
            }
            setView('lista');
            loadAtletas();
        } catch (error) {
            showAlert('error', 'Error: ' + (error.response?.data?.message || error.message));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (id) => {
        setDeleteConfirm({ show: true, id });
    };

    const confirmDelete = async () => {
        if (!deleteConfirm.id) return;
        setSaving(true);
        try {
            await AtletaService.delete(deleteConfirm.id);
            showAlert('success', 'Atleta eliminado');
            setDeleteConfirm({ show: false, id: null });
            loadAtletas();
        } catch (error) {
            showAlert('error', 'Error al eliminar');
        } finally {
            setSaving(false);
        }
    };

    const filteredAtletas = atletas
        .filter(atleta => {
            const searchLower = searchTerm.toLowerCase();
            const fullMatch = `${atleta.nombre} ${atleta.apellido} ${atleta.dni} ${atleta.categoriaNombre}`.toLowerCase();
            return fullMatch.includes(searchLower);
        })
        .sort((a, b) => {
            const aVal = a[sortConfig.key] || '';
            const bVal = b[sortConfig.key] || '';
            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

    return (
        <div className="admin-section-container fade-in">
            {msg && <div className={`alert-msg ${msg.type} fade-in`}>{msg.text}</div>}

            <div className="section-header-row">
                <h1>Mis Atletas</h1>
                {view === 'lista' ? (
                    <button className="btn-admin-primary" onClick={handleOpenCrear}>
                        <UserPlus size={20} /> Nuevo Atleta
                    </button>
                ) : (
                    <button className="btn-admin-secondary" onClick={() => setView('lista')}>
                        <ArrowLeft size={20} /> Volver
                    </button>
                )}
            </div>

            {view === 'lista' && (
                <div className="admin-filters-bar glass-effect mb-md">
                    <SearchBox 
                        placeholder="Buscar por nombre, DNI o categoría..." 
                        value={searchTerm}
                        onChange={setSearchTerm}
                    />
                </div>
            )}

            {view === 'lista' ? (
                loading ? <div className="loader-container"><div className="loader"></div></div> : (
                    <AtletaGrid 
                        atletas={filteredAtletas}
                        onEdit={handleOpenEditar}
                        onDelete={handleDelete}
                        sortConfig={sortConfig}
                        requestSort={requestSort}
                    />
                )
            ) : (
                <AtletaForm 
                    initialData={form}
                    saving={saving}
                    isEditing={view === 'editar'}
                    onCancel={() => setView('lista')}
                    onSubmit={handleSubmit}
                    onChange={handleFieldChange}
                    hideClubSelect={true}
                />
            )}

            <ConfirmDialog 
                isOpen={deleteConfirm.show}
                onClose={() => setDeleteConfirm({ show: false, id: null })}
                onConfirm={confirmDelete}
                title="Eliminar Atleta"
                message="¿Estás seguro de eliminar este atleta?"
                type="danger"
                confirmText="Sí, Eliminar"
                loading={saving}
            />
        </div>
    );
};


export default AtletasSection;
