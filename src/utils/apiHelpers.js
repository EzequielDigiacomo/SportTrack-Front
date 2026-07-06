/** Agrega ?idFederacion= para vistas SuperAdmin scoped por federación */
export function withFederationScope(endpoint, fedId) {
    if (fedId == null || fedId === '') return endpoint;
    const id = encodeURIComponent(String(fedId));
    return endpoint.includes('?') ? `${endpoint}&idFederacion=${id}` : `${endpoint}?idFederacion=${id}`;
}

/** Lee un campo con soporte camelCase / PascalCase */
export const pick = (obj, ...keys) => {
    if (!obj) return undefined;
    for (const key of keys) {
        if (obj[key] !== undefined && obj[key] !== null) return obj[key];
    }
    return undefined;
};

/** Normaliza id de federación en objetos club */
export function getClubFederationId(club) {
    return pick(club, 'federacionId', 'FederacionId', 'idFederacion', 'IdFederacion') ?? null;
}

/** Nombre de federación en objetos club */
export function getClubFederationName(club) {
    return pick(club, 'federacionNombre', 'FederacionNombre') || null;
}

/** Id de federación del usuario logueado */
export function getUserFederationId(user) {
    if (!user) return null;
    return pick(user, 'federacionId', 'FederacionId', 'idFederacion', 'IdFederacion') ?? null;
}

/** Club pertenece a la federación indicada */
export function clubBelongsToFederation(club, fedId) {
    if (fedId == null || fedId === '') return true;
    return String(getClubFederationId(club)) === String(fedId);
}

/** Club sin federación asignada */
export function isClubWithoutFederation(club) {
    return !getClubFederationId(club);
}

/** Normaliza federación desde la API */
export const mapFederacionFromApi = (f) => ({
    id: pick(f, 'idFederacion', 'IdFederacion', 'id', 'Id'),
    nombre: pick(f, 'nombre', 'Nombre') || 'Federación',
    sigla: pick(f, 'sigla', 'Sigla') || '',
});

/** Filtra clubes por federación */
export function filterClubesByFederation(clubes, fedId) {
    if (fedId == null || fedId === '') return clubes;
    return (clubes || []).filter(c => clubBelongsToFederation(c, fedId));
}

/** Obtiene ids de clubes de una federación */
export function getClubIdsForFederation(clubes, fedId) {
    return filterClubesByFederation(clubes, fedId).map(c => pick(c, 'id', 'Id'));
}
