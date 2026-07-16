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

/** Flags de producto derivados por ID (fallback si la API aún no los envía). */
const featuresByPlanId = (id) => {
    const planId = Number(id);
    switch (planId) {
        case 1: return { accesoDashboardClub: false, permitirCargaImagenes: false, resultadosTiempoReal: false, exportacionPdf: true, maxAtletas: 200, accesoControlesLive: false };
        case 2: return { accesoDashboardClub: true, permitirCargaImagenes: false, resultadosTiempoReal: false, exportacionPdf: true, maxAtletas: 400, accesoControlesLive: false };
        case 3: return { accesoDashboardClub: true, permitirCargaImagenes: true, resultadosTiempoReal: false, exportacionPdf: true, maxAtletas: -1, accesoControlesLive: false };
        case 4: return { accesoDashboardClub: false, permitirCargaImagenes: false, resultadosTiempoReal: false, exportacionPdf: true, maxAtletas: 200, accesoControlesLive: false };
        case 5: return { accesoDashboardClub: false, permitirCargaImagenes: false, resultadosTiempoReal: true, exportacionPdf: true, maxAtletas: 400, accesoControlesLive: false };
        case 6: return { accesoDashboardClub: false, permitirCargaImagenes: false, resultadosTiempoReal: true, exportacionPdf: true, maxAtletas: -1, accesoControlesLive: true };
        case 7: return { accesoDashboardClub: false, permitirCargaImagenes: false, resultadosTiempoReal: false, exportacionPdf: true, maxAtletas: 200, accesoControlesLive: false };
        case 8: return { accesoDashboardClub: true, permitirCargaImagenes: false, resultadosTiempoReal: true, exportacionPdf: true, maxAtletas: 400, accesoControlesLive: false };
        case 9: return { accesoDashboardClub: true, permitirCargaImagenes: true, resultadosTiempoReal: true, exportacionPdf: true, maxAtletas: -1, accesoControlesLive: true };
        default: return null;
    }
};

const accessByPlanId = (id) => {
    const planId = Number(id);
    if (!planId) return null;
    const features = featuresByPlanId(planId);
    if (!features) return null;

    if (PACK_DUO_IDS.includes(planId)) {
        return { accesoSigdef: true, accesoSportTrack: true, ...features };
    }
    if (SIGDEF_IDS.includes(planId)) {
        return { accesoSigdef: true, accesoSportTrack: false, ...features };
    }
    if (SPORTTRACK_IDS.includes(planId)) {
        return { accesoSigdef: false, accesoSportTrack: true, ...features };
    }
    return null;
};

const boolPick = (raw, camel, pascal, fallback) => {
    const v = pick(raw, camel, pascal);
    if (v === undefined || v === null) return fallback;
    return !!v;
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
            maxAtletas: Number(pick(rawPlan, 'maxAtletas', 'MaxAtletas') ?? byId.maxAtletas),
            accesoSigdef: byId.accesoSigdef,
            accesoSportTrack: byId.accesoSportTrack,
            accesoControlesLive: boolPick(rawPlan, 'accesoControlesLive', 'AccesoControlesLive', byId.accesoControlesLive),
            accesoDashboardClub: boolPick(rawPlan, 'accesoDashboardClub', 'AccesoDashboardClub', byId.accesoDashboardClub),
            permitirCargaImagenes: boolPick(rawPlan, 'permitirCargaImagenes', 'PermitirCargaImagenes', byId.permitirCargaImagenes),
            resultadosTiempoReal: boolPick(rawPlan, 'resultadosTiempoReal', 'ResultadosTiempoReal', byId.resultadosTiempoReal),
            exportacionPdf: boolPick(rawPlan, 'exportacionPdf', 'ExportacionPdf', byId.exportacionPdf),
        };
    }

    const esPackDuo = lower.includes('pack') && (
        lower.includes('duo') ||
        lower.includes('dúo')
    );
    const esSigdef = lower.includes('sigdef');
    const esSportTrack = lower.includes('sporttrack');
    const esL = lower.endsWith('(l)');
    const esM = lower.endsWith('(m)');

    const accesoSigdef = pick(rawPlan, 'accesoSigdef', 'AccesoSigdef');
    const accesoSportTrack = pick(rawPlan, 'accesoSportTrack', 'AccesoSportTrack');
    const accesoControlesLive = pick(rawPlan, 'accesoControlesLive', 'AccesoControlesLive');

    return {
        id,
        nombre,
        precio: Number(pick(rawPlan, 'precio', 'Precio') ?? 0),
        maxAtletas: Number(pick(rawPlan, 'maxAtletas', 'MaxAtletas') ?? 0),
        accesoSigdef: esSigdef || esPackDuo || accesoSigdef === true,
        accesoSportTrack: esSportTrack || esPackDuo || accesoSportTrack === true,
        accesoControlesLive: ((esSportTrack || esPackDuo) && esL) || accesoControlesLive === true,
        accesoDashboardClub: boolPick(
            rawPlan,
            'accesoDashboardClub',
            'AccesoDashboardClub',
            (esSigdef || esPackDuo) && (esM || esL)
        ),
        permitirCargaImagenes: boolPick(rawPlan, 'permitirCargaImagenes', 'PermitirCargaImagenes', (esSigdef || esPackDuo) && esL),
        resultadosTiempoReal: boolPick(rawPlan, 'resultadosTiempoReal', 'ResultadosTiempoReal', (esSportTrack || esPackDuo) && (esM || esL)),
        exportacionPdf: boolPick(rawPlan, 'exportacionPdf', 'ExportacionPdf', true),
    };
}

export function canAccessControlesLive(plan) {
    return !!normalizePlan(plan)?.accesoControlesLive;
}

export function canAccessDashboardClub(plan) {
    return !!normalizePlan(plan)?.accesoDashboardClub;
}

export function canAccessSportTrack(plan) {
    return !!normalizePlan(plan)?.accesoSportTrack;
}

export function canAccessSigdef(plan) {
    return !!normalizePlan(plan)?.accesoSigdef;
}

export function canCreateClubLogin(plan) {
    return canAccessDashboardClub(plan);
}

export function canCreateJudgeLogin(plan) {
    return canAccessControlesLive(plan);
}

export function extractPlanFromUser(data) {
    if (!data) return null;
    return normalizePlan(data.plan || data.Plan);
}
