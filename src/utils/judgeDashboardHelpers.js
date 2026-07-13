export const normalizeFaseEstado = (estado) => {
    if (!estado) return 'Programada';
    const raw = String(estado).trim();
    const key = raw.toLowerCase().replace(/\s+/g, '');
    if (key === 'encarrera' || key === 'en_carrera') return 'En Carrera';
    if (key === 'pendientedevalidación' || key === 'pendientedevalidacion' || key === 'pendientevalidacion') {
        return 'Pendiente de Validación';
    }
    if (key === 'finalizada' || key === 'finalizado') return 'Finalizada';
    if (key === 'programada') return 'Programada';
    return raw;
};

export const mapFasesFromApi = (data) => {
    const mapped = (data || []).map(f => ({
        ...f,
        estado: normalizeFaseEstado(f.estado || f.Estado),
        resultados: f.resultados?.map(r => ({
            ...r,
            estadoCanto: r.estado === 'Descalificado' ? 'DSQ' : r.estado
        }))
    }));

    return mapped.sort((a, b) => {
        const dateA = a.fechaHoraProgramada || '2000-01-01T00:00:00';
        const dateB = b.fechaHoraProgramada || '2000-01-01T00:00:00';
        return dateA.localeCompare(dateB);
    });
};

/** Puede largarse solo si sigue programada y aún no hay tiempos cargados. */
export const canStartFase = (fase) => {
    if (!fase) return false;
    const estado = normalizeFaseEstado(fase.estado);
    if (estado !== 'Programada') return false;
    const hasTimes = (fase.resultados || []).some(r => r.tiempoOficial);
    return !hasTimes;
};

export const isFaseCerrada = (fase) => {
    if (!fase) return false;
    const estado = normalizeFaseEstado(fase.estado);
    if (['Finalizada', 'Pendiente de Validación'].includes(estado)) return true;
    return (fase.resultados || []).some(r => r.tiempoOficial);
};

export const getJudgeDisplayName = (user, fallback = 'Juez') =>
    user?.nombreCompleto || user?.nombre || user?.username || fallback;
