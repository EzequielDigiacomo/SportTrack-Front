import React, { useEffect, useMemo, useState } from 'react';
import { Edit2, Users, Mail, MapPin } from 'lucide-react';
import { getClubFederationId, getClubFederationName, pick } from '../../../utils/apiHelpers';

const PAGE_SIZE = 10;

const ClubGrid = ({ clubes, onEdit, onViewAtletas, showFederation = true }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const totalPages = Math.max(1, Math.ceil((clubes?.length || 0) / PAGE_SIZE));

    useEffect(() => {
        setCurrentPage(1);
    }, [clubes]);

    useEffect(() => {
        if (currentPage > totalPages) setCurrentPage(totalPages);
    }, [currentPage, totalPages]);

    const pageClubes = useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE;
        return (clubes || []).slice(start, start + PAGE_SIZE);
    }, [clubes, currentPage]);

    const pagination = (clubes?.length || 0) > PAGE_SIZE && (
        <div className="admin-pagination">
            <button
                type="button"
                className="btn-pagination"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
            >
                Anterior
            </button>
            <span className="pagination-info">
                Página <strong>{currentPage}</strong> de {totalPages}
            </span>
            <button
                type="button"
                className="btn-pagination"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
            >
                Siguiente
            </button>
        </div>
    );

    return (
        <div className="club-grid-container fade-in">
            <div className="clubes-mobile-list">
                {pageClubes.map(c => {
                    const clubId = pick(c, 'id', 'Id');
                    const fedName = getClubFederationName(c);

                    return (
                        <div key={clubId} className="admin-native-card glass-effect mb-sm">
                            <div className="card-accent-bar ecu-blue" />
                            <div className="card-content">
                                <h4>
                                    {c.nombre}
                                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                        <span className="badge badge-ecu-yellow">{c.sigla || '—'}</span>
                                    </div>
                                </h4>
                                {showFederation && (
                                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>
                                        Federación: {fedName || `ID ${getClubFederationId(c)}`}
                                    </p>
                                )}
                                <p><Mail size={14} className="text-primary" /> {c.email || 'Sin email'}</p>
                                <p><MapPin size={14} className="text-secondary" /> {c.ubicacion || 'Sin ubicación'}</p>
                                <p><Users size={14} className="text-accent" /> {c.cantidadAtletas || 0} Atletas registrados</p>
                            </div>
                            <div className="card-actions-row">
                                <button className="btn-icon-edit" onClick={() => onEdit(c)} title="Editar"><Edit2 size={16} /></button>
                                <button className="btn-icon-view" onClick={() => onViewAtletas(c)} title="Ver Atletas"><Users size={16} /></button>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="admin-table-wrapper clubes-desktop-table glass-effect">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Club / Entidad</th>
                            <th style={{ width: '100px' }}>Sigla</th>
                            {showFederation && <th>Federación</th>}
                            <th>Email</th>
                            <th>Ubicación</th>
                            <th style={{ width: '100px' }}>Atletas</th>
                            <th style={{ width: '120px' }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pageClubes.length === 0 ? (
                            <tr>
                                <td colSpan={showFederation ? 7 : 6} className="empty-row">
                                    No hay clubes registrados.
                                </td>
                            </tr>
                        ) : pageClubes.map(c => {
                            const clubId = pick(c, 'id', 'Id');
                            const fedName = getClubFederationName(c);

                            return (
                                <tr key={clubId}>
                                    <td style={{ fontWeight: 'bold' }}>{c.nombre}</td>
                                    <td><span className="badge badge-ecu-yellow">{c.sigla || '—'}</span></td>
                                    {showFederation && (
                                        <td>
                                            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>
                                                {fedName || `ID ${getClubFederationId(c)}`}
                                            </span>
                                        </td>
                                    )}
                                    <td>{c.email || '—'}</td>
                                    <td>{c.ubicacion || '—'}</td>
                                    <td>{c.cantidadAtletas || 0}</td>
                                    <td className="actions-cell">
                                        <button className="btn-icon-edit" onClick={() => onEdit(c)} title="Editar"><Edit2 size={16} /></button>
                                        <button className="btn-icon-view" onClick={() => onViewAtletas(c)} title="Ver Atletas"><Users size={16} /></button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {pagination}
        </div>
    );
};

export default ClubGrid;
