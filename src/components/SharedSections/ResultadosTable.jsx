import React from 'react';

// Converts backend TimeSpan string "00:01:23.4500000" → "01:23.450"
const formatTime = (timeStr) => {
    if (!timeStr || timeStr === '') return '';
    try {
        // El formato de C# suele ser hh:mm:ss.fffffff
        const parts = timeStr.split(':');
        if (parts.length === 3) {
            const [h, m, sFull] = parts;
            const [s, ms] = (sFull || '00.000').split('.');
            const msShort = (ms || '0').substring(0, 3).padEnd(3, '0');
            
            const totalMin = (parseInt(h) * 60) + parseInt(m);
            return `${String(totalMin).padStart(2, '0')}:${s.padStart(2, '0')}.${msShort}`;
        }
        
        // Si ya viene formateado como mm:ss.ms por el front
        if (timeStr.includes('.') && !timeStr.includes(':')) {
             return timeStr; // ya procesado
        }
        
        return timeStr;
    } catch {
        return timeStr;
    }
};

const ResultadosTable = ({ 
    fase, 
    tiemposLocales, 
    onResultChange, 
    isLocked,
    isSuccess
}) => {
    if (!fase) return null;

    const parseTimeToMs = (timeStr) => {
        if (!timeStr) return 9999999;
        try {
            const parts = timeStr.split(':');
            if (parts.length === 3) {
                const [h, m, sFull] = parts;
                const [s, ms] = (sFull || '0').split('.');
                return (parseInt(h) * 3600000) + (parseInt(m) * 60000) + (parseInt(s) * 1000) + parseInt((ms || '0').substring(0, 3));
            }
            if (timeStr.includes(':') && timeStr.includes('.')) {
                const [m, sFull] = timeStr.split(':');
                const [s, ms] = sFull.split('.');
                return (parseInt(m) * 60000) + (parseInt(s) * 1000) + parseInt((ms || '0').substring(0, 3));
            }
            return 9999999;
        } catch { return 9999999; }
    };

    const sortedResultados = [...fase.resultados].sort((a, b) => {
        const pA = tiemposLocales[a.id]?.posicion || a.posicion;
        const pB = tiemposLocales[b.id]?.posicion || b.posicion;
        
        if (pA && pB) return pA - pB;
        if (pA) return -1;
        if (pB) return 1;

        // Si no hay posición, ordenamos por tiempo
        const tA = parseTimeToMs(tiemposLocales[a.id]?.tiempoOficial || a.tiempoOficial);
        const tB = parseTimeToMs(tiemposLocales[b.id]?.tiempoOficial || b.tiempoOficial);
        return tA - tB;
    });

    return (
        <div className={`resultados-table-wrapper fade-in ${isSuccess ? 'grid-success-flash' : ''}`}>
            <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                Fase: <span style={{ color: 'var(--color-primary-light)' }}>{fase.nombreFase}</span>
            </h3>
            <table className="admin-table">
                <thead>
                    <tr>
                        <th style={{ width: '60px' }}>POS</th>
                        <th style={{ width: '60px' }}>CARRIL</th>
                        <th>PARTICIPANTE</th>
                        <th>CLUB</th>
                        <th style={{ width: '150px' }}>TIEMPO (MM:SS.MS)</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedResultados.map(res => {
                        const local = tiemposLocales[res.id] || {};
                        const displayTime = formatTime(local.tiempoOficial !== undefined ? local.tiempoOficial : res.tiempoOficial);
                        const displayPos = local.posicion !== undefined ? local.posicion : (res.posicion || '');
                        
                        const isOfficial = res.tiempoOficial && res.tiempoOficial !== '';
                        const rowClass = isOfficial ? 'row-official-saved' : (isSuccess ? 'saved-row' : '');
                        
                        return (
                            <tr key={res.id} className={rowClass}>
                                <td>
                                    <input 
                                        type="number"
                                        className="admin-input-small"
                                        value={displayPos}
                                        onChange={(e) => onResultChange(res.id, 'posicion', e.target.value)}
                                        disabled={isLocked || isOfficial}
                                        style={{ textAlign: 'center', width: '50px' }}
                                    />
                                </td>
                                <td className="text-center" style={{ fontWeight: 'bold' }}>
                                    {res.carril || '-'}
                                </td>
                                <td>
                                    {res.participanteNombre}
                                    {isOfficial && <span className="official-badge">Oficial</span>}
                                </td>
                                <td><span className="chip chip-ecu-blue">{res.clubSigla}</span></td>
                                <td>
                                    <input 
                                        type="text"
                                        placeholder="00:00.00"
                                        className="admin-input-small"
                                        value={displayTime}
                                        onChange={(e) => onResultChange(res.id, 'tiempoOficial', e.target.value)}
                                        disabled={isLocked || isOfficial}
                                        style={{ fontFamily: 'monospace', textAlign: 'center' }}
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

