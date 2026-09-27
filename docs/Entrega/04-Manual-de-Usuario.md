# 04 — Manual de Usuario

**Proyecto:** SportTrack — Frontend de Competencias
**Última actualización: 2026-09-27**
**Audiencia:** usuarios finales y operadores de competencia

---

## Índice

1. [Introducción](#1-introducción)
2. [Acceso y navegación](#2-acceso-y-navegación)
3. [Público general](#3-público-general)
4. [Club](#4-club)
5. [Administrador de Federación / Admin](#5-administrador-de-federación--admin)
6. [Largador](#6-largador)
7. [Cronometrista / Finalizador](#7-cronometrista--finalizador)
8. [Juez de Control](#8-juez-de-control)
9. [Control Técnico](#9-control-técnico)
10. [SuperAdmin / Soporte](#10-superadmin--soporte)
11. [FAQ y resolución de problemas](#11-faq-y-resolución-de-problemas)
12. [Pie del pack](#pie-del-pack)

---

## 1. Introducción

Este manual explica, por rol, cómo operar SportTrack. Cada sección incluye pasos numerados, tablas de campos, notas y advertencias. Si una función no aparece en tu menú, probablemente tu **rol** o **plan SaaS** no la habilita (ver sección 5.6 y FAQ).

**Roles cubiertos:** Público, Club, Admin/Federación, Largador, Cronometrista (rotulado "Finalizador"), Juez de Control, Control Técnico, SuperAdmin/Soporte.

---

## 2. Acceso y navegación

### 2.1 Ingresar al sistema

1. Abrí el navegador en la URL de la aplicación (o la app Android en tu tablet).
2. En `/login` ingresá **usuario** y **contraseña**.
3. Presioná **Iniciar sesión**. El sistema te lleva automáticamente a tu panel según tu rol:

| Rol | Panel al ingresar |
|-----|-------------------|
| Admin / SuperAdmin | `/super` |
| Club | `/club` |
| Control Técnico | `/control-tecnico` |
| Largador | `/jueces/largador` |
| Cronometrista (Finalizador) | `/jueces/llegada` |
| Juez de Control | `/juez-control` |

### 2.2 Elementos comunes de la interfaz

| Elemento | Función |
|----------|---------|
| **Barra lateral** | Navegación entre módulos del panel. |
| **Campana de notificaciones** | Requiere acción (competencia/pagos), Mensajes, Novedades. |
| **Toasts** | Confirmaciones y errores breves en pantalla. |
| **Tema claro/oscuro** | Se guarda en el navegador y persiste entre sesiones. |
| **Cerrar sesión** | Termina la sesión y limpia los datos locales. |

> **Nota.** Si durante una operación se pierde la conexión, la app **no pierde tus datos**: se guardan localmente y se sincronizan al volver la conexión (ver sección 7).

---

## 3. Público general

No requiere usuario ni contraseña.

1. Abrí el enlace público de resultados: `/resultados/:id` (donde `:id` es el evento).
2. Vas a ver las **series y resultados en vivo**, agrupados por prueba/etapa.
3. La tabla se actualiza automáticamente cuando hay nuevos tiempos u oficializaciones.
4. Podés cambiar de serie/prueba con los selectores de la parte superior.
5. Si el organizador lo habilitó, podés descargar el **PDF del cronograma o del programa**.

| Campo visible | Significado |
|---------------|-------------|
| **Carril (L1…) | Número de carril del bote |
| **Posición (1º, 2º…)** | Posición calculada en la serie |
| **Tiempo** | Tiempo oficial o provisional |
| **Diferencia (+Xs)** | Diferencia respecto del primero de la serie |
| **Estado** | Provisional / En revisión / Oficial |

> **Nota.** En eventos de **maratón** los resultados se muestran agrupados por clasificación.

---

## 4. Club

### 4.1 Inscribir un atleta

1. Entrá a **Inscripciones**.
2. Elegí el **evento** y la **prueba**.
3. Presioná **Inscribir atleta**.
4. En la ventana, elegí el atleta o armá el bote de equipo (agregando tripulantes si es K2, K4, C2, etc.).
5. El sistema **valida la elegibilidad** y muestra cualquier observación.
6. Confirmá: la inscripción queda en la lista.

| Campo | Descripción | Obligatorio |
|-------|-------------|-------------|
| Evento | Competencia destino | Sí |
| Prueba | Categoría + bote + distancia + sexo | Sí |
| Atleta / Tripulantes | Participantes del bote | Sí |
| Club | Club al que representa | Sí (precargado) |

### 4.2 Ver resultados de tus atletas

1. Entrá a **Resultados** o abrí `/resultados/:id`.
2. Filtrá por prueba o serie.

### 4.3 Pagos

1. Entrá a **Pagos**.
2. Registrá o consultá el pago de una inscripción.

> **Nota.** Si tu club no tiene un plan con `accesoDashboardClub`, no verás el panel de Club.

---

## 5. Administrador de Federación / Admin

### 5.1 Crear un evento

1. Entrá a **Eventos** → **Nuevo evento**.
2. Completá el formulario:

| Campo | Descripción | Obligatorio |
|-------|-------------|-------------|
| Nombre | Nombre del evento | Sí |
| Fecha / fechas | Fechas de competencia (editables luego) | Sí |
| Ubicación | Sede | Recomendado |
| Federación | Federación organizadora | Sí |
| Inscripciones abiertas | Habilita inscripciones de clubes | Sí |

3. Guardá. El evento aparece en la grilla.

### 5.2 Configurar pruebas

1. Abrí el evento → **Configurar pruebas**.
2. Agregá cada prueba con **categoría**, **bote**, **distancia** y **sexo**.
3. Podés cargar **múltiples categorías**.
4. Ajustá los **horarios** en el cronograma. El cambio se propaga a las fases.
5. Guardá.

> **Nota.** Existe un modo **"todo manual"** para eventos sin consolas de juez: habilita la carga manual de tiempos.

### 5.3 Siembra y generación de fases

1. Entrá a **Resultados** del EventoPrueba.
2. Presioná **Generar fases**: se crean las series con carriles sorteados.
3. Alternativamente, usá **Generar manual** si necesitás indicar colocaciones a mano.
4. Revisá las tarjetas de fase (`FaseCard`); podés editar horarios/carriles o eliminar una fase.
5. Consultá la **auditoría de progresión** para ver el detalle del armado.

### 5.4 Promover una etapa (ICF)

1. Con la etapa finalizada y resultados completos, presioná **Promover**.
2. El sistema aplica la regla ICF y asigna los clasificados a la etapa siguiente.
3. Verificá el resultado en las tarjetas de la etapa siguiente.

### 5.5 Habilitar operadores por evento

En **Logins** podés habilitar/deshabilitar qué roles pueden realizar controles en cada evento.

### 5.6 Planes y funcionalidades

| Feature | Flag del plan | Qué habilita |
|---------|---------------|--------------|
| Acceso a SportTrack | `accesoSportTrack` | Uso del sistema |
| Acceso a SIGDEF | `accesoSigdef` | Módulos federativos |
| Controles live | `accesoControlesLive` | Consolas de juez (solo tier L: planes 6 y 9) |
| Dashboard de Club | `accesoDashboardClub` | Panel de Club |
| Carga de imágenes | `permitirCargaImagenes` | Imágenes en eventos |
| Resultados en tiempo real | `resultadosTiempoReal` | Pizarra en vivo |
| Exportación PDF | `exportacionPdf` | Descarga de PDF |
| Máximo de atletas | `maxAtletas` | Límite de atletas (`-1` = sin límite) |

### 5.7 Exportar reportes

1. En el cronograma o resultados, presioná **Exportar**.
2. Elegí el tipo: cronograma completo, programa inicial, fase, grupo, prueba o start list.
3. El archivo PDF se descarga. También hay exportación **CSV**.

---

## 6. Largador

### 6.1 Prepararse

1. Entrá a `/jueces/largador`.
2. Elegí el **evento** y la **serie**.
3. Esperá a que el indicador de conexión muestre **Conectado**.

### 6.2 Dar la largada

1. Verificá que la serie esté lista.
2. Presioná **Largar**.
3. El sistema registra el **t0 sincronizado con el servidor** (no con tu reloj local).
4. El cronometrista recibe la señal y suena el **timbre de largada**.

> **Advertencia.** Si la conexión se cae, el t0 se guarda y se reintenta automáticamente. **Nunca se recalcula** el instante de largada.

### 6.3 Reiniciar una regata

1. Con la regata en curso, abrí **Reiniciar regata**.
2. Elegí el motivo:

| Categoría | Cuándo usarla |
|-----------|---------------|
| Mala largada / partida en falso | Salida incorrecta |
| Postergación o suspensión (clima, seguridad) | Condiciones externas |
| Problema técnico (cronometraje, sistema) | Falla del sistema |
| Problema externo imprevisto | Otros imprevistos |
| Otro motivo | Requiere detalle de al menos 10 caracteres |

3. Confirmá el reinicio. Los conectados reciben la notificación y la serie vuelve a estar lista.

> **Aviso del sistema.** Usá el reinicio **solo** por incidentes operativos. No corresponde para corregir siembras, pases de etapa ni el armado del cronograma.

---

## 7. Cronometrista / Finalizador

> En la interfaz, este rol aparece como **"Finalizador"**.

### 7.1 Prepararse

1. Entrá a `/jueces/llegada`.
2. Elegí evento y serie.
3. Verificá la conexión y el estado del reloj sincronizado.

### 7.2 Registrar tiempos de llegada

1. Al sonar el **timbre de largada**, el sistema habilita la captura.
2. Por cada carril, presioná el botón correspondiente en el momento en que el bote cruza la meta.
3. La confirmación es inmediata (aunque el envío al servidor tarde).
4. Repetí para todos los carriles.

> **Consejo.** Desbloqueá el audio de tu dispositivo con un primer toque antes de la primera largada (políticas de reproducción automática de los navegadores).

### 7.3 Si la señal es mala (modo offline)

1. Seguí registrando los tiempos con normalidad: se guardan en la **cola local**.
2. Descargá el **PDF de respaldo** desde el botón de respaldo (válido 24 h).
3. Cuando vuelva la conexión, los tiempos se sincronizan solos.
4. Si algo quedó pendiente en el servidor, Soporte puede confirmarlo (ver sección 10).

| Indicador | Significado | Acción |
|-----------|-------------|--------|
| Conectado | Envío en tiempo real | Normal |
| Reintentando | Conexión inestable | Seguir capturando |
| Sin conexión | Cola local activa | Capturar y bajar respaldo PDF |

---

## 8. Juez de Control

1. Entrá a `/juez-control`.
2. Elegí el evento y la serie que esté **En revisión**.
3. Revisá los tiempos y posiciones cargados.
4. Si todo está correcto, presioná **Oficializar**: los resultados pasan a definitivos y se publican en la pizarra pública.
5. Si hay errores, corregí los tiempos antes de oficializar.
6. Toda acción queda registrada en la auditoría.

> **Nota.** Una vez oficializado, un cambio requiere reabrir la revisión desde la operación correspondiente.

---

## 9. Control Técnico

1. Entrá a `/control-tecnico`.
2. Supervisá la operación técnica de la competencia.
3. Según tu asignación por evento, podés acceder a consolas de largada y llegada (tu rol está incluido en los guards de `/jueces/largador` y `/jueces/llegada`).

---

## 10. SuperAdmin / Soporte

### 10.1 Administrar federaciones y clubes

1. Entrá a **Federaciones** y creá/editá federaciones.
2. En **Clubes**, gestioná clubes y su estado activo/inactivo.

### 10.2 Planes SaaS

1. Entrá a **SaaS**.
2. Asigná el plan a un club y consultá las métricas globales.

### 10.3 Logins y usuarios

1. Entrá a **Logins**.
2. Creá usuarios indicando el rol (`rolFederacion`).
3. El sistema valida el plan:
   - logins de **club** requieren `accesoDashboardClub`;
   - logins de **juez** requieren `accesoControlesLive`.
4. Un login de Club **debe** estar vinculado a un club.

### 10.4 Colas temporales de tiempos (soporte)

1. Entrá a **Soporte** → pestaña **Colas temporales**.
2. Verás las entradas pendientes (fase y usuario).
3. Para consolidar: seleccioná una entrada → **Confirmar**.
4. Para eliminar: **Descartar** y confirmá.

### 10.5 Auditoría

1. En **Soporte** podés ver los **logs de errores** y limpiarlos.
2. En **Actividad por evento** podés agrupar la actividad por evento y marcarlo como **"sin problemas"**.

### 10.6 Notificaciones y mensajería

1. Usá la **campana** para ver avisos por categoría.
2. En **Mensajes** gestioná hilos y comunicaciones masivas.

> **Nota.** El usuario alias `soporte_tecnico` se comporta como SuperAdmin, aunque no tenga el rol literal.

---

## 11. FAQ y resolución de problemas

### ¿No puedo iniciar sesión?

- Verificá usuario y contraseña (distingue mayúsculas).
- Si tu sesión expiró, el sistema te redirige a `/login`; volvé a ingresar.
- Si el problema persiste, contactá a Soporte.

### Estoy sin conexión durante el cronometraje

1. Seguí capturando tiempos: quedan en la cola local.
2. Descargá el **PDF de respaldo**.
3. Al volver la conexión, la app sincroniza automáticamente.
4. Si faltan tiempos en el servidor, Soporte los confirma desde las **Colas temporales**.

### Quedaron tiempos pendientes

- Es normal si hubo un corte de red. Soporte puede **confirmar** o **descartar** la cola desde su panel.

### ¿Puedo reiniciar una regata?

- Sí, con motivo y categoría. Si elegís "Otro", el detalle debe tener 10+ caracteres.
- No uses el reinicio para corregir siembras ni cronograma.

### No veo una función que otro usuario sí ve

- Puede ser por **rol** o por **plan SaaS**. Los controles live dependen del plan tier **L** (planes 6 y 9). Consultá a tu administrador.

### ¿Cómo exporto a PDF?

- Desde el cronograma/resultados usá **Exportar**. Si el botón no aparece, tu plan puede no incluir `exportacionPdf`.

### El timbre de largada no suena

- Asegurate de haber hecho un primer toque en la pantalla (desbloqueo de audio).
- Subí el volumen del dispositivo.
- Solo suena para largadas "en vivo" (no al abrir una carrera antigua).

### La pizarra en vivo no se actualiza

- Verificá tu conexión. La app reintenta automáticamente.
- Recargá la página si el problema persiste.

### ¿Funciona en el celular?

- Sí. La app puede instalarse como aplicación Android (`SportTrack Jueces`). En Android se usa solo token (sin cookie), por lo que el login es igual de seguro.

---

## Pie del pack

| Documento anterior | Documento actual | Documento siguiente |
|--------------------|------------------|---------------------|
| [← 03 Diagramas de Flujo](./03-Diagramas-de-Flujo.md) | **04 — Manual de Usuario** | [05 — Manual Técnico →](./05-Manual-Tecnico.md) |

[README](./README.md) · [01](./01-Requerimientos-Usuario.md) · [02](./02-Casos-de-Uso.md) · [03](./03-Diagramas-de-Flujo.md) · [04](./04-Manual-de-Usuario.md) · [05](./05-Manual-Tecnico.md) · [06](./06-Manual-Instalacion-Despliegue.md)
