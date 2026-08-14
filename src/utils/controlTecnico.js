const CONTROL_TECNICO_HANDOFF_KEY = 'controltecnico_handoff';

const roleList = (user) =>
    String(user?.rol || user?.Rol || user?.role || '')
        .toLowerCase()
        .split(/[,;]/)
        .map((r) => r.trim())
        .filter(Boolean);

export const isControlTecnicoRole = (user) => roleList(user).includes('controltecnico');

export const isJudgeAdmin = (user) => {
    const roles = roleList(user);
    return roles.includes('admin') || roles.includes('superadmin');
};

/** Eventos de control técnico: convención actual (nombre contiene "control"). */
export const isControlTecnicoEvent = (evento) => {
    const nombre = String(evento?.nombre || evento?.Nombre || '').toLowerCase();
    return nombre.includes('control');
};

export const filterEventosForJudgeRole = (eventos, user) => {
    const list = eventos || [];
    if (isControlTecnicoRole(user) && !isJudgeAdmin(user)) {
        return list.filter(isControlTecnicoEvent);
    }
    if (isControlTecnicoRole(user) && isJudgeAdmin(user)) {
        return list;
    }
    if (isJudgeAdmin(user)) return list;
    return list.filter((e) => !isControlTecnicoEvent(e));
};

/** Un operador: rol ControlTecnico, o Admin sobre un evento de control técnico. */
export const isSoloControlTecnicoMode = (user, evento) =>
    isControlTecnicoRole(user) || (isJudgeAdmin(user) && isControlTecnicoEvent(evento));

export const saveControlTecnicoHandoff = ({ eventoId, faseId, t0Iso }) => {
    try {
        sessionStorage.setItem(
            CONTROL_TECNICO_HANDOFF_KEY,
            JSON.stringify({ eventoId, faseId, t0Iso, at: Date.now() })
        );
        if (eventoId != null) localStorage.setItem('finisher_event_id', String(eventoId));
        if (faseId != null) localStorage.setItem('finisher_fase_id', String(faseId));
    } catch {
        /* ignore */
    }
};

export const readControlTecnicoHandoff = () => {
    try {
        const raw = sessionStorage.getItem(CONTROL_TECNICO_HANDOFF_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
};
