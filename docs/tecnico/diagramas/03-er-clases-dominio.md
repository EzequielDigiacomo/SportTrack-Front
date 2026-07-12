# 03 — Dominio visto desde SportTrack-Front

Este front **no define** el schema SQL. El ER canónico está en:

**SportTrack-Sigdef** → `docs/tecnico/diagramas/03-er-clases-dominio.md`

Aquí: entidades que la UI usa vía services, y el recorte de mensajería con origen `sporttrack`.

---

## 1. Mapa conceptual consumido

```mermaid
flowchart TB
    Usuario --> Club
    Usuario --> Federacion
    Evento --> EventoPrueba
    EventoPrueba --> Inscripcion
    EventoPrueba --> Etapa
    Etapa --> Fase
    Fase --> Resultado
    Campana --> Hilo
    Hilo --> Mensaje
    PlanSaaS --> Federacion
    PlanSaaS --> Club
```

---

## 2. ER lógico — timing (vista UI)

```mermaid
erDiagram
    EVENTO ||--o{ EVENTO_PRUEBA : tiene
    EVENTO_PRUEBA ||--o{ ETAPA : etapas
    ETAPA ||--o{ FASE : fases
    FASE ||--o{ RESULTADO : tiempos
    INSCRIPCION ||--o{ RESULTADO : corre
    EVENTO_PRUEBA ||--o{ INSCRIPCION : inscritos

    FASE {
        int Id
        string Estado
        string NombreFase
    }
    RESULTADO {
        int Id
        string TiempoOficial
        int Posicion
    }
```

---

## 3. ER lógico — mensajería SportTrack

```mermaid
erDiagram
    CAMPANA ||--o{ HILO : genera
    HILO ||--|{ MENSAJE : msgs
    HILO {
        string SistemaOrigen "siempre sporttrack desde este front"
    }
    CAMPANA {
        string SistemaOrigen "sporttrack"
    }
```

Header fijo en `api.js`: `X-Client-App: sporttrack`. Los hilos `sigdef` **no** aparecen en esta bandeja.

---

## 4. Clases de dominio relevantes (consumo)

```mermaid
classDiagram
    class Evento
    class EventoPrueba
    class Fase {
        +Estado
    }
    class Resultado {
        +TiempoOficial
    }
    class Inscripcion
    class Hilo {
        +SistemaOrigen
    }
    class Mensaje
    class CampanaEnvio
    class Usuario {
        +RolFederacion
    }
    class PlanSaaS
    Evento --> EventoPrueba
    EventoPrueba --> Fase
    Fase --> Resultado
    CampanaEnvio --> Hilo
    Hilo --> Mensaje
```

---

## 5. Roles en UI vs API

| Rol UI | Rutas típicas |
|--------|----------------|
| SuperAdmin / Admin | `/super/*`, `/admin/*`, `/jueces/*` |
| Club | `/club/*` |
| Largador | `/jueces/largador` |
| Cronometrista | `/jueces/llegada` |
| JuezControl | `/juez-control/*` |
| Anónimo | `/`, `/resultados/:id`, Live |
