/** selectedEvento puede ser string (id) u objeto { id } según el dashboard. */
export function resolveEventoId(selectedEvento) {
    if (selectedEvento == null || selectedEvento === '') return null;
    if (typeof selectedEvento === 'object') {
        return selectedEvento.id ?? selectedEvento.Id ?? null;
    }
    return selectedEvento;
}

export function normalizeJudgeRole(role) {
    return (role || '').toLowerCase().replace(/\s+/g, '');
}

export function isLargadorRole(role) {
    return normalizeJudgeRole(role) === 'largador';
}

export function isCronometristaRole(role) {
    return normalizeJudgeRole(role) === 'cronometrista';
}

export function isControlJudgeRole(role) {
    const r = normalizeJudgeRole(role);
    return r === 'admin' || r === 'superadmin' || r === 'juezcontrol' || r === 'juezdecontrol';
}

export function findJudgeByRole(presenceList, roleMatcher) {
    return (presenceList || []).find((j) => roleMatcher(j.role || j.Role));
}
