// Enums matching backend definitions (1-based indexing)

export const SexoEnum = {
    MASCULINO: 1,
    FEMENINO: 2,
    MIXTO: 3,
}

export const TipoBoteEnum = {
    K1: 1,
    K2: 2,
    K4: 3,
    C1: 4,
    C2: 5,
    C4: 6,
}

export const CategoriaEnum = {
    INFANTIL: 1,
    CADETE: 2,
    JUVENIL: 3,
    SENIOR: 4,
    MASTER: 5,
}

export const EstadoInscripcionEnum = {
    PENDIENTE: 1,
    CONFIRMADA: 2,
    CANCELADA: 3,
}

// Helper functions to get display names
export const getSexoName = (value) => {
    const names = {
        [SexoEnum.MASCULINO]: 'Masculino',
        [SexoEnum.FEMENINO]: 'Femenino',
        [SexoEnum.MIXTO]: 'Mixto',
    }
    return names[value] || 'Desconocido'
}

export const getTipoBoteName = (value) => {
    const names = {
        [TipoBoteEnum.K1]: 'K1',
        [TipoBoteEnum.K2]: 'K2',
        [TipoBoteEnum.K4]: 'K4',
        [TipoBoteEnum.C1]: 'C1',
        [TipoBoteEnum.C2]: 'C2',
        [TipoBoteEnum.C4]: 'C4',
    }
    return names[value] || 'Desconocido'
}

export const getCategoriaName = (value) => {
    const names = {
        [CategoriaEnum.INFANTIL]: 'Infantil',
        [CategoriaEnum.CADETE]: 'Cadete',
        [CategoriaEnum.JUVENIL]: 'Juvenil',
        [CategoriaEnum.SENIOR]: 'Senior',
        [CategoriaEnum.MASTER]: 'Master',
    }
    return names[value] || 'Desconocido'
}

export const getEstadoInscripcionName = (value) => {
    const names = {
        [EstadoInscripcionEnum.PENDIENTE]: 'Pendiente',
        [EstadoInscripcionEnum.CONFIRMADA]: 'Confirmada',
        [EstadoInscripcionEnum.CANCELADA]: 'Cancelada',
    }
    return names[value] || 'Desconocido'
}

// Get all options for dropdowns
export const getSexoOptions = () => [
    { value: SexoEnum.MASCULINO, label: 'Masculino' },
    { value: SexoEnum.FEMENINO, label: 'Femenino' },
    { value: SexoEnum.MIXTO, label: 'Mixto' },
]

export const getTipoBoteOptions = () => [
    { value: TipoBoteEnum.K1, label: 'K1' },
    { value: TipoBoteEnum.K2, label: 'K2' },
    { value: TipoBoteEnum.K4, label: 'K4' },
    { value: TipoBoteEnum.C1, label: 'C1' },
    { value: TipoBoteEnum.C2, label: 'C2' },
    { value: TipoBoteEnum.C4, label: 'C4' },
]

export const getCategoriaOptions = () => [
    { value: CategoriaEnum.INFANTIL, label: 'Infantil' },
    { value: CategoriaEnum.CADETE, label: 'Cadete' },
    { value: CategoriaEnum.JUVENIL, label: 'Juvenil' },
    { value: CategoriaEnum.SENIOR, label: 'Senior' },
    { value: CategoriaEnum.MASTER, label: 'Master' },
]

export const getEstadoInscripcionOptions = () => [
    { value: EstadoInscripcionEnum.PENDIENTE, label: 'Pendiente' },
    { value: EstadoInscripcionEnum.CONFIRMADA, label: 'Confirmada' },
    { value: EstadoInscripcionEnum.CANCELADA, label: 'Cancelada' },
]
