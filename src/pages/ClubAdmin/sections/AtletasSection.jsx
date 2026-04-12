import React, { useState, useEffect } from 'react';
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

    return (
        <div className="section-container fade-in">
            <div className="section-header">
                <h2>Mis Atletas</h2>
                <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
                    {showForm ? 'Cancelar' : '+ Agregar Atleta'}
                </button>
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
                                <th>Nombre Completo</th>
                                <th>DNI</th>
                                <th>Edad</th>
                                <th>Sexo</th>
                                <th>Categoría</th>
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
                                    <td>{atleta.edad} años</td>
                                    <td>{atleta.sexoNombre}</td>
                                    <td>{atleta.categoriaNombre || 'N/A'}</td>
                                    <td>
                                        <button className="btn-icon">✏️</button>
                                        <button className="btn-icon btn-delete" onClick={async () => {
                                            if(window.confirm("¿Borrar atleta?")) {
                                                await AtletaService.delete(atleta.id);
                                                loadAtletas();
                                            }
                                        }}>🗑️</button>
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
