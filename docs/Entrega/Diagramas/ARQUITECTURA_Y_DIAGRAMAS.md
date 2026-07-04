# Arquitectura y Diagramas de Sistema

En este documento se visualiza la estructura lógica y el comportamiento del sistema SportTrack-v1.

## 1. Diagrama de Clases (Simplificado)
Relaciones principales entre las entidades del corazón del sistema.

```mermaid
classDiagram
    class Evento {
        +int Id
        +string Nombre
        +DateTime Fecha
        +EstadoEvento Estado
    }
    class Prueba {
        +int Id
        +string Nombre
        +int BoteId
        +int SexoId
    }
    class EventoPrueba {
        +int Id
        +int EventoId
        +int PruebaId
        +DateTime FechaHora
    }
    class Participante {
        +int Id
        +string Nombre
        +string Apellido
        +int ClubId
    }
    class Inscripcion {
        +int Id
        +int EventoPruebaId
        +int ParticipanteId
        +string NumeroCompetidor
    }
    class Resultado {
        +int Id
        +int InscripcionId
        +TimeSpan TiempoOficial
        +int Posicion
    }

    Evento "1" -- "*" EventoPrueba
    Prueba "1" -- "*" EventoPrueba
    EventoPrueba "1" -- "*" Inscripcion
    Participante "1" -- "*" Inscripcion
    Inscripcion "1" -- "0..1" Resultado
```

## 2. Diagrama de Casos de Uso
Interacción de los actores con el sistema.

```mermaid
useCaseDiagram
    participant Publico
    participant Club
    participant Admin

    Publico --> (Ver Eventos Próximos)
    Publico --> (Ver Resultados en TR)
    
    Club --> (Login)
    Club --> (Registrar Atletas)
    Club --> (Inscribir a Carreras)
    
    Admin --> (Gestionar Eventos)
    Admin --> (Cargar Resultados Oficiales)
    Admin --> (Gestionar Calendario)
```

## 3. Flujo de Comunicación Real-Time (SignalR)
Secuencia de eventos desde que se carga un tiempo hasta que el usuario lo ve.

```mermaid
sequenceDiagram
    participant Juez as Juez (Controlador)
    participant API as Web API / Service
    participant Hub as ResultsHub (SignalR)
    participant DB as Postgres DB
    participant Pantalla as Usuario (Frontend)

    Juez->>API: POST /api/resultados/upsert
    API->>DB: SaveChangesAsync()
    DB-->>API: Success
    API->>Hub: NotificarCambio(eventoPruebaId, data)
    Hub->>Pantalla: Cliente.Group(id).SendAsync("RecibirResultado")
    Note over Pantalla: La tabla se actualiza sin refrescar
```

## 4. Estructura de Capas (Onion)
Representación visual de la dependencia de dependencias.

```mermaid
graph TD
    API[SportTrack-v1.Api] --> LOGIC[SportTrack-v1.Controladores]
    EF[SportTrack-v1.AccesoDatos] --> LOGIC
    LOGIC --> CORE[SportTrack-v1.Entidades]
    
    style CORE fill:#f9f,stroke:#333,stroke-width:4px
```
