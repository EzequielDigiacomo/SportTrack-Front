/** Reintentos para envío de tiempos en señal débil (3G intermitente). */
export const TIMING_SUBMIT_RETRY_DELAYS_MS = [2000, 5000, 10000];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Errores que no mejoran reintentando (validación, permisos, sesión). */
export const isRetryableRequestError = (error) => {
    const status = error?.status ?? error?.response?.status;
    if ([400, 401, 403, 404, 409, 422].includes(status)) return false;
    if (status === 408 || status === 429 || status >= 500) return true;
    if (!status) return true;
    return false;
};

/**
 * Ejecuta `fn` y reintenta ante fallos de red / servidor transitorios.
 * @param {() => Promise<T>} fn
 * @param {{ delaysMs?: number[], shouldRetry?: (err: unknown) => boolean, onRetry?: (ctx: object) => void }} options
 * @returns {Promise<T>}
 */
export async function retryWithBackoff(fn, {
    delaysMs = TIMING_SUBMIT_RETRY_DELAYS_MS,
    shouldRetry = isRetryableRequestError,
    onRetry,
} = {}) {
    const maxAttempts = delaysMs.length + 1;
    let lastError;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn(attempt);
        } catch (err) {
            lastError = err;
            const canRetry = attempt < maxAttempts && shouldRetry(err);
            if (!canRetry) throw err;

            const delay = delaysMs[attempt - 1] ?? delaysMs[delaysMs.length - 1];
            onRetry?.({ attempt, nextAttempt: attempt + 1, maxAttempts, delay, error: err });
            await sleep(delay);
        }
    }

    throw lastError;
}
