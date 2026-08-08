export const CATEGORIA_NAMES = {
    1: 'Pre-infantil (8-10 años)', 2: 'Infantil (11-12 años)', 3: 'Menor (13-14 años)', 4: 'Cadete (15-16 años)',
    5: 'Junior (17-18 años)', 6: 'Sub-23 (19-23 años)', 7: 'Senior (24-39 años)', 8: 'Master A (40-49 años)',
    9: 'Master B (50-59 años)', 10: 'Master C (60+ años)'
};

export const BOTE_NAMES = { 1: 'K1', 2: 'K2', 3: 'K4', 4: 'C1', 5: 'C2', 6: 'C4' };

export const DISTANCIA_NAMES = {
    1: '200m', 2: '350m', 3: '400m', 4: '450m', 5: '500m',
    6: '1000m', 7: '1500m', 8: '2000m', 9: '3000m', 10: '5000m',
    17: '6000m',
    11: '10000m', 12: '12000m', 13: '15000m', 14: '18000m', 15: '22000m', 16: '30000m'
};

/** Metros reales por Id de distancia (no confundir con el valor del enum). */
export const DISTANCIA_METROS = {
    1: 200, 2: 350, 3: 400, 4: 450, 5: 500,
    6: 1000, 7: 1500, 8: 2000, 9: 3000, 10: 5000,
    17: 6000,
    11: 10000, 12: 12000, 13: 15000, 14: 18000, 15: 22000, 16: 30000
};

export const MODALIDAD_VELOCIDAD = 'Velocidad';
export const MODALIDAD_MARATON = 'Maraton';
export const MARATON_MIN_METROS = 1000;
/** Velocidad / pista: hasta 6000 m inclusive; superiores son Maratón. */
export const VELOCIDAD_MAX_METROS = 6000;
/** Cadete (15-16) en adelante — ids del catálogo de categorías. */
export const MARATON_MIN_CATEGORIA_ID = 4;

export function getDistanciaMetros(id) {
    return DISTANCIA_METROS[Number(id)] ?? 0;
}

export function isDistanciaMaratonEligible(id) {
    return getDistanciaMetros(id) >= MARATON_MIN_METROS;
}

export function isDistanciaVelocidadEligible(id) {
    const m = getDistanciaMetros(id);
    return m > 0 && m <= VELOCIDAD_MAX_METROS;
}

export function isCategoriaMaratonEligible(id) {
    return Number(id) >= MARATON_MIN_CATEGORIA_ID;
}

export function isModalidadMaraton(modalidad) {
    const v = String(modalidad || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
    return v === 'maraton';
}

export function isModalidadVelocidad(modalidad) {
    if (!modalidad) return true; // default histórico = pista
    if (isModalidadMaraton(modalidad)) return false;
    const v = String(modalidad || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
    return v === 'velocidad' || v === '';
}

/**
 * Detecta Maratón por modalidad o, en eventos viejos, por distancias solo ≥1000m.
 */
export function resolveIsMaratonEvent(evento) {
    if (!evento) return false;
    if (isModalidadMaraton(evento.modalidad ?? evento.Modalidad)) return true;

    const dists = String(evento.distanciasHabilitadas ?? evento.DistanciasHabilitadas ?? '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
    if (!dists.length) return false;
    return dists.every(id => isDistanciaMaratonEligible(id));
}

export const SEXO_NAMES = { 1: 'Masculino', 2: 'Femenino', 3: 'Mixto' };

/** Resuelve etiqueta de distancia (el backend a veces envía metros = id de enum, no metros reales). */
export function getDistanciaLabel(pruebaOrDistancia) {
    const p = pruebaOrDistancia?.prueba || pruebaOrDistancia;
    const dist = p?.distancia || pruebaOrDistancia;
    if (!dist) return '?m';

    const distId = dist.id || p?.distanciaId;
    if (distId && DISTANCIA_NAMES[distId]) return DISTANCIA_NAMES[distId];

    if (dist.descripcion) return dist.descripcion;

    const metros = dist.metros ?? dist.Metros;
    if (metros && Number(metros) >= 100) return `${metros}m`;

    if (distId && DISTANCIA_NAMES[dist.distanciaRegata]) {
        return DISTANCIA_NAMES[dist.distanciaRegata];
    }

    return '?m';
}

/** Nombre legible de EventoPrueba: Categoría - Bote - Distancia - Sexo */
export function formatPruebaName(pr, options = {}) {
    const { raceNumber = null } = options;
    if (pr?.nombre && !options.forceBuild) return pr.nombre;

    const inner = pr?.prueba || pr;
    if (!inner) return `Prueba #${pr?.id || '?'}`;

    const catId = inner.categoria?.id || inner.categoriaId;
    const botId = inner.bote?.id || inner.boteId;
    const sexId = inner.sexoId || inner.sexo?.id;

    const catName = CATEGORIA_NAMES[catId] || inner.categoria?.nombre || 'Cat';
    const botName = BOTE_NAMES[botId] || inner.bote?.tipo || inner.bote?.nombre || 'Bote';
    const distName = getDistanciaLabel(inner);
    const sexName = SEXO_NAMES[sexId] || inner.sexoNombre || inner.sexo?.nombre || 'Mixto';

    const label = `${catName} - ${botName} - ${distName} - ${sexName}`;
    return raceNumber != null ? `#${raceNumber} - ${label}` : label;
}
