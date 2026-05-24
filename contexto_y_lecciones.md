# 📂 SportTrack - Contexto del Proyecto y Lecciones Aprendidas

Este archivo actúa como la **memoria activa y bitácora de desarrollo** para el asistente de IA y el desarrollador. Su objetivo es:
1. **Reducir el consumo de tokens** al proporcionar un contexto consolidado y preciso sin necesidad de reanalizar todo el código fuente en cada inicio.
2. **Prevenir la repetición de errores** registrando lecciones aprendidas, "gotchas", fallos resueltos y particularidades técnicas.
3. **Mantener el estado de la tarea actual** para retomar el desarrollo de manera inmediata y sin fricciones.

---

## 🏗️ 1. Arquitectura y Estructura del Sistema

SportTrack es un sistema de gestión deportiva y cronogramas de regatas (kayak/canoa) compuesto por:

### 💻 Frontend (`SportTrack-Front`)
* **Framework / Librerías**: React, Vanilla CSS para estilos, `jsPDF` y `jspdf-autotable` para reportes, `lucide-react` para iconos vectoriales unificados.
* **Componentes Principales**:
  * [ConfigurarPruebasModal.jsx](file:///c:/Users/EZEQU/source/reposFront/SportTrack-Front/src/components/SharedSections/ConfigurarPruebasModal.jsx): Modal administrativo para gestionar pruebas (categorías, botes, distancias, ramas, fechas/horas) y configurar las reglas del cronograma.
  * [GestionPagosSection.jsx](file:///c:/Users/EZEQU/source/reposFront/SportTrack-Front/src/pages/Super/sections/GestionPagosSection.jsx): Panel de administración manual de cobros y estados de afiliación de clubes, atletas e inscripciones.
  * [useResultados.js](file:///c:/Users/EZEQU/source/reposFront/SportTrack-Front/src/components/SharedSections/useResultados.js): Hook personalizado para consumir y gestionar los resultados de las pruebas.

### ⚙️ Backend (`SportTrack-v1`)
* **Tecnología**: ASP.NET Core (C#), Arquitectura en Capas/Limpia.
* **Estructura**:
  * `SportTrack-v1.Api` ([Program.cs](file:///c:/Users/EZEQU/source/repos/SportTrack-v1/SportTrack-v1.Api/Program.cs)): Punto de entrada, controladores y endpoints.
  * `SportTrack-v1.Controladores` ([EventoDtos.cs](file:///c:/Users/EZEQU/source/repos/SportTrack-v1/SportTrack-v1.Controladores/Evento/Dtos/EventoDtos.cs)): DTOs y lógica de transferencia de datos.
  * `SportTrack-v1.Entidades` ([Evento.cs](file:///c:/Users/EZEQU/source/repos/SportTrack-v1/SportTrack-v1.Entidades/Entidades/Evento.cs)): Modelos de base de datos.

---

## 🧠 2. Lecciones Aprendidas y Prevención de Errores

> [!TIP]
> *Aquí registramos los bugs que solucionamos y reglas técnicas críticas para no cometer los mismos errores.*

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

---

## 📝 3. Bitácora de Desarrollo e Historial de Cambios

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
| **2026-05-24** | Módulo de Resultados y Pagos para Clubes con alertas SignalR | ✅ Completado | Filtrado de eventos, pruebas ordenadas por cronograma, vista Live de resultados y solicitud de cambio de estado de pago en tiempo real con notificaciones al administrador. |

---

## 🎯 4. Estado Actual y Próximos Pasos

* **Contexto Inmediato**: Hemos adaptado exitosamente los módulos de resultados y de pagos para el rol de Club, logrando una interfaz limpia de solo lectura para resultados, y un canal interactivo bidireccional en tiempo real con SignalR para solicitar cambios de estado de afiliación directamente al centro de notificaciones del administrador. Todos los componentes compilan y el backend inicia de manera perfecta.
* **Próxima acción**: *[Esperando directivas adicionales del usuario]*
