import React from 'react';

const PruebaForm = ({ 
    categorias, botes, distancias, 
    selectedCat, setSelectedCat,
    selectedBote, setSelectedBote,
    selectedDist, setSelectedDist,
    selectedSex, setSelectedSex,
    selectedDate, setSelectedDate,
    selectedTime, setSelectedTime,
    onAdd, saving, editingId, onReset
}) => {
    return (
        <div className="prueba-form-container glass-effect p-md" style={{ borderRadius: '12px', marginBottom: '2rem' }}>
            <h4 style={{ margin: '0 0 1rem 0', color: 'var(--color-primary-light)' }}>
                {editingId ? 'Editar Prueba Seleccionada' : 'Configurar Nueva Prueba'}
            </h4>
            <div className="admin-grid-form" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                <div className="form-group">
                    <label>Categoría</label>
                    <select value={selectedCat} onChange={e => setSelectedCat(e.target.value)}>
                        <option value="">Seleccionar...</option>
                        {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                </div>
                <div className="form-group">
                    <label>Bote</label>
                    <select value={selectedBote} onChange={e => setSelectedBote(e.target.value)}>
                        <option value="">Seleccionar...</option>
                        {botes.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                    </select>
                </div>
                <div className="form-group">
                    <label>Distancia</label>
                    <select value={selectedDist} onChange={e => setSelectedDist(e.target.value)}>
                        <option value="">Seleccionar...</option>
                        {distancias.map(d => <option key={d.id} value={d.id}>{d.metros}m</option>)}
                    </select>
                </div>
                <div className="form-group">
                    <label>Rama / Sexo</label>
                    <select value={selectedSex} onChange={e => setSelectedSex(e.target.value)}>
                        <option value="">Seleccionar...</option>
                        <option value="Masculino">Masculino</option>
                        <option value="Femenino">Femenino</option>
                        <option value="Mixto">Mixto</option>
                    </select>
                </div>
                <div className="form-group">
                    <label>Fecha de la Prueba</label>
                    <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
                </div>
                <div className="form-group">
                    <label>Hora Estimada</label>
                    <input type="time" value={selectedTime} onChange={e => setSelectedTime(e.target.value)} />
                </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1.5rem' }}>
                {editingId && (
                    <button className="btn-admin-secondary" onClick={onReset}>Cancelar Edición</button>
                )}
                <button 
                    className="btn-admin-primary" 
                    onClick={onAdd}
                    disabled={saving}
                >
                    {saving ? 'Procesando...' : (editingId ? 'Actualizar Prueba' : 'Habilitar Prueba')}
                </button>
            </div>
        </div>
    );
};

export default PruebaForm;
