import React from 'react';
import { Key } from 'lucide-react';

const LoginGrid = ({ usuarios, onEditPassword }) => {
    return (
        <div className="login-grid-container fade-in">
            {/* Mobile View */}
            <div className="logins-mobile-list">
                {usuarios.map(u => (
                    <div key={u.id} className="admin-native-card glass-effect mb-sm">
                        <div className="card-accent-bar ecu-yellow" />
                        <div className="card-content">
                            <h4 className="flex-row gap-xs">
                                {u.username} 
                                <span className="badge badge-ecu-blue">{u.rol}</span>
                            </h4>
                            <p className="text-muted text-sm">📧 {u.email || 'Sin email'}</p>
                            <p className="text-muted text-xs">🏟️ {u.clubNombre || 'Sin club asociado'}</p>
                        </div>
                        <div className="card-actions-row">
                            <button className="btn-icon-view" onClick={() => onEditPassword(u)} title="Cambiar Contraseña">
                                <Key size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Desktop View */}
            <div className="admin-table-wrapper logins-desktop-table glass-effect">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Usuario</th>
                            <th>Email</th>
                            <th>Rol</th>
                            <th>Club Asociado</th>
                            <th style={{ width: '100px' }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {usuarios.map(u => (
                            <tr key={u.id}>
                                <td style={{ fontWeight: 'bold' }}>{u.username}</td>
                                <td>{u.email || '—'}</td>
                                <td><span className="badge badge-ecu-blue">{u.rol}</span></td>
                                <td>{u.clubNombre || '—'}</td>
                                <td className="actions-cell">
                                    <button className="btn-icon-view" onClick={() => onEditPassword(u)} title="Cambiar Contraseña">
                                        <Key size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default LoginGrid;
