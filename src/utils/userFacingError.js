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

const LOGIN_FALLBACK = 'No se pudo iniciar sesión. Revisá usuario y contraseña.';

function extractLoginBackendMessage(error) {
    const data = error?.data ?? error?.response?.data;
    if (typeof data === 'string' && data.trim() && !isTechnicalErrorMessage(data) && !data.trim().startsWith('<')) {
        return data.trim();
    }
    const apiMsg = data?.message || data?.Message || data?.title || data?.detail;
    if (typeof apiMsg === 'string' && apiMsg.trim() && !isTechnicalErrorMessage(apiMsg)) {
        return apiMsg.trim();
    }
    const raw = error?.message;
    if (typeof raw === 'string' && raw.trim() && !isTechnicalErrorMessage(raw)) {
        return raw.trim();
    }
    return '';
}

/**
 * Mensajes de login amigables: contraseña incorrecta (con intentos),
 * cuenta bloqueada, federación deshabilitada/vencida/pago. Nunca códigos HTTP.
 */
export function getLoginErrorMessage(error) {
    const status = error?.status ?? error?.response?.status;
    const raw = extractLoginBackendMessage(error);
    const lower = raw.toLowerCase();

    if (status === 429 || lower.includes('too many') || lower.includes('demasiados intentos seguidos')) {
        return 'Demasiados intentos seguidos. Esperá un minuto e intentá de nuevo.';
    }

    // Cuenta bloqueada por intentos fallidos o deshabilitada por admin
    if (
        lower.includes('cuenta') &&
        (lower.includes('bloquead') || lower.includes('deshabilit') || lower.includes('intentos fallidos'))
    ) {
        if (lower.includes('intentos')) {
            return 'Tu cuenta quedó bloqueada por demasiados intentos fallidos. Pedile al administrador que la habilite y te reinicie la contraseña.';
        }
        return 'Tu cuenta está bloqueada. Pedile al administrador que la habilite.';
    }

    // Federación / institución deshabilitada
    if (
        (lower.includes('federación') || lower.includes('federacion') || lower.includes('institución') || lower.includes('institucion'))
        && (lower.includes('deshabilit') || lower.includes('suspendid'))
    ) {
        return 'El acceso de tu federación está deshabilitado. Contactá al administrador del sistema.';
    }

    // Federación bloqueada por pago
    if (
        (lower.includes('federación') || lower.includes('federacion') || lower.includes('institución') || lower.includes('institucion') || lower.includes('acceso'))
        && (lower.includes('falta de pago') || lower.includes('bloqueado por falta'))
    ) {
        return 'El acceso de tu federación está bloqueado por falta de pago. Regularizá la situación para volver a ingresar.';
    }

    // Suscripción vencida (backend puede decir "institución" o "federación")
    if (
        lower.includes('suscripción')
        || lower.includes('suscripcion')
        || lower.includes('ha vencido')
        || lower.includes('venció')
        || lower.includes('vencio')
    ) {
        return 'La suscripción de tu federación venció. Renová el plan desde el panel del SuperAdmin para volver a ingresar.';
    }

    // Contraseña incorrecta + conteo de intentos restantes
    if (lower.includes('contraseña incorrecta') || lower.includes('contrasena incorrecta')) {
        const match = raw.match(/quedan?\s+(\d+)\s+intentos?/i);
        if (match) {
            const n = Number(match[1]);
            const label = n === 1 ? '1 intento' : `${n} intentos`;
            return `Contraseña incorrecta. Te quedan ${label} antes de que se bloquee la cuenta.`;
        }
        return 'Contraseña incorrecta. Revisá e intentá de nuevo.';
    }

    // Usuario/contraseña genérico (usuario no encontrado, etc.)
    if (lower.includes('usuario o contraseña') || lower.includes('usuario no encontrado')) {
        return 'Usuario o contraseña incorrectos.';
    }

    // Plan sin acceso a la app
    if (lower.includes('no incluye acceso')) {
        return sanitizeUserFacingText(raw, LOGIN_FALLBACK);
    }

    if (raw && !isTechnicalErrorMessage(raw)) {
        return sanitizeUserFacingText(raw, LOGIN_FALLBACK);
    }

    if (!error?.response && !status) {
        return 'No pudimos conectar con el servidor. Revisá tu conexión e intentá de nuevo.';
    }

    return LOGIN_FALLBACK;
}
