export const CATEGORIA_NAMES = {
    1: 'Pre-infantil (8-10 años)', 2: 'Infantil (11-12 años)', 3: 'Menor (13-14 años)', 4: 'Cadete (15-16 años)',
    5: 'Junior (17-18 años)', 6: 'Sub-23 (19-23 años)', 7: 'Senior (24-39 años)', 8: 'Master A (40-49 años)',
    9: 'Master B (50-59 años)', 10: 'Master C (60+ años)'
};

export const BOTE_NAMES = { 1: 'K1', 2: 'K2', 3: 'K4', 4: 'C1', 5: 'C2', 6: 'C4' };

export const DISTANCIA_NAMES = {
    1: '200m', 2: '350m', 3: '400m', 4: '450m', 5: '500m',
    6: '1000m', 7: '1500m', 8: '2000m', 9: '3000m', 10: '5000m',
    11: '10000m', 12: '12000m', 13: '15000m', 14: '18000m', 15: '22000m', 16: '30000m'
};

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
