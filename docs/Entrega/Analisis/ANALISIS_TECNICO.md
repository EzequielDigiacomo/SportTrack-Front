# Análisis Técnico del Sistema SportTrack-v1

## 1. Introducción
SportTrack-v1 es un sistema de gestión integral para competencias de canotaje de velocidad (sprint). Está diseñado para manejar desde la inscripción de atletas por parte de clubes hasta la visualización de resultados en tiempo real mediante tecnologías de comunicación bidireccional.

## 2. Arquitectura del Software
El backend utiliza una **Arquitectura de Cebolla (Onion Architecture)**, lo que garantiza un bajo acoplamiento y una alta testabilidad.

### Capas del Proyecto:
1.  **SportTrack-v1.Entidades (Núcleo):** Contiene las entidades de dominio, enums y constantes. No tiene dependencias externas.
2.  **SportTrack-v1.AccesoDatos (Infraestructura):** Implementa el `DbContext` de Entity Framework Core y las configuraciones de base de datos para PostgreSQL.
3.  **SportTrack-v1.Controladores (Capa de Aplicación):** Contiene la lógica de negocio, interfaces, servicios, repositorios y DTOs (Data Transfer Objects).
4.  **SportTrack-v1.Api (Presentación):** Es el punto de entrada (ASP.NET Core Web API). Configura la inyección de dependencias, middleware, SignalR y controladores.

## 3. Stack Tecnológico
-   **Lenguaje:** C# / .NET 8
-   **Base de Datos:** PostgreSQL
-   **ORM:** Entity Framework Core (EF Core)
-   **Comunicación TR:** SignalR (WebSockets)
-   **Seguridad:** JWT (JSON Web Tokens) + BCrypt para hashing de contraseñas.
-   **Mapeo de Objetos:** AutoMapper
-   **Documentación API:** Swagger / OpenAPI

## 4. Estructura de Datos (Esquemas)
Para mantener la organización, la base de datos se divide en esquemas lógicos:
-   `catalogos`: Tablas maestras (Botes, Categorías, Distancias, Clubes).
-   `seguridad`: Gestión de usuarios y sesiones.
-   `regatas`: El corazón del sistema (Eventos, Pruebas, Participantes, Inscripciones, Resultados).

## 5. Funcionamiento del "Tiempo Real"
El sistema utiliza un patrón de **Notificación por Hub**. Cuando un resultado es cargado/actualizado en la API, el servicio de negocio invoca el `INotificadorResultados`. Este componente utiliza SignalR para enviar el paquete de datos específicamente a los clientes suscritos al grupo de la carrera (identificado por `EventoPruebaId`).
