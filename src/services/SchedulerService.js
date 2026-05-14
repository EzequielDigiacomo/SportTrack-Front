/**
 * SchedulerService.js
 * Motor de cálculo de cronograma basado en el principio de "Pateo Condicional".
 */

const SchedulerService = {
    /**
     * Recalcula los horarios de una secuencia de regatas (Fases o Pruebas).
     * Respeta el horario original si es posible, de lo contrario empuja (patea) hacia adelante.
     */
    recalcularTiempos: (items, config = {}) => {
        if (!items || items.length === 0) return [];
        
        const {
            gapBaseMs = (config.gapEntrePruebas || 10) * 60 * 1000,
            gapRecuperacionMs = 40 * 60 * 1000,
            horaInicioEvento = "08:00",
            horaFinEvento = "18:00",
            sinReceso = false,
            horaInicioReceso = "13:00",
            horaFinReceso = "14:00"
        } = config;

        const getMinutesOfDay = (item) => {
            const val = item.fechaHoraProgramada || item.time || item.fechaHoraOriginal || item.prueba?.fechaHora || item.raw?.fechaHora;
            if (!val) return 480;

            const date = new Date(val);
            if (!isNaN(date.getTime())) {
                // Si es una fecha válida (ISO), devolvemos minutos locales
                return date.getHours() * 60 + date.getMinutes();
            }

            // Fallback para strings tipo "HH:MM"
            const match = String(val).match(/(\d{2}):(\d{2})/);
            if (match) return parseInt(match[1]) * 60 + parseInt(match[2]);
            return 480; // 08:00 default
        };

        // 1. ORDENAMIENTO CRONOLÓGICO (Permite entreverar Eliminatorias con Semis/Finales)
        const sorted = [...items].sort((a, b) => {
            // Prioridad 1: Hora original del programa (Permite intercalar)
            const minA = getMinutesOfDay(a);
            const minB = getMinutesOfDay(b);
            if (minA !== minB) return minA - minB;

            // Prioridad 2: Orden de la Etapa (1: Eliminatorias, 2: Semis, 3: Finales) para desempatar si caen en la misma hora
            const orderA = a.etapa?.orden || a.etapaOrden || 1;
            const orderB = b.etapa?.orden || b.etapaOrden || 1;
            if (orderA !== orderB) return orderA - orderB;

            // Prioridad 3: Número de fase (Serie 1, Serie 2...)
            return (a.numeroFase || 0) - (b.numeroFase || 0);
        });

        let cursorMinutos = -1;
        let currentDiaOffset = 0;
        const resultados = [];
        const ultimosMinutosPorPrueba = {};

        const parseMinutes = (horaStr) => {
            const [h, m] = horaStr.split(':').map(Number);
            return h * 60 + m;
        };
        const inicioEventoMin = parseMinutes(horaInicioEvento);
        const finEventoMin = parseMinutes(horaFinEvento || "18:00");

        const formatMinutes = (totalMinutes) => {
            const h = Math.floor(totalMinutes / 60);
            const m = totalMinutes % 60;
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        };

        const aplicarReceso = (minutos) => {
            if (sinReceso) return minutos;
            const horaStr = formatMinutes(minutos);
            if (horaStr >= horaInicioReceso && horaStr < horaFinReceso) {
                const [hFin, mFin] = horaFinReceso.split(':').map(Number);
                return hFin * 60 + mFin;
            }
            return minutos;
        };

        for (let i = 0; i < sorted.length; i++) {
            const item = sorted[i];
            
            let minutosCalculados;

            if (i === 0) {
                // La primera regata ancla el horario
                minutosCalculados = getMinutesOfDay(item);
            } else {
                // Empaquetamiento secuencial estricto. Se ignora la hora de la BD para evitar "saltos" por placeholder
                minutosCalculados = cursorMinutos;
            }

            // --- Multi-day Check (Corte de fin de jornada) ---
            if (minutosCalculados >= finEventoMin) {
                currentDiaOffset++;
                minutosCalculados = inicioEventoMin;
                cursorMinutos = inicioEventoMin;
            }

            minutosCalculados = aplicarReceso(minutosCalculados);

            // Regla de Descanso Específica (por si hay muy pocas categorías y el bloque global no alcanza)
            const pruebaId = item.eventoPruebaId || item.raw?.eventoPruebaId || item.raw?.id;
            if (ultimosMinutosPorPrueba[pruebaId]) {
                const infoAnt = ultimosMinutosPorPrueba[pruebaId];
                const etapaActual = item.etapaId || item.raw?.etapaId || item.etapa?.id;
                
                // Solo forzamos descanso si pasaron en el mismo día
                if (etapaActual && infoAnt.etapaId !== etapaActual && infoAnt.diaOffset === currentDiaOffset) {
                    const minTimeRequired = infoAnt.minutos + (gapRecuperacionMs / 60000);
                    if (minutosCalculados < minTimeRequired) {
                        minutosCalculados = Math.floor(minTimeRequired);
                        
                        // Validar salto de día de nuevo por si el descanso forzó superar las 18:00
                        if (minutosCalculados >= finEventoMin) {
                            currentDiaOffset++;
                            minutosCalculados = inicioEventoMin;
                            cursorMinutos = inicioEventoMin;
                        }
                    }
                }
            }

            const displayTime = formatMinutes(minutosCalculados);

            resultados.push({
                ...item,
                nuevaHora: displayTime,
                timeCalculated: displayTime,
                diaOffset: currentDiaOffset
            });

            const gapItem = (item.gapSugerido || 0);
            const gapAplicar = gapItem > 0 ? gapItem : (gapBaseMs / 60000);
            
            cursorMinutos = minutosCalculados + gapAplicar;

            if (pruebaId) {
                ultimosMinutosPorPrueba[pruebaId] = {
                    minutos: minutosCalculados,
                    etapaId: item.etapaId || item.raw?.etapaId || item.etapa?.id,
                    diaOffset: currentDiaOffset
                };
            }
        }

        return resultados;
    }
};

export default SchedulerService;
