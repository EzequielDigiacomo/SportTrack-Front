import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Calendar, Clock, History } from 'lucide-react';
import AuditoriaService from '../../services/AuditoriaService';
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

/**
 * @param {object} props
 * @param {boolean} [props.preview] — resumen en dashboard: sin expandir, enlace a vista completa
 * @param {number} [props.eventosLimit]
 * @param {number} [props.logsPerEvento]
 */
const EventAuditCards = ({
    preview = false,
    eventosLimit = 12,
    logsPerEvento = 6,
}) => {
    const navigate = useNavigate();
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const limit = preview ? Math.min(eventosLimit, 4) : eventosLimit;
    const logsLimit = preview ? 1 : logsPerEvento;

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await AuditoriaService.getPorEventos({
                eventosLimit: limit,
                logsPerEvento: logsLimit,
            });
            setCards(data);
        } catch (err) {
            console.error('[EventAuditCards]', err);
            setError('No se pudo armar la actividad por evento. Probá recargar la página.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, [limit, logsLimit]);

    const goToFull = (eventoId) => {
        const path = eventoId
            ? `/super/actividad-eventos?evento=${eventoId}`
            : '/super/actividad-eventos';
        navigate(path);
    };

    if (loading) {
        return (
            <div className="event-audit-cards glass-effect is-preview">
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
            <div className="event-audit-cards glass-effect is-preview">
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
            <div className="event-audit-cards glass-effect is-preview">
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
        <div className="event-audit-cards glass-effect is-preview">
            <div className="event-audit-cards__header">
                <div>
                    <History size={20} />
                    <h4>Actividad por evento</h4>
                    <p className="event-audit-cards__subtitle">
                        {preview
                            ? 'Resumen reciente — abrí la vista completa para ver todos los movimientos'
                            : 'Módulos de jueces, tiempos, largadas e inscripciones de cada competencia'}
                    </p>
                </div>
                <button type="button" className="btn-admin-secondary btn-sm" onClick={() => goToFull()}>
                    Ver todo <ArrowRight size={14} />
                </button>
            </div>

            <div className="event-audit-cards__grid event-audit-cards__grid--preview">
                {cards.map((card) => (
                    <button
                        key={card.eventoId}
                        type="button"
                        className="event-audit-card event-audit-card--link"
                        onClick={() => goToFull(card.eventoId)}
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
                        <span className="event-audit-card__link-hint">
                            Ver detalle <ArrowRight size={14} />
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default EventAuditCards;
