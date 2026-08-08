import React, { useEffect, useState } from 'react';
import { List, RotateCcw, RefreshCw } from 'lucide-react';
import {
    loadMaratonLargadaInscriptos,
    sortearNumerosMaraton,
    sortInscriptosByNumero,
} from './maratonStartListUtils';
import '../ConfigurarPruebas.css';

/**
 * Start List exclusivo de Maratón.
 * - Muestra todos los atletas de la largada combinada (selectedPrueba = representante del grupo)
 * - Columna Bote (no cabeza de serie / carril)
 * - Sorteo: solo NumeroCompetidor 1..N
 */
const MaratonStartListPanel = ({
    pruebas = [],
    selectedPrueba,
    isAdmin = true,
    onMessage,
}) => {
    const [inscriptos, setInscriptos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isNominaCollapsed, setIsNominaCollapsed] = useState(false);

    const loadInscriptos = async (pruebaId) => {
        if (!pruebaId) {
            setInscriptos([]);
            return;
        }
        setLoading(true);
        try {
            const list = await loadMaratonLargadaInscriptos(pruebas, pruebaId);
            setInscriptos(sortInscriptosByNumero(list));
        } catch (err) {
            console.error(err);
            onMessage?.('Error al cargar inscritos de la largada.');
            setInscriptos([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadInscriptos(selectedPrueba);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPrueba, pruebas]);

    const handleSortearNumeros = async () => {
        if (!inscriptos.length) {
            onMessage?.('No hay inscritos para sortear.');
            return;
        }
        setSaving(true);
        try {
            const updated = await sortearNumerosMaraton(inscriptos);
            setInscriptos(sortInscriptosByNumero(updated));
            onMessage?.(`✅ Números sorteados (1–${updated.length}).`);
        } catch (err) {
            console.error(err);
            onMessage?.('❌ Error al sortear números.');
        } finally {
            setSaving(false);
        }
    };

    const hasNumeros = inscriptos.some(i => i.numeroCompetidor && String(i.numeroCompetidor).trim() !== '');

    return (
        <div className="start-list-view fade-in maraton-start-list">
            {!selectedPrueba ? (
                <div className="empty-state-box glass-effect" style={{ padding: '2rem', textAlign: 'center', opacity: 0.8 }}>
                    Seleccioná una largada arriba para ver todos los atletas inscritos juntos.
                </div>
            ) : loading ? (
                <div className="loader-container"><div className="loader" /></div>
            ) : (
                <>
                    <div
                        className="action-bar-premium glass-effect mb-md"
                        style={{ padding: '0.8rem 1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}
                    >
                        <div className="info-badge-modern">
                            <List size={14} />
                            <span><strong>{inscriptos.length}</strong> Inscritos en la largada</span>
                        </div>

                        {isAdmin && (
                            <button
                                className="btn-admin-action primary"
                                onClick={handleSortearNumeros}
                                disabled={saving || !inscriptos.length}
                            >
                                <RotateCcw size={16} />
                                {hasNumeros ? 'Regenerar números' : 'Sortear números'}
                            </button>
                        )}
                    </div>

                    <div className="seeding-status-banner info mb-md">
                        <span>
                            Maratón: comparten salida. Se listan todos los inscritos de la largada.
                            El sorteo asigna solo números de competidor (1…N), sin carriles ni cabezas de serie.
                        </span>
                    </div>

                    <div className="inscriptos-seeding-panel glass-effect p-md mb-lg" style={{ borderRadius: 'var(--radius-lg)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isNominaCollapsed ? 0 : '1rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-primary-light)' }}>
                                Nómina de la largada
                            </h3>
                            <button
                                className="btn-admin-icon"
                                onClick={() => setIsNominaCollapsed(v => !v)}
                                style={{ width: '28px', height: '28px', borderRadius: '4px' }}
                                title={isNominaCollapsed ? 'Expandir' : 'Minimizar'}
                            >
                                {isNominaCollapsed ? '+' : '−'}
                            </button>
                        </div>

                        {!isNominaCollapsed && (
                            <div className="admin-table-wrapper" style={{ maxHeight: '420px', borderRadius: 'var(--radius-md)' }}>
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '70px', textAlign: 'center' }}>Nº</th>
                                            <th>Atleta / Tripulación</th>
                                            <th>Club</th>
                                            <th>Categoría</th>
                                            <th style={{ textAlign: 'center' }}>Bote</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {inscriptos.length === 0 && (
                                            <tr>
                                                <td colSpan={5} style={{ textAlign: 'center', opacity: 0.7 }}>
                                                    No hay inscritos en esta largada todavía.
                                                </td>
                                            </tr>
                                        )}
                                        {inscriptos.map(ins => (
                                            <tr key={ins.id}>
                                                <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--color-primary)' }}>
                                                    {ins.numeroCompetidor || '—'}
                                                </td>
                                                <td>
                                                    <strong>
                                                        {ins.tripulantes?.length
                                                            ? [ins.participanteNombreCompleto, ...ins.tripulantes.map(t => t.participanteNombreCompleto)].join(' - ')
                                                            : (ins.participanteNombreCompleto || 'Bote de Equipo')}
                                                    </strong>
                                                </td>
                                                <td>{ins.clubNombre || ins.clubSigla || 'Independiente'}</td>
                                                <td style={{ fontSize: '0.9rem', color: '#94a3b8' }}>{ins.categoriaLabel || '—'}</td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <span className="badge-bote">{ins.boteLabel || '—'}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)', marginTop: '1rem', fontStyle: 'italic' }}>
                            * Tras el sorteo, el número es el dorsal de orden de largada (1 = primero, N = último inscrito sorteado).
                        </p>
                    </div>

                    {hasNumeros && (
                        <div className="glass-effect p-md" style={{ borderRadius: 'var(--radius-lg)' }}>
                            <h3 style={{ marginTop: 0, color: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <RefreshCw size={16} /> Orden de largada (por número)
                            </h3>
                            <ol style={{ margin: 0, paddingLeft: '1.25rem', lineHeight: 1.8 }}>
                                {sortInscriptosByNumero(inscriptos.filter(i => i.numeroCompetidor)).map(ins => (
                                    <li key={ins.id}>
                                        <strong>#{ins.numeroCompetidor}</strong>
                                        {' — '}
                                        {ins.participanteNombreCompleto || 'Atleta'}
                                        {' · '}
                                        <span className="badge-bote">{ins.boteLabel}</span>
                                        {ins.categoriaLabel ? ` · ${ins.categoriaLabel}` : ''}
                                    </li>
                                ))}
                            </ol>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default MaratonStartListPanel;
