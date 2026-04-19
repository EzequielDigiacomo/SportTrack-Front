import React from 'react';
import { Filter } from 'lucide-react';

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
                        {pruebas.map(p => (
                            <option key={p.id} value={p.id}>
                                {new Date(p.fechaHora).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {p.prueba?.categoria?.nombre} {p.prueba?.bote?.nombre} {p.prueba?.distancia?.metros}m {p.prueba?.sexo?.nombre}
                            </option>
                        ))}
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
