/** IDs de categoría (catálogo SIGDEF). */
export const SUB23_CATEGORIA_ID = 6;
export const SENIOR_CATEGORIA_ID = 7;

/** Rangos alineados con SportTrackDbContext seed. */
export const SUB23_EDAD_MIN = 19;
export const SUB23_EDAD_MAX = 23;

export function isAtletaSub23(atleta) {
    if (!atleta) return false;
    const catId = Number(atleta.categoriaId ?? atleta.CategoriaId);
    const edad = Number(atleta.edad ?? atleta.Edad);
    if (catId === SUB23_CATEGORIA_ID) return true;
    if (Number.isFinite(edad)) {
        return edad >= SUB23_EDAD_MIN && edad <= SUB23_EDAD_MAX;
    }
    return false;
}

export function isPruebaSenior(catPrueba) {
    return Number(catPrueba?.id ?? catPrueba?.Id) === SENIOR_CATEGORIA_ID;
}

/**
 * Evalúa si un atleta puede inscribirse en la prueba según reglas del evento.
 * Retorna { esElegible, razonNoElegible }.
 */
export function evaluarElegibilidadAtleta({ evento, catPrueba, atleta }) {
    const edadAtleta = atleta.edad;
    const isControlPrueba = (
        catPrueba?.id === 11
        || String(catPrueba?.id) === '11'
        || catPrueba?.nombre === 'Control'
    );

    if (isControlPrueba) {
        return { esElegible: true, razonNoElegible: '' };
    }

    const atletaEsSub23 = isAtletaSub23(atleta);
    const pruebaEsSenior = isPruebaSenior(catPrueba);
    const permitirSub23 = Boolean(evento?.permitirSub23EnSenior);

    const esSub23EnSenior = permitirSub23 && pruebaEsSenior && atletaEsSub23;

    if (evento?.restringirSoloCategoriaPropia) {
        if (atleta.categoriaId !== catPrueba?.id && !esSub23EnSenior) {
            return { esElegible: false, razonNoElegible: 'Regla de Categoría Única' };
        }
        return { esElegible: true, razonNoElegible: '' };
    }

    const cumpleRango = (
        edadAtleta >= (catPrueba.edadMin || 0)
        && edadAtleta <= (catPrueba.edadMax || 99)
    );

    const esMasterEnSenior = evento?.permitirMasterBajarASenior
        && pruebaEsSenior
        && (atleta.categoriaId === 8 || (edadAtleta >= 40 && edadAtleta <= 49));

    // Sub-23 en Senior sin regla explícita: bloquear aunque el rango de edad se solape.
    if (pruebaEsSenior && atletaEsSub23 && !permitirSub23) {
        return { esElegible: false, razonNoElegible: 'Sub-23 no habilitado en Senior' };
    }

    if (cumpleRango || esSub23EnSenior || esMasterEnSenior) {
        return { esElegible: true, razonNoElegible: '' };
    }

    return { esElegible: false, razonNoElegible: 'Fuera de rango de edad' };
}

/** Para refuerzo K4: atleta califica como base en prueba Senior. */
export function atletaCalificaBaseSenior({ evento, catPrueba, atleta }) {
    const edad = atleta.edad;
    const cumpleRango = (
        edad >= (catPrueba.edadMin || 0)
        && edad <= (catPrueba.edadMax || 99)
    );
    const isS23S = evento?.permitirSub23EnSenior
        && isPruebaSenior(catPrueba)
        && isAtletaSub23(atleta);
    return cumpleRango || isS23S;
}
