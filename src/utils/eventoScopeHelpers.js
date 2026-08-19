import EventoService from '../services/EventoService';
import { getUserFederationId, eventBelongsToFederation } from './apiHelpers';
import { isSuperAdminUser, getUserRole } from './authHelpers';
import { filterEventosForJudgeRole } from './controlTecnico';

export const JUDGE_OPERATOR_ROLES = ['largador', 'cronometrista', 'juezcontrol', 'controltecnico'];

export function isJudgeOperatorRole(user) {
    const role = getUserRole(user).toLowerCase();
    return JUDGE_OPERATOR_ROLES.includes(role);
}

/**
 * Carga eventos scoped por federación del usuario.
 * Jueces sin federacionId → lista vacía (cuenta mal configurada).
 */
export async function fetchEventosForUser(user, clubes = []) {
    if (!user) return [];

    if (isSuperAdminUser(user)) {
        const all = await EventoService.getAll();
        return filterEventosForJudgeRole(all, user);
    }

    const fedId = getUserFederationId(user);

    if (isJudgeOperatorRole(user)) {
        if (!fedId) return [];
        const data = await EventoService.getAll(fedId, { asFederation: true });
        const scoped = (data || []).filter((ev) =>
            eventBelongsToFederation(ev, clubes, fedId, { trustApiScope: true })
        );
        return filterEventosForJudgeRole(scoped, user);
    }

    if (user?.rol === 'Club' && user?.clubId) {
        const data = fedId
            ? await EventoService.getAll(fedId, { asFederation: true })
            : await EventoService.getAll(user.clubId);
        return filterEventosForJudgeRole(data, user);
    }

    if (user?.rol === 'Admin' && fedId) {
        const data = await EventoService.getAll(fedId, { asFederation: true });
        return filterEventosForJudgeRole(data, user);
    }

    const data = await EventoService.getAll();
    return filterEventosForJudgeRole(data, user);
}
