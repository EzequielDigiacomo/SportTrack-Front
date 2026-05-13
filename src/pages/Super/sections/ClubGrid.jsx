import React from 'react';
import { Edit2, Users, Link2 } from 'lucide-react';

const ClubGrid = ({ clubes, onEdit, onViewAtletas, onAssignParent }) => {
    return (
        <div className="club-grid-container fade-in">
            {/* Mobile View */}
            <div className="clubes-mobile-list">
                {clubes.map(c => (
                    <div key={c.id} className="admin-native-card glass-effect mb-sm">
                        <div className="card-accent-bar ecu-blue" />
                        <div className="card-content">
                            <h4 className="flex-row gap-xs">
                                {c.nombre} 
                                <span className="badge badge-ecu-yellow">{c.sigla || '—'}</span>
                            </h4>
                            <p className="text-muted text-sm">📧 {c.email || 'Sin email'}</p>
                            {c.ubicacion && <p className="text-muted text-xs">📍 {c.ubicacion}</p>}
                            <p className="text-muted text-xs">👥 {c.cantidadAtletas || 0} Atletas</p>
                        </div>
                        <div className="card-actions-row">
                            {!c.parentClubId && onAssignParent && (
                                <button className="btn-icon-view" onClick={() => onAssignParent(c)} title="Vincular a Federación" style={{ background: 'rgba(251,146,60,0.15)', borderColor: 'var(--color-accent-orange)', color: 'var(--color-accent-orange)' }}>
                                    <Link2 size={16} />
                                </button>
                            )}
                            <button className="btn-icon-edit" onClick={() => onEdit(c)} title="Editar"><Edit2 size={16} /></button>
                            <button className="btn-icon-view" onClick={() => onViewAtletas(c)} title="Ver Atletas"><Users size={16} /></button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Desktop View */}
            <div className="admin-table-wrapper clubes-desktop-table glass-effect">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Club / Entidad</th>
                            <th style={{ width: '100px' }}>Sigla</th>
                            <th>Federación</th>
                            <th>Email</th>
                            <th>Ubicación</th>
                            <th style={{ width: '100px' }}>Atletas</th>
                            <th style={{ width: '120px' }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {clubes.map(c => (
                            <tr key={c.id}>
                                <td style={{ fontWeight: 'bold' }}>
                                    {c.nombre}
                                    {!c.parentClubId && <span className="badge badge-ecu-blue" style={{ marginLeft: '8px', fontSize: '0.65rem' }}>FED</span>}
                                </td>
                                <td><span className="badge badge-ecu-yellow">{c.sigla || '—'}</span></td>
                                <td>
                                    <span style={{ fontSize: '0.85rem', color: c.parentClubId ? 'var(--color-text-dim)' : 'var(--color-primary-light)' }}>
                                        {c.parentClubId ? (c.parentClubNombre || `ID: ${c.parentClubId}`) : '—'}
                                    </span>
                                </td>
                                <td>{c.email || '—'}</td>
                                <td>{c.ubicacion || '—'}</td>
                                <td>{c.cantidadAtletas || 0}</td>
                                <td className="actions-cell">
                                    {!c.parentClubId && onAssignParent && (
                                        <button 
                                            className="btn-icon-view" 
                                            onClick={() => onAssignParent(c)} 
                                            title="Vincular a Federación"
                                            style={{ background: 'rgba(251,146,60,0.15)', borderColor: 'var(--color-accent-orange)', color: 'var(--color-accent-orange)' }}
                                        >
                                            <Link2 size={16} />
                                        </button>
                                    )}
                                    <button className="btn-icon-edit" onClick={() => onEdit(c)} title="Editar"><Edit2 size={16} /></button>
                                    <button className="btn-icon-view" onClick={() => onViewAtletas(c)} title="Ver Atletas"><Users size={16} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ClubGrid;
