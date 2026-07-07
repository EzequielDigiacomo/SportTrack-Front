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

/** Asegura array aunque la API devuelva un solo objeto */
export function ensureArray(data) {
    if (data == null) return [];
    return Array.isArray(data) ? data : [data];
}

/** Detecta entidad club (tiene federacionId) vs federación (tiene idFederacion) */
export function isClubEntity(obj) {
    if (!obj) return false;
    const hasFedParent = pick(obj, 'federacionId', 'FederacionId', 'idFederacion', 'IdFederacion') != null
        && pick(obj, 'idFederacion', 'IdFederacion') == null;
    const hasClubFields = pick(obj, 'federacionNombre', 'FederacionNombre', 'cantidadAtletas', 'CantidadAtletas') != null;
    return hasFedParent || hasClubFields;
}

/** Normaliza federación desde la API */
export const mapFederacionFromApi = (f) => ({
    id: pick(f, 'idFederacion', 'IdFederacion', 'id', 'Id'),
    nombre: pick(f, 'nombre', 'Nombre') || 'Federación',
    sigla: pick(f, 'sigla', 'Sigla') || '',
});

/** Lista de federaciones desde GET /federaciones — excluye clubes mezclados por error */
export function normalizeFederacionesList(raw) {
    return ensureArray(raw)
        .filter(f => !isClubEntity(f))
        .map(mapFederacionFromApi)
        .filter(f => f.id != null && f.id !== '');
}

/** Resuelve id de federación para scoping: URL > usuario > club del usuario > inferir de clubes */
export function resolveScopeFederationId({ fedIdFromUrl, user, clubes = [] }) {
    if (fedIdFromUrl != null && fedIdFromUrl !== '') return String(fedIdFromUrl);

    const userFedId = getUserFederationId(user);
    if (userFedId != null) return String(userFedId);

    const userClubId = pick(user, 'clubId', 'ClubId', 'idClub', 'IdClub');
    if (userClubId != null) {
        const club = (clubes || []).find(c => String(pick(c, 'id', 'Id')) === String(userClubId));
        const clubFedId = getClubFederationId(club);
        if (clubFedId != null) return String(clubFedId);
    }

    // Fallback: si la API ya devolvió clubes scoped al tenant, inferir de la primera fila
    const inferred = (clubes || []).map(getClubFederationId).find(id => id != null);
    if (inferred != null) return String(inferred);

    return null;
}

/** Id de club en objetos atleta/participante */
export function getAtletaClubId(atleta) {
    return pick(atleta, 'clubId', 'ClubId', 'idClub', 'IdClub') ?? null;
}

/** Atleta pertenece a la federación (por club o agente libre visible en su fed) */
export function athleteBelongsToFederation(atleta, clubes, fedId) {
    if (fedId == null || fedId === '') return true;
    const clubId = getAtletaClubId(atleta);
    if (clubId == null || clubId === '' || clubId === 0) return true;
    const club = (clubes || []).find(c => String(pick(c, 'id', 'Id')) === String(clubId));
    return club && String(getClubFederationId(club)) === String(fedId);
}

/** Id de federación en objetos evento (directo o vía club) */
export function getEventFederationId(evento, clubes = []) {
    const fedFromEvent = pick(evento, 'federacionId', 'FederacionId', 'idFederacion', 'IdFederacion');
    if (fedFromEvent != null && fedFromEvent !== '') return fedFromEvent;

    const clubId = pick(evento, 'clubId', 'ClubId', 'idClub', 'IdClub');
    if (clubId == null || clubId === '') return null;

    const club = (clubes || []).find(c => String(pick(c, 'id', 'Id')) === String(clubId));
    return club ? getClubFederationId(club) : null;
}

/** Evento visible para la federación indicada */
export function eventBelongsToFederation(evento, clubes, fedId, { trustApiScope = false } = {}) {
    if (fedId == null || fedId === '') return true;
    const eventFedId = getEventFederationId(evento, clubes);
    if (eventFedId == null) return trustApiScope;
    return String(eventFedId) === String(fedId);
}

/** Filtra clubes por federación */
export function filterClubesByFederation(clubes, fedId) {
    if (fedId == null || fedId === '') return clubes;
    return (clubes || []).filter(c => clubBelongsToFederation(c, fedId));
}

/** Obtiene ids de clubes de una federación */
export function getClubIdsForFederation(clubes, fedId) {
    return filterClubesByFederation(clubes, fedId).map(c => pick(c, 'id', 'Id'));
}
