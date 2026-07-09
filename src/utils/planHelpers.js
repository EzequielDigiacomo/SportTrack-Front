/** Lee campo con soporte camelCase / PascalCase */
const pick = (obj, ...keys) => {
    if (!obj) return undefined;
    for (const key of keys) {
        if (obj[key] !== undefined && obj[key] !== null) return obj[key];
    }
    return undefined;
};

const SIGDEF_IDS = [1, 2, 3];
const SPORTTRACK_IDS = [4, 5, 6];
const PACK_DUO_IDS = [7, 8, 9];

const accessByPlanId = (id) => {
    const planId = Number(id);
    if (!planId) return null;
    if (PACK_DUO_IDS.includes(planId)) {
        return { accesoSigdef: true, accesoSportTrack: true, accesoControlesLive: planId === 9 };
    }
    if (SIGDEF_IDS.includes(planId)) {
        return { accesoSigdef: true, accesoSportTrack: false, accesoControlesLive: planId === 3 };
    }
    if (SPORTTRACK_IDS.includes(planId)) {
        return { accesoSigdef: false, accesoSportTrack: true, accesoControlesLive: planId === 6 };
    }
    return null;
};

/** Normaliza flags de acceso del plan (API + fallback por ID y nombre). */
export function normalizePlan(rawPlan) {
    if (!rawPlan) return null;

    const id = pick(rawPlan, 'id', 'Id');
    const nombre = (pick(rawPlan, 'nombre', 'Nombre') || '').trim();
    const lower = nombre.toLowerCase();

    const byId = accessByPlanId(id);
    if (byId) {
        return {
            id,
            nombre,
            precio: Number(pick(rawPlan, 'precio', 'Precio') ?? 0),
            ...byId,
        };
    }

    const esPackDuo = lower.includes('pack') && (
        lower.includes('duo') ||
        lower.includes('dúo')
    );
    const esSigdef = lower.includes('sigdef');
    const esSportTrack = lower.includes('sporttrack');

    const accesoSigdef = pick(rawPlan, 'accesoSigdef', 'AccesoSigdef');
    const accesoSportTrack = pick(rawPlan, 'accesoSportTrack', 'AccesoSportTrack');
    const accesoControlesLive = pick(rawPlan, 'accesoControlesLive', 'AccesoControlesLive');

    return {
        id,
        nombre,
        precio: Number(pick(rawPlan, 'precio', 'Precio') ?? 0),
        accesoSigdef: esSigdef || esPackDuo || accesoSigdef === true,
        accesoSportTrack: esSportTrack || esPackDuo || accesoSportTrack === true,
        accesoControlesLive: lower.endsWith('(l)') || accesoControlesLive === true,
    };
}

export function canAccessControlesLive(plan) {
    return !!normalizePlan(plan)?.accesoControlesLive;
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
