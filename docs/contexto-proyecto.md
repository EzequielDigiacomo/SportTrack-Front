# Contexto del Proyecto SportTrack / SIGDEF

> Documento de referencia para retomar trabajo sin re-leer todo el historial del chat.  
> Última actualización: julio 2026.

---

## 1. Repositorios y roles

| Repo | Ruta local | Deploy | Rol |
|------|------------|--------|-----|
| **SportTrack-Sigdef** | `c:\Users\EZEQU\source\repos\SportTrack-Sigdef` | Render: `https://sporttrack-sigdef.onrender.com` | Backend unificado (regatas + SIGDEF) |
| **SportTrack-Front** | `c:\Users\EZEQU\source\reposFront\SportTrack-Front` | Vercel: `https://sporttrack-fec.vercel.app` | Frontend competencias / eventos / jueces |
| **FrontSigdef** | `c:\Users\EZEQU\source\reposFront\FrontSigdef` | Vercel (SIGDEF) | Frontend administración federación |

**GitHub backend:** https://github.com/EzequielDigiacomo/SportTrack-Sigdef

**BD compartida (PostgreSQL en Render):** `sporttrack_sigdef_db`  
- Esquemas relevantes: `seguridad` (Usuarios), `regatas` (Fases, ReglasProgresion, etc.), catálogos compartidos.

---

## 2. URLs y variables de entorno

### Backend (Render)
- API base: `https://sporttrack-sigdef.onrender.com/api`
- Login: `POST /api/auth/login`
- Health: `GET /api/health`, `GET /api/health/db`
- Promover fases: `POST /api/fases/Promover/{eventoPruebaId}`
- Auditoría progresión: `GET /api/fases/ProgresionAudit/{eventoPruebaId}`

**Env Render (Web Service):**
- `ConnectionStrings__DefaultConnection` — connection string Npgsql con SSL
- Opcional: `DATABASE_URL` (Render) — `Program.cs` también lo lee vía `ResolveConnectionString`
- Opcional: `TokenKey` — JWT (hay default en código)

### Frontend SportTrack-Front (Vercel)
- **Variable obligatoria:** `VITE_API_URL=https://sporttrack-sigdef.onrender.com/api`
- **Importante:** las `VITE_*` se embeben en el build → cambiar env **requiere redeploy**
- `.env.production` en repo ya apunta a Render (correcto)
- `.env.local` es solo dev (proxy); **no** afecta producción

### FrontSigdef
- Actualizar `.env` a `https://sporttrack-sigdef.onrender.com/api` (antes apuntaba a `sporttrack-federaciones.onrender.com`)

---

## 3. Autenticación — problemas resueltos y decisiones

### Síntoma original
`Network Error` en login (`status: undefined`, `url: '/auth/login'`) desde Vercel.

### Causas encontradas (en orden)
1. **Front:** `VITE_API_URL` mal escrita o ausente en Production → axios usaba `/api` relativo (dominio Vercel).
2. **Back:** respuestas 401/500 **sin headers CORS** → el navegador bloqueaba → axios reportaba `Network Error`.
3. **Back:** hash BCrypt del seed **nunca correspondía a `admin123`** (comentario incorrecto en código).
4. **Front:** redirect post-login leía `data.rol` pero API devuelve `rolFederacion`.

### Fixes aplicados

**Backend (`SportTrack-Sigdef`):**
- `Middleware/ExceptionMiddleware.cs` — captura excepciones + aplica CORS en errores
- `AuthService.cs` — verify BCrypt seguro; mensajes UTF-8 corregidos
- `SportTrackDbContext.cs` — hash seed correcto para `admin123`:
  ```
  $2a$12$6ET.51wRwWnd/mscg3c8l.DcgbMBbQmVSqJ/pHpUcpNAPe4mzxoOS
  ```

**Frontend (`SportTrack-Front`):**
- `.env.production` → URL Render
- `src/utils/authHelpers.js` — `getUserRole()`, `getDashboardPathForRole()`
- `Login.jsx` + `AuthContext.jsx` — mapeo `rolFederacion` → `rol`; redirect SuperAdmin → `/super`

### Credenciales
- Seed: `admin` / `admin123` (rol `SuperAdmin`)
- `superadmin` — crear/resetear en BD con el hash BCrypt de arriba

**SQL reset superadmin:**
```sql
UPDATE seguridad."Usuarios"
SET "PasswordHash" = '$2a$12$6ET.51wRwWnd/mscg3c8l.DcgbMBbQmVSqJ/pHpUcpNAPe4mzxoOS',
    "IntentosFallidos" = 0,
    "EstaActivo" = true
WHERE LOWER("Username") IN ('superadmin', 'admin');
```

### Rutas protegidas (front)
- SuperAdmin / Admin → `/super`
- Club → `/club`
- Jueces → `/jueces/largador`, `/jueces/llegada`, `/juez-control`

---

## 4. Sistema de progresión ICF

### Documento de referencia
`SportTrack-Front/Documentacion/explicacion_sistema_progresion.md`

Define planes **A–G** (10–72 botes), variantes **1 y 2**, reglas de clasificación y **tablas de carriles** (`4/H1 → L5`, `Next BT → L9`, etc.).

### Estado ANTES (legacy)
- `PromoverFasesAsync` usaba reglas simplificadas + carriles **aleatorios** (`CrearFaseConResultados`)
- `PlanProgresionAsignado` se guardaba pero **no se usaba**
- Entidad `ReglaProgresion` en BD **sin uso**
- Planes E/F/G incompletos; máx. 3 semifinales

### Estado DESPUÉS (implementado)

**Nuevos archivos backend:**
```
SportTrack-Sigdef.Controladores/Fase/Progression/
├── ProgressionModels.cs      # SlotRule, BtSlotRule, ProgressionResult
├── ProgressionEngine.cs      # PromoteFromEliminatoria / PromoteFromSemifinal
└── ProgressionPlanRegistry.cs # Planes A1–G2 con tablas del doc
```

**Lógica:**
- Al sortear heats: `DeterminarPlanProgresion(count)` → `A1`, `B2`, etc. (variante aleatoria 1|2)
- Al **Promover Etapa**: motor ICF asigna carril exacto por heat+posición o BT (ordenado por tiempo)
- Eliminatoria → crea SF + Final A (parcial) con carriles ICF
- Semifinal → **fusiona** en Final A/B/C (no borra clasificados directos de heats)
- Hasta **4 semifinales** (planes F/G) y **Final C** (planes D–G)

**`PreGenerarSiguientesEtapasAsync`:**
| Heats | Semis | Finales |
|-------|-------|---------|
| 2 | 1 | A |
| 3 | 2 | A + B |
| 4–6 | 3 | A + B |
| 5+ | 3 | A + B + C |
| 7–8 | 4 | A + B + C |

**Nota:** sorteo inicial de eliminatorias sigue usando carriles centrales prioritarios (5,4,6,3,7,2,8,1,9). La distribución ICF exacta aplica al **promover** entre etapas.

**API auditoría:** `GET /api/fases/ProgresionAudit/{eventoPruebaId}`

**Front:**
- `FaseService.getProgresionAudit()`
- `ProgressionAuditPage.jsx` consume API (fallback: `utils/ProgressionEngine.js`)

### Flujo operativo para probar progresión
1. Generar fases (≥10 inscriptos)
2. Cargar tiempos oficiales en **todas** las series de la etapa
3. Finalizar fases / guardar tiempos
4. **Promover Etapa**
5. Verificar carriles en SF/Finales y en Auditoría de Progresión

---

## 5. Estructura de código clave

### Backend — archivos importantes
| Archivo | Responsabilidad |
|---------|-----------------|
| `Program.cs` | CORS, JWT, migraciones auto, DI, ExceptionMiddleware |
| `Controllers/Auth/AuthController.cs` | Login, cookie `X-Access-Token` |
| `Controllers/FasesController.cs` | CRUD fases, Generar, Promover, Audit |
| `Fase/FaseService.cs` | Sorteo, promoción ICF, cronograma |
| `Fase/Progression/*` | Motor y reglas ICF |
| `AccesoDatos/SportTrackDbContext.cs` | EF Core, seed admin, esquemas |
| `Controllers/Clubes/ClubesController.cs` | API clubes SportTrack-Front |
| `Controllers/SIGDEF/*` | Endpoints administración federación |

### Frontend SportTrack-Front — archivos importantes
| Archivo | Responsabilidad |
|---------|-----------------|
| `src/services/api.js` | Axios, baseURL, interceptors |
| `src/utils/constants.js` | `VITE_API_URL`, endpoints |
| `src/utils/authHelpers.js` | Rol y rutas dashboard |
| `src/context/AuthContext.jsx` | Sesión, normalizeUser |
| `src/pages/Auth/Login.jsx` | Login + redirect por rol |
| `src/components/SharedSections/useResultados.js` | Promover, sortear, tiempos |
| `src/services/FaseService.js` | API fases |
| `vercel.json` | SPA rewrites (todo → index.html) |

### Entidades BD compartidas (concepto)
- **Comunes:** Participante, Club, Federacion, AtletaFederacion
- **Regatas:** Evento, EventoPrueba, Etapa, Fase, Resultado, Inscripcion
- **SIGDEF:** entidades federación propias separadas

---

## 6. Decisiones de arquitectura tomadas

1. **Backend unificado** (`SportTrack-Sigdef`) reemplaza progresivamente `SportTrack-Federaciones` para frontends actuales.
2. **CORS permisivo** en dev/pruebas (`SetIsOriginAllowed(origin => true)` + credentials).
3. **ExceptionMiddleware antes de CORS** en pipeline, pero **inyecta headers CORS manualmente** en catch (crítico para cross-origin).
4. **Plan ICF en código estático** (`ProgressionPlanRegistry`) en lugar de BD `ReglaProgresion` — más simple y alineado al doc; entidad BD queda para futuro.
5. **IDs de plan:** `A1`, `B2`, etc. (alias `PlanA1` también resuelto). Antes era `Plan A1` con espacio.
6. **Alta atleta unificada:** `IAltaAtletaService` — upsert Participante + AtletaFederacion (integrado en varios servicios).
7. **Club dual:** `ClubesController` (SportTrack-Front) + rutas SIGDEF `ClubController`.

---

## 7. SaaS / planes (contexto)

- Planes SaaS en BD (`PlanesSaaS`) — SIGDEF/SportTrack/Pack Duo (S/M/L)
- `PlanGuard.jsx` en front — verifica `accesoSportTrack`, controles live
- SuperAdmin bypass de guards de plan
- Gestión SaaS en `/super` (SaaSManagement)

---

## 8. Deploy y git — estado habitual

### Render (backend)
- Push a `main` → auto-deploy
- Verificar logs: migraciones, connection string
- Cambios frecuentes sin push: `Program.cs` (DATABASE_URL), `HealthController`, progresión ICF

### Vercel (front)
- Push a `main` → build con env de Production
- Confirmar bundle JS nuevo (hash cambia, ej. `index-XXXX.js`)
- Hard refresh (`Ctrl+Shift+R`) tras deploy

---

## 9. Problemas pendientes / deuda técnica

| Prioridad | Item | Notas |
|-----------|------|-------|
| Alta | **Push + deploy** backend con progresión ICF + ExceptionMiddleware | Sin deploy en Render no hay progresión ICF en prod |
| Alta | **Push + deploy** front (authHelpers, auditoría, .env.production) | |
| Media | Actualizar **FrontSigdef** `.env` al backend nuevo | |
| Media | **Reset password** PostgreSQL si se expuso en chat | |
| Media | Verificar **Plan F/G** en regata real (reglas BT complejas) | Probar con datos reales |
| Baja | Usar entidad `ReglaProgresion` en BD o eliminar si no se usa | |
| Baja | Encoding legacy en algunos logs/strings viejos del backend | |
| Baja | `render_db_credentials.md` — no commitear secretos | |
| Baja | Tests automatizados progresión ICF | No existen aún |

---

## 10. Errores frecuentes y diagnóstico rápido

| Síntoma | Causa probable | Acción |
|---------|----------------|--------|
| `Network Error`, status undefined | URL API mal en build o CORS en error 500 | Ver `fullUrl` en consola; revisar CORS en respuesta |
| Login OK pero va a `/` (home) | `rolFederacion` no mapeado a `rol` | Verificar `authHelpers.js` desplegado |
| Contraseña incorrecta con hash “correcto” | Hash viejo en BD | SQL reset con hash BCrypt válido |
| Promover falla “faltan resultados” | Alguna serie sin tiempo guardado | Finalizar/guardar todas las series |
| Categorías OK, login no | Auth/Usuarios aparte de catálogos | Revisar tabla `seguridad.Usuarios` |
| Bundle viejo en browser | Cache | Hard refresh o ventana incógnito |

---

## 11. Comandos útiles

```powershell
# Build backend
cd c:\Users\EZEQU\source\repos\SportTrack-Sigdef
dotnet build

# Build front
cd c:\Users\EZEQU\source\reposFront\SportTrack-Front
npm run build

# Test login API
$body = '{"username":"admin","password":"admin123"}'
Invoke-WebRequest -Uri "https://sporttrack-sigdef.onrender.com/api/auth/login" `
  -Method POST -ContentType "application/json" -Body $body `
  -Headers @{Origin="https://sporttrack-fec.vercel.app"}
```

---

## 12. Commits recientes relevantes (referencia)

- Front: `enviroments` — `.env.production`, PlanGuard, AuthContext, api.js logging
- Front (local, verificar push): `authHelpers.js`, Login redirect, ProgressionAudit API
- Back (local, verificar push): ExceptionMiddleware, AuthService bcrypt, progresión ICF completa

---

*Este archivo debe actualizarse cuando cambien URLs, credenciales de deploy, o decisiones de arquitectura.*
