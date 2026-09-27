# 03 — Diagramas de Flujo

**Proyecto:** SportTrack — Frontend de Competencias
**Última actualización: 2026-09-27**
**Notación:** Mermaid (`flowchart`, `stateDiagram-v2`, `sequenceDiagram`)

---

## Índice

1. [Introducción](#1-introducción)
2. [(a) Alta/edición de evento y configuración de pruebas](#a-altaedición-de-evento-y-configuración-de-pruebas)
3. [(b) Siembra/sorteo y generación de fases](#b-siembrasorteo-y-generación-de-fases)
4. [(c) Progresión ICF](#c-progresión-icf)
5. [(d) Ciclo de vida de una regata](#d-ciclo-de-vida-de-una-regata)
6. [(e) Cronometraje con resiliencia offline](#e-cronometraje-con-resiliencia-offline)
7. [(f) Autenticación/autorización por rol y plan](#f-autenticaciónautorización-por-rol-y-plan)
8. [(g) Flujo maratón](#g-flujo-maratón)
9. [(h) Auditoría de incidencias/errores](#h-auditoría-de-incidenciaserrores)
10. [Pie del pack](#pie-del-pack)

---

## 1. Introducción

Este documento presenta los flujos operativos y técnicos principales del frontend SportTrack mediante diagramas Mermaid reproducibles. Cada diagrama se vincula con los requerimientos ([doc 01](./01-Requerimientos-Usuario.md)) y los casos de uso ([doc 02](./02-Casos-de-Uso.md)).

> Los diagramas son **válidos** para el renderizador Mermaid de GitHub/VSCode. Para copiarlos, usá el bloque completo incluido el encabezado del tipo de diagrama.

---

## (a) Alta/edición de evento y configuración de pruebas

> **RF:** RF-01…RF-06 · **CU:** CU-02

```mermaid
flowchart TD
    A([Admin abre Eventos]) --> B{Nuevo o existente?}
    B -->|Nuevo| C[Completar EventForm]
    B -->|Existente| D[Abrir evento]
    C --> E[POST /eventos]
    D --> F[Editar campos / fecha]
    F --> G[PUT /eventos/:id]
    E --> H[Evento en grilla GestionEventosSection]
    G --> H
    H --> I{Abrir ConfigurarPruebasModal}
    I --> J[Agregar pruebas: categoria + bote + distancia + sexo]
    J --> K{Permite multiples categorias?}
    K -->|Si| J
    K -->|No| L[Persistir pruebas]
    L --> M[SchedulerService arma cronograma]
    M --> N[Ajustar horarios]
    N --> O[FaseService.batchUpdate -> /fases/BatchUpdate]
    O --> P{Evento todo manual?}
    P -->|Si| Q[Deshabilitar consolas de juez / habilitar carga manual]
    P -->|No| R[Consolas de juez habilitadas con requiereControlesLive]
    Q --> S([Evento listo])
    R --> S
```

**Notas.** La edición de la fecha del evento recalcula el cronograma. La carga de imágenes depende del flag `permitirCargaImagenes` del plan.

---

## (b) Siembra/sorteo y generación de fases

> **RF:** RF-12, RF-13, RF-14 · **CU:** CU-04

```mermaid
flowchart TD
    A([EventoPrueba con inscripciones]) --> B{Tipo de generacion}
    B -->|Automatica| C[FaseService.generar -> POST /fases/Generar/:id]
    B -->|Manual| D[handleGenerarManual -> POST /fases/GenerarManual/:id]
    C --> E[ProgressionEngine reparte atletas]
    D --> E
    E --> F[Sorteo de carriles por serie]
    F --> G[Crear etapas: Eliminatorias / Semifinales / Finales]
    G --> H[FaseCard renderiza fases]
    H --> I[Cronograma actualizado]
    I --> J{Revisar?}
    J -->|Editar| K[batchUpdate / updateDetails]
    J -->|Eliminar| L[DELETE /fases/:id]
    J -->|Auditar| M[GET /fases/ProgresionAudit/:id]
    K --> N([Fases listas para largar])
    L --> N
    M --> N
```

---

## (c) Progresión ICF

> **RF:** RF-15, RF-19 · **CU:** CU-05 · Reglamento ICF de canotaje sprint.

```mermaid
flowchart TD
    A([Etapa finalizada con resultados]) --> B{Todos los tiempos cargados?}
    B -->|No| X[Bloquear: faltan resultados]
    B -->|Si| C[FaseService.promover -> POST /fases/Promover/:id]
    C --> D[Backend aplica regla ICF]
    D --> E{Como clasifica?}
    E -->|Por serie| F[Primeros N de cada serie]
    E -->|Mejores tiempos| G[Best losers / repesca]
    E -->|Empate en el corte| H[Criterio de desempate ICF]
    F --> I[Asignar clasificados a etapa siguiente]
    G --> I
    H --> I
    I --> J[No clasificados quedan fuera de la progresion]
    J --> K[Registro en auditoria de progresion]
    K --> L([Etapa siguiente sembrada])
    X --> M([Operador completa resultados])
```

**Notas.** La progresión se ejecuta en el backend; el frontend solo la dispara y muestra el resultado y su auditoría.

---

## (d) Ciclo de vida de una regata

> **RF:** RF-20, RF-21, RF-22, RF-27 · **CU:** CU-06, CU-07, CU-08

```mermaid
stateDiagram-v2
    [*] --> Programada
    Programada --> Sembrada : sorteo de carriles
    Sembrada --> Lista : cronograma confirmado
    Lista --> EnCurso : Largada (t0 sincronizado)
    EnCurso --> EnRevision : tiempos completos / EnviarARevision
    EnCurso --> Reiniciada : RequestResetRace
    EnRevision --> Oficial : Oficializar resultados
    EnRevision --> EnCurso : Correccion de tiempos
    Reiniciada --> Lista : Nueva largada
    EnCurso --> EnCurso : TimeReceived / LapRecorded
    Oficial --> [*]
    Programada --> Cancelada : Suspension
    Cancelada --> [*]

    note right of EnCurso
      Eventos SignalR: RaceStarted,
      TimeReceived, LapRecorded
    end note
    note right of Oficial
      globalRaceOfficialized
      -> pizarra publica
    end note
```

---

## (e) Cronometraje con resiliencia offline

> **RF:** RF-25, RF-28, RF-29, RF-30, RF-31, RF-32 · **CU:** CU-06, CU-07, CU-10

```mermaid
sequenceDiagram
    autonumber
    participant LAR as Largador
    participant FIN as Finalizador
    participant HUB as SignalR /hubs/timing
    participant API as API REST
    participant Q as Cola local
    participant OUT as Outbox servidor
    participant SOP as Soporte

    LAR->>HUB: GetServerTime (x5 muestras)
    HUB-->>LAR: serverTime
    Note over LAR: serverOffset calculado, getSyncedNow()
    LAR->>HUB: RequestStartRace(faseId, t0)
    alt SignalR OK
        HUB-->>FIN: RaceStarted(t0)
        Note over FIN: playRaceStartBell()
    else SignalR cae
        LAR->>API: POST /fases/:id/Iniciar?startTime=t0
        alt HTTP OK
            API-->>FIN: estado actualizado
        else HTTP cae
            LAR->>Q: savePendingRaceStart(t0)
            Note over Q: reintento cada 4s, el t0 NO se regenera
        end
    end

    loop Por cada carril
        FIN->>HUB: SendTime(faseId, resultadoId, tiempo, ms)
        alt Online
            HUB-->>FIN: TimeReceived
        else Offline
            FIN->>Q: timingSubmitQueue (localStorage)
            Note over FIN: respaldo PDF (timingBackupService, TTL 24h)
        end
    end

    FIN->>API: enviarARevision / ResultadoService
    Note over API: RaceInReview
    FIN->>OUT: tiempos no confirmados (upsert)
    SOP->>API: GET /support/timing-outbox
    SOP->>API: POST /support/timing-outbox/:faseId/commit
    API-->>SOP: tiempos consolidados
```

**Notas.** El outbox del servidor (`/timing-outbox/*`) y la consola de Soporte permiten recuperar capturas que no llegaron a tiempo. La cola local (`sporttrack_pending_timing_saves`) y el respaldo PDF cubren el caso extremo de corte prolongado.

---

## (f) Autenticación/autorización por rol y plan

> **RF:** RF-45, RF-57, RF-58 · **RNF:** RNF-12, RNF-13 · **CU:** CU-01, CU-12

```mermaid
flowchart TD
    A([Usuario en /login]) --> B[POST /auth/login]
    B --> C{Credenciales OK?}
    C -->|No| Z1[Mostrar error 401]
    C -->|Si| D[Guardar token + user + plan en localStorage]
    D --> E[normalizeAuthUser / normalizePlan]
    E --> F[getDashboardPathForRole]
    F --> G{Ruta destino}
    G --> H[ProtectedRoute]
    H --> I{Autenticado?}
    I -->|No| Z2[Redirect /login]
    I -->|Si| J{Es SuperAdmin o soporte_tecnico?}
    J -->|Si| K[Omitir restricciones de plan]
    J -->|No| L{canAccessSportTrack plan?}
    L -->|No| Z3[PlanGuard: plan no compatible]
    L -->|Si| M{requiereControlesLive?}
    M -->|Si| N{accesoControlesLive?}
    N -->|No| Z4[PlanGuard: Funcion exclusiva del Ecosistema]
    N -->|Si| O{requiredRole incluye rol del usuario?}
    M -->|No| O
    O -->|No| Z5[Redirect /]
    O -->|Si| P[Renderizar panel por rol]
    K --> P
    P --> Q[AuthContext valida GET /auth/me]
    Q --> R{401?}
    R -->|Si| S[Limpiar localStorage -> /login]
    R -->|No| T([Sesion activa])
```

---

## (g) Flujo maratón

> **RF:** RF-37…RF-40 · **CU:** CU-11

```mermaid
flowchart TD
    A([Evento marcado como maraton]) --> B[Abrir ConfigurarMaratonModal]
    B --> C[Definir grupos y EventoPrueba participantes]
    C --> D{Inscriptos del grupo?}
    D -->|No| X[Bloquear: sin inscriptos]
    D -->|Si| E[FaseService.generarLargadaMaraton]
    E --> F[POST /fases/GenerarLargadaMaraton]
    F --> G[Fase Largada unica con todos los inscriptos]
    G --> H[maratonScheduleUtils calcula horarios]
    H --> I[maratonStartListUtils arma start list]
    I --> J[MaratonProgramaList muestra programa]
    J --> K{Operacion}
    K -->|Exportar| L[exportProgramaMaraton / exportMaratonLargadaStartList]
    K -->|Largar| M[Largada masiva por grupo]
    K -->|Resultados| N[groupMaratonResultadosByClasificacion]
    L --> O([Programa/start list entregado])
    M --> O
    N --> O
    X --> P([Operador inscribe atletas])
```

---

## (h) Auditoría de incidencias/errores

> **RF:** RF-46…RF-49 · **CU:** CU-12 · **RNF:** RNF-15, RNF-21

```mermaid
flowchart TD
    A([Ocurre error o accion de auditoria]) --> B{Es accion de cliente?}
    B -->|Si| C[auditActionTracker / auditActionQueue]
    B -->|No| D[Interceptor api.js captura error]
    C --> E{Hay conexion?}
    D --> E
    E -->|Si| F[POST /Auditoria/client-action o envio directo]
    E -->|No| G[Encolar en localStorage: sporttrack_pending_audit_actions]
    G --> H[Reintento al recuperar conexion]
    H --> F
    F --> I[AuditoriaService]
    I --> J[SoporteSection: pestaña de logs]
    I --> K[ActividadPorEventoPage: GET /Auditoria/por-eventos]
    J --> L{Accion de soporte}
    L -->|Marcar sin problemas| M[POST /Auditoria/por-evento/:id/sin-problemas]
    L -->|Limpiar logs| N[DELETE /support/logs/clear]
    M --> O([Evento marcado OK])
    N --> O
    K --> O
```

---

## Pie del pack

| Documento anterior | Documento actual | Documento siguiente |
|--------------------|------------------|---------------------|
| [← 02 Casos de Uso](./02-Casos-de-Uso.md) | **03 — Diagramas de Flujo** | [04 — Manual de Usuario →](./04-Manual-de-Usuario.md) |

[README](./README.md) · [01](./01-Requerimientos-Usuario.md) · [02](./02-Casos-de-Uso.md) · [03](./03-Diagramas-de-Flujo.md) · [04](./04-Manual-de-Usuario.md) · [05](./05-Manual-Tecnico.md) · [06](./06-Manual-Instalacion-Despliegue.md)
