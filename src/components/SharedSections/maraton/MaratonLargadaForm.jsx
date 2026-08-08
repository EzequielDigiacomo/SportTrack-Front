import React from 'react';
import {
    CATEGORIA_NAMES,
    BOTE_NAMES,
    DISTANCIA_NAMES,
    SEXO_NAMES,
    toggleInList,
} from '../../utils/maratonScheduleUtils';

const checkboxListStyle = {
    maxHeight: '140px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.45rem',
    padding: '0.6rem 0.75rem',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.03)',
};

/**
 * Formulario de largada Maratón.
 * El día/hora son siempre manuales: el sistema no sugiere ni pateá horarios.
 */
const MaratonLargadaForm = ({
    categorias = [],
    botes = [],
    distancias = [],
    selectedCats,
    selectedBotes,
    selectedSexes,
    selectedDist,
    selectedDate,
    selectedTime,
    setSelectedCats,
    setSelectedBotes,
    setSelectedSexes,
    setSelectedDist,
    setSelectedDate,
    setSelectedTime,
    editing,
    saving,
    canSave,
    onCancel,
    onSubmit,
}) => (
    <div className="form-column">
        <h4 className="section-title">{editing ? 'Editar Largada' : 'Nueva Largada'}</h4>
        <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1rem', lineHeight: 1.4 }}>
            Marcá categorías, botes y ramas para una misma largada.
            El horario lo definís vos: no se calcula solo como en pista.
        </p>

        <div className="admin-grid-form">
            <div className="form-group">
                <label>Categorías</label>
                <div style={checkboxListStyle}>
                    {categorias.map(c => (
                        <label key={c.id} className="checkbox-label" style={{ fontSize: '0.85rem', margin: 0 }}>
                            <input
                                type="checkbox"
                                checked={selectedCats.includes(String(c.id))}
                                onChange={() => setSelectedCats(prev => toggleInList(prev, c.id))}
                            />
                            {CATEGORIA_NAMES[c.id] || c.nombre}
                        </label>
                    ))}
                </div>
            </div>

            <div className="form-group">
                <label>Botes</label>
                <div style={checkboxListStyle}>
                    {botes.map(b => (
                        <label key={b.id} className="checkbox-label" style={{ fontSize: '0.85rem', margin: 0 }}>
                            <input
                                type="checkbox"
                                checked={selectedBotes.includes(String(b.id))}
                                onChange={() => setSelectedBotes(prev => toggleInList(prev, b.id))}
                            />
                            {BOTE_NAMES[b.id] || b.tipo}
                        </label>
                    ))}
                </div>
            </div>

            <div className="form-group">
                <label>Ramas</label>
                <div style={{ ...checkboxListStyle, maxHeight: 'none' }}>
                    {[1, 2, 3].map(sexId => (
                        <label key={sexId} className="checkbox-label" style={{ fontSize: '0.85rem', margin: 0 }}>
                            <input
                                type="checkbox"
                                checked={selectedSexes.includes(String(sexId))}
                                onChange={() => setSelectedSexes(prev => toggleInList(prev, sexId))}
                            />
                            {SEXO_NAMES[sexId]}
                        </label>
                    ))}
                </div>
            </div>

            <div className="form-group">
                <label>Distancia</label>
                <select className="admin-select" value={selectedDist} onChange={e => setSelectedDist(e.target.value)}>
                    <option value="">Seleccionar...</option>
                    {distancias.map(d => (
                        <option key={d.id} value={d.id}>{DISTANCIA_NAMES[d.id] || `${d.distanciaRegata}m`}</option>
                    ))}
                </select>
            </div>

            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                    <label>Día</label>
                    <input type="date" className="admin-input" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
                </div>
                <div className="form-group">
                    <label>Hora (manual)</label>
                    <input type="time" className="admin-input" value={selectedTime} onChange={e => setSelectedTime(e.target.value)} required />
                    <small style={{ display: 'block', marginTop: '0.35rem', color: '#94a3b8', fontSize: '0.75rem' }}>
                        Obligatorio. No se autocompleta desde otras largadas.
                    </small>
                </div>
            </div>

            <div className="form-actions mt-md">
                {editing && <button type="button" className="btn-admin-secondary" onClick={onCancel}>Cancelar</button>}
                <button type="button" className="btn-admin-primary flex-1" onClick={onSubmit} disabled={saving || !canSave}>
                    {saving ? '...' : (editing ? 'Actualizar' : 'Crear largada')}
                </button>
            </div>
        </div>
    </div>
);

export default MaratonLargadaForm;
