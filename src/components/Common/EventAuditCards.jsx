import React, { useEffect, useState } from 'react';
import { Calendar, ChevronDown, ChevronUp, Clock, History, User } from 'lucide-react';
import AuditoriaService from '../../services/AuditoriaService';
import { formatAuditAction, formatAuditDetail } from '../../utils/auditHelpers';
import './EventAuditCards.css';

const formatWhen = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const EventAuditCards = ({ eventosLimit = 12, logsPerEvento = 6, compact = false }) => {
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(null);
    const [error, setError] = useState(null);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await AuditoriaService.getPorEventos({ eventosLimit, logsPerEvento });
            setCards(data);
            if (data.length && expandedId == null) {
                setExpandedId(data[0]?.eventoId ?? null);
            }
        } catch (err) {
            console.error('[EventAuditCards]', err);
            setError('No se pudo armar la actividad por evento. Probá recargar la página.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, [eventosLimit, logsPerEvento]);

    if (loading) {
        return (
            <div className="event-audit-cards glass-effect">
                <div className="event-audit-cards__header">
                    <History size={20} />
                    <h4>Actividad por evento</h4>
                </div>
                <p className="event-audit-cards__hint">Cargando…</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="event-audit-cards glass-effect">
                <div className="event-audit-cards__header">
                    <History size={20} />
                    <h4>Actividad por evento</h4>
                </div>
                <p className="event-audit-cards__hint">{error}</p>
            </div>
        );
    }

    if (!cards.length) {
        return (
            <div className="event-audit-cards glass-effect">
                <div className="event-audit-cards__header">
                    <History size={20} />
                    <h4>Actividad por evento</h4>
                </div>
                <p className="event-audit-cards__hint">
                    Todavía no hay acciones vinculadas a eventos. Al operar competencias (largadas, tiempos, inscripciones) aparecerán acá.
                </p>
            </div>
        );
    }

    return (
        <div className={`event-audit-cards glass-effect ${compact ? 'is-compact' : ''}`}>
            <div className="event-audit-cards__header">
                <div>
                    <History size={20} />
                    <h4>Actividad por evento</h4>
                    <p className="event-audit-cards__subtitle">
                        Módulos de jueces, tiempos, largadas e inscripciones de cada competencia
                    </p>
                </div>
                <button type="button" className="btn-admin-secondary btn-sm" onClick={load}>
                    Actualizar
                </button>
            </div>

            <div className="event-audit-cards__grid">
                {cards.map((card) => {
                    const isOpen = expandedId === card.eventoId;
                    return (
                        <article
                            key={card.eventoId}
                            className={`event-audit-card ${isOpen ? 'is-open' : ''}`}
                        >
                            <button
                                type="button"
                                className="event-audit-card__head"
                                onClick={() => setExpandedId(isOpen ? null : card.eventoId)}
                            >
                                <div className="event-audit-card__title-row">
                                    <strong>{card.eventoNombre}</strong>
                                    {card.eventoEstado && (
                                        <span className="event-audit-card__badge">{card.eventoEstado}</span>
                                    )}
                                </div>
                                <div className="event-audit-card__meta">
                                    <span><Calendar size={13} /> {formatWhen(card.eventoFecha)}</span>
                                    <span><Clock size={13} /> Última: {formatWhen(card.ultimaActividad)}</span>
                                    <span>{card.totalRegistros} registro{card.totalRegistros === 1 ? '' : 's'}</span>
                                </div>
                                {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </button>

                            {isOpen && (
                                <ul className="event-audit-card__logs">
                                    {(card.logs || []).map((log) => (
                                        <li key={log.id} className="event-audit-card__log">
                                            <div className="event-audit-card__log-top">
                                                <span className="event-audit-card__time">{formatWhen(log.fecha)}</span>
                                                <span className="event-audit-card__module">{log.modulo}</span>
                                            </div>
                                            <div className="event-audit-card__log-action">
                                                {formatAuditAction(log.accion)}
                                            </div>
                                            <div className="event-audit-card__log-user">
                                                <User size={12} /> {log.usuario}
                                            </div>
                                            <div className="event-audit-card__log-detail" title={formatAuditDetail(log)}>
                                                {formatAuditDetail(log)}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </article>
                    );
                })}
            </div>
        </div>
    );
};

export default EventAuditCards;
