export const mapFasesFromApi = (data) => {
    const mapped = (data || []).map(f => ({
        ...f,
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

export const getJudgeDisplayName = (user, fallback = 'Juez') =>
    user?.nombreCompleto || user?.nombre || user?.username || fallback;
