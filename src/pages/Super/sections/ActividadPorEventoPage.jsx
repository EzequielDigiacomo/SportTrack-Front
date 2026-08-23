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
    User,
} from 'lucide-react';
import AuditoriaService from '../../services/AuditoriaService';
import { formatAuditAction, formatAuditDetail } from '../../utils/auditHelpers';
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
    const [searchParams, setSearchParams] = useSearchParams();
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [eventoSearch, setEventoSearch] = useState('');
    const [logSearch, setLogSearch] = useState('');
    const [moduloFilter, setModuloFilter] = useState('');
    const [expandedLogId, setExpandedLogId] = useState(null);

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
    }, [selectedCard, moduloFilter, logSearch]);

    const selectEvento = (id) => {
        setSearchParams({ evento: String(id) });
        setModuloFilter('');
        setLogSearch('');
        setExpandedLogId(null);
    };

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
                                            <th aria-label="Expandir" />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredLogs.map(log => {
                                            const isOpen = expandedLogId === log.id;
                                            const parsed = parseDetalleJson(log.detalle);
                                            return (
                                                <React.Fragment key={log.id}>
                                                    <tr className={isOpen ? 'is-expanded' : ''}>
                                                        <td>{formatWhen(log.fecha, true)}</td>
                                                        <td><span className="mod-pill">{log.modulo}</span></td>
                                                        <td><strong>{formatAuditAction(log.accion)}</strong></td>
                                                        <td>
                                                            <span className="user-cell">
                                                                <User size={13} /> {log.usuario || '—'}
                                                            </span>
                                                        </td>
                                                        <td className="detalle-cell">{formatAuditDetail(log)}</td>
                                                        <td>
                                                            <button
                                                                type="button"
                                                                className="btn-expand"
                                                                onClick={() => setExpandedLogId(isOpen ? null : log.id)}
                                                                aria-label={isOpen ? 'Contraer' : 'Ver más'}
                                                            >
                                                                {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                    {isOpen && (
                                                        <tr className="actividad-evento-page__expand-row">
                                                            <td colSpan={6}>
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
        </div>
    );
};

export default ActividadPorEventoPage;
