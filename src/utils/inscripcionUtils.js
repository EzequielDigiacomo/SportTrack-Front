/**
 * Determina si un evento acepta altas/bajas de inscripciones.
 * Replica la lógica del backend (EventoDto.InscripcionesAbiertas).
 */
export const areInscripcionesAbiertas = (evento) => {
    if (!evento) return false;

    const flag = evento.inscripcionesAbiertas ?? evento.InscripcionesAbiertas;
    if (flag === false) return false;

    const habilitadas = evento.inscripcionesHabilitadas ?? evento.InscripcionesHabilitadas ?? true;
    if (!habilitadas) return false;

    const estado = String(evento.estado ?? evento.Estado ?? '')
        .replace(/\s+/g, '')
        .toLowerCase();
    if (estado !== 'programada') return false;

    const fechaCierreRaw = evento.fechaFinInscripciones ?? evento.FechaFinInscripciones;
    if (fechaCierreRaw) {
        const cierre = new Date(fechaCierreRaw);
        if (!Number.isNaN(cierre.getTime()) && new Date() > cierre) return false;
    }

    return true;
};
