# 05 — Secuencias y red (SportTrack-Front)

## Red / API

```mermaid
flowchart LR
    ST[SportTrack-Front] -->|Bearer + X-Client-App: sporttrack| API
    ST -->|WebSocket| HUB[/hubs/timing]
    SIG[FrontSigdef] -->|X-Client-App: sigdef| API
    API --> DB[(PostgreSQL)]
```

| Cliente | Header | Bandeja mensajes |
|---------|--------|------------------|
| Este repo | `sporttrack` | Solo origen sporttrack |
| FrontSigdef | `sigdef` | Solo origen sigdef |

---

## 1. Login

```mermaid
sequenceDiagram
    participant UI as Login
    participant Auth as AuthService
    participant API as /Auth/login
    UI->>Auth: credentials
    Auth->>API: POST + X-Client-App
    API-->>UI: JWT + rol
    UI->>UI: redirect por rol
```

---

## 2. Start carrera + Live

```mermaid
sequenceDiagram
    participant L as StarterDashboard
    participant Hub as TimingSignalRService
    participant API as TimingHub
    participant P as LiveResults

    L->>Hub: connect + JoinRaceGroup
    P->>Hub: JoinRaceGroup
    L->>Hub: RequestStartRace
    Hub->>API: hub method
    API-->>L: RaceStarted
    API-->>P: RaceStarted
```

---

## 3. Enviar tiempo

```mermaid
sequenceDiagram
    participant C as FinisherDashboard
    participant Hub as TimingHub
    participant Fas as FaseService API
    participant DB as Resultados
    C->>Hub: SendTime
    Hub->>Fas: persist
    Fas->>DB: INSERT/UPDATE
    Hub-->>C: ack / broadcast
```

---

## 4. Mensajería 1:1 / masivo

```mermaid
sequenceDiagram
    participant UI as MensajesSection
    participant MS as MessageService
    participant API as /mensajes/*
    UI->>MS: crearHilo / enviarMasivo
    MS->>API: header sporttrack
    API-->>UI: hilo o campanaId
```

---

## 5. Unread badge sidebar

```mermaid
sequenceDiagram
    participant SB as AdminSidebar
    participant H as useUnreadMessages
    participant API as GET no-leidos/count
    SB->>H: mount
    H->>API: count sporttrack
    API-->>SB: badge
```

---

## 6. Logout corta SignalR

```mermaid
sequenceDiagram
    participant Auth as AuthContext
    participant Tim as TimingSignalRService
    Auth->>Auth: logout()
    Auth->>Tim: disconnect
    Auth->>Auth: clear storage + redirect /login
```

---

## 7. PlanGuard bloquea feature

```mermaid
sequenceDiagram
    participant R as ProtectedRoute
    participant G as PlanGuard
    participant UI as Página
    R->>G: check plan/feature
    alt sin permiso
        G-->>R: bloqueo
    else ok
        G-->>UI: render
    end
```
