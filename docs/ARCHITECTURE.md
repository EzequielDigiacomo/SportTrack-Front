# Arquitectura de SportTrack-v1 Backend

Este documento detalla la estructura y el diseño técnico del sistema backend de SportTrack. El sistema está construido utilizando .NET 8, siguiendo una arquitectura cebolla (Onion Architecture) simplificada pero robusta, dividida en cuatro proyectos principales.

## Estructura de Proyectos

### 1. SportTrack-v1.Api (Capa de Presentación)
Es el punto de entrada de la aplicación. Contiene la configuración global y los endpoints de la API.
- **Controllers**: Manejan las peticiones HTTP y delegan la lógica a los servicios. No contienen lógica de negocio.
- **Program.cs**: Configuración de servicios (Inyección de Dependencias), Middleware, Base de Datos y Swagger.
- **appsettings.json**: Configuración de entorno y cadenas de conexión.

### 2. SportTrack-v1.Controladores (Capa de Aplicación y Lógica)
Esta capa es el "cerebro" del sistema. A pesar de su nombre, contiene los servicios y la lógica de negocio.
- **Services**: Interfaces y clases que contienen las reglas de negocio. Transforman entidades en DTOs.
- **Repositories**: Interfaces y clases que manejan la lógica de consulta de datos (LINQ), aislando el DbContext de la lógica de negocio.
- **Dtos**: Objetos de Transferencia de Datos. Definen qué información entra y sale de la API, evitando exponer las entidades de la base de datos directamente por seguridad y flexibilidad.
- **Mappings**: Configuración de **AutoMapper** para la conversión automática entre Entidades y DTOs.
- **Exceptions**: Manejo unificado de errores (ej: `NotFoundException`).

### 3. SportTrack-v1.AccesoDatos (Capa de Infraestructura)
Contiene todo lo relacionado con la persistencia de datos.
- **SportTrackDbContext**: Clase central de Entity Framework que mapea las entidades a las tablas de PostgreSQL.
- **Migrations**: Historial de cambios en el esquema de la base de datos.
- **Configuración**: Fluent API para definir relaciones complejas, claves y esquemas (ej: esquemas `catalogos` y `regatas`).

### 4. SportTrack-v1.Entidades (Capa de Dominio)
Es la capa más interna y no depende de ninguna otra.
- **Entidades**: Clases POCO que representan las tablas en la base de datos.
- **Enums**: Definiciones de constantes como `SexoEnum`, `TipoBoteEnum`, etc.

---

## Patrones de Diseño Utilizados

1. **Repository Pattern**: Se utiliza para abstraer la lógica de acceso a datos. Esto permite que el sistema sea más testeable y que el cambio de una base de datos a otra sea menos traumático.
2. **Service Pattern**: Centraliza la lógica de negocio, asegurando que los controladores solo se encarguen de la comunicación HTTP.
3. **DTO (Data Transfer Objects)**: Garantiza que la API sea estable. Si la base de datos cambia, solo el mapeo se ajusta, no la interfaz que consume el frontend.
4. **Dependency Injection**: Se usa el contenedor nativo de .NET para gestionar el ciclo de vida de los servicios y repositorios, promoviendo el bajo acoplamiento.

## Flujo de una Petición
`Cliente (Frontend) -> Controller -> Service -> Repository -> DbContext/Base de Datos`

---

> [!TIP]
> **Consistencia de Nombres**: Los servicios siempre deben implementar una interfaz (ej: `InscripcionService : IInscripcionService`) para facilitar las pruebas unitarias y el cumplimiento del principio de inversión de dependencias.
