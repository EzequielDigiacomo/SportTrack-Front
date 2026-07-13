import React from 'react';
import { formatTime } from '../../utils/dateUtils';
import { Trophy, Calendar, Search, List, FileText } from 'lucide-react';

const CATEGORIA_NAMES = {
    1: 'Pre-infantil (8-10 años)', 2: 'Infantil (11-12 años)', 3: 'Menor (13-14 años)', 4: 'Cadete (15-16 años)', 
    5: 'Junior (17-18 años)', 6: 'Sub-23 (19-23 años)', 7: 'Senior (24-39 años)', 8: 'Master A (40-49 años)', 
    9: 'Master B (50-59 años)', 10: 'Master C (60+ años)'
};

const BOTE_NAMES = { 1: 'K1', 2: 'K2', 3: 'K4', 4: 'C1', 5: 'C2', 6: 'C4' };

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
    setCurrentTab,
    hideTabs,
    cronograma = [],
    onSelectRegata,
    selectedFaseId,
    isAdmin = true
}) => {
    const CATEGORIA_COLORS = {
        1: { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444' },
        2: { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e' },
        3: { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6' },
        4: { bg: 'rgba(6, 182, 212, 0.15)', text: '#06b6d4' },
        5: { bg: 'rgba(99, 102, 241, 0.15)', text: '#6366f1' },
        6: { bg: 'rgba(168, 85, 247, 0.15)', text: '#a855f7' },
        7: { bg: 'rgba(236, 72, 153, 0.15)', text: '#ec4899' },
        8: { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b' },
        9: { bg: 'rgba(132, 204, 22, 0.15)', text: '#84cc16' },
        10: { bg: 'rgba(107, 114, 128, 0.15)', text: '#9ca3af' }
    };

    const p = pruebas.find(p => String(p.id) === String(selectedPrueba));
    const catColor = CATEGORIA_COLORS[p?.categoria?.id || p?.categoriaId] || { bg: 'transparent', text: 'var(--color-primary)' };

    return (
        <div className="resultados-header-section admin-form-card glass-effect">
            <div className="admin-grid-form resultados-header-grid">
                
                {/* Event Selector */}
                <div className="form-group">
                    <label className="resultados-field-label">
                        <Calendar size={14} className="text-primary" /> Evento
                    </label>
                    <select 
                        value={selectedEvento} 
                        onChange={(e) => setSelectedEvento(e.target.value)}
                        className="admin-select"
                        style={{ borderLeft: '3px solid var(--color-primary)' }}
                    >
                        <option value="">-- Seleccione un Evento --</option>
                        {eventos.map(ev => (
                            <option key={ev.id} value={ev.id}>{ev.nombre || ev.Nombre}</option>
                        ))}
                    </select>
                </div>

                {/* Prueba Selector */}
                {isAdmin && (
                    <div className="form-group">
                        <label className="resultados-field-label">
                            <Search size={14} className="text-secondary" /> Prueba / Categoría
                        </label>
                        <select 
                            value={selectedPrueba} 
                            onChange={(e) => setSelectedPrueba(e.target.value)}
                            className="admin-select"
                            style={{ 
                                borderLeft: `3px solid ${catColor.text}`,
                                color: catColor.text
                            }}
                        >
                            <option value="">-- Seleccione una Prueba --</option>
                            {pruebas.map(p => {
                                const inner = p.prueba || p;
                                const catId = inner.categoria?.id || inner.categoriaId;
                                const botId = inner.bote?.id || inner.boteId;
                                const distId = inner.distancia?.id || inner.distanciaId;

                                const catName = CATEGORIA_NAMES[catId] || inner.categoria?.nombre || 'Cat';
                                const botName = BOTE_NAMES[botId] || inner.bote?.tipo || 'Bote';
                                const distName = DISTANCIA_NAMES[distId] || (inner.distancia?.metros ? `${inner.distancia.metros}m` : '?m');

                                // Calcular el número de regata secuencial en el cronograma
                                const raceIndices = [];
                                (cronograma || []).forEach((f, idx) => {
                                    const pid = f.eventoPruebaId || f.EventoPruebaId;
                                    if (String(pid) === String(p.id)) {
                                        raceIndices.push(idx + 1);
                                    }
                                });
                                const minRaceNum = raceIndices.length > 0 ? Math.min(...raceIndices) : null;
                                const prefix = minRaceNum ? `#${minRaceNum} - ` : '';

                                const label = `${prefix}${p.nombre || `${catName} - ${botName} - ${distName}`}`;
                                
                                return (
                                    <option key={p.id} value={p.id} style={{ color: CATEGORIA_COLORS[catId]?.text || 'white' }}>
                                        {label}
                                    </option>
                                );
                            })}
                        </select>
                    </div>
                )}

                {/* Regata Selector */}
                <div className="form-group">
                    <div className="regata-label-row">
                        <label className="resultados-field-label" style={{ margin: 0 }}>
                            <List size={14} className="text-accent" /> Regata Específica
                        </label>
                        {cronograma.length > 0 && (
                            <div className="regata-pdf-actions">
                                <button 
                                    type="button"
                                    className="btn-admin-secondary compact btn-pdf-mini"
                                    onClick={() => {
                                        const ev = eventos.find(e => String(e.id) === String(selectedEvento));
                                        import('../../services/PdfExportService').then(m => {
                                            m.default.exportRegattaSchedule(cronograma, ev || 'Evento');
                                        });
                                    }}
                                >
                                    <FileText size={10} /> PDF Schedule
                                </button>
                                <button 
                                    type="button"
                                    className="btn-admin-secondary compact btn-pdf-mini"
                                    onClick={() => {
                                        const ev = eventos.find(e => String(e.id) === String(selectedEvento));
                                        import('../../services/PdfExportService').then(m => {
                                            m.default.exportCronogramaCompleto(cronograma, ev || 'Evento');
                                        });
                                    }}
                                >
                                    <FileText size={10} /> PDF Start List
                                </button>
                            </div>
                        )}
                    </div>
                    <select 
                        onChange={(e) => {
                            const fase = cronograma.find(f => String(f.id) === e.target.value);
                            if (onSelectRegata) onSelectRegata(fase || null);
                        }}
                        disabled={!selectedEvento || cronograma.length === 0}
                        className="admin-select"
                        style={{ borderLeft: '3px solid var(--color-accent)' }}
                        value={selectedFaseId || ''}
                    >
                        <option value="">-- Ver Cronograma Completo --</option>
                        {cronograma.map((f, idx) => {
                            const timeStr = formatTime(f.fechaHoraProgramada);
                            const timeDisplay = timeStr !== '--:--' ? `${timeStr} hs` : '';

                            const p = f.prueba?.prueba || f.prueba;
                            const catId = p?.categoria?.id || p?.categoriaId;
                            const botId = p?.bote?.id || p?.boteId;
                            const distId = p?.distancia?.id || p?.distanciaId;
                            const sexId = p?.sexoId || p?.sexo?.id;

                            const catName = CATEGORIA_NAMES[catId] || p?.categoria?.nombre || '';
                            const botName = BOTE_NAMES[botId] || p?.bote?.nombre || '';
                            const distName = DISTANCIA_NAMES[distId] || (p?.distancia?.metros ? `${p.distancia.metros}m` : '');
                            const sexName = SEXO_NAMES[sexId] || p?.sexoNombre || '';

                            const label = [`#${idx + 1}`, timeDisplay, f.nombreFase, catName, botName, distName, sexName]
                                .filter(Boolean)
                                .join(' - ');

                            return (
                                <option key={f.id} value={f.id}>
                                    {label}
                                </option>
                            );
                        })}
                    </select>
                </div>
            </div>

            {/* Header Status Bar */}
            <div className="resultados-header-status">
                <div className="resultados-status-left">
                    {cronograma.length > 0 && (
                        <div className="status-pill">
                            <List size={12} />
                            <span>Regatas <strong>{cronograma.length}</strong></span>
                        </div>
                    )}
                </div>

                
                {selectedPrueba && !hideTabs && (
                    <div className="admin-tabs-nav-modern">
                        <button 
                            type="button"
                            className={`tab-link ${currentTab === 'startList' ? 'active' : ''}`}
                            onClick={() => setCurrentTab('startList')}
                        >
                            Start List {selectedFaseId ? `#${cronograma.findIndex(f => String(f.id) === String(selectedFaseId)) + 1}` : ''}
                        </button>
                        <button 
                            type="button"
                            className={`tab-link ${currentTab === 'resultados' ? 'active' : ''}`}
                            onClick={() => setCurrentTab('resultados')}
                        >
                            Resultados {selectedFaseId ? `#${cronograma.findIndex(f => String(f.id) === String(selectedFaseId)) + 1}` : ''}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResultadosHeader;

