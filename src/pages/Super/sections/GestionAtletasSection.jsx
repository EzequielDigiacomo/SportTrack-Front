import { 
    Users, 
    UserPlus, 
    Search, 
    Edit2, 
    Trash2, 
    ChevronUp, 
    ChevronDown, 
    ArrowUpDown,
    ArrowLeft,
    Filter,
    Mail,
    Plus
} from 'lucide-react';
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
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClub, setSelectedClub] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'apellido', direction: 'asc' });

    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 5;

    useEffect(() => {
        loadData();
    }, []);

    // Resetear a la página 1 cuando cambia la búsqueda
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
            console.error('Error cargando datos:', error);
            setMsg({ type: 'error', text: 'Error al cargar los datos del sistema.' });
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
 
    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return <ArrowUpDown size={14} />;
        return sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
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

    const filteredAtletas = atletas
        .filter(atleta => {
            const searchLower = searchTerm.toLowerCase();
            const searchableText = `${atleta.nombre} ${atleta.apellido} ${atleta.dni} ${atleta.email || ''} ${atleta.categoriaNombre || ''}`.toLowerCase();
            const nameMatch = searchableText.includes(searchLower);
            const clubMatch = !selectedClub || atleta.clubNombre === selectedClub;
            return nameMatch && clubMatch;
        })
        .sort((a, b) => {
            let aVal = a[sortConfig.key];
            let bVal = b[sortConfig.key];
            if (aVal === null || aVal === undefined) aVal = '';
            if (bVal === null || bVal === undefined) bVal = '';
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
        <div className="admin-section fade-in">
            <div className="admin-section-header">
                <div>
                    <h2>Nómina de Atletas</h2>
                    <p className="section-desc">Gestión global de atletas y sus representatividades de club.</p>
                </div>
                {view === 'lista' ? (
                    <button className="btn-admin-primary" onClick={handleOpenCrear}>
                        <UserPlus size={18} style={{marginRight: '6px'}} /> Nuevo Atleta
                    </button>
                ) : (
                    <button className="btn-admin-secondary" onClick={() => setView('lista')}>
                        <ArrowLeft size={18} style={{marginRight: '6px'}} /> Volver a la lista
                    </button>
                )}
            </div>

            {msg && <div className={`alert-msg ${msg.type}`} style={{marginBottom: '1rem'}}>{msg.text}</div>}
 
            {view === 'lista' && (
                <div className="admin-filters-container glass-effect">
                    <div className="admin-filter-row">
                        <div className="filter-group">
                            <label>Filtrar por Club:</label>
                            <select 
                                className="filter-select"
                                value={selectedClub}
                                onChange={(e) => setSelectedClub(e.target.value)}
                            >
                                <option value="">Todos los Clubes</option>
                                {clubes.map(c => (
                                    <option key={c.id} value={c.nombre}>{c.nombre}</option>
                                ))}
                            </select>
                        </div>
                        <div className="filter-stats">
                            Mostrando <strong>{filteredAtletas.length}</strong> de {atletas.length} atletas
                        </div>
                    </div>
                    <div className="admin-search-row">
                        <div className="search-input-wrapper main-search">
                            <i><Search size={18} /></i>
                            <input 
                                type="text" 
                                placeholder="Escribe nombre, apellido, DNI, email o categoría..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            )}

            {view === 'lista' ? (
                loading ? <div className="loader-container"><div className="loader"></div></div> : (
                    <div className="admin-table-wrapper glass-effect">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th className="sortable" onClick={() => requestSort('apellido')}>
                                        Nombre Completo <span className="sort-icon">{getSortIcon('apellido')}</span>
                                    </th>
                                    <th className="sortable" onClick={() => requestSort('dni')}>
                                        DNI <span className="sort-icon">{getSortIcon('dni')}</span>
                                    </th>
                                    <th className="sortable" onClick={() => requestSort('clubNombre')}>
                                        Club <span className="sort-icon">{getSortIcon('clubNombre')}</span>
                                    </th>
                                    <th className="sortable" onClick={() => requestSort('categoriaNombre')}>
                                        Categoría <span className="sort-icon">{getSortIcon('categoriaNombre')}</span>
                                    </th>
                                    <th className="sortable" onClick={() => requestSort('edad')}>
                                        Sex / Edad <span className="sort-icon">{getSortIcon('edad')}</span>
                                    </th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                             <tbody>
                                {displayedAtletas.length > 0 ? displayedAtletas.map(atleta => (
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
                                        <td>
                                            <span style={{fontSize: '0.9rem', color: 'var(--color-primary-light)', fontWeight: '600'}}>
                                                {atleta.categoriaNombre || 'Sin Cat.'}
                                            </span>
                                        </td>
                                        <td>{atleta.sexoNombre?.[0]} / {atleta.edad}a</td>
                                        <td className="actions-cell">
                                            <button className="btn-icon-admin primary" onClick={() => handleOpenEditar(atleta)} title="Editar"><Edit2 size={16} /></button>
                                            <button className="btn-admin-danger" onClick={() => handleDelete(atleta.id)} title="Eliminar" style={{padding: '0.4rem 0.6rem'}}><Trash2 size={16} /></button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="6" className="empty-row">No hay atletas registrados en el sistema.</td></tr>
                                )}
                            </tbody>
                        </table>
                         {/* PAGINACIÓN */}
                         {filteredAtletas.length > rowsPerPage && (
                            <div className="admin-pagination">
                                <button 
                                    className="btn-pagination" 
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(prev => prev - 1)}
                                >
                                    Anterior
                                </button>
                                <div className="pagination-info">
                                    Página <strong>{currentPage}</strong> de {totalPages}
                                </div>
                                <button 
                                    className="btn-pagination" 
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage(prev => prev + 1)}
                                >
                                    Siguiente
                                </button>
                            </div>
                        )}
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
