import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import EventoService from '../../../services/EventoService';
import AtletaService from '../../../services/AtletaService';
import InscripcionService from '../../../services/InscripcionService';
import ResultadoService from '../../../services/ResultadoService';
import { PruebaService } from '../../../services/ConfigService';
import { ENDPOINTS } from '../../../utils/constants';
import '../../../components/SharedSections/AdminSections.css';

const SimulacionSection = () => {
    const [eventos, setEventos] = useState([]);
    const [selectedEvento, setSelectedEvento] = useState('');
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState([]);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        loadEventos();
    }, []);

    const loadEventos = async () => {
        try {
            const res = await EventoService.getAll();
            setEventos(res);
        } catch (e) {
            console.error("Error al cargar eventos", e);
        }
    };

    const addLog = (msg) => {
        setLogs(prev => [msg, ...prev].slice(0, 15));
    };

    const runSimulationBaseEntities = async () => {
        setLoading(true);
        setLogs([]);
        setProgress(0);
        addLog("🚀 Generando Entidades Base (Clubes y Atletas)...");

        try {
            // 1. Obtener y Crear/Reutilizar Clubes
            addLog("🏗️ Obteniendo/Creando clubes...");
            const currentClubsRes = await api.get(ENDPOINTS.CLUBES);
            const currentClubs = currentClubsRes.data || [];
            
            const mockClubsTemplate = [
                { nombre: "Náutico El Fuerte", sigla: "NEF", ubicacion: "Tandil" },
                { nombre: "Club San Fernando", sigla: "CSF", ubicacion: "San Fernando" },
                { nombre: "Paraná Rowing Club", sigla: "PRC", ubicacion: "Paraná" },
                { nombre: "Club Regatas La Plata", sigla: "CRLP", ubicacion: "La Plata" }
            ];

            const activeClubs = [...currentClubs];

            for (const tpl of mockClubsTemplate) {
                if (!currentClubs.find(c => c.sigla === tpl.sigla)) {
                    // Genera sufijo aleatorio para evitar conflictos con data vieja si la borraron parcial
                    const suffix = `-${Math.floor(Math.random() * 1000)}`;
                    const res = await api.post(ENDPOINTS.CLUBES, { ...tpl, sigla: tpl.sigla + suffix });
                    activeClubs.push(res.data);
                    addLog(`✅ Nuevo Club creado: ${tpl.nombre}`);
                }
            }
            if(activeClubs.length === 0) throw new Error("No hay clubes disponibles");
            setProgress(30);

            // 2. Crear Atletas Nuevos
            addLog(`👥 Generando lote de atletas aleatorios...`);
            const nombres = ["Juan", "Pedro", "Maria", "Ana", "Lucas", "Marta", "Diego", "Paula", "Facundo", "Elena", "Sofia", "Mateo"];
            const apellidos = ["Garcia", "Rodriguez", "Lopez", "Perez", "Gonzalez", "Martinez", "Sanchez", "Alvarez", "Gomez", "Diaz"];

            for (let i = 0; i < 20; i++) {
                const club = activeClubs[Math.floor(Math.random() * activeClubs.length)];
                const randomId = Math.floor(Math.random() * 10000);
                const atleta = {
                    nombre: nombres[Math.floor(Math.random() * nombres.length)] + `-${randomId}`, // Unico para evitar colisiones
                    apellido: apellidos[Math.floor(Math.random() * apellidos.length)],
                    sexoId: (i % 2) + 1, // Alternar Masculino/Femenino
                    clubId: club.id,
                    fechaNacimiento: `200${Math.floor(Math.random() * 9)}-05-15T00:00:00Z`
                };
                try {
                    await AtletaService.create(atleta);
                    if (i % 5 === 0) addLog(`👤 Atleta creado: ${atleta.nombre} ${atleta.apellido}`);
                } catch(e) {
                     addLog(`⚠️ Saltando atleta duplicado...`);
                }
            }
            setProgress(100);
            addLog("🏁 ¡Entidades Base creadas con éxito!");

        } catch (err) {
            addLog(`❌ Error: ${err.message}`);
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const runSimulationEvento = async () => {
         setLoading(true);
         setLogs([]);
         setProgress(0);
         addLog("📅 Creando Evento y Pruebas Simulado...");

         try {
             // 1. Crear Evento
             const timestamp = new Date().getTime().toString().slice(-4);
             const evt = {
                 nombre: `Regata Oficial Simulación #${timestamp}`,
                 ubicacion: "Pista Nacional de Remo, Tigre",
                 fecha: new Date().toISOString()
             };
             
             let eventoId;
             try {
                const evtRes = await EventoService.create(evt); // Validar Payload Endpoint Create en controller
                eventoId = evtRes.id;
                addLog(`✅ Evento creado: ${evtRes.nombre}`);
             } catch(e) {
                 addLog(`⚠️ Falló creación directa por DTO. Usando mock si evento ya estaba en form`);
                 return;
             }
             setProgress(30);

             // 2. Asignar Pruebas
             addLog(`📋 Generando Pruebas para Evento ${eventoId}...`);
             
             const pruebasTemplate = [
                 { categoriaId: 4, boteId: 1, distanciaId: 1, sexoId: 1 }, // Senior K1 200m Masc
                 { categoriaId: 4, boteId: 1, distanciaId: 2, sexoId: 2 }, // Senior K1 500m Fem
                 { categoriaId: 3, boteId: 2, distanciaId: 1, sexoId: 1 }, // Junior C1 200m Masc
             ];

             for (const pt of pruebasTemplate) {
                 const payload = { ...pt, fechaHora: new Date().toISOString() };
                 await PruebaService.assignToEvento(eventoId, null, payload);
             }

             addLog(`✅ 3 Pruebas asignadas al Evento`);
             setProgress(100);
             addLog("🏁 ¡Evento y Pruebas listos!");
             
             // Recargar select de eventos
             loadEventos();
             setSelectedEvento(eventoId);

         } catch (err) {
            addLog(`❌ Error Eventos: ${err.message}`);
         } finally {
             setLoading(false);
         }
    };

    const runSimulationInscripciones = async () => {
        if (!selectedEvento) {
            alert("Seleccioná un evento primero");
            return;
        }

        setLoading(true);
        setLogs([]);
        setProgress(0);
        addLog(`🏃‍♂️ Inscribiendo atletas en Evento ${selectedEvento}...`);

        try {
            // 1. Obtener todas las pruebas del evento
            const pruebas = await PruebaService.getByEvento(selectedEvento);
            if (pruebas.length === 0) {
                 addLog("❌ El evento no tiene pruebas asignadas. Creá atletas/pruebas primero.");
                 setLoading(false);
                 return;
            }
            
            // 2. Obtener Atletas Disponibles (idealmente del DB, por simplicidad obtenemos todos)
            const clubsRes = await api.get(ENDPOINTS.CLUBES);
            let todosLosAtletas = [];
            
            // Iterar por algunos clubes para obtener atletas (workaround a no tener GetTodos endpoint paginado)
            for(const c of clubsRes.data.slice(0,5)) {
                try {
                     const acts = await api.get(ENDPOINTS.PARTICIPANTES.BY_CLUB(c.id));
                     todosLosAtletas = [...todosLosAtletas, ...acts.data];
                } catch(e) {}
            }

            if(todosLosAtletas.length === 0) {
                 addLog("❌ No hay atletas en la DB. Creá Entidades Base primero.");
                 setLoading(false);
                 return;
            }
            setProgress(30);

            // 3. Inscribir aleatorios
            addLog("✍️ Asignando inscripciones y sorteando resultados...");
            const createdInscripciones = [];
            
            for (const ep of pruebas) {
                // Obtener inscriptos actuales para no duplicar
                let existentes = [];
                try {
                    const resExistentes = await api.get(ENDPOINTS.INSCRIPCIONES.BY_EVENTO_PRUEBA(ep.id));
                    existentes = Array.isArray(resExistentes.data) ? resExistentes.data : [];
                } catch(e) {
                    console.warn(`No se pudieron cargar existentes para prueba ${ep.id}`, e);
                }

                // Filtramos atletas: primero intentamos por sexo exacto o mixto e ignoramos ya inscriptos
                // Soportamos tanto 'participanteId' como 'ParticipanteId' por las dudas
                let atletasValidos = todosLosAtletas.filter(a => 
                    (ep.prueba?.sexoId === 3 || a.sexoId === ep.prueba?.sexoId) &&
                    !existentes.some(ins => (ins.participanteId || ins.ParticipanteId) === a.id)
                );
                
                // Si no hay válidos por sexo, probamos cualquier atleta no inscripto
                if (atletasValidos.length === 0) {
                    atletasValidos = todosLosAtletas.filter(a => !existentes.some(ins => (ins.participanteId || ins.ParticipanteId) === a.id));
                }
                
                // Inscribir hasta completar 5
                const cupoExistente = existentes.length;
                const cupoNecesario = Math.max(0, 5 - cupoExistente);
                const aInscribir = atletasValidos.slice(0, cupoNecesario);

                for (let i = 0; i < aInscribir.length; i++) {
                    const atleta = aInscribir[i];
                    const numComp = `E${ep.id}A${atleta.id}-${Math.floor(Math.random() * 999)}`.slice(0, 20);
                    const insc = {
                        eventoPruebaId: ep.id,
                        participanteId: atleta.id,
                        carril: cupoExistente + i + 1,
                        numeroCompetidor: numComp
                    };
                    try {
                        const res = await InscripcionService.create(insc);
                        createdInscripciones.push(res);
                    } catch(e) {
                        console.error("Error al crear inscripcion simulada", e);
                    }
                }
                addLog(`📝 ${cupoExistente + aInscribir.length} Inscriptos totales en Prueba #${ep.id}`);
            }
            setProgress(70);

            // 4. Generar Resultados Live (para todos los inscriptos, no solo los nuevos)
            addLog("⏱️ Finalizando Regatas y asignando tiempos oficiales...");
            
            // Obtenemos todos los inscriptos finales para estar seguros
            let todasLasInscripciones = [];
            for (const ep of pruebas) {
                try {
                    const resIns = await api.get(`/inscripciones/evento-prueba/${ep.id}`);
                    todasLasInscripciones = [...todasLasInscripciones, ...resIns.data];
                } catch(e) {}
            }

            for (const insc of todasLasInscripciones) {
                const segsTotal = 90 + Math.random() * 200;
                const mins = Math.floor(segsTotal / 60);
                const secs = Math.floor(segsTotal % 60);
                const ms = Math.floor(Math.random() * 999);
                
                // Formato .NET TimeSpan: [hh:]mm:ss[.fffffff]
                // Aseguramos 3 dígitos para ms
                const tiempo = `00:${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}.${ms.toString().padStart(3,'0')}`;
                
                const resData = {
                    inscripcionId: insc.id || insc.Id,
                    tiempoOficial: tiempo,
                    posicion: Math.floor(Math.random() * 10) + 1
                };
                try {
                    await ResultadoService.upsert(resData);
                } catch(e) {
                     console.error("Error upserting result for insc:", insc.id || insc.Id, e.response?.data || e.message);
                     addLog(`⚠️ Falló guardado de resultado para competidor ${insc.id || insc.Id}`);
                }
            }
            setProgress(100);
            addLog("🏁 ¡Inscripciones y Resultados simulados con éxito!");

        } catch (err) {
            addLog(`❌ Error: ${err.message}`);
            console.error(err);
        } finally {
            setLoading(false);
        }
    };


    const deleteDatabaseData = async () => {
         if(!window.confirm("⚠️ ATENCIÓN: ¿Estás seguro de que querés borrar TODA la base de datos (Atletas, Clubes, Eventos)? Esto no se puede deshacer.")) return;
         
         setLoading(true);
         setLogs([]);
         addLog("🧹 Iniciando purga de la base de datos...");
         
         try {
             // Este es un endpoint destructivo de prueba, idealmente haríamos un endpoint específico para vaciar, 
             // o iterar sobre GetAll y borrar 1 por 1..
             
             // Iteramos sobre eventos
             const evts = await EventoService.getAll();
             for(let e of evts) {
                  try { await EventoService.delete(e.id); addLog(`🗑️ Evento borrado #${e.id}`); } catch(ex){}
             }

             // Por constraints, borrar clubes borra atletas. Necesitamos un endpoint para clubes.
             // As placeholder, avisaremos
             addLog("⏳ Purga de Eventos completa. (Nota: Para borrar atletas y clubes masivamente se requiere un SP en Backend)");
             
         } catch(e) {
             addLog(`❌ Error borrando: ${e.message}`);
         } finally {
             setLoading(false);
         }
    };


    return (
        <div className="admin-section fade-in">
            <div className="admin-section-header">
                <div>
                    <h2>Simulación Avanzada de Datos</h2>
                    <p className="section-desc">Herramientas para poblar la DB segmentadamente y probar el cronometraje en vivo.</p>
                </div>
            </div>

            <div className="simulacion-card glass-effect" style={{display: 'flex', flexDirection: 'column', gap: '2rem'}}>
                
                {/* Herramientas de Base de Datos */}
                <div className="simulacion-controls" style={{flexDirection: 'row', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem'}}>
                    <div style={{flex: '1 1 100%'}}><h3>Paso 1: Configurar Base</h3></div>
                    <button className="btn-admin-primary" onClick={runSimulationBaseEntities} disabled={loading}>
                        👥 1. Cargar Clubes y Atletas
                    </button>
                    <button className="btn-admin-primary" onClick={runSimulationEvento} disabled={loading}>
                        🏟️ 2. Crear Evento Simulado
                    </button>
                    <button className="btn-admin-danger" onClick={deleteDatabaseData} disabled={loading} style={{marginLeft: 'auto'}}>
                        🗑️ Vaciar Eventos DB
                    </button>
                </div>

                {/* Ejecucion de Regatas */}
                <div className="simulacion-controls" style={{flexDirection: 'row', flexWrap: 'wrap', gap: '1rem'}}>
                     <div style={{flex: '1 1 100%'}}><h3>Paso 2: Inscribir y Correr Regata</h3></div>
                    <div className="form-field" style={{flex: '1'}}>
                        <select value={selectedEvento} onChange={e => setSelectedEvento(e.target.value)} disabled={loading}>
                            <option value="">-- Primero seleccioná un Evento --</option>
                            {eventos.map(ev => (
                                <option key={ev.id} value={ev.id}>{ev.nombre}</option>
                            ))}
                        </select>
                    </div>

                    <button 
                        className="btn-admin-primary btn-huge" 
                        onClick={runSimulationInscripciones}
                        disabled={loading || !selectedEvento}
                        style={{flex: '1', backgroundColor: 'var(--color-primary)'}}
                    >
                        {loading ? 'Procesando...' : '🏁 3. Inscribir y Simular Tiempos'}
                    </button>
                </div>

                {loading && (
                    <div className="sim-progress-bar">
                        <div className="sim-progress-fill" style={{ width: `${progress}%` }}></div>
                    </div>
                )}

                <div className="sim-console">
                    <h4>Terminal de Logs</h4>
                    <div className="console-lines">
                        {logs.map((log, i) => <div key={i} className="console-line">{log}</div>)}
                        {logs.length === 0 && <div className="console-line empty">Esperando comando de simulación...</div>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SimulacionSection;
