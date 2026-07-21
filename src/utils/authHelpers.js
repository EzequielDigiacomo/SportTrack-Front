import { STORAGE_KEYS } from './constants';

/** Token JWT para API y SignalR (misma fuente que api.js). */
export const getStoredAuthToken = () => {
    const direct = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (direct) return direct;

    try {
        const userData = localStorage.getItem(STORAGE_KEYS.USER_DATA);
        if (!userData) return null;
        const parsed = JSON.parse(userData);
        return parsed?.token || parsed?.Token || null;
    } catch {
        return null;
    }
};

export const getUserRole = (data) => {
    if (!data) return '';
    return (
        data.rol ||
        data.Rol ||
        data.rolFederacion ||
        data.RolFederacion ||
        data.role ||
        data.Role ||
        ''
    ).trim();
};

/** Normaliza campos del login/sesión (camelCase + PascalCase del backend). */
export const normalizeAuthUser = (data, plan = null) => {
    if (!data) return null;
    const rol = getUserRole(data);
    return {
        ...data,
        rol,
        token: data.token || data.Token || null,
        clubId: data.clubId ?? data.ClubId ?? null,
        federacionId: data.federacionId ?? data.FederacionId ?? null,
        plan: plan ?? data.plan ?? data.Plan ?? null,
    };
};

export const isSuperAdminUser = (user) => {
    const role = getUserRole(user).toLowerCase();
    return role === 'superadmin' || user?.username === 'soporte_tecnico';
};

export const isFederationAdminUser = (user) => {
    const role = getUserRole(user).toLowerCase();
    return role === 'admin';
};

export const isClubUser = (user) => {
    const role = getUserRole(user).toLowerCase();
    return role === 'club';
};

export const getDashboardPathForRole = (role) => {
    const normalized = (role || '').toLowerCase();
    if (normalized === 'admin' || normalized === 'superadmin') return '/super';
    if (normalized === 'club') return '/club';
    if (normalized === 'largador') return '/jueces/largador';
    if (normalized === 'cronometrista') return '/jueces/llegada';
    if (normalized === 'juezcontrol') return '/juez-control';
    return '/';
};

/** Texto buscable seguro (evita crash si faltan campos). */
export const buildSearchText = (...parts) =>
    parts
        .flat()
        .filter((p) => p != null && p !== '')
        .map((p) => String(p).toLowerCase())
        .join(' ');

export const matchesSearch = (term, ...parts) => {
    const q = (term || '').trim().toLowerCase();
    if (!q) return true;
    return buildSearchText(...parts).includes(q);
};
