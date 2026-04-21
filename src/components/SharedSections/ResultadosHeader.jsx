import React from 'react';

const CATEGORIA_NAMES = {
    1: 'Pre-Infantil (10-11 años)',
    2: 'Infantil (11-12 años)',
    3: 'Menor (13-14 años)',
    4: 'Cadete (14-15 años)',
    5: 'Junior (16-17 años)',
    6: 'Sub-23 (18-22 años)',
    7: 'Senior (18-35 años)',
    8: 'Master A (40-45 años)',
    9: 'Master B (46-50 años)',
    10: 'Master C (50+ años)'
};

const BOTE_NAMES = { 1: 'K1', 2: 'K2', 3: 'K4', 4: 'C1', 5: 'C2', 6: 'Paracanotaje' };

const DISTANCIA_NAMES = {
    1: '200m', 2: '350m', 3: '400m', 4: '450m', 5: '500m',
    6: '1000m', 7: '1500m', 8: '2000m', 9: '3000m', 10: '5000m',
    11: '10000m', 12: '12000m', 13: '15000m', 14: '18000m', 15: '22000m', 16: '30000m'
};

const SEXO_NAMES = { 1: 'Masculino', 2: 'Femenino', 3: 'Mixto' };

const ResultadosHeader = ({ 
    eventos, 
    selectedEvento, 
    setSelectedEvento, 
    pruebas, 
    selectedPrueba, 
    setSelectedPrueba,
    currentTab,
    setCurrentTab
}) => {
    return (
        <div className="resultados-header-section admin-form-card glass-effect mb-xl">
            <div className="admin-grid-form" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
                <div className="form-group">
                    <label>Seleccionar Evento</label>
                    <select 
                        value={selectedEvento} 
                        onChange={(e) => setSelectedEvento(e.target.value)}
                        className="admin-select"
                    >
                        <option value="">-- Seleccione un Evento --</option>
                        {eventos.map(ev => (
                            <option key={ev.id} value={ev.id}>{ev.nombre || ev.Nombre}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label>Seleccionar Prueba / Schedule</label>
                    <select 
                        value={selectedPrueba} 
                        onChange={(e) => setSelectedPrueba(e.target.value)}
                        disabled={!selectedEvento}
                        className="admin-select"
                    >
                        <option value="">-- Seleccione una Prueba --</option>
                        {pruebas.map(p => {
                            const catId = p.prueba?.categoriaId || p.prueba?.categoria?.id;
                            const botId = p.prueba?.boteId || p.prueba?.bote?.id;
                            const distId = p.prueba?.distanciaId || p.prueba?.distancia?.id;
                            const sexId = p.prueba?.sexoId || p.prueba?.sexo?.id;
                            
                            const catName = CATEGORIA_NAMES[catId] || p.prueba?.categoria?.nombre || 'Categoría';
                            const botName = BOTE_NAMES[botId] || p.prueba?.bote?.nombre || '';
                            const distName = DISTANCIA_NAMES[distId] || (p.prueba?.distancia?.metros ? `${p.prueba.distancia.metros}m` : '');
                            const sexName = SEXO_NAMES[sexId] || p.prueba?.sexo?.nombre || '';

                            return (
                                <option key={p.id} value={p.id}>
                                    {new Date(p.fechaHora).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {catName} {botName} {distName} {sexName}
                                </option>
                            );
                        })}
                    </select>
                </div>
            </div>

            {selectedPrueba && (
                <div className="admin-tabs-nav mt-xl">
                    <button 
                        className={`admin-tab-btn ${currentTab === 'startList' ? 'active' : ''}`}
                        onClick={() => setCurrentTab('startList')}
                    >
                        📋 Start List (Inscritos)
                    </button>
                    <button 
                        className={`admin-tab-btn ${currentTab === 'resultados' ? 'active' : ''}`}
                        onClick={() => setCurrentTab('resultados')}
                    >
                        ⏱️ Resultados y Tiempos
                    </button>
                </div>
            )}
        </div>
    );
};

export default ResultadosHeader;
