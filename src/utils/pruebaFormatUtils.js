const BOTE_ABBREVIATIONS = [
    { pattern: /Kayak Individual/i, code: 'K1' },
    { pattern: /Kayak Doble/i, code: 'K2' },
    { pattern: /Kayak Cu[aá]druple/i, code: 'K4' },
    { pattern: /Canoa Individual/i, code: 'C1' },
    { pattern: /Canoa Doble/i, code: 'C2' },
    { pattern: /Canoa Cu[aá]druple/i, code: 'C4' },
];

const SEXO_ABBREVIATIONS = [
    { pattern: /\bMasculino\b/i, code: 'Masc' },
    { pattern: /\bFemenino\b/i, code: 'Fem' },
    { pattern: /\bMixto\b/i, code: 'Mix' },
    { pattern: /\bMasc\b/i, code: 'Masc' },
    { pattern: /\bFem\b/i, code: 'Fem' },
    { pattern: /\bMix\b/i, code: 'Mix' },
];

/**
 * Convierte nombres largos de prueba al formato abreviado:
 * "Cadete Kayak Individual 200m Masculino" → "K1 200m Cadete Masc"
 */
export const abbreviatePruebaNombre = (nombre) => {
    if (!nombre?.trim()) return '';

    let text = nombre.trim();

    let bote = '';
    const existingBote = text.match(/\b([KC][124])\b/i);
    if (existingBote) {
        bote = existingBote[1].toUpperCase();
        text = text.replace(existingBote[0], ' ').trim();
    } else {
        for (const { pattern, code } of BOTE_ABBREVIATIONS) {
            if (pattern.test(text)) {
                bote = code;
                text = text.replace(pattern, ' ').trim();
                break;
            }
        }
    }

    let sexo = '';
    for (const { pattern, code } of SEXO_ABBREVIATIONS) {
        if (pattern.test(text)) {
            sexo = code;
            text = text.replace(pattern, ' ').trim();
            break;
        }
    }

    let distancia = '';
    const distM = text.match(/(\d+)\s*m\b/i);
    if (distM) {
        distancia = `${distM[1]}m`;
        text = text.replace(distM[0], ' ').trim();
    } else {
        const distMetros = text.match(/(\d+)\s*Metros\b/i);
        if (distMetros) {
            distancia = `${distMetros[1]}m`;
            text = text.replace(distMetros[0], ' ').trim();
        } else {
            const distK = text.match(/\b(\d+)\s*K\b/i);
            if (distK) {
                distancia = `${distK[1]}K`;
                text = text.replace(distK[0], ' ').trim();
            }
        }
    }

    const categoria = text.replace(/\s+/g, ' ').trim();
    const parts = [bote, distancia, categoria, sexo].filter(Boolean);

    return parts.length > 0 ? parts.join(' ') : nombre.trim();
};
