import React from 'react';

// Converts backend TimeSpan string "00:01:23.4500000" → "01:23.45"
const formatTime = (timeStr) => {
    if (!timeStr || timeStr === '') return '';
    try {
        // Remove trailing zeros from fractional seconds
        const [, rest] = timeStr.split(/^00:/); // strips leading "00:" for hours
        if (!rest) {
            // Was already hh:mm:ss.fff, try again
            const parts = timeStr.split(':');
            if (parts.length === 3) {
                const [h, m, sFull] = parts;
                const [s, ms] = sFull.split('.');
                const msShort = (ms || '0').substring(0, 3);
                const totalMin = parseInt(h) * 60 + parseInt(m);
                return `${String(totalMin).padStart(2, '0')}:${s.padStart(2, '0')}.${msShort}`;
            }
            return timeStr;
        }
        // rest = "mm:ss.fffffff"
        const [m, sFull] = rest.split(':');
        const [s, ms] = (sFull || '').split('.');
        const msShort = (ms || '0').substring(0, 3);
        return `${m.padStart(2, '0')}:${(s || '00').padStart(2, '0')}.${msShort}`;
    } catch {
        return timeStr;
    }
};

const ResultadosTable = ({ 
    fase, 
    tiemposLocales, 
    onResultChange, 
    isLocked 
}) => {
    if (!fase) return null;

    const sortedResultados = [...fase.resultados].sort((a, b) => {
        const tA = tiemposLocales[a.id]?.posicion || a.posicion || 999;
        const tB = tiemposLocales[b.id]?.posicion || b.posicion || 999;
        if (tA !== tB) return tA - tB;
        return (a.carril || 99) - (b.carril || 99);
    });

    return (
        <div className="resultados-table-wrapper fade-in">
            <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                Fase: <span style={{ color: 'var(--color-primary-light)' }}>{fase.nombreFase}</span>
            </h3>
            <table className="admin-table">
                <thead>
                    <tr>
                        <th style={{ width: '60px' }}>Carril</th>
                        <th>Participante</th>
                        <th>Club</th>
                        <th style={{ width: '150px' }}>Tiempo (mm:ss.ms)</th>
                        <th style={{ width: '100px' }}>Posición</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedResultados.map(res => {
                        const local = tiemposLocales[res.id] || {};
                        const displayTime = local.tiempoOficial !== undefined 
                            ? local.tiempoOficial  // user is editing — show raw
                            : formatTime(res.tiempoOficial);
                        const displayPos = local.posicion !== undefined ? local.posicion : (res.posicion || '');
                        return (
                            <tr key={res.id}>
                                <td className="text-center" style={{ fontWeight: 'bold' }}>{res.carril || '-'}</td>
                                <td>{res.participanteNombre}</td>
                                <td><span className="chip chip-ecu-blue">{res.clubSigla}</span></td>
                                <td>
                                    <input 
                                        type="text"
                                        placeholder="00:00.00"
                                        className="admin-input-small"
                                        value={displayTime}
                                        onChange={(e) => onResultChange(res.id, 'tiempoOficial', e.target.value)}
                                        disabled={isLocked}
                                        style={{ fontFamily: 'monospace', textAlign: 'center' }}
                                    />
                                </td>
                                <td>
                                    <input 
                                        type="number"
                                        className="admin-input-small"
                                        value={displayPos}
                                        onChange={(e) => onResultChange(res.id, 'posicion', e.target.value)}
                                        disabled={isLocked}
                                        style={{ textAlign: 'center' }}
                                    />
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default ResultadosTable;

