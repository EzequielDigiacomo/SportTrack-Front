import React, { useState, useEffect } from 'react';
import { UserPlus, ArrowLeft, Filter } from 'lucide-react';
import AtletaService from '../../../services/AtletaService';
import ClubService from '../../../services/ClubService';
import ConfirmDialog from '../../../components/Common/ConfirmDialog';
import SearchBox from '../../../components/Common/SearchBox';
import AtletaGrid from './AtletaGrid';
import AtletaForm from './AtletaForm';
import { useAlert } from '../../../hooks/useAlert';
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
        pais: 'Ecuador'
    });

    const [saving, setSaving] = useState(false);
    const { alert: msg, showAlert } = useAlert();
    const [deleteConfirm, setDeleteConfirm] = useState({ show: false, id: null });

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClub, setSelectedClub] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'apellido', direction: 'asc' });

    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 5;

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedClub]);

    const loadData = async () => {
        try {
            const [atletasData, clubesData] = await Promise.all([
                AtletaService.getAll(),
                ClubService.getAll()
            ]);
            setAtletas(atletasData);
            setClubes(clubesData);
        } catch (error) {
            showAlert('error', 'Error al cargar los datos del sistema.');
        } finally {
            setLoading(false);
        }
    };
 
    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
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
            pais: 'Ecuador'
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
            pais: atleta.pais || 'Ecuador'
        });
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
                await AtletaService.update(selectedAtleta.id, form);
                showAlert('success', 'Atleta actualizado correctamente.');
            } else {
                await AtletaService.create(form);
                showAlert('success', 'Atleta registrado exitosamente.');
            }
            setView('lista');
            loadData();
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
        const { id } = deleteConfirm;
        if (!id) return;
        setSaving(true);
        try {
            await AtletaService.delete(id);
            showAlert('success', 'Atleta eliminado correctamente.');
            setDeleteConfirm({ show: false, id: null });
            loadData();
        } catch (error) {
            showAlert('error', 'Error al eliminar: ' + (error.response?.data?.message || error.message));
        } finally {
            setSaving(false);
        }
    };

    const filteredAtletas = atletas
        .filter(atleta => {
            const searchLower = searchTerm.toLowerCase();
            const searchableText = `${atleta.nombre} ${atleta.apellido} ${atleta.dni} ${atleta.email || ''} ${atleta.categoriaNombre || ''}`.toLowerCase();
            const nameMatch = searchableText.includes(searchLower);
            const clubMatch = !selectedClub || atleta.clubNombre === selectedClub;
            return nameMatch && clubMatch;
        })
        .sort((a, b) => {
            let aVal = a[sortConfig.key] || '';
            let bVal = b[sortConfig.key] || '';
            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

    const totalPages = Math.ceil(filteredAtletas.length / rowsPerPage);
    const displayedAtletas = filteredAtletas.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage
    );

    return (
        <div className="admin-section-container">
            {msg && <div className={`alert-msg ${msg.type} fade-in`}>{msg.text}</div>}

            <div className="section-header-row">
                <div>
                    <h1>Nómina de Atletas</h1>
                    <p className="section-subtitle">Gestión global de atletas y sus representatividades de club.</p>
                </div>
                {view === 'lista' ? (
                    <button className="btn-admin-primary" onClick={handleOpenCrear}>
                        <UserPlus size={20} /> Nuevo Atleta
                    </button>
                ) : (
                    <button className="btn-admin-secondary" onClick={() => setView('lista')}>
                        <ArrowLeft size={20} /> Volver a la lista
                    </button>
                )}
            </div>

            {view === 'lista' && (
                <div className="admin-filters-bar glass-effect fade-in">
                    <div className="admin-filter-item">
                        <Filter size={18} className="filter-icon" />
                        <select 
                            className="filter-select"
                            value={selectedClub} 
                            onChange={(e) => setSelectedClub(e.target.value)}
                        >
                            <option value="">Todos los Clubes</option>
                            {clubes.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                        </select>
                    </div>
                    <SearchBox 
                        placeholder="Busca por nombre, DNI o categoría..."
                        value={searchTerm}
                        onChange={setSearchTerm}
                    />
                </div>
            )}

            {view === 'lista' ? (
                loading ? <div className="loader-container"><div className="loader"></div></div> : (
                    <>
                        <AtletaGrid 
                            atletas={displayedAtletas}
                            onEdit={handleOpenEditar}
                            onDelete={handleDelete}
                            sortConfig={sortConfig}
                            requestSort={requestSort}
                        />
                        
                        {filteredAtletas.length > rowsPerPage && (
                            <div className="admin-pagination">
                                <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Anterior</button>
                                <span className="page-indicator">Página <b>{currentPage}</b> de {totalPages}</span>
                                <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Siguiente</button>
                            </div>
                        )}
                    </>
                )
            ) : (
                <AtletaForm 
                    initialData={form}
                    clubes={clubes}
                    saving={saving}
                    isEditing={view === 'editar'}
                    onCancel={() => setView('lista')}
                    onSubmit={handleSubmit}
                    onChange={handleFieldChange}
                />
            )}

            <ConfirmDialog 
                isOpen={deleteConfirm.show}
                onClose={() => setDeleteConfirm({ show: false, id: null })}
                onConfirm={confirmDelete}
                title="Eliminar Atleta"
                message="¿Estás seguro de que deseas eliminar este atleta? Esta acción no se puede deshacer."
                type="danger"
                confirmText="Sí, Eliminar"
                loading={saving}
            />
        </div>
    );
};

export default GestionAtletasSection;
