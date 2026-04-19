import React from 'react';
import { Settings, Edit2, Trash2, Copy, Calendar, MapPin, Unlock, Lock } from 'lucide-react';
import StatusBadge from '../Common/StatusBadge';
import EmptyState from '../Common/EmptyState';

const EventGrid = ({ 
    eventos, 
    onOpenDashboard, 
    onEdit, 
    onDelete, 
    onCopyLink 
}) => {
    if (!eventos || eventos.length === 0) {
        return <EmptyState message="No hay eventos creados aún" description="Pulsa en '+ Nuevo Evento' para comenzar." />;
    }

    return (
        <>
            {/* VISTA MOBILE: Cards */}
            <div className="eventos-mobile-grid">
                {eventos.map(ev => (
                    <div key={ev.id} className="evento-native-row glass-effect fade-in">
                        <div className="evento-native-status-bar" style={{ background: 'var(--color-primary)' }} />
                        <div className="evento-native-info">
                            <span className="evento-native-name">{ev.nombre}</span>
                            <span className="evento-native-meta">
                                <Calendar size={14} /> {new Date(ev.fecha).toLocaleDateString('es-AR')} | <MapPin size={14} /> {ev.ubicacion || 'Sin ubicación'}
                            </span>
                            <div className="evento-native-tags">
                                <StatusBadge estado={ev.estado} />
                                <span className={`inscripciones-tag ${ev.inscripcionesAbiertas ? 'open' : 'closed'}`}>
                                    {ev.inscripcionesAbiertas ? <Unlock size={12} /> : <Lock size={12} />}
                                    {ev.inscripcionesAbiertas ? 'Abiertas' : 'Cerradas'}
                                </span>
                            </div>
                        </div>
                        <div className="evento-native-actions">
                            <button className="btn-icon-admin primary" onClick={() => onCopyLink(ev.id, ev.nombre)} title="Live Link"><Copy size={16} /></button>
                            <button className="btn-icon-admin primary" onClick={() => onOpenDashboard(ev)} title="Dirigir"><Settings size={16} /></button>
                            <button className="btn-icon-admin secondary" onClick={() => onEdit(ev)} title="Editar"><Edit2 size={16} /></button>
                            <button className="btn-icon-admin danger" onClick={() => onDelete(ev)} title="Eliminar"><Trash2 size={16} /></button>
                        </div>
                    </div>
                ))}
            </div>

            {/* VISTA DESKTOP: Tabla */}
            <div className="admin-table-wrapper glass-effect eventos-desktop-table fade-in">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Evento</th>
                            <th>Fecha</th>
                            <th>Ubicación</th>
                            <th>Inscripciones</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {eventos.map(ev => (
                            <tr key={ev.id}>
                                <td><strong>{ev.nombre}</strong></td>
                                <td>{new Date(ev.fecha).toLocaleDateString('es-AR')}</td>
                                <td>{ev.ubicacion || '—'}</td>
                                <td>
                                    <span className={`inscripciones-tag ${ev.inscripcionesAbiertas ? 'open' : 'closed'}`}>
                                        {ev.inscripcionesAbiertas ? <><Unlock size={14} /> Abiertas</> : <><Lock size={14} /> Cerradas</>}
                                    </span>
                                </td>
                                <td><StatusBadge estado={ev.estado} /></td>
                                <td className="actions-cell">
                                    <button className="btn-icon-admin primary" onClick={() => onCopyLink(ev.id, ev.nombre)} title="Live Link"><Copy size={18} /></button>
                                    <button className="btn-admin-primary" onClick={() => onOpenDashboard(ev)} title="Dirigir Carrera"><Settings size={16} /> Dirigir</button>
                                    <button className="btn-admin-secondary" onClick={() => onEdit(ev)} title="Editar"><Edit2 size={16} /></button>
                                    <button className="btn-admin-danger" onClick={() => onDelete(ev)} title="Eliminar"><Trash2 size={16} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
};

export default EventGrid;
