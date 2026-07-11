# Módulo de mensajería privada — Plan definitivo

> Documentación del plan de implementación.  
> Proyectos: **SportTrack-Front** (UI) + **SportTrack-Sigdef** (API).  
> Última actualización: julio 2026.

---

## Estado actual

**MVP cerrado (fases 0–4):** implementado y probado en producción/local (jul 2026).

Incluye: mensajería tipo email 1:1, historial por hilos, envío masivo con respuestas individuales, y puntito rojo de no leídos (polling ~90 s).

Las **fases 5+** quedan para mejoras futuras; no son bloqueantes.

---

## Cómo retomar fases futuras (chat de Cursor)

Pedí **una fase a la vez**, por ejemplo:

1. `Ejecutá Fase 5 del plan de mensajería — búsqueda`
2. `Ejecutá Fase 6 — reporte de acuse`
3. `Ejecutá Fase 7 — adjuntos`
4. `Ejecutá Fase 8 — copia SMTP`
5. `Ejecutá Fase 9 — UX avanzada`

---

## Resumen funcional (MVP)

Módulo **tipo email** (no chat en vivo): mensajes persistidos, **historial por hilos**, **envío masivo con respuestas individuales**, y **indicador de no leídos** por polling.

**Alcance de comunicación:**

| Rol emisor | Puede enviar a | Envío masivo |
|------------|----------------|--------------|
| **SuperAdmin** | Admins de federación | Sí — varias federaciones/Admins; **cada uno responde en su hilo** |
| **Admin** | SuperAdmin + Clubes de su federación | Sí — varios clubes a elección; **cada club responde en su hilo** |
| **Club** | Admin de su federación | No — solo 1:1 |

**Visibilidad de bandeja:**

| Rol | Qué ve |
|-----|--------|
| **SuperAdmin** | Bandeja global + campañas masivas desglosadas |
| **Admin** | Solo hilos propios; masivos a clubes = N hilos separados |
| **Club** | Solo su hilo con el Admin |

---

## Fases implementadas (MVP) ✅

| Fase | Qué entrega | Estado |
|------|-------------|--------|
| **0** | API 1:1 SuperAdmin↔Admin | ✅ |
| **1** | Bandeja SuperAdmin | ✅ |
| **2** | Bandejas Admin + Club | ✅ |
| **3** | Envío masivo + campañas | ✅ |
| **4** | Puntito no leídos (polling) | ✅ |

### Fase 0 — Backend base ✅
Entidades `Hilo` + `Mensaje`, esquema `comunicacion`, permisos SuperAdmin↔Admin, API REST básica.

### Fase 1 — UI SuperAdmin ✅
`MessageService.js`, `MensajesSection.jsx`, ruta `/super/mensajes`.

### Fase 2 — Admin y Club ✅
Permisos Admin↔Club (misma federación), rutas `/super/mensajes` (Admin) y `/club/mensajes`.

### Fase 3 — Envío masivo ✅
`CampanaEnvio`, `POST /hilos/masivo`, `DestinatariosMultiSelect`, `CampanaDetalle`.

### Fase 4 — Indicador no leídos ✅
`GET /no-leidos/count`, `useUnreadMessages.js`, puntito rojo en sidebar y card Club.

---

## Fases futuras (mejoras)

### Fase 5 — Búsqueda y filtros
**Objetivo:** encontrar conversaciones rápido en bandejas grandes.

- Buscar por asunto, cuerpo, username/nombre de contraparte
- Filtros: no leídos / leídos / solo campañas / rango de fechas
- Endpoint opcional `GET /hilos?q=&soloNoLeidos=&desde=&hasta=` (hoy el filtro es solo client-side en bandeja)
- Resaltar coincidencias en la lista

**Complejidad:** baja–media | **Sesión:** chica–mediana

---

### Fase 6 — Reporte de acuse (exportable)
**Objetivo:** circular oficial con evidencia de lectura/respuesta.

- En detalle de campaña: % leídos, % respondidos, pendientes
- Export CSV/Excel o PDF del desglose (destinatario, leído, fecha lectura, respondió, fecha respuesta)
- Endpoint `GET /campanas/{id}/acuse` o export directo
- Opcional: recordatorio masivo solo a quienes no leyeron

**Complejidad:** media | **Sesión:** mediana  
*Nota:* el desglose visual básico ya existe en `CampanaDetalle`; esta fase lo vuelve reporte formal.

---

### Fase 7 — Adjuntos
**Objetivo:** adjuntar PDFs/imágenes a mensajes y comunicados.

- Tabla `comunicacion.Adjuntos` (`IdAdjunto`, `MensajeId`, nombre, content-type, tamaño, URL/path)
- Storage: disco local, Azure Blob o S3 (definir en implementación)
- Límite de tamaño y tipos permitidos (ej. PDF, JPG, PNG)
- UI: subir al redactar, chips en el hilo, descarga segura con auth
- Soft delete coherente con el mensaje

**Complejidad:** media–alta | **Sesión:** mediana–grande

---

### Fase 8 — Copia por email externo (SMTP)
**Objetivo:** avisar fuera de la app cuando llega un mensaje interno.

- `IEmailService` (SMTP / SendGrid / Mailgun)
- Plantilla HTML corta: asunto + preview + link a SportTrack
- Config en `appsettings` / variables de entorno (sin hardcodear secretos)
- Opt-in por usuario o por federación (evitar spam)
- Cola / background job si el volumen crece
- No reemplaza la bandeja interna: es notificación, no el canal principal

**Complejidad:** media–alta | **Sesión:** mediana–grande  
*Dependencia:* cuenta de proveedor + DNS (SPF/DKIM) si se usa dominio propio.

---

### Fase 9 — UX y tiempo real (opcional)
**Objetivo:** pulir la experiencia sin convertir el módulo en chat en vivo.

- Badge instantáneo vía SignalR (`MessagingHub`) además del polling
- Soft delete desde la UI (hoy existe en modelo, poco expuesto)
- Plantillas de comunicado (asuntos/cuerpos frecuentes)
- Prioridad / etiquetas (urgente, informativo)
- Preferencias: silenciar puntito, digest diario
- Integrar bandeja también en **FrontSigdef** si los Admins usan esa app

**Complejidad:** media | **Sesión:** mediana (por ítem)

---

### Fase 10 — Gobernanza y retención (opcional)
**Objetivo:** operación a largo plazo.

- Política de retención / archivo de hilos viejos
- Auditoría explícita de envíos masivos en `AuditService`
- Roles de solo lectura (ej. soporte ve sin responder)
- Rate limit en envíos masivos
- Métricas: mensajes/día, tiempo medio de respuesta

**Complejidad:** media | **Sesión:** mediana

---

## Checklist anti-regresión (al retomar cualquier fase)

- [ ] `dotnet build` sin errores
- [ ] Migración EF aplica (si hay)
- [ ] `npm run build` sin errores
- [ ] Login OK (SuperAdmin, Admin, Club)
- [ ] Mensajería 1:1 y masiva siguen funcionando
- [ ] Puntito de no leídos no se rompe

---

## Reglas de negocio (MVP)

### Envío individual (1:1)

1. **SuperAdmin → Admin**
2. **Admin → SuperAdmin**
3. **Admin → Club** (misma federación)
4. **Club → Admin** (misma federación)
5. **Prohibido:** Admin↔Admin, Club↔Club, Club→SuperAdmin, cruce entre federaciones

### Envío masivo

- SuperAdmin → varios Admins: un hilo por Admin, vinculados a `CampanaEnvio`
- Admin → varios Clubes: un hilo por Club, vinculados a `CampanaEnvio`
- Respuestas siempre en el hilo existente; no se cruzan entre destinatarios

### Historial

- Lista: una fila por hilo
- Detalle: mensajes cronológicos
- Soft delete por lado (remitente/destinatario) — modelo listo; UI completa en Fase 9

---

## Modelo de datos (esquema `comunicacion`)

### `CampanasEnvio`

`IdCampana`, `RemitenteId`, `Asunto`, `Cuerpo`, `EnviadoEn`, `CantidadDestinatarios`, `TipoCampana`

### `Hilos`

`IdHilo`, `Asunto`, `IdCampana` (nullable), `CreadoEn`, `UltimoMensajeEn`

### `Mensajes`

`IdMensaje`, `HiloId`, `RemitenteId`, `DestinatarioId`, `Cuerpo`, `EnviadoEn`, `LeidoEn`, `EliminadoPorRemitente`, `EliminadoPorDestinatario`

### Futuro (Fase 7)

`Adjuntos`: `IdAdjunto`, `MensajeId`, `NombreArchivo`, `ContentType`, `TamanoBytes`, `StorageKey`, `SubidoEn`

---

## API REST (`api/mensajes`) — MVP

| Método | Endpoint | Fase |
|--------|----------|------|
| `GET` | `/hilos` | 0 |
| `GET` | `/hilos/{id}` | 0 |
| `POST` | `/hilos` | 0 |
| `POST` | `/hilos/{id}/responder` | 0 |
| `PATCH` | `/hilos/{id}/leer` | 0 |
| `POST` | `/hilos/masivo` | 3 |
| `GET` | `/campanas` | 3 |
| `GET` | `/campanas/{id}` | 3 |
| `GET` | `/no-leidos/count` | 4 |

---

## Frontend — rutas y componentes (MVP)

| Ruta | Rol | Fase |
|------|-----|------|
| `/super/mensajes` | SuperAdmin / Admin | 1–2 |
| `/club/mensajes` | Club | 2 |

**Componentes:**
- `MessageService.js`
- `MensajesSection.jsx`
- `DestinatariosMultiSelect.jsx`
- `CampanaDetalle.jsx`
- `useUnreadMessages.js`

---

## Riesgos / decisiones

1. No es chat grupal — cada destinatario del masivo tiene hilo privado.
2. `NotificationCenter` (regatas) ≠ mensajes privados.
3. Admin no ve hilos de otro Admin.
4. Backend rechaza envío masivo si algún destinatario es inválido.
5. Sin SMTP ni adjuntos en el MVP (fases 7–8).
6. Fix importante: AutoMapper debe mapear `IdUsuario` → `UsuarioDto.Id` (ya corregido).
