const TECHNICAL_RE = /request failed with status code|status code \d+|network error|axioserror|econnaborted|timeout of \d+/i;

const FIELD_LABELS = {
    clubid: 'Club / Entidad',
    idclub: 'Club / Entidad',
    federacionid: 'Federación',
    nombre: 'Nombre',
    apellido: 'Apellido',
    dni: 'Documento',
    documento: 'Documento',
    fechanacimiento: 'Fecha de nacimiento',
    email: 'Email',
    username: 'Usuario',
    password: 'Contraseña',
    rol: 'Rol',
    rolfederacion: 'Rol',
};

export function isTechnicalErrorMessage(text) {
    if (!text || typeof text !== 'string') return true;
    return TECHNICAL_RE.test(text);
}

function parseValidationFieldLabels(errors) {
    if (!errors || typeof errors !== 'object') return [];
    const labels = Object.keys(errors)
        .filter((k) => k && k !== '$')
        .map((k) => FIELD_LABELS[k.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()])
        .filter(Boolean);
    return [...new Set(labels)];
}

/** Mensaje para mostrar al usuario: nunca códigos HTTP ni texto de Axios. */
export function getUserFacingError(error, fallback = 'No se pudo completar la operación. Revisá los datos e intentá de nuevo.') {
    const data = error?.data ?? error?.response?.data;
    const status = error?.status ?? error?.response?.status;

    if (typeof data === 'string' && data.trim() && !isTechnicalErrorMessage(data) && !data.trim().startsWith('<')) {
        return data.trim();
    }

    const apiMsg = data?.message;
    if (apiMsg && typeof apiMsg === 'string' && !isTechnicalErrorMessage(apiMsg) && !/one or more validation errors/i.test(apiMsg)) {
        return apiMsg;
    }

    const fields = parseValidationFieldLabels(data?.errors);
    if (fields.length) {
        return `Falta completar o revisar: ${fields.join(', ')}.`;
    }

    const raw = error?.message;
    if (raw && !isTechnicalErrorMessage(raw)) return raw;

    if (status === 400) {
        return 'Hay datos incompletos o incorrectos. Completá los campos señalados e intentá de nuevo.';
    }
    if (status === 401) return 'Tu sesión expiró. Volvé a iniciar sesión.';
    if (status === 403) return 'No tenés permiso para esta acción.';
    if (status === 404) return 'No encontramos el registro solicitado.';
    if (status >= 500) return 'El servidor no pudo completar la operación. Intentá de nuevo en unos minutos.';
    return fallback;
}
