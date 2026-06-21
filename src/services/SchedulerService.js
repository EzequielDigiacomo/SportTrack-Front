/**
 * SchedulerService.js
 * Motor de cálculo de cronograma inteligente basado en "Bloques por Categoría" e "Intercalación Activa".
 * Agrupa las series de la misma categoría de manera consecutiva y coloca las semis/finales
 * en los huecos naturales entre categorías respetando una ventana óptima de descanso (40-60 minutos).
 * Adicionalmente, retiene las Finales para que comiencen a partir de una hora preferencial (ej. 10:30 AM).
 */

const SchedulerService = {
    recalcularTiempos: (items, config = {}) => {
        if (!items || items.length === 0) return [];
        
        const {
            gapBaseMs = (config.gapEntrePruebas || 10) * 60 * 1000,
            gapRecuperacionMs = 40 * 60 * 1000,
            horaInicioEvento = "08:00",
            horaFinEvento = "18:00",
            sinReceso = false,
            horaInicioReceso = "13:00",
            horaFinReceso = "14:00",
            horaInicioFinales = config.horaInicioFinales || "10:30", // Hora preferencial para iniciar las finales
            usarGapVariable = config.usarGapVariable || false
        } = config;

        const getMinutesOfDay = (item) => {
            const val = item.fechaHoraProgramada || item.time || item.fechaHoraOriginal || item.prueba?.fechaHora || item.raw?.fechaHora;
            if (!val) return 480;

            const date = new Date(val);
            if (!isNaN(date.getTime())) {
                return date.getHours() * 60 + date.getMinutes();
            }

            const match = String(val).match(/(\d{2}):(\d{2})/);
            if (match) return parseInt(match[1]) * 60 + parseInt(match[2]);
            return 480; // 08:00 default
        };

        const getPruebaId = (item) => {
            return item.eventoPruebaId || item.raw?.eventoPruebaId || item.raw?.id || "unknown";
        };

        const getCatAndSex = (item) => {
            const f = item.raw || item;
            const p = f.etapa?.eventoPrueba?.prueba 
                   || f.prueba?.prueba 
                   || f.prueba 
                   || f.eventoPrueba?.prueba 
                   || f;
            const catId = p?.categoriaId || p?.categoria?.id || p?.categoria;
            const sexId = p?.sexoId || p?.sexo?.id || p?.sexo;
            return { catId, sexId };
        };

        const getEtapaOrden = (item) => {
            return item.etapa?.orden || item.etapaOrden || 1;
        };

        const getNumeroFase = (item) => {
            return item.numeroFase || 0;
        };

        const getISODateStr = (item) => {
            const val = item.time || item.fechaHoraOriginal || item.prueba?.fechaHora || item.raw?.fechaHora || item.raw?.fechaHoraProgramada;
            if (val && String(val).includes('T')) {
                return String(val).split('T')[0];
            }
            return new Date().toISOString().split('T')[0];
        };

        const parseMinutes = (horaStr) => {
            const [h, m] = horaStr.split(':').map(Number);
            return h * 60 + m;
        };
        const inicioEventoMin = parseMinutes(horaInicioEvento);
        const finEventoMin = parseMinutes(horaFinEvento || "18:00");
        const inicioFinalesMin = parseMinutes(horaInicioFinales || "10:30");

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

        // --- 1. AGRUPAR ITEMS POR PRUEBA/CATEGORÍA ---
        const itemsByPrueba = {};
        items.forEach(item => {
            const pId = getPruebaId(item);
            if (!itemsByPrueba[pId]) {
                itemsByPrueba[pId] = [];
            }
            itemsByPrueba[pId].push(item);
        });

        // --- 2. ORDENAR LOS ITEMS INTERNOS DE CADA CATEGORÍA ---
        // Series (etapaOrden 1) -> Semis (etapaOrden 2) -> Finales (etapaOrden 3)
        Object.keys(itemsByPrueba).forEach(pId => {
            itemsByPrueba[pId].sort((a, b) => {
                const orderA = getEtapaOrden(a);
                const orderB = getEtapaOrden(b);
                if (orderA !== orderB) return orderA - orderB;
                return getNumeroFase(a) - getNumeroFase(b);
            });
        });

        // --- 3. PARTIR EN BLOQUES DE ETAPAS POR CATEGORÍA ---
        const categoryBlocks = {};
        Object.keys(itemsByPrueba).forEach(pId => {
            const sortedItems = itemsByPrueba[pId];
            const blocks = [];
            let currentBlock = null;

            sortedItems.forEach(item => {
                const stage = getEtapaOrden(item);
                if (!currentBlock || currentBlock.etapaOrden !== stage) {
                    currentBlock = {
                        id: `${pId}-${stage}`,
                        pruebaId: pId,
                        etapaOrden: stage,
                        items: []
                    };
                    blocks.push(currentBlock);
                }
                currentBlock.items.push(item);
            });

            categoryBlocks[pId] = blocks;
        });

        // --- 4. DETERMINAR EL HORARIO DE INICIO ORIGINAL DE CADA CATEGORÍA ---
        const categoryStartTimes = {};
        Object.keys(itemsByPrueba).forEach(pId => {
            const firstItem = itemsByPrueba[pId][0];
            categoryStartTimes[pId] = getMinutesOfDay(firstItem);
        });

        // Listar las pruebas ordenadas por su hora de inicio original en la base de datos
        const sortedPruebaIds = Object.keys(itemsByPrueba).sort((a, b) => {
            return categoryStartTimes[a] - categoryStartTimes[b];
        });

        // --- 5. BUCLE DE PLANIFICACIÓN INTELIGENTE (GREEDY SCHEDULER) ---
        let cursorMinutos = sortedPruebaIds.length > 0 ? categoryStartTimes[sortedPruebaIds[0]] : inicioEventoMin;
        let currentDiaOffset = 0;
        const resultados = [];
        const lastStageFinishTime = {};
        const lastStageDiaOffset = {};
        const lastCatSexTime = {};
        const lastCatSexDia = {};
        const lastCatSexPruebaId = {};

        while (true) {
            // Obtener el bloque activo actual de cada categoría (el primero de la cola)
            const eligibleBlocks = [];
            sortedPruebaIds.forEach(pId => {
                const blocks = categoryBlocks[pId];
                if (blocks && blocks.length > 0) {
                    eligibleBlocks.push(blocks[0]);
                }
            });

            if (eligibleBlocks.length === 0) {
                break; // No quedan más bloques por programar
            }

            // Clasificar bloques elegibles en listos (ready) o en descanso/retención (not ready)
            const readyBlocks = [];
            const notReadyBlocks = [];

            eligibleBlocks.forEach(block => {
                // Check for category/gender safety gap conflict (minimum 40 minutes rest between different events)
                const { catId, sexId } = getCatAndSex(block.items[0]);
                let hasCatSexConflict = false;
                if (catId && sexId) {
                    const lastFinish = lastCatSexTime[catId]?.[sexId];
                    const lastOffset = lastCatSexDia[catId]?.[sexId];
                    const lastPId = lastCatSexPruebaId[catId]?.[sexId];
                    if (lastFinish !== undefined && lastOffset === currentDiaOffset) {
                        if (lastPId !== block.pruebaId) {
                            const elapsed = cursorMinutos - lastFinish;
                            if (elapsed < 40) {
                                hasCatSexConflict = true;
                            }
                        }
                    }
                }

                if (hasCatSexConflict) {
                    notReadyBlocks.push(block);
                } else if (block.etapaOrden === 1) {
                    // Las Series de eliminación siempre están listas para arrancar según su turno original
                    readyBlocks.push(block);
                } else if (block.etapaOrden === 2) {
                    // Semifinales: Requieren un descanso mínimo respecto al bloque anterior
                    const lastFinish = lastStageFinishTime[block.pruebaId];
                    const lastOffset = lastStageDiaOffset[block.pruebaId];

                    if (lastFinish === undefined || lastOffset !== currentDiaOffset) {
                        readyBlocks.push(block);
                    } else {
                        const elapsed = cursorMinutos - lastFinish;
                        if (elapsed >= (gapRecuperacionMs / 60000)) {
                            readyBlocks.push(block);
                        } else {
                            notReadyBlocks.push(block);
                        }
                    }
                } else if (block.etapaOrden === 3) {
                    // Finales: Requieren haber superado la hora de inicio de finales (ej: 10:30) y descanso suficiente
                    if (cursorMinutos < inicioFinalesMin) {
                        notReadyBlocks.push(block);
                    } else {
                        const lastFinish = lastStageFinishTime[block.pruebaId];
                        const lastOffset = lastStageDiaOffset[block.pruebaId];

                        if (lastFinish === undefined || lastOffset !== currentDiaOffset) {
                            readyBlocks.push(block);
                        } else {
                            const elapsed = cursorMinutos - lastFinish;
                            if (elapsed >= (gapRecuperacionMs / 60000)) {
                                readyBlocks.push(block);
                            } else {
                                notReadyBlocks.push(block);
                            }
                        }
                    }
                }
            });

            let selectedBlock = null;

            if (readyBlocks.length > 0) {
                // PRIORIDAD A: Semifinales listas.
                // Queremos correrlas lo antes posible en los "huecos" de la mañana.
                const readySemis = readyBlocks.filter(b => b.etapaOrden === 2);

                if (readySemis.length > 0) {
                    readySemis.sort((a, b) => {
                        return sortedPruebaIds.indexOf(a.pruebaId) - sortedPruebaIds.indexOf(b.pruebaId);
                    });
                    selectedBlock = readySemis[0];
                } else {
                    // PRIORIDAD B: Si no hay semis listas, ver si hay Finales listas (si ya es horario de finales)
                    const readyFinals = readyBlocks.filter(b => b.etapaOrden === 3);
                    if (readyFinals.length > 0) {
                        readyFinals.sort((a, b) => {
                            return sortedPruebaIds.indexOf(a.pruebaId) - sortedPruebaIds.indexOf(b.pruebaId);
                        });
                        selectedBlock = readyFinals[0];
                    } else {
                        // PRIORIDAD C: Si no hay semis ni finales listas, corremos las Series del bloque de la mañana
                        readyBlocks.sort((a, b) => {
                            return sortedPruebaIds.indexOf(a.pruebaId) - sortedPruebaIds.indexOf(b.pruebaId);
                        });
                        selectedBlock = readyBlocks[0];
                    }
                }
            } else {
                // CASO LÍMITE: No hay ningún bloque listo (solo quedan semis/finales en retención o descanso).
                // Adelantamos el cursorMinutos al momento en que la primera de ellas esté lista.
                let earliestReadyTime = Infinity;
                let bestBlock = null;

                notReadyBlocks.forEach(block => {
                    // 1. Same-prueba recovery gap
                    const lastFinishPrueba = lastStageFinishTime[block.pruebaId];
                    let readyTimePrueba = lastFinishPrueba !== undefined ? lastFinishPrueba + (gapRecuperacionMs / 60000) : cursorMinutos;

                    // 2. Category-sex recovery gap
                    const { catId, sexId } = getCatAndSex(block.items[0]);
                    let readyTimeCatSex = cursorMinutos;
                    if (catId && sexId) {
                        const lastFinishCS = lastCatSexTime[catId]?.[sexId];
                        const lastOffsetCS = lastCatSexDia[catId]?.[sexId];
                        const lastPIdCS = lastCatSexPruebaId[catId]?.[sexId];
                        if (lastFinishCS !== undefined && lastOffsetCS === currentDiaOffset && lastPIdCS !== block.pruebaId) {
                            readyTimeCatSex = lastFinishCS + 40;
                        }
                    }

                    let readyTime = Math.max(readyTimePrueba, readyTimeCatSex);

                    // Si es una final, también debe cumplir la hora de inicio de finales preferencial
                    if (block.etapaOrden === 3) {
                        readyTime = Math.max(readyTime, inicioFinalesMin);
                    }

                    if (readyTime < earliestReadyTime) {
                        earliestReadyTime = readyTime;
                        bestBlock = block;
                    }
                });

                if (bestBlock) {
                    cursorMinutos = Math.floor(earliestReadyTime);
                    selectedBlock = bestBlock;
                } else {
                    break; // Failsafe
                }
            }

            if (!selectedBlock) break;

            // --- 6. PROCESAR Y AGENDAR EL BLOQUE SELECCIONADO ---
            const pId = selectedBlock.pruebaId;
            categoryBlocks[pId].shift(); // Quitar de la cola

            let blockFinishTime = cursorMinutos;

            for (let j = 0; j < selectedBlock.items.length; j++) {
                const item = selectedBlock.items[j];

                // Corte diario de fin de jornada
                if (cursorMinutos >= finEventoMin) {
                    currentDiaOffset++;
                    cursorMinutos = inicioEventoMin;
                }

                cursorMinutos = aplicarReceso(cursorMinutos);

                const displayTime = formatMinutes(cursorMinutos);
                
                const baseDateStr = getISODateStr(item);
                let finalDateStr = baseDateStr;
                if (currentDiaOffset > 0) {
                    const d = new Date(baseDateStr + 'T12:00:00');
                    d.setDate(d.getDate() + currentDiaOffset);
                    finalDateStr = d.toISOString().split('T')[0];
                }
                const timeCalculatedStr = `${finalDateStr}T${displayTime}:00`;

                resultados.push({
                    ...item,
                    nuevaHora: displayTime,
                    timeCalculated: timeCalculatedStr,
                    diaOffset: currentDiaOffset
                });

                const gapItem = usarGapVariable ? (item.gapSugerido || 0) : 0;
                const gapAplicar = gapItem > 0 ? gapItem : (gapBaseMs / 60000);

                blockFinishTime = cursorMinutos; // El inicio de esta regata
                cursorMinutos = cursorMinutos + gapAplicar; // Avanzar cursor para la siguiente
            }

            // Registrar cuándo finalizó esta etapa de la categoría
            lastStageFinishTime[pId] = blockFinishTime;
            lastStageDiaOffset[pId] = currentDiaOffset;

            // Registrar cuándo finalizó esta categoría y sexo (para evitar que otras pruebas se programen demasiado cerca)
            const firstItem = selectedBlock.items[0];
            const { catId, sexId } = getCatAndSex(firstItem);
            if (catId && sexId) {
                if (!lastCatSexTime[catId]) {
                    lastCatSexTime[catId] = {};
                    lastCatSexDia[catId] = {};
                    lastCatSexPruebaId[catId] = {};
                }
                lastCatSexTime[catId][sexId] = blockFinishTime;
                lastCatSexDia[catId][sexId] = currentDiaOffset;
                lastCatSexPruebaId[catId][sexId] = pId;
            }
        }

        return resultados;
    }
};

export default SchedulerService;
