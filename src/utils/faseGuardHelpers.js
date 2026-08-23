import { normalizeFaseEstado } from './judgeDashboardHelpers';
import { isJudgeAdmin } from './controlTecnico';

export const isJuezControlOnly = (user) => {
    const role = String(user?.rol || user?.Rol || user?.role || '').toLowerCase();
    return role.includes('juezcontrol') && !isJudgeAdmin(user);
};

/** Tiempos ya persistidos en BD (viene del API en fase.resultados). */
export const faseTieneTiemposPersistidos = (fase) =>
    (fase?.resultados || []).some(r => {
        const t = r.tiempoOficial ?? r.TiempoOficial;
        return t != null && String(t).trim() !== '';
    });

/** Tiempos tipeados en mesa de control (p. ej. desde PDF de respaldo). */
export const faseTieneTiemposLocalesCargados = (fase, tiemposLocales = {}) => {
    if (!fase?.resultados?.length) return false;
    const ids = new Set(fase.resultados.map(r => String(r.id)));
    return Object.entries(tiemposLocales).some(([id, item]) => {
        if (!ids.has(String(id)) || !item) return false;
        const estado = item.estadoCanto || item.estado;
        if (estado && estado !== 'Pendiente') return true;
        const t = item.tiempoOficial;
        return t != null && String(t).trim() !== '';
    });
};

/**
 * Juez de control puede guardar cuando:
 * - el cronometrista ya envió tiempos al servidor, o
 * - la serie está finalizada, o
 * - mesa cargó tiempos manualmente (respaldo PDF / contingencia).
 */
export const canJuezControlGuardarFase = (fase, tiemposLocales = null) => {
    if (!fase) return false;
    const estado = normalizeFaseEstado(fase.estado);
    if (estado === 'Finalizada') return true;
    if (tiemposLocales && faseTieneTiemposLocalesCargados(fase, tiemposLocales)) return true;
    if (estado !== 'Pendiente de Validación') return false;
    return faseTieneTiemposPersistidos(fase);
};

export const getJuezControlGuardMessage = (fase, tiemposLocales = null) => {
    if (!fase) return 'Seleccioná una fase.';
    if (tiemposLocales && faseTieneTiemposLocalesCargados(fase, tiemposLocales)) {
        return null;
    }
    const estado = normalizeFaseEstado(fase.estado);

    if (estado === 'En Carrera' || estado === 'Programada') {
        return 'Esperá el envío del cronometrista. Si te entregó PDF de respaldo, cargá los tiempos en la columna Tiempo de la grilla y después Guardar.';
    }
    if (estado === 'Pendiente de Validación' && !faseTieneTiemposPersistidos(fase)) {
        return 'No hay tiempos en el servidor. Pedí reintento al cronometrista o cargá los tiempos manualmente desde el PDF en la grilla.';
    }
    if (estado === 'Finalizada') {
        return null;
    }
    return 'Esperá a que el cronometrista envíe los tiempos (botón Enviar) antes de guardar desde mesa de control.';
};
