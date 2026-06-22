/**
 * ProgressionEngine.js
 * Parses the event phases and results to build a factual trace of each athlete's journey.
 */
export const buildFactualProgression = (inscriptos, fases) => {
    // 1. Initialize a map for every athlete
    const traceMap = {};
    
    inscriptos.forEach(ins => {
        const fullName = ins.tripulantes && ins.tripulantes.length > 0
            ? [ins.participanteNombreCompleto, ...ins.tripulantes.map(t => t.participanteNombreCompleto)].join(' - ')
            : (ins.participanteNombreCompleto || "Bote de Equipo");
            
        traceMap[ins.id] = {
            atleta: fullName,
            club: ins.clubNombre || ins.clubSigla || 'Independiente',
            eliminatoria: 'Pendiente',
            semifinal: '—',
            final: '—',
            // Default plan logic will just read the plan assigned to the eventoPrueba
        };
    });

    // 2. Iterate through all phases and results
    (fases || []).forEach(fase => {
        const isHeat = fase.etapaNombre === 'Eliminatorias' || fase.nombreFase.toLowerCase().includes('heat');
        const isSemi = fase.etapaNombre === 'Semifinales' || fase.nombreFase.toLowerCase().includes('semi');
        const isFinal = fase.etapaNombre === 'Finales' || fase.nombreFase.toLowerCase().includes('final');

        (fase.resultados || []).forEach(res => {
            const insId = res.inscripcionId;
            if (!traceMap[insId]) return;

            const positionText = res.posicion ? `${res.posicion}º` : '';
            const statusText = res.estadoCanto && res.estadoCanto !== 'OK' ? `*(${res.estadoCanto})*` : '';
            const laneText = res.carril ? `L${res.carril}` : '';
            
            let details = '';
            if (positionText || laneText) {
                if (positionText) {
                    details = `(${positionText} 👉 ${laneText})`;
                } else {
                    details = `(${laneText})`;
                }
            }
            if (statusText) {
                details += ` ${statusText}`;
            }

            const label = `${fase.nombreFase} ${details}`.trim();

            if (isHeat) {
                traceMap[insId].eliminatoria = label;
            } else if (isSemi) {
                traceMap[insId].semifinal = label;
            } else if (isFinal) {
                traceMap[insId].final = label;
            }
        });
    });

    return Object.values(traceMap);
};
