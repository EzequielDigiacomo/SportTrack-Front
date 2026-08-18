import {
    getUserRole,
    isClubUser,
    isFederationAdminUser,
    isSuperAdminUser,
} from './authHelpers';

export const NOTIF_META = {
    review: { category: 'action', label: 'Competencia', priority: 'high' },
    payment: { category: 'action', label: 'Administración', priority: 'high' },
    message: { category: 'messages', label: 'Mensajes', priority: 'medium' },
    event: { category: 'events', label: 'Eventos', priority: 'low' },
};

export const SECTION_ORDER = [
    { key: 'action', title: 'Requiere acción' },
    { key: 'messages', title: 'Mensajes' },
    { key: 'events', title: 'Novedades' },
];

const DISMISSED_EVENTS_KEY = 'sporttrack_dismissed_event_notifs';

export const enrichNotification = (notification) => {
    const meta = NOTIF_META[notification.type] || { category: 'events', label: 'Aviso', priority: 'low' };
    return { ...notification, ...meta };
};

export const formatNotifTime = (value) => {
    if (!value) return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
        return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const getDismissedEventIds = () => {
    try {
        const raw = localStorage.getItem(DISMISSED_EVENTS_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return new Set((Array.isArray(parsed) ? parsed : []).map(String));
    } catch {
        return new Set();
    }
};

export const dismissEventNotification = (eventoId) => {
    const next = getDismissedEventIds();
    next.add(String(eventoId));
    localStorage.setItem(DISMISSED_EVENTS_KEY, JSON.stringify([...next]));
};

export const resolveUserFederacionId = (user) =>
    user?.federacionId
    ?? user?.FederacionId
    ?? user?.club?.federacionId
    ?? user?.club?.idFederacion
    ?? null;

export const getEventosPath = (user) => (isClubUser(user) ? '/club/eventos' : '/super/eventos');

export const canSeeOperationalNotifications = (user) => {
    const role = getUserRole(user).toLowerCase();
    return role.includes('admin')
        || role.includes('juezcontrol')
        || role.includes('controltecnico')
        || user?.username === 'soporte_tecnico';
};

export const canSeeMessageNotifications = (user) =>
    isSuperAdminUser(user) || isFederationAdminUser(user) || isClubUser(user);

export const canSeeEventNotifications = (user) => isClubUser(user);

export const mapUnreadHiloToNotification = (hilo) => {
    const hiloId = hilo.idHilo ?? hilo.IdHilo;
    const contraparte = hilo.contraparte ?? hilo.Contraparte ?? {};
    const remitente = contraparte.username
        || contraparte.Username
        || [contraparte.nombre, contraparte.apellido].filter(Boolean).join(' ')
        || 'Usuario';

    return enrichNotification({
        id: `msg_${hiloId}`,
        type: 'message',
        hiloId,
        title: hilo.asunto ?? hilo.Asunto ?? 'Nuevo mensaje',
        desc: `De ${remitente}${(hilo.ultimoMensajePreview ?? hilo.UltimoMensajePreview) ? `: ${hilo.ultimoMensajePreview ?? hilo.UltimoMensajePreview}` : ''}`,
        time: formatNotifTime(hilo.ultimoMensajeEn ?? hilo.UltimoMensajeEn),
    });
};

export const mapEventPayloadToNotification = (payload) => enrichNotification({
    id: `event_${payload.eventoId ?? payload.EventoId ?? payload.id ?? payload.Id}`,
    type: 'event',
    eventoId: payload.eventoId ?? payload.EventoId ?? payload.id ?? payload.Id,
    title: `Nuevo evento: ${payload.nombre ?? payload.Nombre ?? 'Evento'}`,
    desc: [payload.ubicacion ?? payload.Ubicacion, (payload.inscripcionesAbiertas ?? payload.InscripcionesAbiertas) ? 'Inscripciones abiertas' : null]
        .filter(Boolean)
        .join(' · '),
    time: formatNotifTime(payload.fecha ?? payload.Fecha ?? payload.fechaCreacion ?? payload.FechaCreacion),
});

export const mapMessagePayloadToNotification = (payload) => enrichNotification({
    id: `msg_${payload.hiloId ?? payload.HiloId}`,
    type: 'message',
    hiloId: payload.hiloId ?? payload.HiloId,
    title: payload.asunto ?? payload.Asunto ?? 'Nuevo mensaje',
    desc: `De ${payload.remitenteNombre ?? payload.RemitenteNombre ?? 'Usuario'}${payload.preview ? `: ${payload.preview}` : ''}`,
    time: formatNotifTime(payload.enviadoEn ?? payload.EnviadoEn),
});

export const groupNotifications = (notifications) =>
    SECTION_ORDER
        .map((section) => ({
            ...section,
            items: notifications.filter((n) => n.category === section.key),
        }))
        .filter((section) => section.items.length > 0);

export const MENSAJES_PENDING_HILO_KEY = 'sporttrack_pending_hilo_id';

export const queueOpenHilo = (hiloId) => {
    sessionStorage.setItem(MENSAJES_PENDING_HILO_KEY, String(hiloId));
};
