import React, { useState, useEffect } from 'react';
import { 
    Search, 
    ChevronUp, 
    ChevronDown, 
    ArrowUpDown, 
    Edit2, 
    Trash2, 
    UserPlus, 
    X, 
    Download 
} from 'lucide-react';
import AtletaService from '../../../services/AtletaService';
import { useAuth } from '../../../context/AuthContext';
import './Sections.css';

const AtletasSection = () => {
    const [atletas, setAtletas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [newAtleta, setNewAtleta] = useState({
        nombre: '',
        apellido: '',
        dni: '',
        email: '',
        fechaNacimiento: '',
        sexoId: 1,
        pais: 'Argentina'
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'apellido', direction: 'asc' });
    const { user } = useAuth();

    useEffect(() => {
        loadAtletas();
    }, []);

    const loadAtletas = async () => {
        if (!user?.clubId) {
            console.warn('Usuario sin clubId asignado');
            setLoading(false);
            return;
        }
        try {
            const data = await AtletaService.getByClub(user.clubId);
            setAtletas(data);
        } catch (error) {
            console.error('Error cargando atletas:', error);
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

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewAtleta(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user?.clubId) {
            alert('Error: tu usuario no tiene un club asignado. Contactá al administrador.');
            return;
        }
        try {
            await AtletaService.create({ ...newAtleta, clubId: user.clubId });
            setShowForm(false);
            setNewAtleta({ nombre: '', apellido: '', dni: '', email: '', fechaNacimiento: '', sexoId: 1, pais: 'Argentina' });
            loadAtletas();
        } catch (error) {
            alert('Error al crear atleta: ' + (error.response?.data?.message || error.message));
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
        <div className="section-container fade-in">
            <div className="section-header">
                <h2>Mis Atletas</h2>
                <button className={`btn-${showForm ? 'secondary' : 'primary'}`} onClick={() => setShowForm(!showForm)}>
                    {showForm ? <><X size={18} /> Cancelar</> : <><UserPlus size={18} /> Agregar Atleta</>}
                </button>
            </div>

            <div className="admin-search-bar glass-effect">
                <div className="search-input-wrapper">
                    <i><Search size={18} /></i>
                    <input 
                        type="text" 
                        placeholder="Buscar por nombre, DNI o categoría..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {showForm && (
                <div className="form-card glass-effect fade-in">
                    <form onSubmit={handleSubmit} className="atleta-form">
                        <div className="form-row">
                            <div className="form-group">
                                <label>Nombre</label>
                                <input type="text" name="nombre" value={newAtleta.nombre} onChange={handleInputChange} required />
                            </div>
                            <div className="form-group">
                                <label>Apellido</label>
                                <input type="text" name="apellido" value={newAtleta.apellido} onChange={handleInputChange} required />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>DNI / Documento</label>
                                <input type="text" name="dni" value={newAtleta.dni} onChange={handleInputChange} placeholder="Sin puntos" required />
                            </div>
                            <div className="form-group">
                                <label>Email de Contacto</label>
                                <input type="email" name="email" value={newAtleta.email} onChange={handleInputChange} placeholder="atleta@ejemplo.com" />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Fecha de Nacimiento</label>
                                <input type="date" name="fechaNacimiento" value={newAtleta.fechaNacimiento} onChange={handleInputChange} required />
                            </div>
                            <div className="form-group">
                                <label>Sexo</label>
                                <select name="sexoId" value={newAtleta.sexoId} onChange={handleInputChange}>
                                    <option value={1}>Masculino</option>
                                    <option value={2}>Femenino</option>
                                    <option value={3}>Mixto</option>
                                </select>
                            </div>
                        </div>
                        <button type="submit" className="btn-submit">Guardar Atleta</button>
                    </form>
                </div>
            )}

            <div className="atletas-table-container glass-effect">
                {loading ? (
                    <div className="loader-container"><div className="loader"></div></div>
                ) : (
                    <table className="custom-table">
                        <thead>
                            <tr>
                                <th className="sortable" onClick={() => requestSort('apellido')}>
                                    Nombre Completo <span className="sort-icon">{getSortIcon('apellido')}</span>
                                </th>
                                <th className="sortable" onClick={() => requestSort('dni')}>
                                    DNI <span className="sort-icon">{getSortIcon('dni')}</span>
                                </th>
                                <th className="sortable" onClick={() => requestSort('edad')}>
                                    Edad <span className="sort-icon">{getSortIcon('edad')}</span>
                                </th>
                                <th>Sexo</th>
                                <th className="sortable" onClick={() => requestSort('categoriaNombre')}>
                                    Categoría <span className="sort-icon">{getSortIcon('categoriaNombre')}</span>
                                </th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAtletas.length > 0 ? filteredAtletas.map(atleta => (
                                <tr key={atleta.id}>
                                    <td>
                                        <div style={{fontWeight: 'bold'}}>{atleta.nombre} {atleta.apellido}</div>
                                        <div style={{fontSize: '0.8rem', color: 'var(--color-text-dim)'}}>{atleta.email || 'Sin email'}</div>
                                    </td>
                                    <td>{atleta.dni || '—'}</td>
                                    <td>{atleta.edad} años</td>
                                    <td>{atleta.sexoNombre}</td>
                                    <td>{atleta.categoriaNombre || 'N/A'}</td>
                                    <td>
                                        <button className="btn-icon" title="Editar"><Edit2 size={16} /></button>
                                        <button className="btn-icon btn-delete" title="Eliminar" onClick={async () => {
                                            if(window.confirm("¿Borrar atleta?")) {
                                                await AtletaService.delete(atleta.id);
                                                loadAtletas();
                                            }
                                        }}><Trash2 size={16} /></button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="6" className="empty-state">No hay atletas registrados</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default AtletasSection;
