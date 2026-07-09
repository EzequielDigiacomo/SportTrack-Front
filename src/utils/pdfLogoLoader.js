import logoUrl from '../assets/SportTrack-Logo-Detallado.png';

/** @type {{ dataUrl: string, width: number, height: number } | null} */
let cachedLogo = null;

const loadDataUrl = () => new Promise((resolve, reject) => {
    fetch(logoUrl)
        .then(r => r.blob())
        .then(blob => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        })
        .catch(reject);
});

const readImageSize = (dataUrl) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = dataUrl;
});

/** Logo con dataUrl y dimensiones reales para mantener proporción en PDF. */
export async function getPdfLogo() {
    if (cachedLogo) return cachedLogo;
    const dataUrl = await loadDataUrl();
    const { width, height } = await readImageSize(dataUrl);
    cachedLogo = { dataUrl, width, height };
    return cachedLogo;
}

/** @deprecated Usar getPdfLogo */
export async function getPdfLogoDataUrl() {
    const logo = await getPdfLogo();
    return logo.dataUrl;
}

/**
 * Calcula tamaño del logo dentro del encabezado sin deformar.
 * @param {{ width: number, height: number }} logo
 * @param {number} maxH altura máxima mm
 * @param {number} maxW ancho máximo mm
 */
export function fitLogoDimensions(logo, maxH, maxW) {
    const ratio = logo.width / logo.height;
    let h = maxH;
    let w = h * ratio;
    if (w > maxW) {
        w = maxW;
        h = w / ratio;
    }
    return { width: w, height: h };
}
