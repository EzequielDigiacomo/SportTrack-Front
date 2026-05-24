# Arquitectura y Diagramas del Sistema: SportTrack

## 1. Arquitectura de Despliegue y Tecnologías

SportTrack se construye utilizando una arquitectura moderna orientada a la nube, separando claramente la interfaz de usuario de las reglas de negocio, y permitiendo conectividad en tiempo real.

```mermaid
graph LR
    %% Clientes
    subgraph Frontend - React SPA
        A[Navegador Club]
        B[Navegador Admin]
    end

    %% Servidor
    subgraph Backend - ASP.NET Core
        API[API REST Controladores]
        Hub[SignalR Hub - Tiempo Real]
        Services[Servicios de Dominio]
    end

    %% Datos
    subgraph Persistencia
        DB[(Base de Datos SQL Server)]
    end

    %% Relaciones
    A <-->|HTTPS / JWT| API
    B <-->|HTTPS / JWT| API
    A <-->|WebSockets| Hub
    B <-->|WebSockets| Hub
    API --> Services
    Services <--> DB
    Hub <--> DB
```

### Componentes Clave:
*   **React (Frontend):** Responsable de la visualización. Gestiona los estados locales y renderiza componentes mediante Vanilla CSS y recursos modernos (`lucide-react`).
*   **ASP.NET Core (Backend):** Arquitectura en capas que incluye Controladores (Endpoints), Servicios (Lógica de negocio como `SaaSService` y `SchedulerService`), y Entidades (Modelos de BD).
*   **SignalR:** Permite enviar resultados en vivo a los tableros del club a medida que los jueces cargan los datos en el sistema, sin que el cliente necesite refrescar (polling).

---

## 2. Diagrama de Clases (Base de Datos)

El siguiente modelo ilustra las entidades principales del sistema y sus relaciones. Este diagrama está optimizado desde el modelo conceptual y mapeado a la estructura transaccional (`Entity Framework Core`).

```mermaid
erDiagram
    CLUB {
        int Id PK
        string Nombre
        int PlanSaaSId FK
        bool Activo
    }
    
    USUARIO {
        int Id PK
        string Email
        string Rol
        int ClubId FK
    }

    PLAN_SAAS {
        int Id PK
        string Nombre
        decimal Precio
        int LimiteAtletas
    }

    PAGO {
        int Id PK
        int ClubId FK
        decimal Monto
        date FechaPago
    }
    
    PARTICIPANTE {
        int Id PK
        string Nombre
        string Apellido
        date FechaNacimiento
        int ClubId FK
        int SexoId FK
    }
    
    SEXO {
        int Id PK
        string Descripcion
    }

    EVENTO {
        int Id PK
        string Nombre
        date FechaInicio
        int OrganizadorId FK
    }
    
    PRUEBA {
        int Id PK
        int DistanciaId FK
        int BoteId FK
        int CategoriaId FK
    }

    EVENTO_PRUEBA {
        int Id PK
        int EventoId FK
        int PruebaId FK
        decimal Precio
    }
    
    DISTANCIA {
        int Id PK
        int Metros
    }
    
    BOTE {
        int Id PK
        string Tipo
        int Capacidad
    }
    
    CATEGORIA {
        int Id PK
        string Nombre
        int EdadMin
        int EdadMax
    }

    INSCRIPCION {
        int Id PK
        int EventoPruebaId FK
        int ClubId FK
        string EstadoPago
    }

    INSCRIPCION_TRIPULANTE {
        int Id PK
        int InscripcionId FK
        int ParticipanteId FK
    }

    FASE {
        int Id PK
        int EventoPruebaId FK
        string TipoFase
    }
    
    ETAPA {
        int Id PK
        int FaseId FK
        time HorarioLargada
    }

    RESULTADO {
        int Id PK
        int InscripcionId FK
        int EtapaId FK
        integer TiempoMs
        int Posicion
    }

    PENALIZACION {
        int Id PK
        int ResultadoId FK
        string Motivo
        integer Segundos
    }

    AUDITORIA {
        int Id PK
        string Tabla
        string Accion
    }

    %% Relaciones
    PLAN_SAAS ||--o{ CLUB : "asigna"
    CLUB ||--o{ USUARIO : "tiene"
    CLUB ||--o{ PAGO : "realiza"
    CLUB ||--o{ PARTICIPANTE : "afilia"
    SEXO ||--o{ PARTICIPANTE : "define"
    
    CLUB ||--o{ EVENTO : "organiza"
    EVENTO ||--o{ EVENTO_PRUEBA : "ofrece"
    PRUEBA ||--o{ EVENTO_PRUEBA : "configura"
    DISTANCIA ||--o{ PRUEBA : "mide"
    BOTE ||--o{ PRUEBA : "usa"
    CATEGORIA ||--o{ PRUEBA : "limita"

    EVENTO_PRUEBA ||--o{ INSCRIPCION : "recibe"
    CLUB ||--o{ INSCRIPCION : "paga"
    INSCRIPCION ||--|{ INSCRIPCION_TRIPULANTE : "incluye"
    PARTICIPANTE ||--o{ INSCRIPCION_TRIPULANTE : "compite_en"

    EVENTO_PRUEBA ||--o{ FASE : "se_divide_en"
    FASE ||--o{ ETAPA : "contiene"
    INSCRIPCION ||--o{ RESULTADO : "obtiene"
    ETAPA ||--o{ RESULTADO : "registra"
    RESULTADO ||--o{ PENALIZACION : "puede_tener"
```

## 3. Lógica de Dominio y Reglas Clave

1.  **Motor de Cronogramas (`SchedulerService`):**
    *   Evalúa el número de inscritos en la tabla `REGISTRATIONS` para una `EVENT_TESTS`.
    *   Basado en la categoría y cantidad, genera "fases" (Series, Semifinales, Finales).
    *   Determina el `gap` de separación entre la largada de dos pruebas consecutivas.

2.  **Portal SaaS y Afiliaciones:**
    *   El acceso a realizar `REGISTRATIONS` se bloquea dinámicamente. El Frontend no guarda el estado estático de la deuda, sino que lo consulta (o calcula) combinando la validación del backend `activo && !bloqueadoPorFaltaDePago && !isExpired`.

3.  **Auditoría (`AUDIT_LOG`):**
    *   Toda modificación crítica en las inscripciones o configuración de pruebas genera un registro inmutable en el backend para control de fraudes.
