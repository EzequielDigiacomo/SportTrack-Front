# 📂 SportTrack - Contexto del Proyecto y Lecciones Aprendidas

Este archivo actúa como la **memoria activa y bitácora de desarrollo** para el asistente de IA y el desarrollador. Su objetivo es:
1. **Reducir el consumo de tokens** al proporcionar un contexto consolidado y preciso sin necesidad de reanalizar todo el código fuente en cada inicio.
2. **Prevenir la repetición de errores** registrando lecciones aprendidas, "gotchas", fallos resueltos y particularidades técnicas.
3. **Mantener el estado de la tarea actual** para retomar el desarrollo de manera inmediata y sin fricciones.

---

## 🏗️ 1. Arquitectura, Stack Tecnológico y Estructura del Sistema

SportTrack es un sistema multi-inquilino (SaaS) para la gestión deportiva y cronogramas de regatas de kayak y canoa en tiempo real.

### ⚙️ Entorno y Stack Tecnológico
* **Frontend**: React (Vite), React Router v6, Axios para peticiones HTTP, `@microsoft/signalr` para conexiones WebSocket. Estilos basados en Vanilla CSS con enfoque premium y responsivo. Librerías auxiliares: `jsPDF` y `jspdf-autotable` para reportes, `lucide-react` para iconos.
* **Backend**: ASP.NET Core (C#), arquitectura en capas/limpia (Api, Controladores, Entidades, AccesoDatos).
* **Base de Datos**: PostgreSQL con Entity Framework Core.
* **Autenticación/Autorización**: JWT. Los tokens se envían mediante la cabecera `Authorization: Bearer <token>` o a través de la cookie `X-Access-Token` para conexiones WebSocket (SignalR).
* **Puertos de Desarrollo**:
  * Frontend: `http://localhost:5173` (redirige `/api` a backend).
  * Backend API: `http://localhost:5029` (o HTTPS según configuración).

### 📁 Estructura del Código

#### 💻 Frontend (`SportTrack-Front`)
* `src/App.jsx`: Configuración de rutas públicas y privadas (protegidas por rol) y renderizado de la barra de notificaciones y toasts.
* `src/context/`:
  * [AuthContext.jsx](file:///c:/Users/EZEQU/source/reposFront/SportTrack-Front/src/context/AuthContext.jsx): Gestiona el estado de sesión del usuario actual, login, logout y lectura de JWT.
  * [ThemeContext.jsx](file:///c:/Users/EZEQU/source/reposFront/SportTrack-Front/src/context/ThemeContext.jsx): Administrador del tema visual (claro/oscuro).
  * [ToastContext.jsx](file:///c:/Users/EZEQU/source/reposFront/SportTrack-Front/src/context/ToastContext.jsx): Notificaciones tipo Toast en pantalla.
* `src/services/`:
  * [api.js](file:///c:/Users/EZEQU/source/reposFront/SportTrack-Front/src/services/api.js): Cliente Axios configurado con interceptores para adjuntar token JWT y manejar errores 401 globales.
  * [SchedulerService.js](file:///c:/Users/EZEQU/source/reposFront/SportTrack-Front/src/services/SchedulerService.js): Motor del cronograma inteligente para regatas.
  * [TimingSignalRService.js](file:///c:/Users/EZEQU/source/reposFront/SportTrack-Front/src/services/TimingSignalRService.js): Conexión en tiempo real al hub de cronometraje (`/hubs/timing`).
* `src/pages/ClubAdmin/sections/`:
  * [AtletasSection.jsx](file:///c:/Users/EZEQU/source/reposFront/SportTrack-Front/src/pages/ClubAdmin/sections/AtletasSection.jsx): Paginación y filtro local de atletas.
  * [InscripcionAtletaModal.jsx](file:///c:/Users/EZEQU/source/reposFront/SportTrack-Front/src/pages/ClubAdmin/sections/InscripcionAtletaModal.jsx): Inscripción de palistas a pruebas.
  * [PagosClubSection.jsx](file:///c:/Users/EZEQU/source/reposFront/SportTrack-Front/src/pages/ClubAdmin/sections/PagosClubSection.jsx): Solicitud interactiva de cambios de estado de afiliación mediante SignalR.

#### ⚙️ Backend (`SportTrack-v1`)
* `SportTrack-v1.Api` ([Program.cs](file:///c:/Users/EZEQU/source/repos/SportTrack-v1/SportTrack-v1.Api/Program.cs)): Configuración del backend (CORS con credentials, autenticación JWT con soporte de Query String para WebSockets, inyección de dependencias, salvaguardas y mapeo de hubs).
* `SportTrack-v1.Controladores`: Capa de controladores que exponen endpoints HTTP.
* `SportTrack-v1.Entidades`: Modelos de negocio en C# y enumeradores.
* `SportTrack-v1.AccesoDatos` ([SportTrackDbContext.cs](file:///c:/Users/EZEQU/source/repos/SportTrack-v1/SportTrack-v1.AccesoDatos/SportTrackDbContext.cs)): Contexto de Entity Framework Core para PostgreSQL.

---

## 🗃️ 2. Arquitectura de Base de Datos y Entidades

El backend utiliza las siguientes entidades principales en `SportTrack.Entidades`:
1. **Club**: Identidad deportiva. Puede ser club individual o federación madre (`ParentClubId`).
2. **Usuario**: Credenciales y roles. Relacionado con un Club.
3. **Participante** (Atleta): Información personal de los atletas afiliados a un club.
4. **Evento**: Competencia deportiva organizada por un Club (o Federación). Incluye campos de control de estado (`Habilitado`, `CostoInscripcion`, `UsarGapVariable`).
5. **Prueba** (EventoPrueba): Las pruebas específicas dentro de un evento (ej: K1 500m Cadete Masculino).
6. **Inscripcion**: Vinculación de un Atleta a una Prueba específica con su `PaymentStatus` e `InscripcionTripulante` para botes grupales (K2, K4).
7. **Fase**: Fases de la regata (Eliminatoria, Semifinal, Final).
8. **Resultado**: Tiempos registrados por cada inscripción en una fase determinada, incluyendo posición, milisegundos de carrera, notas y estado del palista (`DNS`, `DNF`, `DSQ`, `OK`).
9. **PlanSaaS**: Planes del sistema (Oro, Plata, Bronce, Demo) que limitan funcionalidad de clubes y administradores.

---

## 👥 3. Jerarquía de Roles y Control de Accesos
* **Admin / SuperAdmin**: Rol federativo supremo. Puede gestionar planes SaaS, habilitar o suspender clubes, organizar eventos, configurar pruebas, sortear series y administrar cobros.
* **Club**: Acceso al panel administrativo de club. Puede afiliar atletas, inscribir botes a eventos de su federación, consultar resultados en vivo de solo lectura y solicitar cambio de estado de pago.
* **Largador (Starter)**: Juez en la línea de partida. Inicia regatas en tiempo real sincronizando relojes.
* **Cronometrista (Timer / Llegada)**: Registra tiempos manuales o interactúa con el sistema de cronometraje en la meta.
* **JuezControl**: Administra y vigila el flujo del evento.

---

## ⚡ 4. Mensajería en Tiempo Real (SignalR Hubs)

El backend expone dos hubs funcionales:
1. **`ResultsHub`** (Ruta: `/hubs/results`):
   * Notifica actualizaciones de resultados en vivo (`RecibirResultado`, `RecibirEstructura`, `GlobalUpdate`).
   * Permite unirse a grupos específicos por ID de prueba (`JoinPruebaGroup` / `LeavePruebaGroup`).
2. **`TimingHub`** (Ruta: `/hubs/timing`):
   * Control de cronometraje de baja latencia inter-roles.
   * `JoinRaceGroup`/`LeaveRaceGroup` y `JoinEventGroup`: Seguimiento de presencia en tiempo real (`RacePresenceUpdated` y `EventPresenceUpdated`) para jueces y administradores.
   * Acciones de carrera: `RequestStartRace` (inicia carrera con timestamp), `RequestResetRace`, `RecordLap`, `FinishRace`, `SendTime`.
   * Notificaciones dinámicas: `RequestPaymentStatusChange` envía avisos en tiempo real al administrador desde el panel del club.

---

## 🧠 5. Lecciones Aprendidas y Gotchas Técnicos

### 🟢 Reglas del Motor de Cronograma (`SchedulerService`)
* **Prioridad de Fases**: Al ordenar las fases, las eliminatorias/series deben ir siempre antes de las semifinales o finales (`etapa.orden` o `etapaOrden` es fundamental para el orden correcto).
* **Gap Variable**: El gap de largada depende del tipo de distancia. Si está activado `usarGapVariable`, se debe consultar el `gapSugerido` configurado para la distancia.

### 🟢 React y Renderizado de Cronograma
* **Inscritos y Fases**: Para renderizar la cantidad de inscritos en una fase frente a una prueba sin sortear:
  * Si es una fase activa (`isF`): usar `resultados.length` (o cantidad calculada de palistas en la fase).
  * Si es una prueba base: usar `cantidadInscritos`.

### 🟢 React y Estados del Dashboard con Subrutas
* **Actualización al Navegar**: En vistas de tipo Dashboard que contienen subrutas internas (por ejemplo, `/club` con subruta `/club/atletas`), la carga de estadísticas y actividad reciente en el componente padre se queda obsoleta si no se re-ejecuta al volver. Se debe incluir `isRoot` en las dependencias del `useEffect` de carga y evaluar si `isRoot` es verdadero para re-sincronizar el estado del dashboard (contadores, últimos movimientos) sin requerir recargar la página.

### 🟢 Control de Accesos por Rol
* **Ocultar 'Organizar Evento' a Clubes**: Se ocultó la tarjeta "Organizar Evento" del Dashboard si el usuario no tiene rol `'Admin'` (Federación), previniendo que los clubes accedan a funcionalidades de organización reservadas por ahora solo para la federación.
* **Ocultar Plan de la Federación a Clubes**: Se removió el borde izquierdo coloreado según el plan y la insignia con el nombre del plan (ej. `'ORO'`) en la cabecera del panel cuando el usuario tiene rol `'Club'` (solo visible para el rol `'Admin'`).

### 🟢 Sistema de Iconos e Identidad Visual
* **Unificación de Emojis a Lucide**: Para garantizar que la interfaz se vea premium e idéntica en cualquier sistema operativo (evitando los emojis de sistema de Windows, Android, macOS que son inconsistentes), se migraron todos los emojis tipográficos nativos en vistas administrativas y móviles a iconos SVG de `lucide-react`. Las alineaciones verticales deben estructurarse usando `display: inline-flex` y `alignItems: center`.

### 🟢 Paginación y Filtrado del Lado del Cliente (Client-Side)
* **Reinicio de Página Activa**: Cuando se implementa paginación local en componentes React (`itemsPerPage = 9`), se debe definir obligatoriamente un efecto (`useEffect`) para reiniciar la página activa (`currentPage`) a `1` cada vez que el texto de búsqueda o los filtros adicionales (como el desplegable de club) cambien. Esto previene que el paginador quede en una página vacía inexistente cuando el nuevo conjunto filtrado de resultados sea menor.
* **Lógica Combinada**: El filtrado por texto y club debe combinarse en un único `useMemo` para evitar desfases de renderizado.

### 🟢 Sincronización Automática de Expiración SaaS
* **Acceso Efectivo y Estado Real**: En modelos SaaS multi-inquilino, el estado operativo (bloqueo por morosidad o vencimiento de plan) debe calcularse dinámicamente tanto en backend como frontend para evitar discrepancias visuales.
  * **Backend (`SaaSService.cs`)**: El indicador `PlanAlDia` evalúa dinámicamente si la fecha actual sobrepasa `FechaVencimientoPlan` o si está marcado como `BloqueadoPorFaltaDePago`.
  * **Frontend (`SaaSManagement.jsx`)**: Se deriva un estado de actividad efectiva (`isEffectiveActive`) combinando `activo && !bloqueadoPorFaltaDePago && !isExpired`, actualizando instantáneamente los dots de estado, badges informativos específicos (`"Vencido"`, `"Bloqueado"`, `"Excedido"`, `"Al día"`) y etiquetas del botón de acceso (`"BLOQUEADA"`, `"VENCIDA"`, `"SUSPENS."`, `"ACTIVA"`) sin forzar inserciones innecesarias en base de datos.
  * **Alerta visual**: Se incluye una advertencia detallada en el panel de detalle a la derecha para explicar de forma explícita por qué el acceso está retenido.

### 🟢 Prevención de Errores de JSX y Atributos
* **Atributos JSX Duplicados**: Estar sumamente atentos al colocar múltiples expresiones dentro de etiquetas de apertura de JSX de gran tamaño. Los botones o contenedores que definen funciones inline extensas (ej. `onClick={async () => { ... }}`) suelen inducir a errores donde se vuelve a declarar un atributo (como `disabled`) al final del tag por no haber cerrado el tag de apertura adecuadamente.

### 🟢 Módulo de Resultados Adaptado para Consulta (Rol Club)
* **Filtrado por Federación**: Los clubes deben visualizar de forma exclusiva los eventos organizados por su federación madre. Esto se logra buscando el `parentClubId` del club del usuario logueado en la base de datos y pasándolo como filtro.
* **Orden Secuencial de Pruebas**: Para ordenar desplegables de pruebas chronológicamente, se debe calcular la primera aparición (número de regata) de cada prueba dentro del cronograma del evento y ordenar la lista ascendentemente basados en dicho índice.
* **Diseño Premium y Simplificado (Live Results)**: La grilla de consulta para usuarios de club debe deshacerse de los inputs e interactividad administrativa, reemplazándola por una vista de sólo lectura estilizada que muestre copas (🥇🥈🥉), nombres completos de tripulantes, badges del club y la diferencia (`Dif.`) calculada dinámicamente en milisegundos con respecto al líder de la serie.
* **Ocultamiento de Funciones Administrativas**: Los botones de reprogramación, sorteo de series, siembra manual, cabezas de serie interactivas y leyendas de bloqueo deben encapsularse estrictamente en bloques de control `{isAdmin && ...}` para resguardar la consistencia y seguridad del sistema.

### 🟢 Control de Afiliaciones y Notificaciones en Tiempo Real (WebSockets / SignalR)
* **Relaciones en Repositorios Backend**: Al buscar entidades con relaciones dinámicas de primer nivel (como un sub-club y su federación), se debe incluir explícitamente el `.Include(c => c.ParentClub)` en la consulta por ID del repositorio backend para evitar que el mapeo de nombres de relaciones en los DTOs resulte en campos nulos o vacíos.
* **Mensajería Instantánea Inter-Roles**: La comunicación crítica o notificaciones que requieren una resolución ágil (como una solicitud de cambio de estado a pagado hecha por un club) pueden transmitirse fluidamente mediante eventos dedicados en SignalR (`RequestPaymentStatusChange`), evitando sobrecargar la base de datos con lecturas frecuentes de persistencia.
* **Diseño Reactivo en Formularios de Envío**: Los botones que disparan eventos de WebSockets deben incorporar estados de feedback inmediato (ej. desactivar el click y mostrar el texto `"Solicitud Enviada ✓"` en verde glassmorphic) para guiar correctamente la interacción del usuario y prevenir llamadas SignalR duplicadas.
* **Redirección desde Notificaciones**: Las alertas recibidas en el Centro de Notificaciones (`NotificationCenter.jsx`) deben soportar diferentes acciones basadas en su contexto. Al hacer clic en un aviso de pago de un club, el administrador debe ser redirigido directamente al módulo de `/super/pagos` para facilitar una acción resolutiva inmediata.
* **Ciclo de Vida de Conexión y Dependencias en React (useEffect)**: Al sincronizar hubs de SignalR, la función de limpieza (cleanup) del `useEffect` suele desconectar el servicio (`timingSignalRService.disconnect()`). Para prevenir micro-desconexiones y errores de invocación cancelada al actualizar estados de la fase local (por ejemplo, cambiar estado a DNS/DNF/DSQ), la dependencia del `useEffect` debe basarse en propiedades primitivas estables como `selectedFase?.id` y `selectedEvento?.id` en lugar de la referencia del objeto fase completo.

---

## 📝 6. Bitácora de Desarrollo e Historial de Cambios

| Fecha | Tarea / Cambio Realizado | Estado | Notas Técnicas |
| :--- | :--- | :--- | :--- |
| **2026-05-21** | Creación del archivo de contexto unificado. | ✅ Completado | Documento inicial en ambos repositorios. |
| **2026-05-21** | Ocultar módulo 'Organizar Evento' para clubes. | ✅ Completado | Se limitó el acceso a `user?.rol === 'Admin'` en `ClubDashboard.jsx`. |
| **2026-05-21** | Ocultar insignia y borde de plan a clubes. | ✅ Completado | Se condicionó la visualización a `user?.rol === 'Admin'` en `ClubDashboard.jsx`. |
| **2026-05-22** | Corregir carga y actualización de Dashboard. | ✅ Completado | Se invocó `loadDashboardData` en mount y se agregó `isRoot` al `useEffect` para refrescar estadísticas y "Últimos Movimientos". |
| **2026-05-22** | Unificación de Iconos Emojis a Lucide SVG. | ✅ Completado | Migrados múltiples emojis a Lucide (`AtletaGrid.jsx`, `AdminHome.jsx`, `SaaSManagement.jsx`, etc.). |
| **2026-05-22** | Creación de Bitácora de Preguntas del Cliente. | ✅ Completado | Creación de [preguntas_cliente.md](file:///c:/Users/EZEQU/source/repos/SportTrack-v1/preguntas_cliente.md) para registrar dudas críticas de negocio (precios de eventos, morosidad de inscripción). |
| **2026-05-22** | Paginación y Filtro de Club en Control de Pagos. | ✅ Completado | Agregada paginación estricta de 9 filas por página y selector de club en las solapas de Atletas e Inscripciones. |
| **2026-05-22** | Sincronización Automática de Vencimiento SaaS. | ✅ Completado | Sincronizado el estado de vencimiento y bloqueo en backend (`SaaSService`) y frontend (`SaaSManagement.jsx`) con badges específicos y alertas informativas en el panel lateral. |
| **2026-05-22** | Correcciones sintácticas y de compilación. | ✅ Completado | Reparado tag de cierre JSX roto en `GestionPagosSection.jsx` y atributo `disabled` duplicado en `InscripcionAtletaModal.jsx`. |
| **2026-05-24** | Módulo de Resultados y Pagos para Clubes con alertas SignalR y persistencia DB | ✅ Completado | Filtrado de eventos, pruebas ordenadas por cronograma, vista Live de resultados y solicitud de pago persistente en base de datos (con migración EF Core a PostgreSQL) y alerta WebSocket en tiempo real al administrador. |
| **2026-06-19** | Solución a desconexión SignalR, Restablecer Lista de Largada y Validación de Llegada Conectada | ✅ Completado | Se corrigió la dependencia de useEffect para evitar desconexiones al actualizar estados; se añadió el botón "Restablecer Lista" con actualización concurrente y alertas SignalR en tiempo real; y se bloquea la largada si la mesa de llegada está desconectada, mostrando aviso de advertencia visual ámbar en el botón. |

---

## 🎯 7. Estado Actual y Próximos Pasos

* **Estado Actual**:
  * El backend compila perfectamente y ejecuta migraciones/salvaguardas automáticamente al inicio (verificando tablas de base de datos como `Auditoria` con `UserAgent` y `Eventos` con `UsarGapVariable`).
  * El frontend se construye correctamente (`npm run build` sin errores).
  * Los accesos están restringidos correctamente según el rol del usuario, asegurando que los usuarios con rol `'Club'` accedan de forma segura solo a lo permitido y cuenten con herramientas dedicadas (Live results optimizados, solicitud de pago).
* **Próximos Pasos**:
  * Esperando nuevas solicitudes e instrucciones del usuario.
