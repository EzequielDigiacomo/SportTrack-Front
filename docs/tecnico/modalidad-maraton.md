# Técnico — Modalidad Maratón

Documentación de implementación frontend de la modalidad **Maratón**: detección, schedule, Start List, resultados, APIs y mapa de archivos.

Guía de usuario: [../guias-usuario/modalidad-maraton.md](../guias-usuario/modalidad-maraton.md).

---

## Índice

1. [Detección de modalidad](#1-detección-de-modalidad)
2. [Modelo de datos (frontend)](#2-modelo-de-datos-frontend)
3. [Arquitectura de UI](#3-arquitectura-de-ui)
4. [Flujos principales](#4-flujos-principales)
5. [APIs y fallbacks](#5-apis-y-fallbacks)
6. [Mapa de archivos](#6-mapa-de-archivos)
7. [Permisos en código](#7-permisos-en-código)
8. [Notas y deuda conocida](#8-notas-y-deuda-conocida)

---

## 1. Detección de modalidad

Utilidades en `src/utils/pruebaLabelUtils.js`:

| Función | Comportamiento |
|---------|----------------|
| `isModalidadMaraton(modalidad)` | Normaliza acentos/caso; true si es `maraton`. |
| `resolveIsMaratonEvent(evento)` | 1) `evento.modalidad === Maraton`; 2) fallback legacy: todas las `distanciasHabilitadas` ≥ **1000 m**. |

Constantes relevantes:

- `MARATON_MIN_METROS = 1000`
- Categorías Maratón: desde Cadete (id ≥ 4)
- Velocidad: distancias hasta 6000 m inclusive

El payload de evento persiste `modalidad: 'Maraton' | 'Velocidad'`.

---

## 2. Modelo de datos (frontend)

### Largada / GrupoLargada

Varios `EventoPrueba` comparten:

- Misma `fechaHora`
- Misma distancia
- Mismo `grupoLargadaId` (UUID; o id sintético `synth:hora|distancia` al colapsar datos viejos)

Helpers: `src/utils/maratonScheduleUtils.js`

- `getEpGrupoId`, `collapseMaratonLargadas`, `buildMaratonProgramaRows`, fechas ISO, miembros del grupo.

### Clasificación

Clave: `categoriaId|sexoId|boteId` (`getClasificacionKeyFromEventoPrueba`).

Tras la carrera, una fase compartida se parte en grillas por esa clave (`groupMaratonResultadosByClasificacion`).

### Número de competidor ↔ carril

- Start List: `inscripcion.numeroCompetidor` (1…N).
- Cronometraje / resultados: el campo **carril** del resultado se sincroniza con el dorsal.
- Regenerar números también resincroniza carriles en resultados asociados.

---

## 3. Arquitectura de UI

```
EventForm / GestionEventosSection
        │  modalidad Maraton
        ▼
ConfigurarPruebasModal  ──resolveIsMaratonEvent──►  ConfigurarMaratonModal
                                                    ├─ MaratonLargadaForm
                                                    └─ MaratonProgramaList

GestionResultadosSection
        │  isMaratonEvent
        ├─ ResultadosHeader (selector Largada, sin Regata)
        ├─ MaratonStartListPanel          (tab startList)
        └─ MaratonResultadosGrids         (tab resultados)
              └─ ResultadosTable × N clasificaciones

LiveResults / FinisherDashboard
        └─ reutilizan fase; pad admite dorsales > 9
```

### Router de schedule

`ConfigurarPruebasModal.jsx` delega:

- Maratón → `ConfigurarMaratonModal`
- Velocidad → flujo con gaps / pateo / `SchedulerService`

### Header de resultados

`ResultadosHeader.jsx`:

- Si `isMaraton`: label **Largada**, opciones vía `buildMaratonLargadaOptions`, sin selector de regata.
- Si no: **Prueba / Categoría** + **Regata específica**.
- El selector de Largada/Prueba **no** está gated por Admin (Admin y JuezControl lo necesitan).

---

## 4. Flujos principales

### Configurar largada

1. UI arma selección multi de cat × bote × sexo + distancia + fechaHora.
2. `PruebaService.assignLargada` (o fallback cartesiano asignando el mismo `grupoLargadaId`).
3. Programa provisorio: `collapseMaratonLargadas` + PDF `PdfExportService.exportProgramaMaraton`.

### Start List

1. `buildMaratonLargadaOptions(pruebas)` → selector.
2. `loadMaratonLargadaInscriptos(pruebas, selectedPruebaId)` carga inscritos de **todos** los EP del grupo.
3. Admin: shuffle de `numeroCompetidor` + `FaseService.generarLargadaMaraton` + sync carril↔Nº.

### Resultados

1. Fase única de la largada (filtro interno por fases de la prueba seleccionada / grupo).
2. `MaratonResultadosGrids` agrupa por clasificación.
3. Mapa opcional `inscripcionId → eventoPruebaId` si la API aún no manda `eventoPruebaId` en cada resultado.

---

## 5. APIs y fallbacks

| Operación | Preferida | Fallback |
|-----------|-----------|----------|
| Crear/actualizar largada | `POST .../pruebas/largada` (`assignLargada`) | POST por cada EP del producto cartesiano con mismo `grupoLargadaId` |
| Generar fase | `POST .../fases/GenerarLargadaMaraton` | `GenerarManual` / flujo por EP si 404 |
| Inscriptos | `InscripcionService.getByEventoPrueba` por cada miembro | Lista vacía por miembro fallido (`catch`) |

Constantes de ruta: `src/utils/constants.js` (`GENERAR_LARGADA_MARATON`, etc.).

> Soporte: si el backend aún no expone el endpoint de largada/fase Maratón, el frontend intenta degradar; conviene verificar logs de red ante fallos de schedule o sorteo.

---

## 6. Mapa de archivos

| Área | Path |
|------|------|
| UI Maratón | `src/components/SharedSections/maraton/` |
| Configurar Maratón | `.../maraton/ConfigurarMaratonModal.jsx` |
| Form largada | `.../maraton/MaratonLargadaForm.jsx` |
| Programa | `.../maraton/MaratonProgramaList.jsx` |
| Start List | `.../maraton/MaratonStartListPanel.jsx` |
| Resultados | `.../maraton/MaratonResultadosGrids.jsx` |
| Utils Start List | `.../maraton/maratonStartListUtils.js` |
| Utils schedule | `src/utils/maratonScheduleUtils.js` |
| Labels / detección | `src/utils/pruebaLabelUtils.js` |
| Panel resultados | `src/components/SharedSections/GestionResultadosSection.jsx` |
| Header | `src/components/SharedSections/ResultadosHeader.jsx` |
| Router pruebas | `src/components/SharedSections/ConfigurarPruebasModal.jsx` |
| Evento | `EventForm.jsx`, `GestionEventosSection.jsx` |
| Servicios | `ConfigService.js`, `FaseService.js`, `PdfExportService.js` |
| Juez Control | `src/pages/JuezControl/JuezControlDashboard.jsx` |
| Live | `src/pages/Home/LiveResults.jsx` |
| Cronometrista | `src/pages/Judges/FinisherDashboard.jsx` |

---

## 7. Permisos en código

| Capacidad | Condición típica |
|-----------|------------------|
| Ver selector Largada/Prueba | Siempre en `ResultadosHeader` (si hay evento) |
| Sortear / editar nómina Maratón | `isAdmin` estricto en `MaratonStartListPanel` |
| Editar tiempos en resultados | `canEditResults` = Admin **o** JuezControl **o** `viewMode` resultados/tiempos |
| Oficializar | Admin o `viewMode` resultados/tiempos (Juez Control usa `viewMode="resultados"`) |
| Carga manual | Solo Admin / SuperAdmin |

`JuezControlDashboard` embebe `GestionResultadosSection` con acceso al panel; no incluye configuración de evento ni schedule.

---

## 8. Notas y deuda conocida

1. **Homónimo “largada”:** programa Maratón vs botón del Largador — documentar siempre el contexto.
2. **Copy de dashboard** de eventos a veces habla de “series/carriles” también en Maratón.
3. **Menús PDF Live** pueden ofrecer Series/Semis/Finales (lenguaje de pista) en eventos Maratón.
4. **Promoción ICF** no aplica; el botón puede ocultarse o no tener sentido según estado de fases.
5. **Fallback de API:** comportamiento depende de versión de backend; probar en staging ante 404.
6. **Detección legacy** por distancias ≥ 1000 m puede clasificar mal eventos mixtos antiguos sin `modalidad`.

---

## Relación con otros docs

| Doc | Contenido |
|-----|-----------|
| [guias-usuario/modalidad-maraton.md](../guias-usuario/modalidad-maraton.md) | Manual operativo Maratón |
| [guias-usuario/modulos-control-competencia.md](../guias-usuario/modulos-control-competencia.md) | Consolas de jueces (pista + notas Maratón) |
| [CONTROL_ACCESO_PLAN.md](./CONTROL_ACCESO_PLAN.md) | Plan L / rutas de jueces |
| [contexto-proyecto.md](./contexto-proyecto.md) | Roles y rutas generales |
