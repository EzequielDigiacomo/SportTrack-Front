import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    ArrowLeft,
    Calendar,
    ChevronDown,
    ChevronUp,
    Clock,
    History,
    RefreshCcw,
    Search,
    Trash2,
    User,
} from 'lucide-react';
import AuditoriaService from '../../../services/AuditoriaService';
import ConfirmDialog from '../../../components/Common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { formatAuditAction, formatAuditDetail, getAuditLogWhen, isOperationalIssueAction } from '../../../utils/auditHelpers';
import './ActividadPorEventoPage.css';

const formatWhen = (iso, withSeconds = false) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        ...(withSeconds ? { second: '2-digit' } : {}),
    });
};

const parseDetalleJson = (detalle) => {
    if (!detalle || typeof detalle !== 'string') return null;
    const t = detalle.trim();
    if (!t.startsWith('{')) return null;
    try {
        return JSON.parse(t);
    } catch {
        return null;
    }
};

const ActividadPorEventoPage = () => {
    const navigate = useNavigate();
    const { addToast } = useToast();
    const [searchParams, setSearchParams] = useSearchParams();
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [eventoSearch, setEventoSearch] = useState('');
    const [logSearch, setLogSearch] = useState('');
    const [moduloFilter, setModuloFilter] = useState('');
    const [soloProblemas, setSoloProblemas] = useState(false);
    const [expandedLogId, setExpandedLogId] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, log: null, bulk: false });

    const selectedEventoId = Number(searchParams.get('evento')) || null;

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await AuditoriaService.getPorEventos({
                eventosLimit: 50,
                logsPerEvento: 150,
            });
            setCards(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('[ActividadPorEvento]', err);
            setError('No se pudo cargar la actividad. Probá actualizar.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        if (!selectedEventoId && cards.length > 0) {
            setSearchParams({ evento: String(cards[0].eventoId) }, { replace: true });
        }
    }, [cards, selectedEventoId, setSearchParams]);

    const filteredCards = useMemo(() => {
        const q = eventoSearch.trim().toLowerCase();
        if (!q) return cards;
        return cards.filter(c =>
            (c.eventoNombre || '').toLowerCase().includes(q)
            || String(c.eventoId).includes(q)
        );
    }, [cards, eventoSearch]);

    const selectedCard = useMemo(
        () => cards.find(c => Number(c.eventoId) === Number(selectedEventoId)) || null,
        [cards, selectedEventoId]
    );

    const modulos = useMemo(() => {
        const set = new Set();
        (selectedCard?.logs || []).forEach(l => {
            if (l.modulo) set.add(l.modulo);
        });
        return [...set].sort();
    }, [selectedCard]);

    const filteredLogs = useMemo(() => {
        let logs = [...(selectedCard?.logs || [])];
        if (moduloFilter) {
            logs = logs.filter(l => l.modulo === moduloFilter);
        }
        if (soloProblemas) {
            logs = logs.filter(l => isOperationalIssueAction(l.accion));
        }
        const q = logSearch.trim().toLowerCase();
        if (q) {
            logs = logs.filter(l =>
                formatAuditAction(l.accion).toLowerCase().includes(q)
                || (l.usuario || '').toLowerCase().includes(q)
                || formatAuditDetail(l).toLowerCase().includes(q)
                || (l.modulo || '').toLowerCase().includes(q)
            );
        }
        return logs.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    }, [selectedCard, moduloFilter, logSearch, soloProblemas]);

    const selectEvento = (id) => {
        setSearchParams({ evento: String(id) });
        setModuloFilter('');
        setLogSearch('');
        setExpandedLogId(null);
    };

    const removeLogFromState = (logId) => {
        setCards(prev => prev.map(card => {
            if (Number(card.eventoId) !== Number(selectedEventoId)) return card;
            const logs = (card.logs || []).filter(l => l.id !== logId);
            return {
                ...card,
                logs,
                totalRegistros: Math.max(0, (card.totalRegistros || 0) - 1),
            };
        }));
        if (expandedLogId === logId) setExpandedLogId(null);
    };

    const handleConfirmDelete = async () => {
        setDeleting(true);
        try {
            if (confirmDelete.bulk) {
                const result = await AuditoriaService.deleteSinProblemas(selectedEventoId);
                addToast(result?.message || 'Registros OK eliminados.', 'success');
                await load();
            } else if (confirmDelete.log?.id) {
                await AuditoriaService.deleteRegistro(confirmDelete.log.id);
                removeLogFromState(confirmDelete.log.id);
                addToast('Registro eliminado.', 'success');
            }
        } catch (err) {
            console.error('[ActividadPorEvento] delete:', err);
            addToast(err?.message || 'No se pudo eliminar el registro.', 'error');
        } finally {
            setDeleting(false);
            setConfirmDelete({ isOpen: false, log: null, bulk: false });
        }
    };

    const okLogsInView = useMemo(
        () => (selectedCard?.logs || []).filter(l => !isOperationalIssueAction(l.accion)).length,
        [selectedCard],
    );

    return (
        <div className="actividad-evento-page fade-in">
            <header className="actividad-evento-page__header glass-effect">
                <div>
                    <button
                        type="button"
                        className="btn-admin-secondary btn-sm actividad-evento-page__back"
                        onClick={() => navigate('/super')}
                    >
                        <ArrowLeft size={16} /> Volver al inicio
                    </button>
                    <h1>
                        <History size={24} />
                        Actividad por evento
                    </h1>
                    <p>
                        Largadas, tiempos, inscripciones y acciones de jueces — detalle completo por competencia
                    </p>
                </div>
                <button type="button" className="btn-admin-secondary" onClick={load} disabled={loading}>
                    <RefreshCcw size={16} className={loading ? 'spin' : ''} /> Actualizar
                </button>
            </header>

            {error && (
                <div className="actividad-evento-page__error glass-effect">{error}</div>
            )}

            <div className="actividad-evento-page__layout">
                <aside className="actividad-evento-page__sidebar glass-effect">
                    <div className="actividad-evento-page__sidebar-head">
                        <h2>Eventos</h2>
                        <span>{filteredCards.length}</span>
                    </div>
                    <div className="actividad-evento-page__search">
                        <Search size={16} />
                        <input
                            type="search"
                            placeholder="Buscar evento…"
                            value={eventoSearch}
                            onChange={(e) => setEventoSearch(e.target.value)}
                        />
                    </div>
                    {loading ? (
                        <p className="actividad-evento-page__hint">Cargando eventos…</p>
                    ) : (
                        <ul className="actividad-evento-page__event-list">
                            {filteredCards.map(card => {
                                const active = Number(card.eventoId) === Number(selectedEventoId);
                                const issueCount = (card.logs || []).filter(l => isOperationalIssueAction(l.accion)).length;
                                return (
                                    <li key={card.eventoId}>
                                        <button
                                            type="button"
                                            className={`actividad-evento-page__event-item ${active ? 'is-active' : ''}`}
                                            onClick={() => selectEvento(card.eventoId)}
                                        >
                                            <strong>{card.eventoNombre}</strong>
                                            <div className="actividad-evento-page__event-meta">
                                                {card.eventoEstado && (
                                                    <span className="badge">{card.eventoEstado}</span>
                                                )}
                                                {issueCount > 0 && (
                                                    <span className="actividad-evento-page__issue-badge">
                                                        {issueCount} problema{issueCount !== 1 ? 's' : ''}
                                                    </span>
                                                )}
                                                <span>{card.totalRegistros} reg.</span>
                                            </div>
                                            <span className="actividad-evento-page__event-last">
                                                Última: {formatWhen(card.ultimaActividad)}
                                            </span>
                                        </button>
                                    </li>
                                );
                            })}
                            {!filteredCards.length && (
                                <li className="actividad-evento-page__hint">Sin eventos que coincidan.</li>
                            )}
                        </ul>
                    )}
                </aside>

                <section className="actividad-evento-page__detail glass-effect">
                    {!selectedCard ? (
                        <p className="actividad-evento-page__hint">Elegí un evento de la lista.</p>
                    ) : (
                        <>
                            <div className="actividad-evento-page__detail-head">
                                <div>
                                    <h2>{selectedCard.eventoNombre}</h2>
                                    <div className="actividad-evento-page__detail-meta">
                                        <span><Calendar size={14} /> {formatWhen(selectedCard.eventoFecha)}</span>
                                        <span><Clock size={14} /> Última actividad: {formatWhen(selectedCard.ultimaActividad, true)}</span>
                                        {selectedCard.eventoEstado && (
                                            <span className="badge">{selectedCard.eventoEstado}</span>
                                        )}
                                        <span>{selectedCard.totalRegistros} registros en total</span>
                                    </div>
                                </div>
                                {okLogsInView > 0 && (
                                    <button
                                        type="button"
                                        className="btn-admin-secondary btn-sm actividad-evento-page__bulk-delete"
                                        onClick={() => setConfirmDelete({ isOpen: true, log: null, bulk: true })}
                                        disabled={deleting}
                                    >
                                        <Trash2 size={14} />
                                        Eliminar registros OK ({okLogsInView} visibles)
                                    </button>
                                )}
                            </div>

                            <div className="actividad-evento-page__filters">
                                <div className="actividad-evento-page__search">
                                    <Search size={16} />
                                    <input
                                        type="search"
                                        placeholder="Buscar en acciones, usuario o detalle…"
                                        value={logSearch}
                                        onChange={(e) => setLogSearch(e.target.value)}
                                    />
                                </div>
                                <select
                                    value={moduloFilter}
                                    onChange={(e) => setModuloFilter(e.target.value)}
                                    aria-label="Filtrar por módulo"
                                >
                                    <option value="">Todos los módulos</option>
                                    {modulos.map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                                <label className="actividad-evento-page__filter-check">
                                    <input
                                        type="checkbox"
                                        checked={soloProblemas}
                                        onChange={(e) => setSoloProblemas(e.target.checked)}
                                    />
                                    Solo envíos fallidos / sin conexión
                                </label>
                            </div>

                            {selectedCard.totalRegistros > (selectedCard.logs?.length || 0) && (
                                <p className="actividad-evento-page__limit-note">
                                    Mostrando los últimos {selectedCard.logs?.length || 0} movimientos de {selectedCard.totalRegistros}.
                                </p>
                            )}

                            <div className="actividad-evento-page__table-wrap">
                                <table className="actividad-evento-page__table">
                                    <thead>
                                        <tr>
                                            <th>Fecha</th>
                                            <th>Módulo</th>
                                            <th>Acción</th>
                                            <th>Usuario</th>
                                            <th>Detalle</th>
                                            <th aria-label="Acciones" />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredLogs.map(log => {
                                            const isOpen = expandedLogId === log.id;
                                            const isIssue = isOperationalIssueAction(log.accion);
                                            const parsed = parseDetalleJson(log.detalle);
                                            return (
                                                <React.Fragment key={log.id}>
                                                    <tr className={`${isOpen ? 'is-expanded' : ''} ${isIssue ? 'is-error' : ''}`}>
                                                        <td>{formatWhen(getAuditLogWhen(log), true)}</td>
                                                        <td><span className="mod-pill">{log.modulo}</span></td>
                                                        <td>
                                                            <strong>{formatAuditAction(log.accion)}</strong>
                                                            {isIssue && <span className="actividad-evento-page__error-tag">Problema</span>}
                                                        </td>
                                                        <td>
                                                            <span className="user-cell">
                                                                <User size={13} /> {log.usuario || '—'}
                                                            </span>
                                                        </td>
                                                        <td className="detalle-cell">{formatAuditDetail(log)}</td>
                                                        <td className="actividad-evento-page__actions-cell">
                                                            <button
                                                                type="button"
                                                                className="btn-expand"
                                                                onClick={() => setExpandedLogId(isOpen ? null : log.id)}
                                                                aria-label={isOpen ? 'Contraer' : 'Ver más'}
                                                            >
                                                                {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="btn-delete-log"
                                                                onClick={() => setConfirmDelete({ isOpen: true, log, bulk: false })}
                                                                disabled={deleting}
                                                                aria-label="Eliminar registro"
                                                                title="Eliminar registro"
                                                            >
                                                                <Trash2 size={15} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                    {isOpen && (
                                                        <tr className="actividad-evento-page__expand-row">
                                                            <td colSpan={7}>
                                                                <div className="expand-panel">
                                                                    <div><strong>Acción técnica:</strong> {log.accion}</div>
                                                                    {log.ip && <div><strong>IP:</strong> {log.ip}</div>}
                                                                    {parsed ? (
                                                                        <pre>{JSON.stringify(parsed, null, 2)}</pre>
                                                                    ) : (
                                                                        <pre>{formatAuditDetail(log)}</pre>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                {!filteredLogs.length && (
                                    <p className="actividad-evento-page__hint">No hay movimientos con ese filtro.</p>
                                )}
                            </div>
                        </>
                    )}
                </section>
            </div>

            <ConfirmDialog
                isOpen={confirmDelete.isOpen}
                onClose={() => !deleting && setConfirmDelete({ isOpen: false, log: null, bulk: false })}
                onConfirm={handleConfirmDelete}
                title={confirmDelete.bulk ? 'Eliminar registros OK' : 'Eliminar registro'}
                message={
                    confirmDelete.bulk
                        ? `¿Eliminar todos los registros sin problemas del evento "${selectedCard?.eventoNombre}"? Se conservan fallos de conexión, envíos fallidos y errores del sistema.`
                        : `¿Eliminar este registro (${formatAuditAction(confirmDelete.log?.accion)})? Esta acción no se puede deshacer.`
                }
                confirmText="Eliminar"
                cancelText="Cancelar"
                type="danger"
                loading={deleting}
            />
        </div>
    );
};

export default ActividadPorEventoPage;
