# Contexto del Proyecto SportTrack / SIGDEF

> Documento de referencia compartido entre los **3 repositorios**.  
> Copias: `SportTrack-Front/docs/`, `SportTrack-Sigdef/docs/`, `FrontSigdef/docs/`  
> Última actualización: julio 2026.

---

## 1. Repositorios y roles

| Repo | Ruta local | Deploy | Rol |
|------|------------|--------|-----|
| **SportTrack-Sigdef** | `c:\Users\EZEQU\source\repos\SportTrack-Sigdef` | Render: `https://sporttrack-sigdef.onrender.com` | Backend unificado (.NET 8): regatas + SIGDEF + SaaS |
| **SportTrack-Front** | `c:\Users\EZEQU\source\reposFront\SportTrack-Front` | Vercel: `https://sporttrack-fec.vercel.app` | Frontend **competencias**: eventos, jueces, cronometraje, panel SuperAdmin SportTrack |
| **FrontSigdef** | `c:\Users\EZEQU\source\reposFront\FrontSigdef` | Vercel (SIGDEF) | Frontend **administración federación**: atletas, clubes, delegados, SuperAdmin SaaS |

**GitHub backend:** https://github.com/EzequielDigiacomo/SportTrack-Sigdef

**BD compartida (PostgreSQL en Render):** `sporttrack_sigdef_db`

| Esquema | Contenido |
|---------|-----------|
| `seguridad` | Usuarios, auth |
| `regatas` | Eventos, Fases, Resultados, Inscripciones |
| `federacion` | Federaciones, Clubes SIGDEF, AtletasFederacion, Delegados, etc. |
| Catálogos | Botes, Categorías, Distancias, PlanesSaaS |
| Público | Auditoria |

**Principio:** un solo backend sirve a **ambos frontends**. Los frontends solo difieren en módulos expuestos y guards de plan.

---

## 2. URLs y variables de entorno

### Backend (Render)
- API base: `https://sporttrack-sigdef.onrender.com/api`
- SignalR: `https://sporttrack-sigdef.onrender.com/hubs/timing`
- Login: `POST /api/auth/login`
- Health: `GET /api/health`, `GET /api/health/db`

**Env Render (Web Service):**
- `ConnectionStrings__DefaultConnection` — Npgsql con SSL
- Opcional: `DATABASE_URL` — `Program.cs` lo lee vía `ResolveConnectionString`
- Opcional: `TokenKey` — clave JWT (**debe ser la misma** en firma y validación)

### SportTrack-Front (Vercel)
- **Obligatorio:** `VITE_API_URL=https://sporttrack-sigdef.onrender.com/api`
- **Obligatorio:** `VITE_SIGNALR_HUB_URL=https://sporttrack-sigdef.onrender.com/hubs/timing`
- Las `VITE_*` se embeben en el build → cambiar env **requiere redeploy**
- `.env.production` en repo apunta a Render
- `.env.local` solo dev (proxy Vite); no afecta producción

### FrontSigdef (Vercel)
- **Obligatorio:** `VITE_API_URL=https://sporttrack-sigdef.onrender.com/api`
- ⚠️ El `.env` local aún puede apuntar a `sporttrack-federaciones.onrender.com` (legacy) — **actualizar antes de deploy**
- Stack: React 19 + Vite, fetch nativo (no axios), Capacitor Android opcional
- Token en `localStorage` key `user` (objeto con `.token`)

---

## 3. Autenticación

### Modelo
- JWT en header `Authorization: Bearer {token}` + cookie HttpOnly `X-Access-Token` (5 h)
- Cross-origin Vercel → Render: **cookies third-party suelen bloquearse** → el Bearer en localStorage es crítico
- Roles backend (`RolFederacion`): `SuperAdmin`, `Admin`, `Club`, `Largador`, `Cronometrista`, `JuezControl`, `soporte_tecnico`

### Problemas resueltos

| # | Síntoma | Causa | Fix |
|---|---------|-------|-----|
| 1 | `Network Error` en login | `VITE_API_URL` ausente → axios pegaba al dominio Vercel | `.env.production` con URL Render |
| 2 | `Network Error` en errores 401/500 | Respuestas sin CORS | `ExceptionMiddleware` inyecta headers CORS |
| 3 | Login falla con hash “correcto” | Seed BCrypt no correspondía a `admin123` | Hash corregido en `SportTrackDbContext` |
| 4 | Redirect post-login a `/` | API devuelve `rolFederacion`, front leía `rol` | `authHelpers.js` + `AuthContext` |
| 5 | **401 en endpoints protegidos** (ej. crear federación) | `TokenService` y `Program.cs` usaban **defaults distintos** de `TokenKey` | Unificados en `TokenService.cs` |
| 6 | **401 con token válido en localStorage** | JWT leía cookie vieja antes que Bearer | `Program.cs`: priorizar header `Authorization` |

### Fixes aplicados (detalle)

**Backend:**
- `Middleware/ExceptionMiddleware.cs` — CORS en errores
- `Auth/AuthService.cs` — BCrypt seguro
- `Auth/TokenService.cs` — misma default key que `Program.cs`
- `Program.cs` — JwtBearer prioriza Bearer sobre cookie

**SportTrack-Front:**
- `src/services/api.js` — token desde `AUTH_TOKEN` o `USER_DATA`; limpia ambos en 401
- `src/pages/Auth/Login.jsx` — `data.token || data.Token`
- `src/context/AuthContext.jsx` — limpia token en sesión inválida
- `src/pages/Super/sections/GestionFederacionesSection.jsx` — guard SuperAdmin + mensajes 401/403

**FrontSigdef:**
- `src/context/AuthContext.jsx` — `Token`/`rolFederacion` fallback; jwt-decode para rol
- `src/pages/SuperAdmin/SuperDashboard.jsx` — datos reales (sin mocks)
- `src/pages/SuperAdmin/Auditoria.jsx` — `/support/logs`

### Credenciales seed
- `admin` / `admin123` → rol `SuperAdmin`

**SQL reset password:**
```sql
UPDATE seguridad."Usuarios"
SET "PasswordHash" = '$2a$12$6ET.51wRwWnd/mscg3c8l.DcgbMBbQmVSqJ/pHpUcpNAPe4mzxoOS',
    "IntentosFallidos" = 0,
    "EstaActivo" = true
WHERE LOWER("Username") IN ('superadmin', 'admin');
```

### Rutas post-login

| Rol | SportTrack-Front | FrontSigdef |
|-----|------------------|-------------|
| SuperAdmin | `/super` | `/superadmin` |
| Admin (federación) | `/super` | `/dashboard` |
| Club | `/club` | `/club` |
| Largador | `/jueces/largador` | — |
| Cronometrista | `/jueces/llegada` | — |
| JuezControl | `/juez-control` | — |

---

## 4. API — endpoints clave por dominio

### Auth
| Método | Ruta | Auth | Notas |
|--------|------|------|-------|
| POST | `/auth/login` | No | Devuelve token + setea cookie |
| GET | `/auth/me` | Sí | Valida sesión |
| POST | `/auth/logout` | No | Borra cookie |

### Regatas (SportTrack-Front)
| Método | Ruta | Notas |
|--------|------|-------|
| GET/POST | `/fases/*` | Generar, Promover, BatchUpdate |
| GET | `/fases/ProgresionAudit/{eventoPruebaId}` | Auditoría progresión ICF |
| GET/POST | `/eventos`, `/inscripciones`, `/resultados` | CRUD competencias |
| GET | `/participantes` | Filtrado por rol/club |

### SIGDEF (FrontSigdef)
| Método | Ruta | Auth | Notas |
|--------|------|------|-------|
| GET | `/Federaciones`, `/Federaciones/{id}` | Parcial | Listado público GET |
| POST | `/Federaciones` | SuperAdmin | Alta simple |
| PUT/DELETE | `/Federaciones/{id}` | SuperAdmin/Admin | |
| GET/POST | `/Clubes`, `/Atleta`, `/DelegadoClub`, etc. | Según controller | Ver `Controllers/SIGDEF/*` |
| GET | `/Participantes` | No `[Authorize]` | Filtra por rol en servicio |

### SaaS / SuperAdmin
| Método | Ruta | Rol | Notas |
|--------|------|-----|-------|
| GET | `/saas/planes` | Auth | Catálogo PlanesSaaS |
| GET | `/saas/clubes-status` | SuperAdmin, Admin, soporte | Estado por federación |
| GET | `/saas/global-metrics` | SuperAdmin, soporte | KPIs dashboard |
| POST | `/saas/create-federacion` | **SuperAdmin** | Alta federación + admin |
| PATCH | `/saas/clubes/{id}/toggle-activo` | SuperAdmin, Admin, soporte | |
| POST | `/saas/asignar-plan` | SuperAdmin, Admin | |

### Soporte / Auditoría
| Método | Ruta | Rol | Notas |
|--------|------|-----|-------|
| GET | `/support/logs?limit=N` | SuperAdmin, admin, soporte_tecnico | Tabla `Auditoria` |
| POST | `/support/frontend-error` | Anónimo | Reportes de crash front |

---

## 5. Sistema de progresión ICF (SportTrack-Front)

### Documento de referencia
`SportTrack-Front/Documentacion/explicacion_sistema_progresion.md`

Planes **A–G**, variantes **1 y 2**, tablas de carriles ICF.

### Implementación backend
```
SportTrack-Sigdef.Controladores/Fase/Progression/
├── ProgressionModels.cs
├── ProgressionEngine.cs
└── ProgressionPlanRegistry.cs   # Planes A1–G2 estáticos
```

- Sorteo heats: `DeterminarPlanProgresion(count)` → `A1`, `B2`, etc.
- **Promover Etapa:** motor ICF asigna carril por heat+posición o BT
- Hasta 4 semifinales (F/G) y Final C (D–G)
- Sorteo inicial eliminatorias: carriles centrales (5,4,6,3,7,2,8,1,9); ICF exacto al **promover**

### Front SportTrack-Front
- `FaseService.getProgresionAudit()`
- `ProgressionAuditPage.jsx` — API con fallback local `ProgressionEngine.js`

### Flujo de prueba
1. Generar fases (≥10 inscriptos)
2. Tiempos oficiales en **todas** las series
3. Finalizar / guardar tiempos
4. Promover Etapa
5. Verificar carriles + Auditoría de Progresión

---

## 6. Dashboard SuperAdmin SIGDEF (FrontSigdef)

### Antes (incorrecto)
`SuperDashboard.jsx` tenía **fallback a datos mock** si fallaba cualquier API:
- 4 federaciones ficticias (FAC, FUC, Chile, Brasil)
- 56 clubes, 1.540 atletas, $295.000 ARS
- Gráfico SVG estático, planes hardcodeados, logs mock

### Después (correcto)
Consume APIs reales; **sin fallback mock** (muestra 0 o “Sin datos”):

| Dato UI | Fuente API |
|---------|------------|
| Federaciones / clubes / atletas | `GET /saas/global-metrics` |
| Ingresos mensuales, facturando | `global-metrics` (suma precios planes activos) |
| Crecimiento atletas (gráfico) | `global-metrics.crecimientoMensual` (altas `AtletasFederados` últimos 6 meses) |
| Distribución planes | `global-metrics.distribucionPlanes` |
| Lista federaciones | `GET /saas/clubes-status` |
| Actividad reciente | `GET /support/logs?limit=8` |

`Auditoria.jsx` → `GET /support/logs?limit=100`

**Requisito:** sesión SuperAdmin válida (401 si token inválido).

### Backend — `GlobalMetricsDto` (campos)
- `TotalFederaciones`, `TotalClubesAfiliados`, `TotalAtletasGlobales`
- `IngresosMensuales`, `FederacionesFacturando`
- `PorcentajeCrecimientoAtletas` (mes actual vs anterior)
- `CrecimientoMensual[]`, `DistribucionPlanes[]`, `TopFederaciones[]`

---

## 7. Estructura de código por proyecto

### SportTrack-Sigdef (backend)

| Capa | Ruta | Contenido |
|------|------|-----------|
| API | `SportTrack-Sigdef/Controllers/` | Auth, Fases, Eventos, SaaS, SIGDEF, Support |
| Lógica | `SportTrack-Sigdef.Controladores/` | Services, Progression, Federaciones, SaaS |
| Datos | `SportTrack-Sigdef.AccesoDatos/` | DbContext, migrations |
| Entidades | `SportTrack-Sigdef.Entidades/` | Modelos EF |

**Archivos críticos:**
| Archivo | Responsabilidad |
|---------|-----------------|
| `Program.cs` | CORS, JWT, DI, migraciones auto, pipeline |
| `Controllers/Auth/AuthController.cs` | Login, cookie, logout |
| `Controllers/FasesController.cs` | Fases, Promover, ProgresionAudit |
| `Controllers/SaaSController.cs` | Planes, métricas, create-federacion |
| `Controllers/SupportController.cs` | Logs auditoría |
| `Controllers/SIGDEF/*` | Atletas, Clubes, Delegados, etc. |
| `Fase/FaseService.cs` + `Fase/Progression/*` | Motor regatas ICF |
| `SaaS/SaaSService.cs` | Métricas globales, alta federación |
| `AccesoDatos/SportTrackDbContext.cs` | Seed admin, esquemas |

### SportTrack-Front

| Archivo | Responsabilidad |
|---------|-----------------|
| `src/services/api.js` | Axios, Bearer, interceptors |
| `src/utils/constants.js` | URLs, endpoints, storage keys |
| `src/utils/authHelpers.js` | Rol y rutas dashboard |
| `src/context/AuthContext.jsx` | Sesión |
| `src/components/Common/ProtectedRoute.jsx` | Guard rol + plan |
| `src/components/Common/PlanGuard.jsx` | accesoSportTrack, controles live |
| `src/pages/Super/Dashboard.jsx` | Panel SuperAdmin SportTrack |
| `src/pages/Super/sections/GestionFederacionesSection.jsx` | CRUD federaciones SaaS |
| `src/pages/Super/sections/SaaSManagement.jsx` | Gestión planes |
| `src/pages/Super/sections/ProgressionAuditPage.jsx` | Auditoría ICF |
| `src/services/FaseService.js` | API fases |
| `src/services/TimingSignalRService.js` | Hub timing tiempo real |
| `vercel.json` | SPA rewrites |

**Rutas principales:** `/`, `/login`, `/club/*`, `/super/*`, `/jueces/*`, `/juez-control/*`

### FrontSigdef

| Archivo | Responsabilidad |
|---------|-----------------|
| `src/services/api.js` | Fetch wrapper, Bearer desde `user.token`, reescritura `/Club`→`/Clubes` |
| `src/context/AuthContext.jsx` | Login, jwt-decode, roles mapeados |
| `src/components/common/PlanGuard.jsx` | `requiereSigdef` |
| `src/pages/SuperAdmin/SuperDashboard.jsx` | Consola Superadmin (KPIs reales) |
| `src/pages/SuperAdmin/FederacionesManagement.jsx` | Gestión federaciones + planes |
| `src/pages/SuperAdmin/FederacionesForm.jsx` | Alta/edición (`POST /saas/create-federacion`) |
| `src/pages/SuperAdmin/Auditoria.jsx` | Bitácora |
| `src/pages/FederacionAdmin/*` | Panel federación (atletas, clubes, delegados…) |
| `src/pages/ClubAdmin/*` | Panel club |
| `src/App.jsx` | Rutas `/dashboard`, `/club`, `/superadmin` |

**Roles front mapeados:** `SUPERADMIN`, `FEDERACION`, `CLUB` (desde `rolFederacion` JWT)

---

## 8. Decisiones de arquitectura

1. **Backend unificado** reemplaza `SportTrack-Federaciones` (legacy).
2. **CORS permisivo** + credentials para dev cross-origin.
3. **ExceptionMiddleware** antes de CORS pero inyecta CORS en catch.
4. **Progresión ICF en código** (`ProgressionPlanRegistry`), no en BD `ReglaProgresion`.
5. **IDs plan:** `A1`, `B2` (alias `PlanA1` resuelto).
6. **Alta atleta unificada:** `IAltaAtletaService` → Participante + AtletaFederacion.
7. **Club dual:** `ClubesController` (SportTrack) + `SIGDEF/ClubController`.
8. **Auth cross-origin:** Bearer en localStorage es fuente de verdad; cookie es complemento.
9. **Dashboard SIGDEF:** nunca mock en producción; APIs `/saas/global-metrics` + `/saas/clubes-status`.

---

## 9. SaaS / planes

- Tabla `PlanesSaaS`: SIGDEF/SportTrack/Pack Duo (S/M/L) con `Precio`, límites atletas/torneos
- **SportTrack-Front** `PlanGuard`: `accesoSportTrack`, `accesoControlesLive` (solo plan L)
- **FrontSigdef** `PlanGuard`: `requiereSigdef`
- SuperAdmin bypass de guards de plan en ambos fronts
- Gestión: SportTrack-Front `/super/saas` y `/super/federaciones`; FrontSigdef `/superadmin/federaciones`

---

## 10. Deploy

### Render (backend)
- Push `main` → auto-deploy
- Verificar logs: migraciones, connection string, JWT
- Cambios recientes sin push: TokenKey unificado, global-metrics real, JwtBearer Bearer-first

### Vercel (fronts)
- Push `main` → build con env Production
- Confirmar hash JS nuevo tras deploy
- Hard refresh (`Ctrl+Shift+R`)
- **FrontSigdef:** verificar `VITE_API_URL` en dashboard Vercel (no solo `.env` local)

---

## 11. Problemas pendientes / deuda técnica

| Prioridad | Item | Repo |
|-----------|------|------|
| Alta | Push + deploy backend (JWT fix, global-metrics, progresión ICF) | Sigdef |
| Alta | Push + deploy SportTrack-Front (auth, federaciones, auditoría) | Front |
| Alta | Push + deploy FrontSigdef (dashboard real, auth, `.env` Vercel) | FrontSigdef |
| Alta | Actualizar `VITE_API_URL` FrontSigdef en Vercel (sigue legacy en `.env` local) | FrontSigdef |
| Media | Reset password PostgreSQL si se expuso | BD |
| Media | Probar planes F/G progresión con regata real | Sigdef |
| Media | Eventos/inscripciones en FrontSigdef (rutas comentadas en App.jsx) | FrontSigdef |
| Baja | Entidad `ReglaProgresion` en BD — usar o eliminar | Sigdef |
| Baja | Encoding legacy en strings backend | Sigdef |
| Baja | Tests automatizados progresión ICF | Sigdef |
| Baja | No commitear secretos (`render_db_credentials.md`, `.env`) | Todos |

---

## 12. Errores frecuentes y diagnóstico

| Síntoma | Causa probable | Acción |
|---------|----------------|--------|
| `Network Error`, status undefined | URL API mal en build o CORS en 500 | Ver `fullUrl` en consola |
| Login OK pero redirect incorrecto | `rolFederacion` no mapeado | `authHelpers.js` / AuthContext |
| **401 en POST** (create-federacion, saas) | Token inválido, TokenKey distinto, cookie stale | Re-login; deploy backend JWT fix; verificar header Bearer |
| **401 response.data vacío** | JwtBearer rechazó token | Cerrar sesión, volver a entrar como SuperAdmin |
| Dashboard SIGDEF muestra 4 feds / $295k | Bundle viejo con mocks o API falló sin deploy nuevo | Deploy FrontSigdef + login SuperAdmin |
| Contraseña incorrecta | Hash viejo en BD | SQL reset arriba |
| Promover falla “faltan resultados” | Serie sin tiempo | Guardar todos los tiempos |
| FrontSigdef pega a API vieja | `VITE_API_URL` legacy | Cambiar a `sporttrack-sigdef.onrender.com` |
| Bundle viejo | Cache browser | Incógnito / hard refresh |

---

## 13. Comandos útiles

```powershell
# Build backend
cd c:\Users\EZEQU\source\repos\SportTrack-Sigdef
dotnet build

# Build SportTrack-Front
cd c:\Users\EZEQU\source\reposFront\SportTrack-Front
npm run build

# Build FrontSigdef
cd c:\Users\EZEQU\source\reposFront\FrontSigdef
npm run build

# Test login API
$body = '{"username":"admin","password":"admin123"}'
Invoke-WebRequest -Uri "https://sporttrack-sigdef.onrender.com/api/auth/login" `
  -Method POST -ContentType "application/json" -Body $body `
  -Headers @{Origin="https://sporttrack-fec.vercel.app"}
```

---

## 14. Mapa mental — qué frontend usa qué

```
                    ┌─────────────────────────────┐
                    │   SportTrack-Sigdef (API)    │
                    │   PostgreSQL Render           │
                    └──────────────┬──────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
    ┌─────────▼─────────┐ ┌───────▼────────┐ ┌────────▼────────┐
    │ SportTrack-Front  │ │  FrontSigdef   │ │  SignalR Hub    │
    │ Regatas, jueces,  │ │  Atletas,      │ │  Timing live    │
    │ tiempos, ICF      │ │  clubes, SaaS  │ │  (SportTrack)   │
    └───────────────────┘ └────────────────┘ └─────────────────┘
```

---

*Actualizar este archivo cuando cambien URLs, auth, APIs de métricas, o decisiones de arquitectura. Mantener sincronizado en los 3 repos.*
