import React from 'react';
import { buildMaratonProgramaRows, getISODatePart } from '../../../utils/maratonScheduleUtils';

/**
 * Listado del programa provisorio Maratón.
 * Muestra la hora cargada por el usuario, sin pateo/gaps de pista.
 */
const MaratonProgramaList = ({
    largadas = [],
    filtroDia,
    setFiltroDia,
    loading,
    onEdit,
    onDelete,
}) => {
    const diasUnicos = ['Todos', ...new Set(
        (largadas || []).map(ep => getISODatePart(ep.fechaHora)).filter(Boolean)
    )].sort();

    const rows = buildMaratonProgramaRows(largadas, filtroDia);

    return (
        <div className="list-column">
            <div className="flex-between mb-md">
                <h4 className="section-title" style={{ margin: 0 }}>Programa provisorio (horarios manuales)</h4>
                <select className="admin-select-sm" value={filtroDia} onChange={e => setFiltroDia(e.target.value)}>
                    {diasUnicos.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
            </div>

            <div className="table-container-mini">
                {loading ? (
                    <div className="loader" />
                ) : (
                    <table className="admin-table mini">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Categoría</th>
                                <th>Bote</th>
                                <th>Distancia</th>
                                <th>Rama</th>
                                <th>Hora</th>
                                <th>Ins</th>
                                <th>Acc</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 && (
                                <tr>
                                    <td colSpan={8} style={{ opacity: 0.7, textAlign: 'center' }}>
                                        Todavía no hay largadas. Creá una con día y hora manual.
                                    </td>
                                </tr>
                            )}
                            {rows.map(row => (
                                <tr
                                    key={row.key}
                                    style={{
                                        background: row.isGrupo ? 'rgba(14, 165, 233, 0.06)' : 'transparent',
                                    }}
                                >
                                    <td>{row.orden}</td>
                                    <td>
                                        <span className="badge-outline" style={{ color: '#7dd3fc', borderColor: '#7dd3fc', whiteSpace: 'normal', textAlign: 'left' }}>
                                            {row.catLabel}
                                            {row.isGrupo && <span className="phase-tag"> · combinada</span>}
                                        </span>
                                    </td>
                                    <td><span className="badge-bote" style={{ whiteSpace: 'normal' }}>{row.botLabel}</span></td>
                                    <td><span className="badge-distancia">{row.distLabel}</span></td>
                                    <td><span className="badge-sexo mix" style={{ whiteSpace: 'normal' }}>{row.sexLabel}</span></td>
                                    <td style={{ fontWeight: 'bold', color: '#3b82f6' }}>{row.hora}</td>
                                    <td><span className="badge-inscritos">{row.inscritos}</span></td>
                                    <td className="actions-cell">
                                        <button className="btn-icon-admin edit" onClick={() => onEdit(row.raw)} title="Editar">✏️</button>
                                        <button className="btn-icon-delete" onClick={() => onDelete(row.raw)} title="Eliminar">🗑️</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default MaratonProgramaList;
