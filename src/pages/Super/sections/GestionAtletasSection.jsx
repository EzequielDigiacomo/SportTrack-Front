import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserPlus, ArrowLeft, Filter, Link2, X } from 'lucide-react';
import AtletaService from '../../../services/AtletaService';
import ClubService from '../../../services/ClubService';
import ConfirmDialog from '../../../components/Common/ConfirmDialog';
import SearchBox from '../../../components/Common/SearchBox';
import AtletaGrid from './AtletaGrid';
import AtletaForm from './AtletaForm';
import { useAlert } from '../../../hooks/useAlert';
import '../../../components/SharedSections/AdminSections.css';

const GestionAtletasSection = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const clubIdFromUrl = params.get('clubId');
    const clubNombreFromUrl = params.get('clubNombre') ? decodeURIComponent(params.get('clubNombre')) : '';
    const fedIdFromUrl = params.get('fedId');

    const [atletas, setAtletas] = useState([]);
    const [clubes, setClubes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('lista');
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
    const [assignModal, setAssignModal] = useState({ show: false, atleta: null, clubId: '' });

    const [searchTerm, setSearchTerm] = useState('');
    // Si venimos desde un club específico, lo pre-filtramos por nombre
    const [selectedClub, setSelectedClub] = useState(clubNombreFromUrl || '');
    const [sortConfig, setSortConfig] = useState({ key: 'apellido', direction: 'asc' });

    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 9;

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

    const handleAssignClub = async () => {
        if (!assignModal.clubId || !assignModal.atleta) return;
        setSaving(true);
        try {
            const atleta = assignModal.atleta;
            await AtletaService.update(atleta.id, {
                nombre: atleta.nombre,
                apellido: atleta.apellido,
                dni: atleta.dni,
                email: atleta.email || '',
                fechaNacimiento: atleta.fechaNacimiento,
                sexoId: atleta.sexoId,
                clubId: parseInt(assignModal.clubId),
                pais: atleta.pais || 'Ecuador'
            });
            showAlert('success', `${atleta.nombre} ${atleta.apellido} asignado correctamente.`);
            setAssignModal({ show: false, atleta: null, clubId: '' });
            loadData();
        } catch (err) {
            showAlert('error', 'Error al asignar: ' + (err.response?.data?.message || err.message));
        } finally {
            setSaving(false);
        }
    };

    const filteredAtletas = atletas
        .filter(atleta => {
            const searchLower = searchTerm.toLowerCase();
            const searchableText = `${atleta.nombre} ${atleta.apellido} ${atleta.dni} ${atleta.email || ''} ${atleta.categoriaNombre || ''}`.toLowerCase();
            const nameMatch = searchableText.includes(searchLower);
            let clubMatch;
            if (selectedClub === '__SIN_CLUB__') {
                clubMatch = !atleta.clubNombre || atleta.clubId === null || atleta.clubId === 0;
            } else {
                clubMatch = !selectedClub || atleta.clubNombre === selectedClub;
            }

            // Scoping por federación
            let fedMatch = true;
            if (fedIdFromUrl) {
                const targetFedId = parseInt(fedIdFromUrl);
                if (atleta.clubId) {
                    const athleteClub = clubes.find(c => c.id === atleta.clubId);
                    fedMatch = athleteClub && (athleteClub.id === targetFedId || athleteClub.parentClubId === targetFedId);
                } else {
                    // Atletas sin club (siempre visibles para poder ser asignados a clubes de esta federación)
                    fedMatch = true;
                }
            }

            return nameMatch && clubMatch && fedMatch;
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
                        <h1 style={{ margin: 0 }}>
                            {clubNombreFromUrl ? `Atletas — ${clubNombreFromUrl}` : 'Nómina de Atletas'}
                        </h1>
                        <p className="section-subtitle" style={{ margin: '0.2rem 0 0 0' }}>
                            {clubNombreFromUrl 
                                ? `Mostrando atletas del club seleccionado.`
                                : 'Gestión global de atletas y sus representatividades de club.'
                            }
                        </p>
                    </div>
                </div>
                {view === 'lista' && (
                    <button className="btn-admin-primary" onClick={handleOpenCrear}>
                        <UserPlus size={20} /> Nuevo Atleta
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
                            <option value="__SIN_CLUB__">⚠️ Sin Club asignado</option>
                            {clubes
                                .filter(c => !fedIdFromUrl || c.id === parseInt(fedIdFromUrl) || c.parentClubId === parseInt(fedIdFromUrl))
                                .map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)
                            }
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
                            onAssignClub={(atleta) => setAssignModal({ show: true, atleta, clubId: '' })}
                            sortConfig={sortConfig}
                            requestSort={requestSort}
                        />
                        
                        {filteredAtletas.length > rowsPerPage && (
                            <div className="admin-pagination">
                                <button className="btn-admin-secondary" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Anterior</button>
                                <span className="page-indicator">Página <b>{currentPage}</b> de {totalPages}</span>
                                <button className="btn-admin-secondary" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Siguiente</button>
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

            {/* MODAL ASIGNAR CLUB */}
            {assignModal.show && (
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <Link2 size={20} style={{ color: 'var(--color-accent-orange)' }} />
                                <h3 style={{ margin: 0 }}>Asignar Club</h3>
                            </div>
                            <button onClick={() => setAssignModal({ show: false, atleta: null, clubId: '' })}
                                style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                            Atleta: <strong style={{ color: 'var(--color-text)' }}>
                                {assignModal.atleta?.nombre} {assignModal.atleta?.apellido}
                            </strong>
                        </p>
                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                                Seleccionar Club
                            </label>
                            <select
                                className="admin-select"
                                value={assignModal.clubId}
                                onChange={e => setAssignModal(prev => ({ ...prev, clubId: e.target.value }))}
                                style={{ width: '100%' }}
                            >
                                <option value="">-- Elegir un club --</option>
                                {clubes
                                    .filter(c => c.parentClubId && (!fedIdFromUrl || c.parentClubId === parseInt(fedIdFromUrl)))
                                    .map(c => (
                                        <option key={c.id} value={c.id}>{c.nombre}</option>
                                    ))
                                }
                            </select>
                        </div>
                        <div style={{ display: 'flex', gap: '0.8rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                            <button className="btn-admin-secondary"
                                onClick={() => setAssignModal({ show: false, atleta: null, clubId: '' })}>
                                Cancelar
                            </button>
                            <button className="btn-admin-primary"
                                disabled={!assignModal.clubId || saving}
                                onClick={handleAssignClub}
                                style={{ background: 'var(--color-accent-orange)', borderColor: 'var(--color-accent-orange)' }}>
                                {saving ? 'Guardando...' : 'Asignar Club'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GestionAtletasSection;
