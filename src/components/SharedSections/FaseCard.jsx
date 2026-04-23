import React from 'react';
import { Trash2, Clock } from 'lucide-react';

const FaseCard = ({ fase, onDelete, filtroVisualFase = 'Todas' }) => {
    if (filtroVisualFase !== 'Todas' && fase.nombreFase !== filtroVisualFase) return null;

    const sortedResultados = [...fase.resultados].sort((a, b) => (a.carril || 99) - (b.carril || 99));

    return (
        <div className="fase-card glass-effect fade-in" style={{ padding: '15px', position: 'relative' }}>
            <div className="fase-card-header flex-between mb-sm">
                <div className="flex-row gap-sm">
                    <h4 style={{ margin: 0, color: 'var(--color-primary-light)' }}>{fase.nombreFase}</h4>
                    <span className="badge-time">
                        <Clock size={12} /> {fase.fechaHoraProgramada ? new Date(fase.fechaHoraProgramada).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                    </span>
                </div>
                {onDelete && (
                    <button 
                        className="btn-icon-admin danger" 
                        onClick={() => onDelete(fase.id)}
                        title="Eliminar fase"
                    >
                        <Trash2 size={14} />
                    </button>
                )}
            </div>

            <table className="admin-table mini-table">
                <thead>
                    <tr>
                        <th style={{ width: '50px' }}>Carril</th>
                        <th>Atleta / Tripulación</th>
                        <th>Club</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedResultados.map(res => (
                        <tr key={res.id}>
                            <td className="text-center" style={{ fontWeight: 'bold' }}>{res.carril || '-'}</td>
                            <td>{res.participanteNombre}</td>
                            <td><span className="chip chip-ecu-blue">{res.clubSigla || res.clubNombre}</span></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default FaseCard;
