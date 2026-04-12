import React, { useState, useEffect } from 'react';
import { CategoriaService, BoteService, DistanciaService, PruebaService } from '../../services/ConfigService';
import './ConfigurarPruebas.css';

const ConfigurarPruebasModal = ({ evento, onClose, onRefresh }) => {
    const [categorias, setCategorias] = useState([]);
    const [botes, setBotes] = useState([]);
    const [distancias, setDistancias] = useState([]);
    const [pruebasActuales, setPruebasActuales] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Estados para el formulario
    const [selectedCat, setSelectedCat] = useState('');
    const [selectedBote, setSelectedBote] = useState('');
    const [selectedDist, setSelectedDist] = useState('');
    const [selectedSex, setSelectedSex] = useState('');
    const [selectedTime, setSelectedTime] = useState('');
    const [saving, setSaving] = useState(false);
    
    // Estado para edición
    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [cats, bts, dists, actuals] = await Promise.all([
                    CategoriaService.getAll(),
                    BoteService.getAll(),
                    DistanciaService.getAll(),
                    PruebaService.getByEvento(evento.id)
                ]);
                setCategorias(cats);
                setBotes(bts);
                setDistancias(dists);
                setPruebasActuales(actuals);
            } catch (e) {
                console.error("Error loading config data", e);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [evento.id]);

    const resetForm = () => {
        setSelectedCat('');
        setSelectedBote('');
        setSelectedDist('');
        setSelectedSex('');
        setSelectedTime('');
        setEditingId(null);
    };

    const handleAddPrueba = async () => {
        if (!selectedCat || !selectedBote || !selectedDist || !selectedSex || !selectedTime) {
            alert("Por favor completá todos los campos antes de habilitar la prueba.");
            return false;
        }

        setSaving(true);
        try {
            const sexoMap = {
                'Masculino': 1,
                'Femenino': 2,
                'Mixto': 3
            };

            const eventDate = new Date(evento.fecha);
            const [hours, minutes] = selectedTime.split(':');
            const fechaHora = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate(), parseInt(hours), parseInt(minutes));

            const payload = {
                categoriaId: parseInt(selectedCat),
                boteId: parseInt(selectedBote),
                distanciaId: parseInt(selectedDist),
                sexoId: sexoMap[selectedSex] || 3,
                fechaHora: fechaHora.toISOString(),
            };

            if (editingId) {
                await PruebaService.updateAssign(editingId, payload);
            } else {
                await PruebaService.assignToEvento(evento.id, null, payload);
            }
            
            // Recargar lista
            const actuals = await PruebaService.getByEvento(evento.id);
            setPruebasActuales(actuals);
            resetForm();
            return true;
        } catch (err) {
            alert("Error al procesar prueba: " + err.message);
            return false;
        } finally {
            setSaving(false);
        }
    };

    const handleDeletePrueba = async (id) => {
        if (!window.confirm("¿Estás seguro de quitar esta prueba del evento?")) return;
        
        try {
            await PruebaService.deleteAssign(id);
            setPruebasActuales(prev => prev.filter(p => p.id !== id));
        } catch (err) {
            alert("Error al eliminar: " + err.message);
        }
    };

    const handleEditStart = (ep) => {
        setEditingId(ep.id);
        setSelectedCat(ep.prueba.categoriaId.toString());
        setSelectedBote(ep.prueba.boteId.toString());
        setSelectedDist(ep.prueba.distanciaId.toString());
        // El DTO de retorno debe tener estos IDs o el frontend debe mapearlos.
        // Si no vienen los IDs directos en ep.prueba, usamos los objetos.
        setSelectedCat(ep.prueba.categoria.id.toString());
        setSelectedBote(ep.prueba.bote.id.toString());
        setSelectedDist(ep.prueba.distancia.id.toString());
        
        // Mapear sexo (si no viene nombre exacto, ajustar)
        // ep.prueba.sexo.nombre -> "Masculino", "Femenino", "Mixto"
        if (ep.prueba.sexo) {
            setSelectedSex(ep.prueba.sexo.nombre); 
        }

        // Formatear hora
        const date = new Date(ep.fechaHora);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        setSelectedTime(`${hours}:${minutes}`);
    };

    const formatTime = (isoString) => {
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="admin-modal-overlay">
            <div className="admin-modal glass-effect fade-in">
                <div className="modal-header">
                    <h2>Configurar Pruebas: {evento.nombre}</h2>
                    <button className="btn-close" onClick={onClose}>&times;</button>
                </div>

                <div className="modal-body">
                    <div className="config-scheduler">
                        <div className="config-form glass-effect">
                            <h4>{editingId ? "Editar Prueba" : "Agregar Nueva Prueba"}</h4>
                            <div className="config-grid">
                                <div className="form-field">
                                    <label>Categoría</label>
                                    <select value={selectedCat} onChange={e => setSelectedCat(e.target.value)}>
                                        <option value="">Seleccionar...</option>
                                        {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                    </select>
                                </div>
                                <div className="form-field">
                                    <label>Bote</label>
                                    <select value={selectedBote} onChange={e => setSelectedBote(e.target.value)}>
                                        <option value="">Seleccionar...</option>
                                        {botes.map(b => <option key={b.id} value={b.id}>{b.tipo}</option>)}
                                    </select>
                                </div>
                                <div className="form-field">
                                    <label>Distancia</label>
                                    <select value={selectedDist} onChange={e => setSelectedDist(e.target.value)}>
                                        <option value="">Seleccionar...</option>
                                        {distancias.map(d => <option key={d.id} value={d.id}>{d.descripcion}</option>)}
                                    </select>
                                </div>
                                <div className="form-field">
                                    <label>Sexo</label>
                                    <select value={selectedSex} onChange={e => setSelectedSex(e.target.value)}>
                                        <option value="">Seleccionar...</option>
                                        <option value="Mixto">Mixto</option>
                                        <option value="Masculino">Masculino</option>
                                        <option value="Femenino">Femenino</option>
                                    </select>
                                </div>
                                <div className="form-field">
                                    <label>Hora de la Prueba</label>
                                    <input 
                                        type="time" 
                                        value={selectedTime} 
                                        onChange={e => setSelectedTime(e.target.value)}
                                        className="admin-input-dark"
                                    />
                                </div>
                            </div>
                            <div className="form-actions mt-md">
                                <button className="btn-admin-primary w-100" onClick={handleAddPrueba} disabled={saving}>
                                    {saving ? "Procesando..." : (editingId ? "Guardar Cambios" : "+ Habilitar Prueba")}
                                </button>
                                {editingId && (
                                    <button className="btn-admin-secondary w-100 mt-sm" onClick={resetForm}>
                                        Cancelar Edición
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="current-pruebas glass-effect">
                            <h4>Pruebas Habilitadas ({pruebasActuales.length})</h4>
                            <div className="pruebas-list">
                                {loading ? <div className="loader"></div> : (
                                    pruebasActuales.length > 0 ? (
                                        <table className="mini-table">
                                            <thead>
                                                <tr>
                                                    <th>#</th>
                                                    <th>Categoría</th>
                                                    <th>Bote</th>
                                                    <th>Distancia</th>
                                                    <th>Sexo</th>
                                                    <th>Hora</th>
                                                    <th>Inscritos</th>
                                                    <th>Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {[...pruebasActuales]
                                                    .sort((a, b) => new Date(a.fechaHora) - new Date(b.fechaHora))
                                                    .map((ep, idx) => (
                                                    <tr key={ep.id} className={editingId === ep.id ? "row-editing" : ""}>
                                                        <td>{idx + 1}</td>
                                                        <td>{ep.prueba.categoria.nombre}</td>
                                                        <td>{ep.prueba.bote.tipo}</td>
                                                        <td>{ep.prueba.distancia.descripcion}</td>
                                                        <td>{ep.prueba.sexoNombre || ep.prueba.sexo?.nombre || 'Mixto'}</td>
                                                        <td className="time-cell">{formatTime(ep.fechaHora)}</td>
                                                        <td className="count-cell">
                                                            <span className={`count-badge ${ep.cantidadInscritos > 0 ? 'has-data' : ''}`}>
                                                                {ep.cantidadInscritos}
                                                            </span>
                                                        </td>
                                                        <td className="actions-cell">
                                                            <button 
                                                                className="btn-icon-admin" 
                                                                title="Editar"
                                                                onClick={() => handleEditStart(ep)}
                                                            >
                                                                ✏️
                                                            </button>
                                                            <button 
                                                                className="btn-icon-danger" 
                                                                title="Eliminar"
                                                                onClick={() => handleDeletePrueba(ep.id)}
                                                            >
                                                                🗑️
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : <p className="empty-text">No hay pruebas habilitadas aún para este evento.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn-admin-secondary" onClick={onClose}>Cerrar sin recargar</button>
                    <button className="btn-admin-primary" onClick={async () => {
                        if (selectedCat || selectedBote || selectedDist || selectedSex || selectedTime) {
                            const success = await handleAddPrueba();
                            if (!success) return; 
                        }
                        onRefresh();
                        onClose();
                    }}>Finalizar y Actualizar</button>
                </div>
            </div>
        </div>
    );
};

export default ConfigurarPruebasModal;
