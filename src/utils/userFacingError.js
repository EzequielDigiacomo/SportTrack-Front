const TECHNICAL_RE = new RegExp(
    [
        'request failed with status code',
        'status code \\d+',
        'network error',
        'axioserror',
        'econnaborted',
        'timeout of \\d+',
        'failed to fetch',
        'err_[a-z0-9_]+',
        'cors policy',
        'access-control-allow',
        'internal server error',
        'bad request',
        'unauthorized',
        'forbidden',
        'not found',
        'nullreference',
        'object reference not set',
        'sqlexception',
        'dbupdate',
        'entityframework',
        'system\\.\\w*exception',
        'invalidoperation',
        'argumentnullexception',
        'argumentexception',
        'unexpected token',
        'syntaxerror',
        'typeerror:',
        'referenceerror:',
        'at\\s+[A-Za-z0-9_$.]+\\(',
        'stack trace',
        'www-authenticate',
        'application/json',
        'http/1\\.',
        'https?:\\/\\/localhost',
        'one or more validation errors',
        'nullable object must have a value',
        'sequence contains no elements',
        'input string was not in a correct format',
        'an error occurred while',
        'see the inner exception',
        'exception has been thrown',
        'microsoft\\.',
        'newtonsoft\\.',
        'system\\.text',
    ].join('|'),
    'i'
);

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

const DEFAULT_FALLBACK =
    'No se pudo completar la operación. Revisá los datos e intentá de nuevo.';

export function isTechnicalErrorMessage(text) {
    if (!text || typeof text !== 'string') return true;
    const trimmed = text.trim();
    if (!trimmed) return true;
    if (trimmed.startsWith('<')) return true; // HTML de error del servidor
    if (trimmed.length > 280) return true;
    if (trimmed.includes('\n    at ') || trimmed.includes('\nat ')) return true;
    return TECHNICAL_RE.test(trimmed);
}

/**
 * Sanitiza un texto ya armado (toast, alert, etc.) para no mostrar jerga técnica.
 */
export function sanitizeUserFacingText(text, fallback = DEFAULT_FALLBACK) {
    if (!text || typeof text !== 'string') return fallback;
    const trimmed = text.trim();
    if (!trimmed || isTechnicalErrorMessage(trimmed)) return fallback;
    return trimmed;
}

function parseValidationFieldLabels(errors) {
    if (!errors || typeof errors !== 'object') return [];
    const labels = Object.keys(errors)
        .filter((k) => k && k !== '$')
        .map((k) => FIELD_LABELS[k.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()])
        .filter(Boolean);
    return [...new Set(labels)];
}

/** Mensaje para mostrar al usuario: nunca códigos HTTP ni texto de Axios/.NET. */
export function getUserFacingError(error, fallback = DEFAULT_FALLBACK) {
    const data = error?.data ?? error?.response?.data;
    const status = error?.status ?? error?.response?.status;

    if (typeof data === 'string' && data.trim() && !isTechnicalErrorMessage(data) && !data.trim().startsWith('<')) {
        return data.trim();
    }

    const apiMsg = data?.message || data?.title || data?.detail;
    if (apiMsg && typeof apiMsg === 'string' && !isTechnicalErrorMessage(apiMsg)) {
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
    if (status === 409) return 'Hay un conflicto con datos existentes. Revisá e intentá de nuevo.';
    if (status >= 500) return 'El servidor no pudo completar la operación. Intentá de nuevo en unos minutos.';
    if (!error?.response && !status && (raw || error?.code)) {
        return 'No pudimos conectar con el servidor. Revisá tu conexión e intentá de nuevo.';
    }
    return fallback;
}
