import React, { useMemo } from 'react';
import { pick } from '../../utils/apiHelpers';
import './DestinatariosMultiSelect.css';

const pickNum = (obj, ...keys) => {
    const value = pick(obj, ...keys);
    if (value === undefined || value === null || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
};

const pickUsuarioId = (usuario) => {
    const id = pickNum(usuario, 'idUsuario', 'IdUsuario', 'id', 'Id');
    return id != null && id > 0 ? id : null;
};

const displayUsuario = (usuario) => {
    const nombre = pick(usuario, 'nombre', 'Nombre') ?? '';
    const apellido = pick(usuario, 'apellido', 'Apellido') ?? '';
    const full = `${nombre} ${apellido}`.trim();
    return full || pick(usuario, 'username', 'Username') || 'Usuario';
};

/**
 * grupos: [{ id, label, items: usuario[] }]
 * selectedIds: number[]
 */
const DestinatariosMultiSelect = ({
    grupos = [],
    selectedIds = [],
    onChange,
    emptyMessage = 'No hay destinatarios disponibles',
}) => {
    const selectedSet = useMemo(() => new Set(selectedIds.map(Number)), [selectedIds]);

    const allIds = useMemo(
        () => grupos.flatMap((g) => g.items.map(pickUsuarioId).filter(Boolean)),
        [grupos]
    );

    const toggle = (id) => {
        const next = new Set(selectedSet);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        onChange(Array.from(next));
    };

    const toggleGrupo = (grupo) => {
        const ids = grupo.items.map(pickUsuarioId).filter(Boolean);
        const allSelected = ids.every((id) => selectedSet.has(id));
        const next = new Set(selectedSet);
        ids.forEach((id) => {
            if (allSelected) next.delete(id);
            else next.add(id);
        });
        onChange(Array.from(next));
    };

    const selectAll = () => onChange(allIds);
    const clearAll = () => onChange([]);

    if (!grupos.length || allIds.length === 0) {
        return <div className="dest-multi-empty">{emptyMessage}</div>;
    }

    return (
        <div className="dest-multi">
            <div className="dest-multi-toolbar">
                <span>{selectedIds.length} seleccionado{selectedIds.length === 1 ? '' : 's'}</span>
                <div className="dest-multi-actions">
                    <button type="button" onClick={selectAll}>Todos</button>
                    <button type="button" onClick={clearAll}>Ninguno</button>
                </div>
            </div>
            <div className="dest-multi-list">
                {grupos.map((grupo) => {
                    const ids = grupo.items.map(pickUsuarioId).filter(Boolean);
                    const allSelected = ids.length > 0 && ids.every((id) => selectedSet.has(id));
                    return (
                        <div key={grupo.id || grupo.label} className="dest-multi-group">
                            <button type="button" className="dest-multi-group-header" onClick={() => toggleGrupo(grupo)}>
                                <input type="checkbox" readOnly checked={allSelected} />
                                <strong>{grupo.label}</strong>
                                <span>({ids.length})</span>
                            </button>
                            <div className="dest-multi-items">
                                {grupo.items.map((usuario) => {
                                    const id = pickUsuarioId(usuario);
                                    if (!id) return null;
                                    return (
                                        <label key={`user-${id}`} className="dest-multi-item">
                                            <input
                                                type="checkbox"
                                                checked={selectedSet.has(id)}
                                                onChange={() => toggle(id)}
                                            />
                                            <span>
                                                {displayUsuario(usuario)}
                                                <small> ({pick(usuario, 'username', 'Username')})</small>
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default DestinatariosMultiSelect;
