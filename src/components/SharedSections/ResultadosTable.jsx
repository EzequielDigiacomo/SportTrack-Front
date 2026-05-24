import React from 'react';
import { Trophy } from 'lucide-react';

const timeToMs = (time) => {
    if (!time) return null;
    const parts = time.split(':');
    try {
        if (parts.length === 3) {
            const [hh, mm, rest] = parts;
            const [ss, ms = '0'] = rest.split('.');
            return (parseInt(hh) * 3600000) + (parseInt(mm) * 60000) + (parseInt(ss) * 1000) + parseInt(ms.padEnd(3, '0').slice(0, 3));
        } else if (parts.length === 2) {
            const [mm, rest] = parts;
            const [ss, ms = '0'] = rest.split('.');
            return (parseInt(mm) * 60000) + (parseInt(ss) * 1000) + parseInt(ms.padEnd(3, '0').slice(0, 3));
        }
    } catch { return null; }
    return null;
};

const formatDiff = (diffMs) => {
    if (diffMs === null || diffMs <= 0) return '-';
    const totalSec = diffMs / 1000;
    if (totalSec < 60) return `+${totalSec.toFixed(3)}s`;
    const m = Math.floor(totalSec / 60);
    const s = (totalSec % 60).toFixed(3).padStart(6, '0');
    return `+${m}:${s}`;
};

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
    isSuccess,
    isAdmin = true
}) => {
    if (!fase) return null;

    // Si no es admin, mostramos el formato "Live Results" (vista de consulta premium y simple)
    if (!isAdmin) {
        const sorted = [...fase.resultados].sort((a, b) => {
            const localA = tiemposLocales[a.id] || {};
            const localB = tiemposLocales[b.id] || {};
            const posA = localA.posicion !== undefined ? localA.posicion : a.posicion;
            const posB = localB.posicion !== undefined ? localB.posicion : b.posicion;
            if (posA && posB) return posA - posB;
            if (posA) return -1;
            if (posB) return 1;
            return (a.carril || 99) - (b.carril || 99);
        });

        const lider = sorted.find(r => {
            const localR = tiemposLocales[r.id] || {};
            const pos = localR.posicion !== undefined ? localR.posicion : r.posicion;
            return pos === 1;
        });
        const liderTime = lider ? (tiemposLocales[lider.id]?.tiempoOficial !== undefined ? tiemposLocales[lider.id]?.tiempoOficial : lider.tiempoOficial) : null;
        const liderMs = liderTime ? timeToMs(liderTime) : null;

        return (
            <div className="resultados-table-wrapper fade-in" style={{ marginBottom: '2.5rem' }}>
                <h3 style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                    Fase: <span style={{ color: 'var(--color-primary-light)' }}>{fase.nombreFase}</span>
                </h3>
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th style={{ width: '60px' }}>POS</th>
                            <th style={{ width: '60px' }}>CARRIL</th>
                            <th>PARTICIPANTE / TRIPULACIÓN</th>
                            <th>CLUB</th>
                            <th style={{ width: '150px' }}>TIEMPO</th>
                            <th style={{ width: '100px' }}>DIF.</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map((res, index) => {
                            const local = tiemposLocales[res.id] || {};
                            const pos = local.posicion !== undefined ? local.posicion : (res.posicion || '');
                            const timeStr = local.tiempoOficial !== undefined ? local.tiempoOficial : res.tiempoOficial;
                            const displayTime = formatTime(timeStr);
                            const status = local.estadoCanto || res.estado;
                            const isSpecialStatus = status && !['Pendiente', 'Preliminar', 'Oficial', 'Revisado'].includes(status);

                            const tMs = timeStr ? timeToMs(timeStr) : null;
                            const diff = (pos !== 1 && liderMs && tMs) ? tMs - liderMs : null;

                            return (
                                <tr key={res.id} className={pos === 1 ? 'row-official-saved' : ''} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                    <td className="col-pos" style={{ fontWeight: 'bold', textAlign: 'center' }}>
                                        {pos === 1 ? (
                                            <Trophy size={16} style={{ color: '#eab308', display: 'inline' }} />
                                        ) : pos === 2 ? (
                                            <Trophy size={16} style={{ color: '#94a3b8', display: 'inline' }} />
                                        ) : pos === 3 ? (
                                            <Trophy size={16} style={{ color: '#cd7f32', display: 'inline' }} />
                                        ) : (
                                            pos || '—'
                                        )}
                                    </td>
                                    <td className="col-carril text-center" style={{ fontWeight: 'bold' }}>
                                        {res.carril || '-'}
                                    </td>
                                    <td className="col-atleta">
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <strong style={{ color: 'white', fontSize: '1.05rem' }}>
                                                {res.tripulantes && res.tripulantes.length > 0 
                                                    ? [res.participanteNombre, ...res.tripulantes.map(t => t.participanteNombre)].join(' - ')
                                                    : res.participanteNombre
                                                }
                                            </strong>
                                            {res.tripulantes && res.tripulantes.length > 0 && (
                                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', marginTop: '2px', letterSpacing: '0.5px' }}>
                                                    TRIPULACIÓN COMPLETA
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="col-club">
                                        <span className="chip chip-ecu-blue">{res.clubSigla}</span>
                                    </td>
                                    <td className="col-tiempo" style={{ fontWeight: 'bold', color: 'white' }}>
                                        {isSpecialStatus ? (
                                            <span className={`status-badge-judge ${status.toLowerCase()}`}>{status}</span>
                                        ) : (
                                            displayTime || '—'
                                        )}
                                    </td>
                                    <td className="col-diff" style={{ color: 'var(--color-text-dim)', fontSize: '0.9rem' }}>
                                        {isSpecialStatus ? '—' : formatDiff(diff)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    }

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
        <div className={`resultados-table-wrapper fade-in ${isSuccess ? 'grid-success-flash' : ''}`} style={{ marginBottom: '2.5rem' }}>
            <h3 style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
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
                                <td className="col-pos">
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
                                <td className="col-carril text-center" style={{ fontWeight: 'bold' }}>
                                    {res.carril || '-'}
                                </td>
                                <td className="col-atleta">
                                    <div className="atleta-info-wrapper">
                                        <span className="atleta-names">
                                            {res.tripulantes && res.tripulantes.length > 0 
                                                ? [res.participanteNombre, ...res.tripulantes.map(t => t.participanteNombre)].map(n => getSoloApellido(n)).join(' - ')
                                                : getSoloApellido(res.participanteNombre)
                                            }
                                        </span>
                                        {isOfficial && <span className="official-badge">Oficial</span>}
                                    </div>
                                </td>
                                <td className="col-club">
                                    <span className="chip chip-ecu-blue">{res.clubSigla}</span>
                                </td>
                                <td className="col-tiempo">
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

