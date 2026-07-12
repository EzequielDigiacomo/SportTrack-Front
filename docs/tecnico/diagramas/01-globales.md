# 01 — Globales (SportTrack-Front)

## 1. Contexto

```mermaid
flowchart TB
    subgraph Actores
        SA[SuperAdmin]
        AD[Admin Federación]
        CL[Club]
        LA[Largador]
        CR[Cronometrista]
        JC[JuezControl]
        PU[Público Live]
    end

    subgraph EsteRepo["SportTrack-Front"]
        APP[SPA React]
    end

    subgraph Fuera
        API[SportTrack-Sigdef API]
        PG[(PostgreSQL)]
        SIG[FrontSigdef<br/>otro producto]
    end

    SA --> APP
    AD --> APP
    CL --> APP
    LA --> APP
    CR --> APP
    JC --> APP
    PU --> APP
    APP -->|REST + JWT<br/>X-Client-App: sporttrack| API
    APP -->|SignalR /hubs/timing| API
    API --> PG
    SIG -.->|misma API, origen sigdef| API
```

---

## 2. Contenedores

```mermaid
flowchart LR
    FE[SportTrack-Front<br/>Vite + React]
    API[API .NET 8]
    HUB[TimingHub]
    DB[(PostgreSQL)]

    FE -->|axios api.js| API
    FE -->|TimingSignalRService| HUB
    HUB --> API
    API --> DB
```

---

## 3. Capas (este front)

```mermaid
flowchart TB
    P[Pages: Home ClubAdmin Super Judges JuezControl Shared]
    L[Layouts: MainLayout JudgesLayout AdminSidebar Navbar]
    C[Contexts: Auth Theme Toast]
    H[Hooks: useUnreadMessages useAlert]
    S[Services: Evento Fase Timing Message Auth…]
    A[api.js CLIENT_APP=sporttrack]

    P --> L
    P --> C
    P --> H
    P --> S
    H --> S
    S --> A
    A -->|HTTPS| API[Backend]
```

---

## 4. Despliegue

```mermaid
flowchart LR
    U[Usuario] --> HOST[Hosting estático SportTrack-Front]
    HOST -->|VITE_API_URL| API[API Kestrel/Render]
    U -->|WebSocket Live| API
    API --> PG[(PostgreSQL)]
```

---

## 5. Despliegue detallado

```mermaid
flowchart TB
    subgraph Local
        FE[localhost Vite]
        APIL[API :5029]
        PGL[(PG)]
    end
    subgraph Prod
        FEP[Front deploy]
        APIP[API Render]
        PGP[(PG managed)]
    end
    FE --> APIL --> PGL
    FEP --> APIP --> PGP
```

---

## 6. Paquetes / módulos front

```mermaid
flowchart TB
    subgraph pages
        Home[Home LiveResults]
        Club[ClubAdmin]
        Super[Super Dashboard]
        Judges[Judges / Starter / Finisher]
        JC[JuezControl]
        Msg[Shared MensajesSection]
    end
    subgraph services
        api[api.js]
        Ev[EventoService FaseService]
        Tim[TimingSignalRService]
        MsgS[MessageService]
        Auth[AuthService]
        Pay[PagoService SaaSService]
    end
    Club --> Ev
    Super --> Ev
    Judges --> Tim
    Judges --> Ev
    Msg --> MsgS
    Ev --> api
    Tim --> api
    MsgS --> api
    Auth --> api
```

---

## 7. Componentes UI

```mermaid
flowchart TB
    App[App.jsx + ProtectedRoute PlanGuard] --> ML[MainLayout]
    App --> JL[JudgesLayout]
    ML --> Nav[Navbar]
    JL --> AS[AdminSidebar + unread dot]
    App --> NC[NotificationCenter]
    Super[Super Dashboard] --> SS[SharedSections eventos/resultados]
    Club[Club Dashboard] --> Cards[Cards menú]
    Shared[MensajesSection] --> Camp[CampanaDetalle DestinatariosMultiSelect]
```
