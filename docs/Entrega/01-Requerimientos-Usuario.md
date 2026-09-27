# 01 — Requerimientos de Usuario

**Proyecto:** SportTrack — Frontend de Competencias
**Última actualización: 2026-09-27**
**Norma de referencia:** ISO/IEC/IEEE 29148 (ingeniería de requerimientos) · ISO/IEC 25010 (calidad de producto)

---

## Índice

1. [Introducción y alcance](#1-introducción-y-alcance)
2. [Actores y roles](#2-actores-y-roles)
3. [Requerimientos Funcionales](#3-requerimientos-funcionales)
4. [Requerimientos No Funcionales (ISO 25010)](#4-requerimientos-no-funcionales-iso-25010)
5. [Historias de Usuario (Gherkin)](#5-historias-de-usuario-gherkin)
6. [Reglas de Negocio](#6-reglas-de-negocio)
7. [Matriz de trazabilidad](#7-matriz-de-trazabilidad)
8. [Pie del pack](#pie-del-pack)

---

## 1. Introducción y alcance

### 1.1 Objetivo del documento

Definir los requerimientos **funcionales y no funcionales** del frontend **SportTrack**, verificado contra el código fuente del repositorio `SportTrack-Front`, de modo que sirva como base contractual de la entrega y como referencia de trazabilidad hacia casos de uso, diagramas y módulos de implementación.

### 1.2 Alcance del sistema

El sistema cubre el ciclo completo de una competencia de remo/canotaje:

1. **Preparación**: alta de eventos, pruebas y cronograma; inscripciones de clubes.
2. **Siembra y armado**: sorteo de carriles y generación de fases con progresión ICF.
3. **Operación en vivo**: largada, cronometraje, validación de llegada, oficialización de resultados.
4. **Difusión**: pizarra pública de resultados en tiempo real y exportación de reportes PDF/CSV.
5. **Administración**: gestión SaaS multi-tenant, auditoría, mensajería y soporte.

### 1.3 Alcance de este documento

- **Incluye:** requerimientos del frontend web (Vercel) y de la app Android (Capacitor).
- **Excluye:** la implementación del backend (repo `SportTrack-Sigdef`) y los módulos federativos SIGDEF (repo `FrontSigdef`).
- Todo requerimiento no verificable en el código fue **omitido**. Lo que existe pero está desactivado se marca como **FUERA DE ALCANCE ACTUAL**.

### 1.4 Convenciones de identificadores

| Prefijo | Significado | Ejemplo |
|---------|-------------|---------|
| `RF-##` | Requerimiento Funcional | `RF-05` |
| `RNF-##` | Requerimiento No Funcional | `RNF-03` |
| `HU-##` | Historia de Usuario | `HU-07` |
| `RN-##` | Regla de Negocio | `RN-02` |
| `CU-##` | Caso de Uso (documento 02) | `CU-04` |

---

## 2. Actores y roles

### 2.1 Actores del sistema

| Actor | Autenticación | Descripción |
|-------|---------------|-------------|
| **Público general** | No requiere | Consulta resultados en vivo en `/resultados/:id`, home y planes. |
| **Club** | Requerida (rol `Club`) | Gestiona sus atletas, inscripciones, pagos y consulta sus eventos. |
| **Administrador de Federación** | Requerida (rol `Admin`) | Administra eventos, pruebas, clubes, usuarios y operación completa. |
| **SuperAdmin** | Requerida (rol `SuperAdmin`) | Administración SaaS global: federaciones, planes, backups, auditoría y soporte. |
| **Largador (Starter)** | Requerida (rol `Largador`) | Lanza las regatas desde la consola de largada. |
| **Cronometrista / Finalizador** | Requerida (rol `Cronometrista`) | Registra tiempos de llegada; la UI lo rotula "Finalizador". |
| **Juez de Control** | Requerida (rol `JuezControl`) | Valida y oficializa resultados de las regatas. |
| **Control Técnico** | Requerida (rol `ControlTecnico`) | Supervisiona técnica y operativamente; accede a varias consolas. |

### 2.2 Roles técnicos y mapeo de código

| Rol (UI) | Valor de rol en API | Ruta de aterrizaje (`getDashboardPathForRole`) | Guard |
|----------|----------------------|------------------------------------------------|-------|
| SuperAdmin | `SuperAdmin` | `/super` | `requiredRole={['Admin','SuperAdmin']}` |
| Admin (federación) | `Admin` | `/super` | `requiredRole={['Admin','SuperAdmin']}` |
| Club | `Club` | `/club` | `requiredRole="Club"` |
| Control Técnico | `ControlTecnico` | `/control-tecnico` | `requiredRole={['Admin','SuperAdmin','ControlTecnico']}` + `requiereControlesLive` |
| Largador | `Largador` | `/jueces/largador` | `requiredRole={['Admin','SuperAdmin','Largador','ControlTecnico']}` + `requiereControlesLive` |
| Cronometrista (UI: "Finalizador") | `Cronometrista` | `/jueces/llegada` | `requiredRole={['Admin','SuperAdmin','Cronometrista','ControlTecnico']}` + `requiereControlesLive` |
| Juez de Control | `JuezControl` | `/juez-control` | `requiredRole={['Admin','SuperAdmin','JuezControl']}` + `requiereControlesLive` |
| Soporte técnico (alias) | usuario `soporte_tecnico` | Tratado como SuperAdmin | `isSuperAdminUser` |

> **Nota.** El rol `Cronometrista` se muestra en la interfaz como **"Finalizador"**. El alias `soporte_tecnico` no es un rol de la API sino un **usuario especial** que `authHelpers.isSuperAdminUser` reconoce como superadministrador.

---

## 3. Requerimientos Funcionales

### 3.1 Gestión de eventos

| ID | Requerimiento | Prioridad |
|----|---------------|-----------|
| RF-01 | El sistema debe permitir crear un evento con nombre, fechas, ubicación, federación y estado de inscripciones. | Alta |
| RF-02 | El sistema debe permitir editar un evento existente, incluida la **fecha del evento**. | Alta |
| RF-03 | El sistema debe permitir configurar las **pruebas** de un evento (categoría, bote, distancia, sexo), incluyendo eventos con **múltiples categorías**. | Alta |
| RF-04 | El sistema debe permitir editar los **horarios de las pruebas** dentro del cronograma. | Alta |
| RF-05 | El sistema debe permitir consultar los próximos eventos desde la home pública. | Media |
| RF-06 | El sistema debe permitir marcar un evento como **"todo manual"** (sin consolas de juez), habilitando la carga manual de tiempos. | Media |

### 3.2 Inscripciones

| ID | Requerimiento | Prioridad |
|----|---------------|-----------|
| RF-07 | El sistema debe permitir inscribir atletas/botes a una prueba de un evento, con validación de elegibilidad. | Alta |
| RF-08 | El sistema debe permitir a un Club inscribir a sus propios atletas. | Alta |
| RF-09 | El sistema debe soportar botes de equipo con tripulantes (K2, K4, C2, etc.). | Alta |
| RF-10 | El sistema debe permitir consultar las inscripciones por evento/prueba. | Media |
| RF-11 | El sistema debe integrar el registro de pago por inscripción. | Media |

### 3.3 Fases y progresión ICF

| ID | Requerimiento | Prioridad |
|----|---------------|-----------|
| RF-12 | El sistema debe permitir realizar la **siembra/sorteo** y asignar carriles a las inscripciones. | Alta |
| RF-13 | El sistema debe **generar automáticamente las fases** (series/etapas) de un EventoPrueba. | Alta |
| RF-14 | El sistema debe permitir la **generación manual** de fases por colocaciones indicadas por el operador. | Media |
| RF-15 | El sistema debe permitir **promover** atletas a la etapa siguiente conforme al sistema de progresión ICF. | Alta |
| RF-16 | El sistema debe permitir editar la metadata de una fase (horario, carriles) y realizar **batch update** de fases. | Media |
| RF-17 | El sistema debe permitir editar los detalles de una fase (`updateDetails`). | Media |
| RF-18 | El sistema debe permitir eliminar una fase. | Baja |
| RF-19 | El sistema debe exponer una **auditoría de progresión** por EventoPrueba. | Media |

### 3.4 Cronometraje y operación de regata

| ID | Requerimiento | Prioridad |
|----|---------------|-----------|
| RF-20 | El sistema debe permitir al **Largador** iniciar una regata (t0) y solicitar su reinicio. | Alta |
| RF-21 | El sistema debe permitir al **Cronometrista/Finalizador** capturar tiempos de llegada por carril. | Alta |
| RF-22 | El sistema debe permitir al **Juez de Control** validar, enviar a revisión y oficializar resultados. | Alta |
| RF-23 | El sistema debe permitir el **control técnico** de la operación. | Media |
| RF-24 | El sistema debe permitir la **carga manual** de tiempos para planes sin controles live. | Media |
| RF-25 | El sistema debe sincronizar el reloj con el servidor y calcular el t0 en el instante del click. | Alta |
| RF-26 | El sistema debe emitir un **timbre de largada** audible en la consola del finalizador. | Baja |
| RF-27 | El sistema debe permitir **reiniciar una regata** con motivo y categoría. | Alta |

### 3.5 Resiliencia offline-first

| ID | Requerimiento | Prioridad |
|----|---------------|-----------|
| RF-28 | El sistema debe encolar localmente los tiempos capturados cuando no hay conexión. | Alta |
| RF-29 | El sistema debe reintentar el envío de tiempos y largadas al restablecerse la conexión. | Alta |
| RF-30 | El sistema debe persistir un **outbox de tiempos en el servidor** para su commit/discard. | Alta |
| RF-31 | El sistema debe generar un **respaldo PDF** de los tiempos capturados. | Alta |
| RF-32 | El sistema debe mantener la sesión extendida (token de 24 h) para turnos largos de cronometraje. | Alta |

### 3.6 Resultados y pizarra en vivo

| ID | Requerimiento | Prioridad |
|----|---------------|-----------|
| RF-33 | El sistema debe mostrar una **pizarra pública de resultados en vivo** sin login en `/resultados/:id`. | Alta |
| RF-34 | El sistema debe actualizar resultados en tiempo real vía SignalR. | Alta |
| RF-35 | El sistema debe calcular posiciones por fase y diferencias de tiempo respecto del primero. | Alta |
| RF-36 | El sistema debe permitir actualizar el estado de un resultado (provisional / oficial). | Alta |

### 3.7 Modalidad maratón

| ID | Requerimiento | Prioridad |
|----|---------------|-----------|
| RF-37 | El sistema debe permitir configurar un evento en **modalidad maratón** (largada masiva por grupo). | Alta |
| RF-38 | El sistema debe generar la **largada de maratón** con todos los inscriptos del grupo. | Alta |
| RF-39 | El sistema debe permitir cargar y visualizar la **start list / programa** de maratón. | Alta |
| RF-40 | El sistema debe agrupar resultados de maratón por clasificación. | Media |

### 3.8 SaaS y federaciones

| ID | Requerimiento | Prioridad |
|----|---------------|-----------|
| RF-41 | El sistema debe permitir al SuperAdmin gestionar **federaciones**. | Alta |
| RF-42 | El sistema debe permitir gestionar **clubes**, su estado activo/inactivo y su plan SaaS. | Alta |
| RF-43 | El sistema debe permitir consultar **métricas globales** del SaaS. | Media |
| RF-44 | El sistema debe permitir la **gestión de logins/usuarios** por rol y por plan. | Alta |
| RF-45 | El sistema debe restringir el acceso a funcionalidades según los **flags del plan** contratado. | Alta |

### 3.9 Auditoría y control de actividad

| ID | Requerimiento | Prioridad |
|----|---------------|-----------|
| RF-46 | El sistema debe registrar y listar la **auditoría de errores** de la aplicación. | Alta |
| RF-47 | El sistema debe registrar y listar la **auditoría de actividad** agrupada por evento. | Alta |
| RF-48 | El sistema debe encolar acciones de auditoría cuando no hay conexión y enviarlas luego. | Media |
| RF-49 | El sistema debe permitir marcar un evento como "sin problemas" desde la auditoría. | Baja |

### 3.10 Notificaciones y mensajería

| ID | Requerimiento | Prioridad |
|----|---------------|-----------|
| RF-50 | El sistema debe mostrar una **campana de notificaciones** segmentada por categoría (requiere acción, mensajes, novedades). | Media |
| RF-51 | El sistema debe notificar nuevos eventos y mensajes en tiempo real. | Media |
| RF-52 | El sistema debe permitir la **mensajería privada** por hilos entre usuarios y hacia clubes. | Media |
| RF-53 | El sistema debe permitir el envío de **comunicaciones masivas** y campañas. | Media |

### 3.11 Reportes y exportación

| ID | Requerimiento | Prioridad |
|----|---------------|-----------|
| RF-54 | El sistema debe exportar a **PDF**: fase, grupo, prueba, start list de maratón, cronograma completo, programa inicial, programa de maratón, cronograma de regatas y respaldo del cronometrista. | Alta |
| RF-55 | El sistema debe exportar datos a **CSV**. | Media |
| RF-56 | El sistema debe permitir descargar el PDF de respaldo desde la consola del finalizador. | Alta |

### 3.12 Autenticación, permisos y plataforma

| ID | Requerimiento | Prioridad |
|----|---------------|-----------|
| RF-57 | El sistema debe autenticar por usuario/contraseña y validar la sesión en `/auth/me`. | Alta |
| RF-58 | El sistema debe restaurar el plan del usuario desde el almacenamiento local al reanudar la sesión. | Alta |
| RF-59 | El sistema debe permitir a la federación habilitar/deshabilitar operadores por rol en eventos. | Media |
| RF-60 | El sistema debe ejecutarse como app Android mediante Capacitor, con permiso de red al backend. | Media |

---

## 4. Requerimientos No Funcionales (ISO 25010)

### 4.1 Adecuación funcional

| ID | Característica | Requerimiento |
|----|----------------|---------------|
| RNF-01 | Completitud funcional | Toda funcionalidad de operación de competencia (RF-01…RF-56) debe estar accesible desde la UI web sin pasos manuales sobre la base de datos. |
| RNF-02 | Corrección funcional | Las posiciones y diferencias de tiempo deben calcularse con redondeo a centésimas a partir del `t0` sincronizado con el servidor. |

### 4.2 Eficiencia de desempeño

| ID | Característica | Requerimiento |
|----|----------------|---------------|
| RNF-03 | Comportamiento temporal | La confirmación visual de un tiempo capturado debe ser inmediata (optimista) y no bloquear la captura del siguiente carril. |
| RNF-04 | Utilización de recursos | El bundle debe construirse con Vite y dividirse para no descargar `jspdf`, mapas ni módulos de jueces en rutas que no los usan. |
| RNF-05 | Capacidad | La pizarra en vivo debe soportar la actualización simultánea de múltiples series sin recarga de página. |

### 4.3 Usabilidad

| ID | Característica | Requerimiento |
|----|----------------|---------------|
| RNF-06 | Reconocibilidad | La consola del finalizador debe exponer un botón grande por carril y una campana audible de largada. |
| RNF-07 | Accesibilidad operativa | La operación de cancha debe ser usable en tablets y móviles (layout de jueces `JudgesLayout`). |
| RNF-08 | Estética/consistencia | La UI debe respetar el tema (claro/oscuro) persistido en `localStorage` y feedback por toasts. |

### 4.4 Fiabilidad

| ID | Característica | Requerimiento |
|----|----------------|---------------|
| RNF-09 | Tolerancia a fallos | Ante pérdida de conexión, los tiempos deben persistir localmente y reintentarse automáticamente (colas + outbox). |
| RNF-10 | Recuperabilidad | El respaldo PDF del cronometrista debe permitir reconstruir manualmente los tiempos ante fallos prolongados. |
| RNF-11 | Disponibilidad operativa | La app debe reanudar la conexión SignalR automáticamente y re-suscribirse a los grupos de evento y carrera. |

### 4.5 Seguridad

| ID | Característica | Requerimiento |
|----|----------------|---------------|
| RNF-12 | Autenticidad | Cada request debe enviar el JWT en `Authorization: Bearer` y el header `X-Client-App: sporttrack`. |
| RNF-13 | Confidencialidad | El acceso a consolas y paneles debe protegerse por rol (`ProtectedRoute`) y por plan (`PlanGuard`). |
| RNF-14 | Integridad | El t0 no debe regenerarse: si falla el canal SignalR, se usa HTTP o se encola, nunca se recalcula el instante de largada. |
| RNF-15 | Trazabilidad de seguridad | Las acciones sensibles (reinicio de regata, cambios de estado) deben quedar registradas en auditoría. |

### 4.6 Compatibilidad

| ID | Característica | Requerimiento |
|----|----------------|---------------|
| RNF-16 | Interoperabilidad | El frontend debe consumir la API REST y el hub SignalR de la API unificada sin acoplarse a versiones del backend. |
| RNF-17 | Coexistencia | El frontend debe convivir con SIGDEF sobre la misma API/BD, diferenciándose por módulos y guards. |
| RNF-18 | Portabilidad | El mismo código debe compilar como web (Vercel) y como app Android (`build:android`). |

### 4.7 Mantenibilidad

| ID | Característica | Requerimiento |
|----|----------------|---------------|
| RNF-19 | Modularidad | La lógica de operación debe residir en servicios y hooks reutilizables (p. ej. `useResultados.js`). |
| RNF-20 | Reusabilidad | Los vectores HTTP deben centralizarse en `ENDPOINTS` (`utils/constants.js`). |
| RNF-21 | Analizabilidad | La app debe exponer auditoría de errores y de actividad consultable desde Soporte. |
| RNF-22 | Modificabilidad | Los flags de plan y roles deben derivarse de helpers únicos (`planHelpers`, `authHelpers`). |

---

## 5. Historias de Usuario (Gherkin)

> Formato: `Como <rol> quiero <acción> para <beneficio>`. Criterios de aceptación en Gherkin (`Dado/Cuando/Entonces`).

### HU-01 — Alta de evento con pruebas

**Como** Administrador de Federación **quiero** crear un evento y configurar sus pruebas **para** dejarlo listo para recibir inscripciones.

```gherkin
Escenario: Crear evento con una prueba
  Dado que estoy autenticado como Admin
  Y tengo acceso al sistema SportTrack según mi plan
  Cuando completo el formulario de evento con nombre, fecha y ubicación
  Y configuro una prueba (categoría, bote, distancia, sexo)
  Y guardo el evento
  Entonces el evento queda disponible en la grilla de eventos
  Y aparece en el cronograma con su horario
```

```gherkin
Escenario: Editar la fecha de un evento existente
  Dado un evento creado con fecha anterior
  Cuando modifico la fecha del evento y guardo
  Entonces el cronograma se recalcula con la nueva fecha
```

### HU-02 — Inscripción de atleta por club

**Como** Club **quiero** inscribir a mis atletas en las pruebas **para** participar de la competencia.

```gherkin
Escenario: Inscripción válida
  Dado que estoy autenticado como usuario de Club
  Y el evento tiene inscripciones abiertas
  Cuando inscribo un atleta en una prueba compatible
  Entonces la inscripción queda registrada y visible en la lista
  Y su elegibilidad fue validada por el sistema
```

```gherkin
Escenario: Inscripción rechazada por elegibilidad
  Dado un atleta que no cumple la elegibilidad de la prueba
  Cuando intento inscribirlo
  Entonces el sistema rechaza la inscripción y muestra el motivo
```

### HU-03 — Generación automática de fases

**Como** Administrador **quiero** generar las fases de una prueba automáticamente **para** obtener series, semifinales y finales sin armarlas a mano.

```gherkin
Escenario: Generar fases con progresión ICF
  Dado un EventoPrueba con inscripciones confirmadas
  Cuando ejecuto "Generar fases"
  Entonces el sistema crea las etapas (Eliminatorias/Semifinales/Finales) con sus series
  Y cada atleta aparece en la serie y carril sorteados
```

### HU-04 — Promover etapa ICF

**Como** Administrador **quiero** promover los clasificados a la etapa siguiente **para** continuar la competencia conforme al reglamento ICF.

```gherkin
Escenario: Promover clasificados
  Dado un EventoPrueba con Eliminatorias finalizadas y resultados cargados
  Cuando ejecuto "Promover"
  Entonces los clasificados por regla ICF se asignan a la etapa siguiente
  Y los no clasificados quedan fuera de la progresión
  Y queda registro en la auditoría de progresión
```

### HU-05 — Largada de regata

**Como** Largador **quiero** dar la largada de una serie **para** iniciar oficialmente el cronometraje.

```gherkin
Escenario: Largada exitosa
  Dado que estoy autenticado como Largador con controles live habilitados
  Y la serie está en estado "lista"
  Cuando presiono "Largar"
  Entonces se registra el t0 sincronizado con el reloj del servidor
  Y el cronometrista recibe la señal de largada con timbre
```

```gherkin
Escenario: Largada sin conexión
  Dado que la conexión está caída
  Cuando presiono "Largar"
  Entonces el t0 se guarda localmente y se encola
  Y se reintenta automáticamente al restablecerse la conexión
  Y el t0 NO se regenera
```

### HU-06 — Cronometraje de llegada

**Como** Cronometrista (Finalizador) **quiero** registrar el tiempo de llegada de cada carril **para** obtener los resultados de la serie.

```gherkin
Escenario: Captura de tiempos online
  Dado que la regata fue largada y hay conexión
  Cuando registro el tiempo de llegada de cada carril
  Entonces el tiempo se envía al servidor y se refleja en la pizarra
  Y se emite el evento TimeReceived a los suscriptores
```

```gherkin
Escenario: Captura de tiempos offline con respaldo
  Dado que la conexión se pierde durante la serie
  Cuando registro los tiempos de los carriles
  Entonces los tiempos se guardan en la cola local
  Y puedo descargar el PDF de respaldo
  Y al volver la conexión los tiempos se sincronizan
```

### HU-07 — Juez de Control oficializa resultados

**Como** Juez de Control **quiero** validar y oficializar los resultados **para** publicarlos como definitivos en la pizarra.

```gherkin
Escenario: Oficializar una serie
  Dado que la serie tiene todos los tiempos cargados
  Cuando reviso los resultados y presiono "Oficializar"
  Entonces el estado de los resultados pasa a oficial
  Y la pizarra pública muestra los resultados oficiales
  Y se registra la acción en auditoría
```

### HU-08 — Pizarra pública en vivo

**Como** público general **quiero** ver los resultados en vivo sin iniciar sesión **para** seguir la competencia desde mi dispositivo.

```gherkin
Escenario: Consulta pública
  Dado que accedo al enlace /resultados/:id
  Cuando la competencia está en curso
  Entonces veo las series, los tiempos y las posiciones actualizadas en tiempo real
  Y no se me solicita inicio de sesión
```

### HU-09 — Reiniciar regata

**Como** Largador **quiero** reiniciar una regata con un motivo **para** repetirla tras una mala largada o incidente.

```gherkin
Escenario: Reinicio por mala largada
  Dado una regata en curso
  Cuando solicito el reinicio indicando categoría "Mala largada" y detalle
  Entonces el sistema notifica el evento RaceReset a los conectados
  Y la serie vuelve a estado listo para una nueva largada
  Y el motivo fuerza al menos un texto cuando la categoría es "Otro"
```

### HU-10 — Configuración de maratón

**Como** Administrador **quiero** configurar un evento en modalidad maratón **para** operar largadas masivas por grupo.

```gherkin
Escenario: Generar largada de maratón
  Dado un evento en modalidad maratón con inscripciones
  Cuando ejecuto la generación de largada de maratón
  Entonces se crea una fase "Largada" con todos los inscriptos del grupo
  Y el programa/start list queda disponible para exportar
```

### HU-11 — Soporte de tiempos pendientes

**Como** Soporte técnico **quiero** ver y confirmar las colas temporales de tiempos **para** recuperar capturas que no llegaron al servidor.

```gherkin
Escenario: Confirmar cola temporal
  Dado que existe una entrada pendiente en el outbox del servidor
  Cuando la selecciono y presiono "Confirmar"
  Entonces los tiempos se consolidan en la fase correspondiente
  Y la entrada desaparece de la cola
```

```gherkin
Escenario: Descartar cola temporal
  Dado que existe una entrada pendiente inválida
  Cuando presiono "Descartar" y confirmo
  Entonces la cola se elimina del outbox
```

### HU-12 — Restricción por plan SaaS

**Como** SuperAdmin **quiero** que cada plan habilite solo las features contratadas **para** respetar la comercialización del SaaS.

```gherkin
Escenario: Acceso bloqueado por plan
  Dado un usuario con un plan que no incluye controles live
  Cuando intenta entrar a /jueces/largador
  Entonces el sistema muestra la pantalla "Función exclusiva del Ecosistema"
  Y ofrece actualizar el plan o cerrar sesión
```

---

## 6. Reglas de Negocio

| ID | Regla | Origen en código |
|----|-------|------------------|
| RN-01 | Los planes SaaS se identifican por ID: SIGDEF 1–3, SportTrack 4–6, Pack Dúo 7–9. | `planHelpers.js` |
| RN-02 | Solo los planes tier **L** (IDs 6 y 9) habilitan `accesoControlesLive`. | `planHelpers.js` |
| RN-03 | El flag `maxAtletas` = `-1` significa "sin límite". | `planHelpers.js` |
| RN-04 | La creación de logins de club requiere `accesoDashboardClub`; la de logins de juez requiere `accesoControlesLive`. | `canCreateClubLogin`, `canCreateJudgeLogin` |
| RN-05 | `SuperAdmin` (y el alias `soporte_tecnico`) omiten las restricciones de plan. | `PlanGuard`, `ProtectedRoute`, `authHelpers` |
| RN-06 | La ruta `/jueces/carga-manual` no exige `requiereControlesLive`; está disponible desde el plan Esencial. | `App.jsx` |
| RN-07 | Un login de Club debe estar vinculado obligatoriamente a un club. | `AuthService.register` |
| RN-08 | La sesión del cronometrista se extiende a 24 h para cubrir turnos completos. | `tokenUtils`, `FinisherDashboard` |
| RN-09 | El t0 nunca se regenera: se entrega por SignalR → HTTP → cola persistente. | `TimingSignalRService.deliverRaceStart` |
| RN-10 | El reinicio de regata requiere motivo; si la categoría es "Otro", el detalle debe tener al menos 10 caracteres. | `reiniciarFaseConstants.isReiniciarMotivoValid` |
| RN-11 | El respaldo PDF del cronometrista tiene TTL de 24 h. | `timingBackupService` |
| RN-12 | Los eventos "todo manual" habilitan `handleGenerarManual`/`isManualTiming` y ocultan controles de simulación. | `useResultados.js`, `ConfigurarMaratonModal` |
| RN-13 | En modalidad maratón la largada es masiva: una única fase "Largada" con todos los inscriptos del grupo. | `FaseService.generarLargadaMaraton` |
| RN-14 | Los archivos `.env*` no se versionan; las variables se cargan en Vercel → Settings. | `.gitignore`, `.env.example` |
| RN-15 | La autenticación es híbrida: Bearer en `localStorage` + cookie `X-Access-Token`; en Capacitor solo Bearer (las cookies cross-origin rompen el login). | `api.js`, `authHelpers.js` |
| RN-16 | Toda request debe enviar `X-Client-App: sporttrack`. | `api.js` |
| RN-17 | Ante un `401`, el sistema limpia `USER_DATA` y `AUTH_TOKEN` del almacenamiento. | `api.js` (interceptor de respuesta) |

---

## 7. Matriz de trazabilidad

| RF | Módulo / componente | HU relacionada | CU (doc 02) |
|----|---------------------|----------------|-------------|
| RF-01, RF-02, RF-06 | `GestionEventosSection`, `EventForm` | HU-01 | CU-02 |
| RF-03, RF-04 | `ConfigurarPruebasModal`, `PruebaForm`, `useResultados.handleUpdateFaseHorario` | HU-01 | CU-02 |
| RF-07, RF-08, RF-09, RF-10 | `RegistroInscripcionesSection`, `InscripcionAtletaModal`, `inscripcionEligibilityUtils` | HU-02 | CU-03 |
| RF-12, RF-13, RF-16, RF-17, RF-18, RF-19 | `ProgressionEngine`, `FaseService`, `ProgressionAuditPage` | HU-03 | CU-04 |
| RF-14 | `useResultados.handleGenerarManual` | HU-03 | CU-04 |
| RF-15 | `FaseService.promover`, `promotionHelpers` | HU-04 | CU-05 |
| RF-20, RF-25, RF-26, RF-27 | `StarterDashboard`, `raceStartBell`, `ReiniciarFaseDialog` | HU-05, HU-09 | CU-06, CU-08 |
| RF-21, RF-28, RF-29, RF-31, RF-32, RF-56 | `FinisherDashboard`, `timingSubmitQueue`, `timingBackupService` | HU-06 | CU-07 |
| RF-22 | `JuezControlDashboard`, `TimingSignalRService.updateResultStatus` | HU-07 | CU-07 |
| RF-23, RF-24 | `ControlesSection`, `ManualTiming` | HU-06 | CU-07 |
| RF-30 | `SoporteSection` (colas temporales), `SupportService` | HU-11 | CU-10 |
| RF-33, RF-34, RF-35, RF-36 | `LiveResults`, `ResultadosTable`, `resultadosHelpers` | HU-08 | CU-09 |
| RF-37, RF-38, RF-39, RF-40 | `ConfigurarMaratonModal`, `maratonScheduleUtils`, `maratonStartListUtils` | HU-10 | CU-11 |
| RF-41, RF-42, RF-43, RF-44 | `GestionFederacionesSection`, `SaaSManagement`, `GestionLoginsSection` | HU-12 | CU-12 |
| RF-45 | `PlanGuard`, `ProtectedRoute`, `planHelpers` | HU-12 | CU-12 |
| RF-46, RF-47, RF-48, RF-49 | `SoporteSection`, `ActividadPorEventoPage`, `AuditoriaService`, `auditActionQueue` | — | CU-12 |
| RF-50, RF-51 | `NotificationCenter`, `notificationHelpers` | — | CU-01 |
| RF-52, RF-53 | `MessageService`, `MensajesSection`, `DestinatariosMultiSelect` | — | CU-01 |
| RF-54, RF-55 | `PdfExportService`, `CsvExportService` | HU-08 | CU-09 |
| RF-57, RF-58, RF-59, RF-60 | `AuthContext`, `AuthService`, `GestionLoginsSection`, Capacitor | HU-12 | CU-01, CU-12 |
| RNF-09, RNF-10, RNF-14 | `timingSubmitQueue`, `timingOutboxService`, `timingBackupService` | HU-05, HU-06 | CU-07, CU-08 |
| RNF-12 a RNF-15 | `api.js`, `ProtectedRoute`, `PlanGuard` | HU-12 | CU-01, CU-12 |
| RNF-16 a RNF-22 | Arquitectura general de `src/` | — | — |

---

## Pie del pack

| Documento anterior | Documento actual | Documento siguiente |
|--------------------|------------------|---------------------|
| [← README](./README.md) | **01 — Requerimientos de Usuario** | [02 — Casos de Uso →](./02-Casos-de-Uso.md) |

[README](./README.md) · [01](./01-Requerimientos-Usuario.md) · [02](./02-Casos-de-Uso.md) · [03](./03-Diagramas-de-Flujo.md) · [04](./04-Manual-de-Usuario.md) · [05](./05-Manual-Tecnico.md) · [06](./06-Manual-Instalacion-Despliegue.md)
