import React from 'react';
import { Trash2, Clock } from 'lucide-react';

const getSoloApellido = (nombreCompleto) => {
    if (!nombreCompleto) return "-";
    const parts = nombreCompleto.trim().split(' ');
    return parts[parts.length - 1];
};

const CATEGORIA_NAMES = {
    1: 'Pre-infantil (8-10 años)', 2: 'Infantil (11-12 años)', 3: 'Menor (13-14 años)', 4: 'Cadete (14-15 años)', 
    5: 'Junior (16-17 años)', 6: 'Sub-23 (18-22 años)', 7: 'Senior (18-35 años)', 8: 'Master A (40-45 años)', 
    9: 'Master B (46-50 años)', 10: 'Master C (50+ años)'
};
const BOTE_NAMES = { 1: 'K1', 2: 'K2', 3: 'K4', 4: 'C1', 5: 'C2', 6: 'C4' };
const DISTANCIA_NAMES = {
    1: '200m', 2: '350m', 3: '400m', 4: '450m', 5: '500m', 6: '1000m', 7: '1500m', 8: '2000m', 9: '3000m', 
    10: '5000m', 11: '10000m', 12: '12000m', 13: '15000m', 14: '18000m', 15: '22000m', 16: '30000m'
};
const SEXO_NAMES = { 1: 'Masculino', 2: 'Femenino', 3: 'Mixto' };

const FaseCard = ({ fase, onDelete, filtroVisualFase = 'Todas', showPruebaName = false, pruebaNro = null }) => {
    if (filtroVisualFase !== 'Todas' && filtroVisualFase !== 'Cronograma' && fase.nombreFase !== filtroVisualFase) return null;

    const p = fase.prueba?.prueba;
    const pruebaLabel = p ? `${CATEGORIA_NAMES[p.categoria?.id] || p.categoria?.nombre} ${BOTE_NAMES[p.bote?.id] || p.bote?.nombre} ${DISTANCIA_NAMES[p.distancia?.id] || p.distancia?.metros + 'm'} ${SEXO_NAMES[p.sexoId] || p.sexoNombre}` : '';

    const sortedResultados = [...fase.resultados].sort((a, b) => (a.carril || 99) - (b.carril || 99));

    return (
        <div className="fase-card glass-effect fade-in" style={{ padding: '15px', position: 'relative' }}>
            <div className="fase-card-header flex-between mb-sm">
                <div className="flex-row gap-sm" style={{ flexWrap: 'wrap' }}>
                    {showPruebaName && p && (
                        <div style={{ width: '100%', display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px', alignItems: 'center' }}>
                            {pruebaNro !== null && (
                                <span style={{
                                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(100, 180, 255, 0.15) 100%)',
                                    color: '#bfdbfe',
                                    fontSize: '1rem',
                                    fontWeight: '900',
                                    padding: '3px 12px',
                                    borderRadius: '6px',
                                    border: '1.5px solid rgba(100, 180, 255, 0.5)',
                                    letterSpacing: '1px',
                                    fontFamily: 'monospace',
                                    boxShadow: '0 0 10px rgba(100, 180, 255, 0.2)',
                                    flexShrink: 0,
                                }}>
                                    #{pruebaNro}
                                </span>
                            )}
                            <span className="chip" style={{ background: 'rgba(100, 180, 255, 0.15)', color: '#64b4ff', fontSize: '0.7rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(100, 180, 255, 0.3)' }}>
                                {CATEGORIA_NAMES[p.categoria?.id] || p.categoria?.nombre}
                            </span>
                            <span className="chip" style={{ background: 'rgba(167, 139, 250, 0.15)', color: '#a78bfa', fontSize: '0.7rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(167, 139, 250, 0.3)' }}>
                                {BOTE_NAMES[p.bote?.id] || p.bote?.nombre}
                            </span>
                            <span className="chip" style={{ background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', fontSize: '0.7rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
                                {DISTANCIA_NAMES[p.distancia?.id] || p.distancia?.metros + 'm'}
                            </span>
                            <span className="chip" style={{ 
                                background: p.sexoId === 1 ? 'rgba(59, 130, 246, 0.15)' : p.sexoId === 2 ? 'rgba(236, 72, 153, 0.15)' : 'rgba(20, 184, 166, 0.15)', 
                                color: p.sexoId === 1 ? '#3b82f6' : p.sexoId === 2 ? '#ec4899' : '#14b8a6', 
                                fontSize: '0.7rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', 
                                border: `1px solid ${p.sexoId === 1 ? 'rgba(59, 130, 246, 0.3)' : p.sexoId === 2 ? 'rgba(236, 72, 153, 0.3)' : 'rgba(20, 184, 166, 0.3)'}` 
                            }}>
                                {SEXO_NAMES[p.sexoId] || p.sexoNombre}
                            </span>
                        </div>
                    )}
                    <h4 style={{ margin: 0, color: 'var(--color-primary-light)' }}>{fase.nombreFase}</h4>
                    <span className="badge-time">
                        <Clock size={12} /> {fase.fechaHoraProgramada && fase.fechaHoraProgramada.includes('T') 
                            ? fase.fechaHoraProgramada.split('T')[1].substring(0, 5) + ' hs' 
                            : '--:--'}
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
                            <td>
                                {res.tripulantes && res.tripulantes.length > 0 
                                    ? [res.participanteNombre, ...res.tripulantes.map(t => t.participanteNombreCompleto || t.participanteNombre)].map(n => getSoloApellido(n)).join(' - ')
                                    : getSoloApellido(res.participanteNombre)
                                }
                            </td>
                            <td><span className="chip chip-ecu-blue">{res.clubSigla || res.clubNombre}</span></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default FaseCard;
