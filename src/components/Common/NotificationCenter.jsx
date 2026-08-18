import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Bell,
    CheckCircle,
    X,
    CreditCard,
    ClipboardCheck,
    Mail,
    CalendarDays,
} from 'lucide-react';
import timingSignalRService from '../../services/TimingSignalRService';
import MessageService from '../../services/MessageService';
import EventoService from '../../services/EventoService';
import { useLocation, useNavigate } from 'react-router-dom';
import './NotificationCenter.css';
import { useAuth } from '../../context/AuthContext';
import {
    getUserRole,
    isSuperAdminUser,
} from '../../utils/authHelpers';
import {
    enrichNotification,
    formatNotifTime,
    getDismissedEventIds,
    dismissEventNotification,
    getMensajesPath,
    getEventosPath,
    canSeeOperationalNotifications,
    canSeeMessageNotifications,
    canSeeEventNotifications,
    mapUnreadHiloToNotification,
    mapEventPayloadToNotification,
    mapMessagePayloadToNotification,
    groupNotifications,
    queueOpenHilo,
    resolveUserFederacionId,
} from '../../utils/notificationHelpers';
import { notifyUnreadMessagesChanged } from '../../hooks/useUnreadMessages';

const MESSAGE_POLL_MS = 90_000;
const EVENT_POLL_MS = 180_000;
const EVENT_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;

const upsertNotification = (list, item) => {
    const idx = list.findIndex((n) => n.id === item.id);
    if (idx === -1) return [item, ...list];
    const next = [...list];
    next[idx] = { ...next[idx], ...item };
    return next;
};

const NotificationCenter = () => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [isVisible, setIsVisible] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const isAdminShell = /^\/(super|admin|juez-control|jueces|control-tecnico)/.test(location.pathname);

    const showOperational = canSeeOperationalNotifications(user);
    const showMessages = canSeeMessageNotifications(user);
    const showEvents = canSeeEventNotifications(user);

    const syncUnreadMessages = useCallback(async () => {
        if (!showMessages) return;
        try {
            const hilos = await MessageService.getHilos();
            const unreadItems = (hilos || [])
                .filter((h) => Number(h.cantidadNoLeidos ?? h.CantidadNoLeidos ?? 0) > 0)
                .map(mapUnreadHiloToNotification);

            setNotifications((prev) => {
                const withoutMessages = prev.filter((n) => n.type !== 'message');
                return [...unreadItems, ...withoutMessages];
            });
            notifyUnreadMessagesChanged();
        } catch {
            // ignore polling errors
        }
    }, [showMessages]);

    const syncRecentEvents = useCallback(async () => {
        if (!showEvents) return;
        try {
            const events = await EventoService.getProximos();
            const dismissed = getDismissedEventIds();
            const cutoff = Date.now() - EVENT_LOOKBACK_MS;
            const freshEvents = (events || [])
                .filter((evento) => {
                    const id = evento.id ?? evento.Id;
                    const nombre = evento.nombre ?? evento.Nombre ?? '';
                    const created = new Date(evento.fechaCreacion ?? evento.FechaCreacion ?? 0).getTime();
                    return id
                        && created >= cutoff
                        && !dismissed.has(String(id))
                        && !nombre.toLowerCase().includes('control');
                })
                .map(mapEventPayloadToNotification);

            setNotifications((prev) => {
                const withoutEvents = prev.filter((n) => n.type !== 'event');
                return [...freshEvents, ...withoutEvents];
            });
        } catch {
            // ignore polling errors
        }
    }, [showEvents]);

    useEffect(() => {
        if (!user) return undefined;

        let cancelled = false;

        if (showOperational) {
            timingSignalRService.onGlobalRaceInReview((fase) => {
                if (cancelled) return;
                const faseId = fase.id ?? fase.Id;
                const nombre = fase.nombre ?? fase.NombreFase ?? fase.nombreFase ?? 'Regata';
                setNotifications((prev) => upsertNotification(prev, enrichNotification({
                    id: `review_${faseId}`,
                    type: 'review',
                    faseId,
                    title: `Por validar: ${nombre}`,
                    time: formatNotifTime(),
                })));
            });

            timingSignalRService.onGlobalRaceOfficialized((faseId) => {
                if (cancelled) return;
                setNotifications((prev) => prev.filter((n) => !(String(n.faseId) === String(faseId) && n.type === 'review')));
            });

            timingSignalRService.onPaymentStatusChangeRequested(({ clubNombre, clubId, motive }) => {
                if (cancelled) return;
                const notifId = `pay_${clubId}_${Date.now()}`;
                setNotifications((prev) => [enrichNotification({
                    id: notifId,
                    type: 'payment',
                    clubId,
                    title: `Solicitud de pago: ${clubNombre}`,
                    desc: motive,
                    time: formatNotifTime(),
                }), ...prev]);
            });
        }

        if (showMessages) {
            timingSignalRService.onNewMessageReceived((payload) => {
                if (cancelled) return;
                setNotifications((prev) => upsertNotification(prev, mapMessagePayloadToNotification(payload)));
                notifyUnreadMessagesChanged();
            });
        }

        if (showEvents) {
            timingSignalRService.onNewEventCreated((payload) => {
                if (cancelled) return;
                const eventoId = payload.eventoId ?? payload.EventoId;
                if (getDismissedEventIds().has(String(eventoId))) return;
                setNotifications((prev) => upsertNotification(prev, mapEventPayloadToNotification(payload)));
            });
        }

        const setup = async () => {
            try {
                const userName = user?.username || user?.nombre || 'Usuario';
                const role = getUserRole(user) || 'Usuario';
                const federacionId = resolveUserFederacionId(user);
                await timingSignalRService.connect(null, null, userName, role, {
                    federacionId,
                    joinNotifications: showMessages || showEvents || showOperational,
                });
                if (!cancelled && showMessages) {
                    await syncUnreadMessages();
                }
                if (!cancelled && showEvents) {
                    await syncRecentEvents();
                }
            } catch (err) {
                if (!cancelled) {
                    console.warn('[NotifCenter] SignalR setup error:', err);
                }
            }
        };

        setup();

        let messagePollId = null;
        let eventPollId = null;
        if (showMessages) {
            messagePollId = setInterval(() => {
                syncUnreadMessages();
            }, MESSAGE_POLL_MS);
        }
        if (showEvents) {
            eventPollId = setInterval(() => {
                syncRecentEvents();
            }, EVENT_POLL_MS);
        }

        const onFocus = () => {
            syncUnreadMessages();
            syncRecentEvents();
        };
        window.addEventListener('focus', onFocus);
        window.addEventListener('mensajes:refresh-unread', onFocus);

        return () => {
            cancelled = true;
            if (messagePollId) clearInterval(messagePollId);
            if (eventPollId) clearInterval(eventPollId);
            window.removeEventListener('focus', onFocus);
            window.removeEventListener('mensajes:refresh-unread', onFocus);
        };
    }, [user, showOperational, showMessages, showEvents, syncUnreadMessages, syncRecentEvents]);

    const visibleNotifications = useMemo(() => {
        const dismissedEvents = getDismissedEventIds();
        return notifications.filter((n) => {
            if (n.type === 'review' || n.type === 'payment') return showOperational;
            if (n.type === 'message') return showMessages;
            if (n.type === 'event') return showEvents && !dismissedEvents.has(String(n.eventoId));
            return true;
        });
    }, [notifications, showOperational, showMessages, showEvents]);

    const groupedSections = useMemo(
        () => groupNotifications(visibleNotifications),
        [visibleNotifications]
    );

    const hasUrgent = visibleNotifications.some((n) => n.priority === 'high');

    if (!user || (!showOperational && !showMessages && !showEvents)) return null;

    const handleGoToRace = (faseId) => {
        const roleStr = getUserRole(user).toLowerCase();
        const isAdminUser = roleStr.includes('admin') || isSuperAdminUser(user);
        const base = isAdminUser ? '/super/resultados' : '/juez-control';
        navigate(`${base}?faseId=${faseId}&tab=resultados`);
        setIsVisible(false);
    };

    const handleNotificationClick = (n) => {
        if (n.type === 'payment') {
            navigate('/super/pagos');
            setIsVisible(false);
            return;
        }
        if (n.type === 'review') {
            handleGoToRace(n.faseId);
            return;
        }
        if (n.type === 'message') {
            queueOpenHilo(n.hiloId);
            navigate(getMensajesPath(user));
            setIsVisible(false);
            setNotifications((prev) => prev.filter((item) => item.id !== n.id));
            notifyUnreadMessagesChanged();
            return;
        }
        if (n.type === 'event') {
            dismissEventNotification(n.eventoId);
            navigate(getEventosPath(user));
            setIsVisible(false);
            setNotifications((prev) => prev.filter((item) => item.id !== n.id));
        }
    };

    const renderIcon = (type) => {
        if (type === 'payment') return <CreditCard size={16} />;
        if (type === 'review') return <ClipboardCheck size={16} />;
        if (type === 'message') return <Mail size={16} />;
        if (type === 'event') return <CalendarDays size={16} />;
        return <Bell size={16} />;
    };

    return (
        <div className={`notification-center-container ${isVisible ? 'open' : ''} ${isAdminShell ? 'in-admin-shell' : 'in-main-layout'}`}>
            <button
                className={`notification-trigger ${hasUrgent ? 'pulse' : ''}`}
                onClick={() => setIsVisible(!isVisible)}
                aria-label="Notificaciones"
            >
                <Bell size={24} />
                {visibleNotifications.length > 0 && (
                    <span className="notification-badge">{visibleNotifications.length}</span>
                )}
            </button>

            <div className="notification-panel glass-effect">
                <div className="notification-header">
                    <h3>Notificaciones</h3>
                    <button onClick={() => setIsVisible(false)} className="close-btn" aria-label="Cerrar">
                        <X size={18} />
                    </button>
                </div>

                <div className="notification-list">
                    {visibleNotifications.length === 0 ? (
                        <div className="empty-notifications">
                            <CheckCircle size={32} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                            <p>No hay alertas pendientes</p>
                        </div>
                    ) : (
                        groupedSections.map((section) => (
                            <div key={section.key} className="notification-section">
                                <div className="notification-section-title">{section.title}</div>
                                {section.items.map((n) => (
                                    <div
                                        key={n.id}
                                        className={`notification-item ${n.priority === 'high' ? 'notification-item--urgent' : ''}`}
                                        onClick={() => handleNotificationClick(n)}
                                    >
                                        <div className={`notif-icon notif-icon--${n.type}`}>
                                            {renderIcon(n.type)}
                                        </div>
                                        <div className="notif-content">
                                            <span className="notif-category">{n.label}</span>
                                            <span className="notif-title">{n.title}</span>
                                            {n.desc && <span className="notif-desc">{n.desc}</span>}
                                            <span className="notif-time">{n.time}</span>
                                        </div>
                                        <div className="notif-action">➔</div>
                                    </div>
                                ))}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default NotificationCenter;
