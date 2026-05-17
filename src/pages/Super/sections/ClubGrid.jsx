import { Edit2, Users, Link2, Mail, MapPin } from 'lucide-react';

const ClubGrid = ({ clubes, onEdit, onViewAtletas, onAssignParent }) => {
    return (
        <div className="club-grid-container fade-in">
            {/* Mobile View */}
            <div className="clubes-mobile-list">
                {clubes.map(c => (
                    <div key={c.id} className="admin-native-card glass-effect mb-sm">
                        <div className="card-accent-bar ecu-blue" />
                        <div className="card-content">
                            <h4>
                                {c.nombre} 
                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                    <span className="badge badge-ecu-yellow">{c.sigla || '—'}</span>
                                    {c.planNombre && <span className="badge badge-ecu-blue" style={{ fontSize: '0.6rem' }}>{c.planNombre}</span>}
                                    {!c.parentClubId && (
                                        <span className="badge" style={{ 
                                            fontSize: '0.6rem',
                                            backgroundColor: c.bloqueadoPorFaltaDePago ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                            color: c.bloqueadoPorFaltaDePago ? '#EF4444' : '#10B981',
                                            border: `1px solid ${c.bloqueadoPorFaltaDePago ? '#EF4444' : '#10B981'}`
                                        }}>
                                            {c.bloqueadoPorFaltaDePago ? 'Bloqueado 🛑' : (c.frecuenciaPago || 'Mensual')}
                                        </span>
                                    )}
                                </div>
                            </h4>
                            {!c.parentClubId && c.fechaVencimientoPlan && (
                                <p style={{ fontSize: '0.75rem', marginTop: '-4px', color: new Date(c.fechaVencimientoPlan) < new Date() ? '#EF4444' : 'var(--color-text-secondary)' }}>
                                    📅 Vence: {new Date(c.fechaVencimientoPlan).toLocaleDateString()}
                                </p>
                            )}
                            <p><Mail size={14} className="text-primary" /> {c.email || 'Sin email'}</p>
                            <p><MapPin size={14} className="text-secondary" /> {c.ubicacion || 'Sin ubicación'}</p>
                            <p><Users size={14} className="text-accent" /> {c.cantidadAtletas || 0} Atletas registrados</p>
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
                            <th>Plan</th>
                            <th>Suscripción / Vence</th>
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
                                <td>
                                    {c.planNombre ? (
                                        <span className="badge" style={{ 
                                            border: '1px solid',
                                            padding: '4px 12px',
                                            borderRadius: '6px',
                                            fontSize: '0.7rem',
                                            fontWeight: 'bold',
                                            backgroundColor: 'rgba(255,255,255,0.05)',
                                            color: c.planNombre.toLowerCase() === 'oro' ? '#FFD700' : 
                                                   c.planNombre.toLowerCase() === 'plata' ? '#E0E0E0' : 
                                                   c.planNombre.toLowerCase() === 'bronce' ? '#CD7F32' : 'var(--color-text-dim)',
                                            borderColor: 'currentColor'
                                        }}>
                                            {c.planNombre}
                                        </span>
                                    ) : '—'}
                                </td>
                                <td>
                                    {!c.parentClubId ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <span className="badge" style={{
                                                padding: '2px 8px',
                                                fontSize: '0.65rem',
                                                backgroundColor: c.bloqueadoPorFaltaDePago ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                                color: c.bloqueadoPorFaltaDePago ? '#EF4444' : '#10B981',
                                                border: `1px solid ${c.bloqueadoPorFaltaDePago ? '#EF4444' : '#10B981'}`,
                                                borderRadius: '4px',
                                                width: 'fit-content',
                                                fontWeight: 'bold'
                                            }}>
                                                {c.bloqueadoPorFaltaDePago ? 'Bloqueado 🛑' : (c.frecuenciaPago || 'Mensual')}
                                            </span>
                                            {c.fechaVencimientoPlan ? (
                                                <span style={{ 
                                                    fontSize: '0.75rem', 
                                                    fontWeight: '500',
                                                    color: new Date(c.fechaVencimientoPlan) < new Date() ? '#EF4444' : 'var(--color-text-secondary)' 
                                                }}>
                                                    Vence: {new Date(c.fechaVencimientoPlan).toLocaleDateString()}
                                                </span>
                                            ) : (
                                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>Sin fecha</span>
                                            )}
                                        </div>
                                    ) : (
                                        <span style={{ color: 'var(--color-text-dim)' }}>—</span>
                                    )}
                                </td>
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
