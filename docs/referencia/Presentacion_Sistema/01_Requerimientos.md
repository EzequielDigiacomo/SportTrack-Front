# Requerimientos del Sistema: SportTrack

## 1. Introducción
SportTrack es una plataforma integral SaaS diseñada para la gestión deportiva, cronometraje y seguimiento de eventos para federaciones de canotaje y clubes asociados. Este documento detalla los requerimientos formales que el sistema debe cumplir.

## 2. Requerimientos Funcionales (RF)

### 2.1. Gestión de Usuarios y Accesos
- **RF-01:** El sistema debe permitir la autenticación de usuarios basada en roles (`Admin` para Federación y `Club` para los clubes asociados).
- **RF-02:** El sistema debe restringir el acceso a módulos administrativos de eventos y gestión de pagos a los usuarios con rol `Admin`.
- **RF-03:** El sistema debe permitir a los usuarios con rol `Club` visualizar exclusivamente a sus atletas, sus inscripciones y su estado de deuda.

### 2.2. Gestión de Atletas y Clubes
- **RF-04:** El sistema debe permitir la creación, lectura, actualización y eliminación (CRUD) de perfiles de clubes.
- **RF-05:** El sistema debe permitir el registro (CRUD) de atletas, vinculando cada atleta a un club específico y a una categoría de edad.
- **RF-06:** El sistema debe categorizar automáticamente a los atletas basándose en su fecha de nacimiento y género.

### 2.3. Gestión de Eventos y Pruebas
- **RF-07:** La Federación (Admin) debe poder crear nuevos eventos, definiendo fechas, sedes y fechas límite de inscripción.
- **RF-08:** El sistema debe permitir configurar las pruebas de cada evento, incluyendo distancia, embarcación (bote), rama y categorías permitidas.
- **RF-09:** El sistema debe restringir las pruebas para que coincidan lógicamente con las restricciones biológicas y etarias de los atletas.

### 2.4. Gestión de Inscripciones
- **RF-10:** El sistema debe permitir a los clubes inscribir a sus atletas en las pruebas de eventos vigentes.
- **RF-11:** El sistema debe registrar un estado de inscripción (pagado, pendiente) e integrarlo con el flujo de deuda del club.
- **RF-12:** El sistema debe bloquear automáticamente nuevas inscripciones si el club se encuentra en mora o excedido en los límites de su plan SaaS.

### 2.5. Gestión de Cronogramas y Regatas
- **RF-13:** El sistema debe calcular y generar automáticamente un cronograma de regatas, estructurando series clasificatorias, semifinales y finales según el número de inscritos.
- **RF-14:** El sistema debe asignar prioridades ("etapa.orden") garantizando que las eliminatorias precedan lógicamente a las finales.
- **RF-15:** El sistema debe calcular "gaps" (intervalos) de largada variables dependientes de las distancias de la prueba.

### 2.6. Gestión de Resultados (Tiempo Real)
- **RF-16:** El sistema debe permitir el ingreso de tiempos y resultados para cada atleta en su respectiva prueba.
- **RF-17:** El sistema debe actualizar instantáneamente los resultados en las pantallas conectadas usando WebSockets/SignalR.
- **RF-18:** El sistema debe permitir la exportación de resultados consolidados en formato PDF (utilizando `jsPDF`).

### 2.7. Portal SaaS y Facturación
- **RF-19:** El sistema debe calcular de manera dinámica el estado de los planes de cada club (Al día, Vencido, Bloqueado).
- **RF-20:** El sistema debe generar alertas visuales detalladas para explicar a los clubes por qué su acceso está retenido (por falta de pago o vencimiento de afiliación).

## 3. Requerimientos No Funcionales (RNF)

### 3.1. Usabilidad e Interfaz
- **RNF-01:** La interfaz de usuario debe estar construida como una Single Page Application (SPA) responsiva utilizando React y componentes visuales modernos.
- **RNF-02:** Los íconos y simbología del sistema deben utilizar el estándar de vectores (Lucide) para asegurar consistencia visual premium en distintos dispositivos.
- **RNF-03:** La navegación y el filtrado (paginación de atletas/clubes) deben realizarse sin refrescos de página, manteniendo el estado en el lado del cliente y optimizando la velocidad.

### 3.2. Rendimiento y Escalabilidad
- **RNF-04:** El backend en ASP.NET Core debe utilizar una Arquitectura Limpia/en Capas para soportar futuras adiciones de deportes o modalidades.
- **RNF-05:** La actualización del dashboard y tableros en tiempo real mediante SignalR debe soportar hasta cientos de clientes simultáneos recibiendo notificaciones de resultados.

### 3.3. Seguridad y Auditoría
- **RNF-06:** Todas las acciones críticas de modificación de datos (pagos, eliminación de inscritos) deben quedar registradas en un `AUDIT_LOG` a nivel de base de datos.
- **RNF-07:** Las conexiones deben estar cifradas mediante HTTPS en los ambientes de producción.
- **RNF-08:** Los endpoints del backend deben requerir un token JWT válido y validar los claims de roles en cada petición.
