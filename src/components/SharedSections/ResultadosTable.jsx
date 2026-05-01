import React from 'react';

const formatTime = (timeStr) => {
    if (!timeStr || timeStr === '') return '';
    try {
        const parts = timeStr.split(':');
        if (parts.length === 3) {
            const [h, m, sFull] = parts;
            const [s, ms] = (sFull || '00.000').split('.');
            const msShort = (ms || '0').substring(0, 3).padEnd(3, '0');
            
            const totalMin = (parseInt(h) * 60) + parseInt(m);
            return `${String(totalMin).padStart(2, '0')}:${s.padStart(2, '0')}.${msShort}`;
        }
        if (timeStr.includes('.') && !timeStr.includes(':')) {
             return timeStr;
        }
        return timeStr;
    } catch {
        return timeStr;
    }
};

const getSoloApellido = (nombreCompleto) => {
    if (!nombreCompleto) return "-";
    const parts = nombreCompleto.trim().split(' ');
    // Retornamos el último elemento (el apellido)
    return parts[parts.length - 1];
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
        const localA = tiemposLocales[a.id] || {};
        const localB = tiemposLocales[b.id] || {};
        
        const statusA = localA.estadoCanto || a.estado;
        const statusB = localB.estadoCanto || b.estado;
        
        const hasStatusA = statusA && !['Pendiente', 'Preliminar', 'Oficial', 'Revisado'].includes(statusA);
        const hasStatusB = statusB && !['Pendiente', 'Preliminar', 'Oficial', 'Revisado'].includes(statusB);

        // Los que tienen estado especial (DNS/DNF/DSQ) van al final
        if (hasStatusA && !hasStatusB) return 1;
        if (!hasStatusA && hasStatusB) return -1;
        
        const pA = localA.posicion || a.posicion;
        const pB = localB.posicion || b.posicion;
        
        if (pA && pB) return pA - pB;
        if (pA) return -1;
        if (pB) return 1;

        // Si no hay posición, ordenamos por tiempo
        const tA = parseTimeToMs(localA.tiempoOficial || a.tiempoOficial);
        const tB = parseTimeToMs(localB.tiempoOficial || b.tiempoOficial);
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
                        <th style={{ width: '150px' }}>TIEMPO / ESTADO</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedResultados.map(res => {
                        const local = tiemposLocales[res.id] || {};
                        const displayTime = formatTime(local.tiempoOficial !== undefined ? local.tiempoOficial : res.tiempoOficial);
                        const displayPos = local.posicion !== undefined ? local.posicion : (res.posicion || '');
                        
                        const status = local.estadoCanto || res.estado;
                        const isSpecialStatus = status && !['Pendiente', 'Preliminar', 'Oficial', 'Revisado'].includes(status);

                        const isOfficial = res.tiempoOficial && res.tiempoOficial !== '';
                        let rowClass = isOfficial ? 'row-official-saved' : (isSuccess ? 'saved-row' : '');
                        if (isSpecialStatus) rowClass += ' row-with-status';
                        
                        return (
                            <tr key={res.id} className={rowClass}>
                                <td>
                                    {!isSpecialStatus && (
                                        <input 
                                            type="number"
                                            className="admin-input-small"
                                            value={displayPos}
                                            onChange={(e) => onResultChange(res.id, 'posicion', e.target.value)}
                                            disabled={isLocked}
                                            style={{ textAlign: 'center', width: '50px' }}
                                        />
                                    )}
                                </td>
                                <td className="text-center" style={{ fontWeight: 'bold' }}>
                                    {res.carril || '-'}
                                </td>
                                <td>
                                    {res.tripulantes && res.tripulantes.length > 0 
                                        ? [res.participanteNombre, ...res.tripulantes.map(t => t.participanteNombre)].map(n => getSoloApellido(n)).join(' - ')
                                        : getSoloApellido(res.participanteNombre)
                                    }
                                    {isOfficial && <span className="official-badge">Oficial</span>}
                                </td>
                                <td><span className="chip chip-ecu-blue">{res.clubSigla}</span></td>
                                <td>
                                    {isSpecialStatus ? (
                                        <span className={`status-badge-judge ${status.toLowerCase()}`}>{status}</span>
                                    ) : (
                                        <input 
                                            type="text"
                                            placeholder="00:00.00"
                                            className="admin-input-small"
                                            value={displayTime}
                                            onChange={(e) => onResultChange(res.id, 'tiempoOficial', e.target.value)}
                                            disabled={isLocked}
                                            style={{ fontFamily: 'monospace', textAlign: 'center' }}
                                        />
                                    )}
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

