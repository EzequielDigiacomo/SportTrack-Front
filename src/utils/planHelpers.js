/** Lee campo con soporte camelCase / PascalCase */
const pick = (obj, ...keys) => {
    if (!obj) return undefined;
    for (const key of keys) {
        if (obj[key] !== undefined && obj[key] !== null) return obj[key];
    }
    return undefined;
};

/** Normaliza flags de acceso del plan (API + fallback por nombre). */
export function normalizePlan(rawPlan) {
    if (!rawPlan) return null;

    const nombre = (pick(rawPlan, 'nombre', 'Nombre') || '').trim();
    const lower = nombre.toLowerCase();

    const esPackDuo = lower.includes('pack') && (lower.includes('duo') || lower.includes('dúo') || lower.includes('dÃºo'));
    const esSigdef = lower.includes('sigdef');
    const esSportTrack = lower.includes('sporttrack');

    const accesoSigdef = pick(rawPlan, 'accesoSigdef', 'AccesoSigdef');
    const accesoSportTrack = pick(rawPlan, 'accesoSportTrack', 'AccesoSportTrack');
    const accesoControlesLive = pick(rawPlan, 'accesoControlesLive', 'AccesoControlesLive');

    return {
        id: pick(rawPlan, 'id', 'Id'),
        nombre,
        precio: Number(pick(rawPlan, 'precio', 'Precio') ?? 0),
        accesoSigdef: accesoSigdef ?? (esSigdef || esPackDuo),
        accesoSportTrack: accesoSportTrack ?? (esSportTrack || esPackDuo),
        accesoControlesLive: accesoControlesLive ?? lower.endsWith('(l)'),
    };
}

export function canAccessSportTrack(plan) {
    return !!normalizePlan(plan)?.accesoSportTrack;
}

export function canAccessSigdef(plan) {
    return !!normalizePlan(plan)?.accesoSigdef;
}

export function extractPlanFromUser(data) {
    if (!data) return null;
    return normalizePlan(data.plan || data.Plan);
}
