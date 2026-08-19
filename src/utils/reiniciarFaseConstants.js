export const REINICIAR_FASE_CATEGORIAS = [
    { value: 'mala_largada', label: 'Mala largada / partida en falso' },
    { value: 'postergacion', label: 'Postergación o suspensión (clima, seguridad)' },
    { value: 'problema_tecnico', label: 'Problema técnico (cronometraje, sistema)' },
    { value: 'problema_externo', label: 'Problema externo imprevisto' },
    { value: 'otro', label: 'Otro motivo (detallar abajo)' },
];

export const REINICIAR_FASE_AVISO =
    'Usá el reinicio solo por incidentes operativos: mala largada, postergación o problemas externos/imprevistos. ' +
    'No corresponde para corregir siembras, pases de etapa ni el armado del cronograma.';

export function buildReiniciarMotivo(categoria, detalle = '') {
    const cat = REINICIAR_FASE_CATEGORIAS.find((c) => c.value === categoria);
    const label = cat?.label || categoria;
    const extra = (detalle || '').trim();

    if (categoria === 'otro') {
        return extra;
    }
    return extra ? `${label}: ${extra}` : label;
}

export function isReiniciarMotivoValid(categoria, detalle = '') {
    if (!categoria) return false;
    const extra = (detalle || '').trim();
    if (categoria === 'otro') return extra.length >= 10;
    return true;
}
