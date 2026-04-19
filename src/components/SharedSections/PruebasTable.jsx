import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import { formatDate, formatTime } from '../../utils/dateUtils';
import EmptyState from '../Common/EmptyState';

const PruebasTable = ({ 
    pruebas, 
    diasUnicos, 
    filtroDia, 
    setFiltroDia, 
    onEdit, 
    onDelete 
}) => {
    return (
        <div className="pruebas-list-container">
            <div className="table-header-filters" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ margin: 0 }}>Pruebas Habilitadas ({pruebas.length})</h4>
                <div className="filter-group">
                    <label style={{ fontSize: '0.8rem', marginRight: '8px' }}>Filtrar Día:</label>
                    <select 
                        value={filtroDia} 
                        onChange={e => setFiltroDia(e.target.value)}
                        style={{ padding: '4px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                    >
                        {diasUnicos.map(d => (
                            <option key={d} value={d}>{d === 'Todos' ? 'Todos los días' : formatDate(d)}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="admin-table-wrapper glass-effect" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Hora</th>
                            <th>Categoría</th>
                            <th>Bote</th>
                            <th>Distancia</th>
                            <th>Rama</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pruebas.length > 0 ? pruebas.map((ep) => (
                            <tr key={ep.id} className="fade-in">
                                <td style={{ fontWeight: 'bold', color: 'var(--color-primary-light)' }}>
                                    {formatTime(ep.fechaHora)}
                                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)', fontWeight: 'normal' }}>
                                        {formatDate(ep.fechaHora)}
                                    </div>
                                </td>
                                <td>{ep.prueba?.categoria?.nombre || ep.prueba?.categoriaNombre || 'N/A'}</td>
                                <td>{ep.prueba?.bote?.nombre || ep.prueba?.boteNombre || 'N/A'}</td>
                                <td>{ep.prueba?.distancia?.metros || ep.prueba?.distanciaMetros || '0'}m</td>
                                <td>{ep.prueba?.sexo?.nombre || ep.prueba?.sexoNombre || 'Mixto'}</td>
                                <td className="actions-cell">
                                    <button className="btn-icon-admin secondary" onClick={() => onEdit(ep)} title="Editar">
                                        <Edit2 size={14} />
                                    </button>
                                    <button className="btn-icon-admin danger" onClick={() => onDelete(ep.id)} title="Eliminar">
                                        <Trash2 size={14} />
                                    </button>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="6">
                                    <EmptyState message="No hay pruebas para los filtros seleccionados" />
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PruebasTable;
