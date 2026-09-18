import React, { useEffect, useState } from 'react';
import { Trash2, Clock, Check, X, Pencil } from 'lucide-react';
import { formatTime, getISODatePart } from '../../utils/dateUtils';

const getSoloApellido = (nombreCompleto) => {
    if (!nombreCompleto) return "-";
    const parts = nombreCompleto.trim().split(' ');
    return parts[parts.length - 1];
};

const CATEGORIA_NAMES = {
    1: 'Pre-infantil (8-10 años)', 2: 'Infantil (11-12 años)', 3: 'Menor (13-14 años)', 4: 'Cadete (15-16 años)', 
    5: 'Junior (17-18 años)', 6: 'Sub-23 (19-23 años)', 7: 'Senior (24-39 años)', 8: 'Master A (40-49 años)', 
    9: 'Master B (50-59 años)', 10: 'Master C (60+ años)'
};
const BOTE_NAMES = { 1: 'K1', 2: 'K2', 3: 'K4', 4: 'C1', 5: 'C2', 6: 'C4' };
const DISTANCIA_NAMES = {
    1: '200m', 2: '350m', 3: '400m', 4: '450m', 5: '500m', 6: '1000m', 7: '1500m', 8: '2000m', 9: '3000m', 
    10: '5000m', 11: '10000m', 12: '12000m', 13: '15000m', 14: '18000m', 15: '22000m', 16: '30000m'
};
const SEXO_NAMES = { 1: 'Masculino', 2: 'Femenino', 3: 'Mixto' };

const isBoteK4 = (fase) => {
    const p = fase?.prueba?.prueba || fase?.prueba || fase;
    if (!p) return false;
    const boteId = p.bote?.id;
    if (boteId === 3 || boteId === 6) return true;
    const boteName = p.bote?.nombre || BOTE_NAMES[boteId] || '';
    return boteName.toUpperCase().includes('4');
};

const toLocalTimeValue = (iso) => {
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const FaseCard = ({
    fase,
    onDelete,
    filtroVisualFase = 'Todas',
    showPruebaName = false,
    pruebaNro = null,
    canEditHorario = false,
    onUpdateHorario,
    savingHorario = false,
}) => {
    const [editingHorario, setEditingHorario] = useState(false);
    const [editDate, setEditDate] = useState('');
    const [editTime, setEditTime] = useState('');

    useEffect(() => {
        if (!editingHorario) {
            setEditDate(getISODatePart(fase.fechaHoraProgramada));
            setEditTime(toLocalTimeValue(fase.fechaHoraProgramada));
        }
    }, [fase.fechaHoraProgramada, editingHorario]);

    if (filtroVisualFase !== 'Todas' && filtroVisualFase !== 'Cronograma' && fase.nombreFase !== filtroVisualFase) return null;

    const p = fase.prueba?.prueba;
    const sortedResultados = [...fase.resultados].sort((a, b) => (a.carril || 99) - (b.carril || 99));

    const openEditor = (e) => {
        e?.stopPropagation?.();
        if (!canEditHorario || !onUpdateHorario) return;
        setEditDate(getISODatePart(fase.fechaHoraProgramada) || '');
        setEditTime(toLocalTimeValue(fase.fechaHoraProgramada) || '');
        setEditingHorario(true);
    };

    const cancelEditor = (e) => {
        e?.stopPropagation?.();
        setEditingHorario(false);
    };

    const saveEditor = async (e) => {
        e?.stopPropagation?.();
        if (!editDate || !editTime || !onUpdateHorario) return;
        await onUpdateHorario(fase, { date: editDate, time: editTime });
        setEditingHorario(false);
    };

    return (
        <div className="fase-card glass-effect fade-in" style={{ padding: '15px', position: 'relative' }}>
            <div className="fase-card-header flex-between mb-sm">
                <div className="flex-row gap-sm" style={{ flexWrap: 'wrap' }}>
                    {showPruebaName && p && (
                        <div style={{ width: '100%', display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px', alignItems: 'center' }}>
                            {pruebaNro !== null && (
                                <span className="chip-prueba-nro">
                                    #{pruebaNro}
                                </span>
                            )}
                            <span className="chip chip-categoria">
                                {CATEGORIA_NAMES[p.categoria?.id] || p.categoria?.nombre}
                            </span>
                            <span className="chip chip-bote">
                                {BOTE_NAMES[p.bote?.id] || p.bote?.nombre}
                            </span>
                            <span className="chip chip-distancia">
                                {DISTANCIA_NAMES[p.distancia?.id] || p.distancia?.metros + 'm'}
                            </span>
                            <span className={`chip chip-sexo ${p.sexoId === 1 ? 'male' : p.sexoId === 2 ? 'female' : 'mixed'}`}>
                                {SEXO_NAMES[p.sexoId] || p.sexoNombre}
                            </span>
                        </div>
                    )}
                    <h4 style={{ margin: 0, color: 'var(--color-text-primary)' }}>{fase.nombreFase}</h4>
                    {editingHorario ? (
                        <div
                            className="badge-time-editor"
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                        >
                            <input
                                type="date"
                                className="admin-input compact"
                                value={editDate}
                                onChange={(e) => setEditDate(e.target.value)}
                                disabled={savingHorario}
                            />
                            <input
                                type="time"
                                className="admin-input compact"
                                value={editTime}
                                onChange={(e) => setEditTime(e.target.value)}
                                disabled={savingHorario}
                            />
                            <button
                                type="button"
                                className="btn-icon-admin primary"
                                onClick={saveEditor}
                                disabled={savingHorario || !editDate || !editTime}
                                title="Guardar horario"
                            >
                                <Check size={14} />
                            </button>
                            <button
                                type="button"
                                className="btn-icon-admin"
                                onClick={cancelEditor}
                                disabled={savingHorario}
                                title="Cancelar"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ) : canEditHorario && onUpdateHorario ? (
                        <button
                            type="button"
                            className="badge-time badge-time-editable"
                            onClick={openEditor}
                            title="Editar horario de esta serie"
                        >
                            <Clock size={12} /> {formatTime(fase.fechaHoraProgramada)} hs
                            <Pencil size={11} className="badge-time-edit-icon" />
                        </button>
                    ) : (
                        <span className="badge-time">
                            <Clock size={12} /> {formatTime(fase.fechaHoraProgramada)} hs
                        </span>
                    )}
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
                                {(() => {
                                    const names = res.tripulantes && res.tripulantes.length > 0 
                                        ? [res.participanteNombre, ...res.tripulantes.map(t => t.participanteNombreCompleto || t.participanteNombre)]
                                        : [res.participanteNombre];
                                    
                                    if (isBoteK4(fase)) {
                                        return names.map(n => getSoloApellido(n)).join(' - ');
                                    } else {
                                        return names.join(' - ');
                                    }
                                })()}
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
