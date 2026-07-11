# Manual de uso — Control de competencia, jueces y cronometraje

Este documento describe **cómo usar cada módulo operativo de SportTrack** el día de la regata: mesa de control, largador, cronometrista, juez de control y carga manual de emergencia.

Está pensado para operadores, jueces y administradores. Refleja el comportamiento actual del sistema en frontend y backend.

---

## Índice

1. [Mapa de acceso y roles](#1-mapa-de-acceso-y-roles)
2. [Flujo integral de una regata](#2-flujo-integral-de-una-regata)
3. [Barra de sincronización en vivo](#3-barra-de-sincronización-en-vivo)
4. [Mesa de control — Administrador (`/super/resultados`)](#4-mesa-de-control--administrador-superresultados)
5. [Juez de control (`/juez-control`)](#5-juez-de-control-juez-control)
6. [Largador (`/jueces/largador`)](#6-largador-jueceslargador)
7. [Cronometrista — Mesa de llegada (`/jueces/llegada`)](#7-cronometrista--mesa-de-llegada-juecesllegada)
8. [Carga manual de tiempos — Salvavidas (`/jueces/carga-manual`)](#8-carga-manual-de-tiempos--salvavidas-juecescarga-manual)
9. [Estados de fase y de atleta](#9-estados-de-fase-y-de-atleta)
10. [Promoción de etapas (ICF)](#10-promoción-de-etapas-icf)
11. [Exportación PDF y CSV](#11-exportación-pdf-y-csv)
12. [Plan Bronce vs Plan con Controles Live](#12-plan-bronce-vs-plan-con-controles-live)
13. [Notificaciones y centro de alertas](#13-notificaciones-y-centro-de-alertas)
14. [Preguntas frecuentes y resolución de problemas](#14-preguntas-frecuentes-y-resolución-de-problemas)

---

## 1. Mapa de acceso y roles

### Rutas principales

| Ruta | Pantalla | Roles habilitados | Requisito de plan |
|------|----------|-------------------|-------------------|
| `/super/resultados` | Mesa de control completa (Admin) | Admin, SuperAdmin | Plan SportTrack activo |
| `/juez-control` | Panel de validación | Admin, SuperAdmin, JuezControl | `accesoControlesLive` (Plan L) |
| `/jueces` | Hub de jueces | Admin, SuperAdmin, Largador, Cronometrista | `accesoControlesLive` |
| `/jueces/largador` | Panel del largador | Admin, SuperAdmin, Largador | `accesoControlesLive` |
| `/jueces/llegada` | Panel del cronometrista | Admin, SuperAdmin, Cronometrista | `accesoControlesLive` |
| `/jueces/carga-manual` | Carga manual de emergencia | **Solo** Admin, SuperAdmin | `accesoControlesLive` |
| `/resultados/:id` | Resultados públicos en vivo | Público | — |

### Redirección automática al iniciar sesión

| Rol | Destino |
|-----|---------|
| Largador | `/jueces/largador` |
| Cronometrista | `/jueces/llegada` |
| JuezControl | `/juez-control` |
| Admin / SuperAdmin | Panel de administración |

### Hub de jueces (`/jueces`)

Pantalla **“Módulo de Jueces Oficiales”** con tarjetas según el rol del usuario:

| Tarjeta | Botón | Función |
|---------|-------|---------|
| **Largador** | Entrar como Largador | Control de salida, check-in y largada |
| **Cronometrista** | Entrar como Cronometrista | Toma de tiempos y cierre de serie |
| **Juez de Control** | Panel de Control | Validación y oficialización |
| **Carga Manual** | Abrir Salvavidas | Solo Admin — corrección directa en BD |

Los administradores ven además el botón **Volver al Panel Admin** → `/super`.

---

## 2. Flujo integral de una regata

Secuencia recomendada el día de la competencia:

```
1. ADMIN — Genera start list, heats y cronograma (/super/resultados → Start List)
2. LARGADOR + CRONOMETRISTA — Abren la misma fase y verifican la barra de sync
3. LARGADOR — Marca DNS/DNF/DSQ pre-largada (si corresponde) y pulsa LARGAR CARRERA
4. CRONOMETRISTA — Registra llegadas, resuelve dudas y pulsa Enviar
5. JUEZ DE CONTROL — Revisa tiempos recibidos y pulsa Guardar y Hacer Oficial
6. ADMIN / JUEZ DE CONTROL — Promover Etapa (cuando la ronda esté completa)
7. EMERGENCIA — Admin usa Carga Manual si falla el cronometraje automático
```

### Estados por los que pasa una fase

```
Programada  →  En Carrera  →  Pendiente de Validación  →  Finalizada
```

| Momento | Quién actúa | Acción clave |
|---------|-------------|--------------|
| Antes de largar | Largador | Marcar ausencias, verificar sync |
| Largada | Largador | **LARGAR CARRERA** |
| Durante la regata | Cronometrista | Registrar tiempos por carril |
| Fin de serie | Cronometrista | **Enviar** → Pendiente de Validación |
| Validación | Juez de Control / Admin | **Guardar y Hacer Oficial** → Finalizada |
| Entre rondas | Juez de Control / Admin | **Promover Etapa** |

---

## 3. Barra de sincronización en vivo

Visible en **Largador**, **Cronometrista** y **Mesa de control** (portal superior).

### Cadena de enlace

```
LARGADOR  ←→  CONTROL  ←→  MESA DE LLEGADA
```

- Cada nodo muestra el **nombre del operador conectado** o **DESCONECTADO**.
- Los conectores cambian de estado (activo / punteado) según haya enlace real vía SignalR.
- El rol propio aparece conectado cuando hay un evento seleccionado.

### Requisito crítico para largar

El largador **no puede largar** si:
- No hay conexión WebSocket activa, **o**
- El cronometrista no aparece conectado en la barra.

En ese caso el botón muestra **ESPERANDO LLEGADA**, **ESPERE SEÑAL...** o **SIN CONEXIÓN** según el caso.

### Tecnología

- Hub SignalR: `/hubs/timing`
- Reconexión automática con fallback HTTP para largada y reinicio si falla el socket.

---

## 4. Mesa de control — Administrador (`/super/resultados`)

**Título:** Panel de Resultados y Start List  
**Acceso:** Admin / SuperAdmin desde el menú lateral → **Resultados**

Es la consola principal de operación. Permite preparar la competencia, monitorear en vivo y editar resultados con control total.

### 4.1 Selectores superiores

| Selector | Descripción |
|----------|-------------|
| **Evento** | Torneo activo |
| **Prueba / Categoría** | Regata específica (solo Admin) |
| **Regata Específica** | Salto directo a una fase del cronograma |

Atajos disponibles: **PDF Schedule**, **PDF Start List**.

### 4.2 Pestaña Start List

#### Barra de acciones

| Elemento | Función |
|----------|---------|
| **N Inscritos** | Total de embarcaciones inscriptas |
| **X/Y cabezas de serie** | Progreso de siembra (si hay más de 9 inscriptos) |
| **Generar Heats** / **Regenerar Sorteo** | Crea series automáticamente en el backend |
| **Manual** / **Cancelar** | Modo asignación manual de serie y carril |
| **Aplicar** | Confirma la colocación manual |
| **Exportar PDF ▼** | Menú de exportación |
| **Reprogramar** | Recalcula horarios de todo el evento |

#### Nómina de inscritos y siembra

- Tabla con atleta/tripulación, club y cabeza de serie (estrella).
- Con **más de 9 inscriptos**: se requiere 1 cabeza de serie cada 9 atletas, ubicada en **carril 5**.
- El sorteo queda bloqueado hasta completar la siembra.

#### Series y sorteo de carriles

- Tarjetas por etapa (Eliminatorias, Semifinales, Finales) con carril, atleta y club.
- Filtro por fase individual.
- Si no hay heats: *“No se han generado las series…”*

#### Flujo Start List (Admin)

1. Seleccionar evento y prueba.
2. Si hay más de 9 inscriptos → marcar cabezas de serie.
3. Pulsar **Generar Heats** (automático) o **Manual** → asignar → **Aplicar**.
4. Opcional: **Reprogramar** para ajustar horarios del cronograma.
5. Exportar PDFs de start list según necesidad.

---

### 4.3 Pestaña Resultados

#### Barra de acciones

| Elemento | Función |
|----------|---------|
| **N Fases** | Cantidad de series de la prueba |
| **— Seleccionar Fase —** | Filtro (🔴 si la fase está En Carrera) |
| Actualizar | Recarga datos |
| **Promover Etapa** | Avanza clasificados a la siguiente ronda |
| **PDF ▼** | Exportación de resultados |

#### Monitor en vivo

Cuando la fase está **En Carrera**:
- Badge **🔴 EN VIVO**
- Cronómetro sincronizado con el servidor
- Mensaje: *“Siguiendo la regata en tiempo real…”*
- Los tiempos llegan automáticamente vía SignalR desde el cronometrista

#### Tabla de resultados (Admin — editable)

| Columna | Editable | Notas |
|---------|----------|-------|
| POS | No (automática) | Calculada por tiempo |
| Carril | Sí | |
| Participante | Sí | |
| Club | Sí | |
| Tiempo | Sí | Formato `mm:ss.SSS` |

#### Acciones del pie

| Botón | Función |
|-------|---------|
| **⚡ Simular Tiempos** | Genera tiempos aleatorios de prueba (no disponible en Plan Bronce ni en carga manual) |
| **Reiniciar Fase** | Borra tiempos en servidor; conserva carriles asignados |
| **Guardar Tiempos Oficiales** | Guarda sin oficializar la fase |
| **Guardar y Hacer Oficial** | Guarda + publica resultados (fase → Finalizada). Aparece en verde cuando la fase está en Pendiente de Validación |

#### Banners informativos

| Estado de fase | Mensaje |
|----------------|---------|
| Pendiente de Validación | *“Serie completada por cronometrista. Revisá los tiempos y usá «Guardar y Hacer Oficial».”* |
| Finalizada | *“Resultados oficiales publicados.”* |

#### Banner de promoción

Indica si la etapa está lista para promover (✅) o faltan series por completar (⚠️).

---

## 5. Juez de control (`/juez-control`)

**Acceso:** rol JuezControl o Admin  
**Propósito:** consultar cronograma, monitorear en vivo y **oficializar resultados** sin acceso a configuración administrativa completa.

### Banner inicial

Al entrar aparece un aviso (se oculta solo a los 10 segundos):

> *Acceso de Juez de Control: podés consultar el cronograma, ver la grilla de largada de cada serie, registrar y validar resultados oficiales. La carga manual de tiempos solo está disponible para administradores.*

### Qué puede hacer el Juez de Control

| Función | JuezControl | Admin |
|---------|:-----------:|:-----:|
| Ver Start List y grilla de carriles | ✅ | ✅ |
| Ver resultados en vivo (SignalR) | ✅ | ✅ |
| Seleccionar evento y regata | ✅ | ✅ |
| Seleccionar prueba/categoría | ❌ | ✅ |
| Generar heats / siembra / reprogramar | ❌ | ✅ |
| Editar tiempos en tabla | ❌ (vista consulta) | ✅ |
| **Guardar y Hacer Oficial** | ✅ | ✅ |
| **Promover Etapa** | ✅ | ✅ |
| **Reiniciar Fase** | ✅ | ✅ |
| Exportar PDF / CSV | ✅ | ✅ |
| Carga manual DNS/DNF/DSQ | ❌ | ✅ (vía `/jueces/carga-manual`) |

### Flujo operativo — Juez de Control

1. Entrar a `/juez-control`.
2. Seleccionar **Evento** y **Regata Específica**.
3. En **Start List**: revisar grilla de carriles de la fase.
4. Durante la regata: pestaña **Resultados** → monitor **EN VIVO**.
5. Cuando el cronometrista pulsa **Enviar** → la fase pasa a **Pendiente de Validación**.
6. Revisar tiempos recibidos (tabla de consulta).
7. Pulsar **Guardar y Hacer Oficial** → confirma → fase **Finalizada**.
8. Si corresponde: **Promover Etapa** al completar la última serie de la ronda.

> **Nota:** El juez de control valida lo que envió el cronometrista. Si necesita corregir tiempos manualmente, debe pedirle al administrador que use **Carga Manual**.

---

## 6. Largador (`/jueces/largador`)

**Acceso:** rol Largador o Admin  
**Propósito:** check-in pre-largada, marcación de ausencias y **disparo oficial de la carrera**.

### Interfaz principal

#### Sidebar — Próximas pruebas

- Selector de **Evento**
- Lista de fases con número de regata, categoría y nombre
- Fases terminadas aparecen atenuadas (Finalizada, Pendiente de Validación)
- Botones **Mostrar / Ocultar** sidebar
- Vista compacta del cronograma (toggle)

#### Panel de la fase seleccionada

- Badge **MODO LARGADOR**
- Botón **Refrescar** (recarga fases + reconecta SignalR)
- Datos de regata: `#n`, categoría, hora, fase, bote, distancia

### Sección “Atletas en Carriles”

Por cada carril:
- Número de carril, atleta/tripulación, club
- Botones de estado (solo en fase **Programada**):

| Botón | Significado | Comportamiento |
|-------|-------------|----------------|
| **DNS** | Did Not Start — no largó | Toggle: segundo clic vuelve a Pendiente |
| **DNF** | Did Not Finish — no terminó | Idem |
| **DSQ** | Descalificado | Idem |

**Restablecer Lista** (solo fase Programada): vuelve todos los carriles a Pendiente y elimina DNS/DNF/DSQ.

Los estados se sincronizan en tiempo real con cronometrista y mesa de control.

### Botón de largada

| Condición | Texto del botón |
|-----------|-----------------|
| Fase Programada + sync OK + cronometrista conectado | **LARGAR CARRERA** |
| Fase Programada + sin cronometrista | **ESPERANDO LLEGADA** (deshabilitado) |
| Reconectando WebSocket | **ESPERE SEÑAL...** |
| Sin conexión | **SIN CONEXIÓN** |
| Fase En Carrera u otro estado | Muestra el estado en mayúsculas (ej. **EN CARRERA**) |

### Reinicio — Partida en falso

Botón **REINICIAR** (visible en En Carrera o Pendiente de Validación):
- Reinicia la carrera en el servidor vía SignalR
- Fallback HTTP si falla la conexión
- Requiere confirmación

### Overlay de largada

Durante la operación muestra:
- “Estableciendo Conexión…”, “Iniciando Carrera…”, “Reiniciando Carrera…”
- “¡LARGADA COMPLETADA!” / “¡REINICIO COMPLETADO!” / “¡ERROR DE CONEXIÓN!”
- Aviso: **⚠️ NO CERRAR NI ACTUALIZAR LA PÁGINA**

### Alertas de conexión

- **Conexión inestable:** auto-sincronización en curso; esperar antes de largar
- **Sin conexión en tiempo real:** se usará canal HTTP de respaldo al largar

### Navegación entre pruebas

- **Anterior** / **Siguiente** — “Prueba X de Y”

### Flujo operativo — Largador

1. Seleccionar evento y fase.
2. Verificar barra sync: Control y Mesa de Llegada conectados.
3. Marcar DNS/DNF/DSQ si algún atleta no largará.
4. Pulsar **LARGAR CARRERA**.
5. Si hubo partida en falso → **REINICIAR** con confirmación.
6. Pasar a la siguiente prueba del cronograma.

### Persistencia local

El sistema recuerda el último evento y fase seleccionados (`starter_event_id`, `starter_fase_id` en localStorage).

---

## 7. Cronometrista — Mesa de llegada (`/jueces/llegada`)

**Acceso:** rol Cronometrista o Admin  
**Propósito:** registrar tiempos de llegada, gestionar dudas y **enviar la serie a revisión**.

### Interfaz principal

- Badge **MODO CRONOMETRISTA**
- **Cronómetro grande** sincronizado con el servidor (arranca automáticamente al recibir la largada)
- Misma sidebar de cronograma que el largador

### Alerta “¡NUEVA LARGADA!”

Si largan una fase distinta a la seleccionada:
- **IR A LA PRUEBA Y CRONOMETRAR** — salta a esa fase
- **Ignorar por ahora**

### Grilla de carriles (1–9)

Botones por carril según estado:

| Estado visual | Significado |
|---------------|-------------|
| `-` | Carril vacío |
| **LLEGADA** | Atleta en carrera, sin tiempo aún |
| **LLEGÓ** | Tiempo registrado |
| **DNS / DNF / DSQ** | Estado especial del largador |

### Registro de tiempos

| Acción | Cómo |
|--------|------|
| Llegada por carril | Clic en el botón del carril |
| Llegada por carril | Teclas **1–9** (incluye numpad) |
| Tiempo dudoso | Botón **DUDA (?) [Espacio]** o tecla **Espacio** |

### Sección “Arribos”

Lista ordenada por tiempo de todos los registros (atletas + dudas ⚠).  
Las dudas tienen botón **X** para cancelar.

### Sección “Atletas por Clasificar”

Atletas pendientes sin tiempo asignado:
- **ASIGNAR ?** — asigna la primera duda pendiente al atleta
- **LLEGADA** — registra llegada directa

### Pie de acciones

| Botón | Función |
|-------|---------|
| **Reiniciar** | Reinicia **solo localmente** el reloj y tiempos capturados en pantalla. **No** reinicia la fase en servidor |
| **Enviar** | Guarda tiempos en BD + envía fase a **Pendiente de Validación** |

**Enviar** queda deshabilitado si:
- Hay dudas sin asignar, o
- No hay ningún arribo registrado

Al enviar:
1. `ResultadoService.batchUpdate` — persiste tiempos
2. `FaseService.enviarARevision` — fase → Pendiente de Validación
3. Notificación al juez de control: **Por Validar**

### Comportamiento automático

- Al recibir señal de largada → cronómetro inicia solo
- Cuando todos los ocupantes tienen tiempo o estado especial → cronómetro se detiene

### Flujo operativo — Cronometrista

1. Conectarse y seleccionar evento/fase (o saltar desde alerta de largada).
2. Esperar largada → cronómetro arranca.
3. Registrar llegadas (clic o teclado 1–9).
4. Usar **DUDA** + **Espacio** para tiempos ambiguos; resolver en “Atletas por Clasificar”.
5. Verificar que no queden pendientes ni dudas.
6. Pulsar **Enviar**.
7. El juez de control recibe la serie para oficializar.

---

## 8. Carga manual de tiempos — Salvavidas (`/jueces/carga-manual`)

**Acceso:** solo Admin / SuperAdmin  
**Propósito:** módulo de **emergencia** cuando falla el cronometraje automático o se necesita corregir resultados ya guardados.

### Cuándo usarlo

- Falla de conexión SignalR irrecuperable
- Error en tiempos ya oficializados
- Corrección post-competencia autorizada por el comité

### Características exclusivas

| Característica | Carga manual | Otros módulos |
|----------------|:------------:|:-------------:|
| Edición directa de tiempos | ✅ | Cronometrista (solo en vivo) / Admin (mesa) |
| Botones DNS / DNF / DSQ por fila | ✅ | Solo largador (pre-largada) |
| Botón Simular Tiempos | ❌ | Admin en modo tiempos |
| Modo Override en fases finalizadas | ✅ | — |
| Cambios directos en BD oficial | ✅ | — |

### Interfaz

Reutiliza el panel de resultados con:
- Selector de evento, prueba y fase
- Tabla editable: carril, participante, club, tiempo
- Botones **DNS**, **DNF**, **DSQ** debajo de cada fila de tiempo

Al marcar DNS/DNF/DSQ:
- Se limpia el tiempo en pantalla
- El atleta queda excluido del ranking automático
- Segundo clic en el mismo botón → vuelve a **Pendiente**

### Banner Modo Override

Si la fase ya está **Finalizada** o **Pendiente de Validación**:

> ⚠️ Modo Override — Esta fase ya fue oficializada/completada. Podés editar tiempos y posiciones directamente.

### Acciones disponibles

| Botón | Función |
|-------|---------|
| **Reiniciar Fase** | Borra todos los tiempos; conserva carriles |
| **Guardar Tiempos Oficiales** | Persiste cambios sin cambiar estado de fase |
| **Guardar y Hacer Oficial** | Persiste + oficializa (→ Finalizada) |

### ¿Se reemplazan tiempos ya guardados?

**Sí.** Al guardar de nuevo:

| Acción | Comportamiento |
|--------|----------------|
| Cambiar un tiempo | El nuevo valor **reemplaza** el anterior en la base de datos |
| Posiciones | Se **recalculan automáticamente** según los tiempos al guardar |
| Marcar DNS/DNF/DSQ | Se guarda el estado y se **borran** tiempo y posición |
| Quitar DNS/DNF/DSQ | Vuelve a Pendiente; podés cargar tiempo nuevamente |
| Borrar tiempo manualmente | En carga manual completa, el backend aplica el valor null (reemplazo real) |

Después de guardar, el sistema **recarga los datos** de la prueba para mostrar el estado actual en BD.

### Tip de emergencia (visible en pantalla)

> Los cambios aquí son directos y afectan a la base de datos oficial.

---

## 9. Estados de fase y de atleta

### Estados de fase

| Estado | Significado operativo |
|--------|----------------------|
| **Programada** | Lista para largada; editable check-in en largador |
| **En Carrera** | Largada ejecutada; cronometrista activo |
| **Pendiente de Validación** | Cronometrista envió; espera oficialización |
| **Finalizada** | Resultados oficiales publicados |

### Estados por atleta (estado de canto)

| Código | Significado | Efecto en ranking |
|--------|-------------|-------------------|
| **Pendiente** | Normal | Participa si tiene tiempo |
| **DNS** | No largó | Excluido |
| **DNF** | No terminó | Excluido |
| **DSQ** | Descalificado | Excluido |

En backend, DSQ se persiste como `Descalificado`.

### Bloqueo de prueba

Una prueba se marca como **bloqueada** cuando:
- Ya hay tiempos oficiales guardados, o
- Está “sellada” en localStorage (final completada)

Admin y modos de carga manual/tiempos pueden editar igualmente, con aviso visible.

---

## 10. Promoción de etapas (ICF)

Botón **Promover Etapa** — visible solo en la **última fase** de la etapa activa (ej. Serie 3, Semifinal 2).

### Cuándo aparece

- En la pestaña Resultados de mesa de control o juez de control
- Solo cuando el motor de promoción detecta que la ronda está completa
- Banner verde ✅ si está listo; amarillo ⚠️ si faltan series

### Qué hace

- Toma los clasificados según tiempos oficiales de la ronda
- Genera la siguiente etapa (Semifinales, Final A, Final B, etc.) según reglas ICF
- Requiere confirmación: *“¿Promover {etapa} y generar la siguiente ronda?”*

### Reglas principales

| Inscriptos | Comportamiento |
|------------|----------------|
| ≤ 9 | Directo a final — no hay promoción |
| 10–18 | Eliminatorias → Final |
| 19–27 | Plan B: 3 series, 2 semifinales, Final A + Final B |
| > 27 | Planes superiores según reglamento ICF |

> Para auditoría detallada de progresiones: `/super` → herramientas de auditoría de progresión.

---

## 11. Exportación PDF y CSV

### Desde Start List

| Opción del menú | Contenido |
|-----------------|-----------|
| 📅 Regatta Schedule | Cronograma completo del evento |
| 👥 Start List Completo | Todas las grillas de largada |
| 🏆 Prueba Seleccionada | Start list de la prueba activa |
| 📋 Solo {Etapa} | Solo eliminatorias, semis o finales |

### Desde Resultados

| Opción | Contenido |
|--------|-----------|
| 📄 Solo: {fase} | Resultados de una serie |
| 📋 Todas las {Etapa} | Todas las series de una etapa |
| 🏆 Prueba Completa | Todos los resultados de la prueba |
| 📊 Exportar Excel (.csv) | Planilla CSV descargable |

### Atajos en selector de regata

- **PDF Schedule**
- **PDF Start List**

Los PDF incluyen logo, datos del evento, categoría, sexo, tiempos formateados y posiciones.

---

## 12. Plan Bronce vs Plan con Controles Live

| Aspecto | Plan Bronce | Plan L (Controles Live) |
|---------|:-----------:|:-----------------------:|
| Acceso `/jueces`, `/juez-control` | ❌ Bloqueado | ✅ |
| Menú “Módulo Jueces” / “Panel de Control” | Oculto | Visible |
| Sync SignalR en mesa de resultados | No (excepto admin/juez) | Sí |
| Badge en resultados | **PLAN BRONCE: CARGA MANUAL HABILITADA** | — |
| Simular tiempos | N/A | Disponible en modo tiempos |
| `/super/resultados` | Accesible con carga manual | Funcionalidad completa + live |

El bloqueo de Controles Live muestra: *“Función exclusiva del Plan L”*.

---

## 13. Notificaciones y centro de alertas

Visible para Admin y JuezControl en rutas operativas.

| Tipo de notificación | Acción al clic |
|---------------------|----------------|
| **Por Validar: {fase}** | Navega a resultados con la fase preseleccionada |
| **¡Regata Iniciada!** | Alerta de largada en curso |
| Solicitudes de pago (admin) | Panel de pagos |

Destino según rol:
- Admin → `/super/resultados`
- JuezControl → `/juez-control`

---

## 14. Preguntas frecuentes y resolución de problemas

### El largador no puede largar

1. Verificar que el cronometrista esté conectado (barra sync).
2. Verificar conexión WebSocket (no debe decir SIN CONEXIÓN).
3. Pulsar **Refrescar** en ambos paneles.
4. Si persiste: usar fallback HTTP (el sistema lo intenta automáticamente).

### El cronometrista no ve la largada

1. Verificar que esté en la misma fase o usar **IR A LA PRUEBA Y CRONOMETRAR**.
2. Pulsar **Refrescar**.
3. Verificar que la fase esté en estado **En Carrera**.

### No puedo pulsar Enviar

- Hay dudas sin asignar → resolver en “Atletas por Clasificar”.
- No hay arribos → registrar al menos una llegada.

### Quiero corregir un tiempo ya oficializado

1. Admin → `/jueces/carga-manual`
2. Seleccionar evento, prueba y fase
3. Editar tiempo o marcar DNS/DNF/DSQ
4. **Guardar Tiempos Oficiales** o **Guardar y Hacer Oficial**

### Las posiciones no coinciden con lo esperado

- Las posiciones se calculan **automáticamente** por tiempo dentro de cada fase.
- Atletas con DNS/DNF/DSQ quedan fuera del ranking.
- Antes de la largada, la grilla se ordena por carril (1→9), no por posición ficticia.

### Error “does not provide an export named default” al cargar

- Suele ser caché corrupta de Vite/HMR.
- Solución: cerrar todos los `npm run dev`, borrar `node_modules/.vite`, reiniciar y hard refresh (`Ctrl+Shift+R`).

### Partida en falso

- **Largador** → **REINICIAR** (reinicia en servidor, limpia estado de carrera).
- **Cronometrista** → **Reiniciar** solo limpia la pantalla local; para reinicio oficial usar el largador.

---

## Referencias técnicas

| Recurso | Ubicación |
|---------|-----------|
| Hub SignalR timing | `/hubs/timing` |
| API batch update resultados | `PUT /api/Resultados/BatchUpdate` |
| Finalizar fase | `FaseService.finalizar` |
| Enviar a revisión | `FaseService.enviarARevision` |
| Reglas ICF progresión | `Documentacion/explicacion_sistema_progresion.md` |
| Historias de usuario base | `Documentacion/01_Usuario_y_Negocio.md` |

---

*Última actualización: julio 2026 — SportTrack Front*
