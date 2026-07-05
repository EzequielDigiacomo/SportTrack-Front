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

export const getDashboardPathForRole = (role) => {
    const normalized = (role || '').toLowerCase();
    if (normalized === 'admin' || normalized === 'superadmin') return '/super';
    if (normalized === 'club') return '/club';
    if (normalized === 'largador') return '/jueces/largador';
    if (normalized === 'cronometrista') return '/jueces/llegada';
    if (normalized === 'juezcontrol') return '/juez-control';
    return '/';
};
