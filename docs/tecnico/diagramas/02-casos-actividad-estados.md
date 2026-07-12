# 02 — Casos de uso, actividad y estados (SportTrack-Front)

## 1. Casos de uso

```mermaid
flowchart TB
    SA((SuperAdmin))
    AD((Admin))
    CL((Club))
    LA((Largador))
    CR((Cronometrista))
    JC((JuezControl))
    PU((Público))

    SA --> U1[SaaS federaciones auditoría]
    SA --> U2[Gestión global eventos/clubes]
    SA --> U3[Mensajes a admins]
    AD --> U4[Eventos inscripciones resultados]
    AD --> U5[Mensajes y campañas]
    AD --> U6[Pagos / logins]
    CL --> U7[Atletas eventos pagos del club]
    CL --> U8[Mensajes con admin]
    LA --> U9[Start carrera TimingHub]
    CR --> U10[Cargar tiempos llegada]
    JC --> U11[Panel control live]
    AD --> U12[Carga manual tiempos]
    PU --> U13[Ver LiveResults]
```

---

## 2. Actividad

### Login → redirect por rol

```mermaid
flowchart TD
    A[Login] --> B{Rol}
    B -->|SuperAdmin/Admin| C[/super o /admin]
    B -->|Club| D[/club]
    B -->|Largador| E[/jueces/largador]
    B -->|Cronometrista| F[/jueces/llegada]
    B -->|JuezControl| G[/juez-control]
```

### Flujo carrera (jueces + público)

```mermaid
flowchart TD
    A[JoinRaceGroup] --> B[Largador RequestStartRace]
    B --> C[Broadcast RaceStarted]
    C --> D[Cronometrista SendTime]
    D --> E[Persistir Resultado API]
    E --> F[Público actualiza LiveResults]
```

### Mensaje / campaña SportTrack

```mermaid
flowchart TD
    A[MensajesSection] --> B{Individual o masivo?}
    B -->|1:1| C[POST /mensajes/hilos]
    B -->|masivo| D[POST /mensajes/hilos/masivo]
    C --> E[SistemaOrigen=sporttrack]
    D --> E
    E --> F[Bandeja / comunicados]
```

### Guard de plan SaaS

```mermaid
flowchart TD
    A[Navegar ruta protegida] --> B{ProtectedRoute + PlanGuard}
    B -->|sin plan / feature| C[Bloqueo o redirect]
    B -->|ok| D[Render página]
```

---

## 3. Estados

### Fase (UI jueces)

```mermaid
stateDiagram-v2
    [*] --> Programada
    Programada --> EnCurso: start
    EnCurso --> Finalizada: finish / revisión
```

### Mensaje

```mermaid
stateDiagram-v2
    [*] --> Enviado
    Enviado --> Leido: abrir hilo
    Leido --> Respondido: reply
```

### Sesión jueces (JudgesLayout)

```mermaid
stateDiagram-v2
    [*] --> Activa
    Activa --> Warning: inactividad
    Warning --> Activa: actividad
    Warning --> Logout: timeout
```
