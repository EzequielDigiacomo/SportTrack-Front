# Implementación de Módulo SaaS (Software as a Service)

## Descripción General
Este documento detalla la implementación inicial del módulo de gestión de planes SaaS en el ecosistema **SportTrack**. El objetivo de este módulo es permitir una administración centralizada de los recursos y características disponibles para cada Federación (representada por la entidad `Club` en la base de datos), dependiendo del plan al que estén suscritos.

---

## 1. Cambios en la Base de Datos (Entity Framework)

### Nueva Entidad: `PlanSaaS`
Ubicación: `SportTrack-v1.Entidades\Entidades\PlanSaaS.cs`
Se introdujo la entidad `PlanSaaS` para definir los planes y sus respectivos límites:
- `Id`, `Nombre`, `Precio`
- Límites numéricos: `MaxAtletas`, `MaxTorneosActivos` (El valor `-1` representa ilimitado).
- Features booleanas: `ResultadosTiempoReal`, `ExportacionExcel`, `SoportePrioritario`.

### Actualización de Entidad Existente: `Club`
Ubicación: `SportTrack-v1.Entidades\Entidades\Club.cs`
A la entidad `Club` se le agregó la clave foránea `PlanSaaSId` y su propiedad de navegación hacia `PlanSaaS`. Si el valor es `null`, la Federación se considera sin plan asignado (o se le puede aplicar restricciones base).

### Seed Data
Ubicación: `SportTrack-v1.AccesoDatos\SportTrackDbContext.cs`
Se configuraron datos semilla (Seed Data) en el `DbContext` para proveer tres planes iniciales:
1. **Básico** (Gratis, 500 atletas, 1 torneo, features deshabilitadas).
2. **Estándar** ($50, 2000 atletas, 5 torneos, reportes en tiempo real habilitados).
3. **Premium** ($120, Ilimitado, soporte prioritario).

La migración fue generada y aplicada con éxito (`AddSaaSPlans`).

---

## 2. Lógica de Backend (C# / .NET 8)

### DTOs
Ubicación: `SportTrack-v1.Controladores\SaaS\Dtos\PlanSaaSDto.cs`
Un objeto simple de transferencia de datos usado para enviar la información del plan al frontend de manera segura.

### Servicio: `SaaSService`
Ubicación: `SportTrack-v1.Controladores\SaaS\SaaSService.cs`
Interfaz: `ISaaSService.cs`
Encargado de la lógica de negocio, incluyendo:
- Obtener todos los planes disponibles (`GetPlanesAsync`).
- Obtener el detalle de un plan.
- Asignar o actualizar el plan de una federación (`AsignarPlanAClubAsync`).

### API Controller: `SaaSController`
Ubicación: `SportTrack-v1.Api\Controllers\SaaSController.cs`
Expone los endpoints protegidos bajo JWT (`[Authorize]`):
- `GET /api/SaaS/planes`
- `POST /api/SaaS/asignar-plan` (Limitado a roles `SuperAdmin,Admin`).

El servicio fue registrado correctamente por inyección de dependencias en `Program.cs`.

---

## 3. Frontend (React)

### Servicio de Comunicación
Ubicación: `src\services\SaaSService.js`
Módulo encargado de realizar peticiones HTTP (Axios) a los endpoints correspondientes de `SaaSController`.

### Componente Visual: `SaaSManagement.jsx`
Ubicación: `src\pages\Super\sections\SaaSManagement.jsx`
- Ubicado dentro de la nueva pestaña de "Gestión SaaS" en el panel de **Soporte Técnico**.
- Conectado con la API para traer dinámicamente el precio, límites y características disponibles del servidor (reemplazando los mocks visuales previos).
- Cuenta con un esqueleto (placeholder table) para la futura implementación del panel de "Asignación de Planes por Federación".

---

## Próximos Pasos (Hoja de Ruta)

1. **Implementar Validadores de Límites**:
   - Modificar `ParticipanteService` para consultar `MaxAtletas` según el `PlanSaaSId` del club y rechazar la creación si se ha alcanzado el límite.
   - Modificar `EventoService` para consultar `MaxTorneosActivos` y aplicar la misma lógica al crear un torneo.
2. **Dashboard de Consumo por Federación**:
   - Construir un endpoint que calcule y devuelva estadísticas reales (ej. recuento actual de atletas creados / atletas permitidos).
   - Vincularlo con la tabla visual en `SaaSManagement.jsx` para que Soporte Técnico o el SuperAdmin visualicen el estado de todas las cuentas y puedan asignarles distintos planes dinámicamente.
