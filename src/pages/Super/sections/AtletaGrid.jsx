import React from 'react';
import { Edit2, Trash2, ArrowUpDown, ChevronUp, ChevronDown, Link2, User, Building2, AlertTriangle } from 'lucide-react';
import EmptyState from '../../../components/Common/EmptyState';

const AtletaGrid = ({ atletas, onEdit, onDelete, onAssignClub, sortConfig, requestSort }) => {

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return <ArrowUpDown size={14} />;
        return sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
    };

    if (!atletas || atletas.length === 0) {
        return <EmptyState message="No hay atletas registrados" description="Ajusta los filtros o registra un nuevo atleta." />;
    }

    const sinClubStyle = { background: 'rgba(251,146,60,0.15)', borderColor: 'var(--color-accent-orange)', color: 'var(--color-accent-orange)' };

    return (
        <>
            {/* VISTA MOBILE */}
            <div className="atletas-mobile-list">
                {atletas.map(atleta => (
                    <div key={atleta.id} className="evento-native-row glass-effect fade-in">
                        <div className="evento-native-status-bar"
                            style={{ background: atleta.clubNombre ? 'var(--color-primary)' : 'var(--color-accent-orange)' }} />
                        <div className="evento-native-info">
                            <span className="evento-native-name">
                                {atleta.nombre} {atleta.apellido}
                                <span style={{ fontSize: '0.8rem', color: 'var(--color-primary-light)', paddingLeft: '4px' }}>
                                    {atleta.categoriaNombre || ''}
                                </span>
                            </span>
                            <span className="evento-native-meta" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <User size={13} className="text-primary" /> DNI: {atleta.dni || '—'} · {atleta.sexoNombre?.[0]} / {atleta.edad}a
                            </span>
                            <span className="evento-native-meta" style={{ marginTop: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <Building2 size={13} className="text-accent" />
                                <span className={`chip ${atleta.clubNombre ? 'chip-ecu-blue' : 'chip-ecu-red'}`} style={{ padding: '0.1rem 0.4rem', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                    {!atleta.clubNombre && <AlertTriangle size={11} />} {atleta.clubNombre || 'Sin Club'}
                                </span>
                            </span>
                        </div>
                        <div className="evento-native-actions">
                            {!atleta.clubNombre && onAssignClub && (
                                <button className="btn-icon-view" onClick={() => onAssignClub(atleta)} title="Asignar Club" style={sinClubStyle}>
                                    <Link2 size={16} />
                                </button>
                            )}
                            <button className="btn-icon-edit" onClick={() => onEdit(atleta)} title="Editar"><Edit2 size={16} /></button>
                            <button className="btn-icon-delete" onClick={() => onDelete(atleta.id)} title="Eliminar"><Trash2 size={16} /></button>
                        </div>
                    </div>
                ))}
            </div>

            {/* VISTA DESKTOP */}
            <div className="admin-table-wrapper glass-effect atletas-desktop-table fade-in">
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
                        {atletas.map(atleta => (
                            <tr key={atleta.id} style={!atleta.clubNombre ? { borderLeft: '3px solid var(--color-accent-orange)' } : {}}>
                                <td>
                                    <div style={{ fontWeight: 'bold' }}>{atleta.nombre} {atleta.apellido}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>{atleta.email || 'Sin email'}</div>
                                </td>
                                <td>{atleta.dni || '—'}</td>
                                <td>
                                    <span className={`chip ${atleta.clubNombre ? 'chip-ecu-blue' : 'chip-ecu-red'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                        {!atleta.clubNombre && <AlertTriangle size={12} />} {atleta.clubNombre || 'Sin Club'}
                                    </span>
                                </td>
                                <td>
                                    <span style={{ fontSize: '0.9rem', color: 'var(--color-primary-light)', fontWeight: '600' }}>
                                        {atleta.categoriaNombre || 'Sin Cat.'}
                                    </span>
                                </td>
                                <td>{atleta.sexoNombre?.[0]} / {atleta.edad}a</td>
                                <td className="actions-cell">
                                    {!atleta.clubNombre && onAssignClub && (
                                        <button className="btn-icon-view" onClick={() => onAssignClub(atleta)} title="Asignar Club" style={sinClubStyle}>
                                            <Link2 size={16} />
                                        </button>
                                    )}
                                    <button className="btn-icon-edit" onClick={() => onEdit(atleta)} title="Editar"><Edit2 size={16} /></button>
                                    <button className="btn-icon-delete" onClick={() => onDelete(atleta.id)} title="Eliminar"><Trash2 size={16} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
};

export default AtletaGrid;
