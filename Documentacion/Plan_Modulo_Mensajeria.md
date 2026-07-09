# Módulo de mensajería privada — Plan definitivo

> Documentación del plan de implementación.  
> Proyectos: **SportTrack-Front** (UI) + **SportTrack-Sigdef** (API).  
> Última actualización: julio 2026.

---

## Cómo ejecutar cada fase (en el chat de Cursor)

Pedí **una fase a la vez**:

1. `Ejecutá Fase 0 del plan de mensajería — solo backend 1:1 SuperAdmin↔Admin`
2. `Ejecutá Fase 1 — UI SuperAdmin`
3. `Ejecutá Fase 2 — Admin y Club`
4. `Ejecutá Fase 3 — envío masivo`
5. `Ejecutá Fase 4 — badge polling`

---

## Resumen

Módulo **tipo email** (no chat en vivo): mensajes persistidos, **historial por hilos**, **envío masivo con respuestas individuales**, y **badge de no leídos** por polling cada ~90 s.

**Alcance de comunicación:**

| Rol emisor | Puede enviar a | Envío masivo |
|------------|----------------|--------------|
| **SuperAdmin** | Admins de federación | Sí — varias federaciones/Admins a la vez; **cada uno responde en su hilo** |
| **Admin** | SuperAdmin + Clubes de su federación | Sí — varios clubes a elección; **cada club responde en su hilo** |
| **Club** | Admin de su federación | No — solo 1:1 |

**Visibilidad de bandeja:**

| Rol | Qué ve |
|-----|--------|
| **SuperAdmin** | Bandeja global: enviados (incl. campañas masivas desglosadas por destinatario) + respuestas recibidas |
| **Admin** | Solo hilos propios; en envíos masivos a clubes ve N hilos separados (uno por club) |
| **Club** | Solo su hilo con el Admin; no ve respuestas de otros clubes |

**Estimación total:** ~6–7 días | **MVP por fases 0–4:** ~5 sesiones de chat.

---

## División en fases (no romper código)

| Fase | Qué entrega | Rompe algo? | Sesión aprox. |
|------|-------------|-------------|---------------|
| **0** | API 1:1 SuperAdmin↔Admin (sin UI) | No | Chica |
| **1** | Bandeja SuperAdmin | No | Mediana |
| **2** | Bandejas Admin + Club | No | Mediana |
| **3** | Envío masivo + campañas | No | Mediana-grande |
| **4** | Badge polling | No | Chica |
| **5** | Extras (adjuntos, SMTP…) | No | Opcional |

### Principios entre fases

1. Solo **archivos nuevos**; tocar existentes solo en `Program.cs`, `SportTrackDbContext.cs` y dashboards (ruta/nav).
2. Migraciones **aditivas** — esquema nuevo `comunicacion`.
3. API aislada en `MensajesController`.
4. Menú `/mensajes` se agrega cuando la fase UI esté lista.
5. Cada fase termina con `dotnet build` + `npm run build` OK.

---

### Fase 0 — Backend base (1:1 SuperAdmin ↔ Admin) ✅

**Estado:** Implementado (jul 2026).

**Backend (SportTrack-Sigdef):**
- Entidades `Hilo` + `Mensaje` (`IdCampana` nullable, sin tabla Campana aún)
- Migración EF esquema `comunicacion`
- `MensajeService` — permisos solo SuperAdmin→Admin y Admin→SuperAdmin
- Endpoints: `GET /hilos`, `GET /hilos/{id}`, `POST /hilos`, `POST /hilos/{id}/responder`, `PATCH /hilos/{id}/leer`

**Frontend:** nada.

**Cierre:** Swagger OK, login/eventos/resultados sin cambios.

---

### Fase 1 — UI SuperAdmin (1:1) ✅

**Estado:** Implementado (jul 2026).

**Frontend (SportTrack-Front):**
- `src/services/MessageService.js`
- `src/pages/Shared/MensajesSection.jsx`
- Ruta `/super/mensajes` + ítem sidebar

**Cierre:** SuperAdmin envía y ve hilos; resto del dashboard intacto.

---

### Fase 2 — Admin y Club (1:1 completo)

**Backend:** Admin→Club, Club→Admin (misma federación).

**Frontend:**
- Props `modoAdmin` / `modoClub` en `MensajesSection`
- Rutas `/admin/mensajes`, `/club/mensajes`

**Cierre:** 3 roles con mensajería 1:1; aislamiento entre usuarios del mismo rol.

---

### Fase 3 — Envío masivo + campañas

**Backend:** `CampanaEnvio`, `POST /hilos/masivo`, `GET /campanas`, `GET /campanas/{id}`.

**Frontend:** toggle individual/masivo, `DestinatariosMultiSelect.jsx`, `CampanaDetalle.jsx`.

**Cierre:** SuperAdmin a N Admins y Admin a N clubes; cada uno responde en su hilo.

---

### Fase 4 — Badge de no leídos

**Backend:** `GET /no-leidos/count`

**Frontend:** `useUnreadMessages.js` (poll 90 s), badge en 3 sidebars.

**Cierre:** badge sube/baja; si falla API, app no crashea.

---

### Fase 5 — Extras (opcional)

- Adjuntos
- Copia SMTP externa
- Búsqueda
- Reporte de acuse

---

## Checklist anti-regresión (cada fase)

- [ ] `dotnet build` sin errores
- [ ] Migración EF aplica
- [ ] `npm run build` sin errores
- [ ] Login OK (SuperAdmin, Admin, Club)
- [ ] Sección existente probada (eventos o resultados)
- [ ] Mensajería probada según fase

---

## Reglas de negocio

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
- Soft delete por lado (remitente/destinatario)

---

## Modelo de datos (esquema `comunicacion`)

### `CampanasEnvio` (Fase 3+)

`IdCampana`, `RemitenteId`, `Asunto`, `Cuerpo`, `EnviadoEn`, `CantidadDestinatarios`, `TipoCampana`

### `Hilos`

`IdHilo`, `Asunto`, `IdCampana` (nullable), `CreadoEn`, `UltimoMensajeEn`

### `Mensajes`

`IdMensaje`, `HiloId`, `RemitenteId`, `DestinatarioId`, `Cuerpo`, `EnviadoEn`, `LeidoEn`, `EliminadoPorRemitente`, `EliminadoPorDestinatario`

---

## API REST (`api/mensajes`)

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
| `DELETE` | `/mensajes/{id}` | 0 |

---

## Frontend — rutas y componentes

| Ruta | Rol | Fase |
|------|-----|------|
| `/super/mensajes` | SuperAdmin | 1 |
| `/admin/mensajes` | Admin | 2 |
| `/club/mensajes` | Club | 2 |

**Componentes nuevos:**
- `MessageService.js`
- `MensajesSection.jsx`
- `DestinatariosMultiSelect.jsx` (Fase 3)
- `CampanaDetalle.jsx` (Fase 3)
- `useUnreadMessages.js` (Fase 4)

---

## Riesgos

1. No es chat grupal — cada destinatario del masivo tiene hilo privado.
2. `NotificationCenter` (regatas) ≠ mensajes privados.
3. Admin no ve hilos de otro Admin.
4. Backend rechaza envío masivo si algún destinatario es inválido.
5. Sin SMTP en MVP.
