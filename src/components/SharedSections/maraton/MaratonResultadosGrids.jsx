import React, { useMemo } from 'react';
import ResultadosTable from '../ResultadosTable';
import { groupMaratonResultadosByClasificacion } from './maratonStartListUtils';
import '../ConfigurarPruebas.css';

/**
 * Resultados Maratón: una grilla por clasificación (Categoría · Sexo · Bote).
 * La largada es compartida; al finalizar se muestran clasificaciones separadas.
 */
const MaratonResultadosGrids = ({
    fase,
    pruebas = [],
    tiemposLocales,
    onResultChange,
    onStatusChange,
    onTransferRequest,
    isLocked,
    isSuccess,
    isAdmin = true,
    allowManualPositions = false,
    isMaraton = true,
    /** Mapa opcional InscripcionId → EventoPruebaId (fallback si la API aún no envía eventoPruebaId). */
    inscripcionEpMap = null,
}) => {
    const groups = useMemo(() => {
        if (!fase) return [];

        // Enriquecer resultados con EventoPruebaId si falta
        const enrichedFase = {
            ...fase,
            resultados: (fase.resultados || []).map(r => {
                if (r.eventoPruebaId || r.EventoPruebaId) return r;
                const epId = inscripcionEpMap?.get?.(String(r.inscripcionId))
                    ?? inscripcionEpMap?.[String(r.inscripcionId)];
                return epId ? { ...r, eventoPruebaId: epId } : r;
            }),
        };

        return groupMaratonResultadosByClasificacion(enrichedFase, pruebas);
    }, [fase, pruebas, inscripcionEpMap]);

    if (!fase) return null;

    if (!groups.length) {
        return (
            <ResultadosTable
                fase={fase}
                tiemposLocales={tiemposLocales}
                onResultChange={onResultChange}
                onStatusChange={onStatusChange}
                onTransferRequest={onTransferRequest}
                isLocked={isLocked}
                isSuccess={isSuccess}
                isAdmin={isAdmin}
                allowManualPositions={allowManualPositions}
                isMaraton={isMaraton}
            />
        );
    }

    return (
        <div className="maraton-resultados-grids">
            <div className="seeding-status-banner info mb-md">
                <span>
                    Maratón: resultados clasificados por <strong>Categoría · Sexo · Bote</strong>
                    {' '}({groups.length} grilla{groups.length !== 1 ? 's' : ''}).
                </span>
            </div>

            {groups.map(g => (
                <div key={g.key} className="mb-lg">
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        marginBottom: '0.6rem',
                        flexWrap: 'wrap',
                    }}>
                        <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--color-primary-light)' }}>
                            {g.title}
                        </h3>
                        <span className="badge-inscritos">{g.resultados.length}</span>
                        <span className={`badge-sexo ${
                            String(g.sexoLabel || '').toLowerCase().startsWith('masc') ? 'masc'
                                : String(g.sexoLabel || '').toLowerCase().startsWith('fem') ? 'fem'
                                    : 'mix'
                        }`}>{g.sexoLabel}</span>
                        <span className="badge-bote">{g.boteLabel}</span>
                    </div>
                    <ResultadosTable
                        fase={g.faseVirtual}
                        tiemposLocales={tiemposLocales}
                        onResultChange={onResultChange}
                        onStatusChange={onStatusChange}
                        onTransferRequest={onTransferRequest}
                        isLocked={isLocked}
                        isSuccess={isSuccess}
                        isAdmin={isAdmin}
                        allowManualPositions={allowManualPositions}
                        isMaraton={isMaraton}
                    />
                </div>
            ))}
        </div>
    );
};

export default MaratonResultadosGrids;
