import React from 'react';
import { Trophy } from 'lucide-react';
import { computePositionsForPhase, isExcludedFromRanking, timeToMs } from '../../utils/resultadosHelpers';
import { formatRaceTime, isMeaningfulRaceTime } from '../../utils/raceTimeUtils';

const formatDiff = (diffMs) => {
    if (diffMs === null || diffMs <= 0) return '-';
    const totalSec = diffMs / 1000;
    if (totalSec < 60) return `+${totalSec.toFixed(3)}s`;
    const m = Math.floor(totalSec / 60);
    const s = (totalSec % 60).toFixed(3).padStart(6, '0');
    return `+${m}:${s}`;
};

const getSoloApellido = (nombreCompleto) => {
    if (!nombreCompleto) return "-";
    const parts = nombreCompleto.trim().split(' ');
    return parts[parts.length - 1];
};

const isBoteK4 = (fase) => {
    const p = fase?.prueba?.prueba || fase?.prueba || fase;
    if (!p) return false;
    const bote = p.bote;
    if (!bote) return false;
    if (bote.id === 3 || bote.id === 6) return true; // K4 or C4
    const name = bote.nombre || '';
    return name.toUpperCase().includes('4');
};

const normalizeEstadoCanto = (estado) => {
    if (!estado || estado === 'Pendiente') return 'Pendiente';
    if (estado === 'Descalificado') return 'DSQ';
    return estado;
};

const ResultadosTable = ({ 
    fase, 
    tiemposLocales, 
    onResultChange,
    onStatusChange,
    isLocked,
    isSuccess,
    isAdmin = true
}) => {
    if (!fase) return null;

    const computedPositions = computePositionsForPhase(fase.resultados, tiemposLocales);

    const phaseHasMeaningfulTimes = (fase.resultados || []).some(r => {
        const local = tiemposLocales[r.id] || {};
        const time = local.tiempoOficial !== undefined ? local.tiempoOficial : r.tiempoOficial;
        return isMeaningfulRaceTime(time);
    });

    const sortByCarril = (a, b) => (a.carril || 99) - (b.carril || 99);

    const getDisplayPosition = (res) => {
        const local = tiemposLocales[res.id] || {};
        const estado = local.estadoCanto || res.estado;
        if (isExcludedFromRanking(estado)) return '';
        return computedPositions[res.id] || '';
    };

    // Si no es admin, mostramos el formato "Live Results" (vista de consulta premium y simple)
    if (!isAdmin) {
        const sorted = [...fase.resultados].sort((a, b) => {
            if (!phaseHasMeaningfulTimes) return sortByCarril(a, b);
            const posA = getDisplayPosition(a);
            const posB = getDisplayPosition(b);
            if (posA && posB) return posA - posB;
            if (posA) return -1;
            if (posB) return 1;
            return sortByCarril(a, b);
        });

        const lider = sorted.find(r => getDisplayPosition(r) === 1);
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
                            const pos = getDisplayPosition(res);
                            const timeStr = local.tiempoOficial !== undefined ? local.tiempoOficial : res.tiempoOficial;
                            const displayTime = formatRaceTime(timeStr);
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
                                                {(() => {
                                                    const names = res.tripulantes && res.tripulantes.length > 0 
                                                        ? [res.participanteNombre, ...res.tripulantes.map(t => t.participanteNombreCompleto || t.participanteNombre)]
                                                        : [res.participanteNombre];
                                                    
                                                    if (isBoteK4(fase)) {
                                                        return names.map(n => getSoloApellido(n)).join(' - ');
                                                    } else {
                                                        return names.join(' - ');
                                                    }
                                                })()}
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

    const sortedResultados = [...fase.resultados].sort((a, b) => {
        if (!phaseHasMeaningfulTimes) return sortByCarril(a, b);

        const localA = tiemposLocales[a.id] || {};
        const localB = tiemposLocales[b.id] || {};
        
        const statusA = localA.estadoCanto || a.estado;
        const statusB = localB.estadoCanto || b.estado;
        
        const hasStatusA = isExcludedFromRanking(statusA);
        const hasStatusB = isExcludedFromRanking(statusB);

        if (hasStatusA && !hasStatusB) return 1;
        if (!hasStatusA && hasStatusB) return -1;
        
        const pA = getDisplayPosition(a);
        const pB = getDisplayPosition(b);
        
        if (pA && pB) return pA - pB;
        if (pA) return -1;
        if (pB) return 1;

        const tA = timeToMs(localA.tiempoOficial || a.tiempoOficial) ?? 9999999;
        const tB = timeToMs(localB.tiempoOficial || b.tiempoOficial) ?? 9999999;
        if (tA !== tB) return tA - tB;
        return sortByCarril(a, b);
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
                        <th style={{ width: onStatusChange ? '220px' : '150px' }}>TIEMPO / ESTADO</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedResultados.map(res => {
                        const local = tiemposLocales[res.id] || {};
                        const displayTime = formatRaceTime(local.tiempoOficial !== undefined ? local.tiempoOficial : res.tiempoOficial);
                        const displayPos = getDisplayPosition(res);
                        const displayCarril = local.carril !== undefined ? local.carril : (res.carril || '');
                        const displayNombre = local.participanteNombre !== undefined ? local.participanteNombre : (res.participanteNombre || '');
                        const displayClub = local.clubSigla !== undefined ? local.clubSigla : (res.clubSigla || '');
                        
                        const status = normalizeEstadoCanto(local.estadoCanto || res.estado);
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
                                            readOnly
                                            disabled={isLocked}
                                            title="La posición se calcula automáticamente según el tiempo"
                                            style={{ textAlign: 'center', width: '50px', background: 'rgba(255,255,255,0.05)' }}
                                        />
                                    )}
                                </td>
                                <td className="col-carril text-center">
                                    <input 
                                        type="number"
                                        className="admin-input-small"
                                        value={displayCarril}
                                        onChange={(e) => onResultChange(res.id, 'carril', e.target.value)}
                                        disabled={isLocked}
                                        style={{ textAlign: 'center', width: '50px', fontWeight: 'bold' }}
                                    />
                                </td>
                                <td className="col-atleta">
                                    <div className="atleta-info-wrapper" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <input 
                                            type="text"
                                            className="admin-input-small"
                                            value={displayNombre}
                                            onChange={(e) => onResultChange(res.id, 'participanteNombre', e.target.value)}
                                            disabled={isLocked}
                                            style={{ width: '100%', minWidth: '150px' }}
                                        />
                                        {isOfficial && <span className="official-badge">Oficial</span>}
                                    </div>
                                </td>
                                <td className="col-club">
                                    <input 
                                        type="text"
                                        className="admin-input-small"
                                        value={displayClub}
                                        onChange={(e) => onResultChange(res.id, 'clubSigla', e.target.value)}
                                        disabled={isLocked}
                                        style={{ textAlign: 'center', width: '70px', fontWeight: 'bold' }}
                                    />
                                </td>
                                <td className="col-tiempo">
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
                                        {isSpecialStatus ? (
                                            <span className={`status-badge-judge ${status.toLowerCase()}`}>{status}</span>
                                        ) : (
                                            <input 
                                                type="text"
                                                placeholder="00:00.000"
                                                className="admin-input-small"
                                                value={displayTime}
                                                onChange={(e) => onResultChange(res.id, 'tiempoOficial', e.target.value)}
                                                disabled={isLocked}
                                                style={{ fontFamily: 'JetBrains Mono, monospace', textAlign: 'center', width: '100%' }}
                                            />
                                        )}
                                        {onStatusChange && (
                                            <div className="status-quick-actions">
                                                <button
                                                    type="button"
                                                    className={`btn-status-toggle dns ${status === 'DNS' ? 'active' : ''}`}
                                                    onClick={() => onStatusChange(res.id, status === 'DNS' ? 'Pendiente' : 'DNS')}
                                                    disabled={isLocked}
                                                >
                                                    DNS
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`btn-status-toggle dnf ${status === 'DNF' ? 'active' : ''}`}
                                                    onClick={() => onStatusChange(res.id, status === 'DNF' ? 'Pendiente' : 'DNF')}
                                                    disabled={isLocked}
                                                >
                                                    DNF
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`btn-status-toggle dsq ${status === 'DSQ' ? 'active' : ''}`}
                                                    onClick={() => onStatusChange(res.id, status === 'DSQ' ? 'Pendiente' : 'DSQ')}
                                                    disabled={isLocked}
                                                >
                                                    DSQ
                                                </button>
                                            </div>
                                        )}
                                    </div>
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

