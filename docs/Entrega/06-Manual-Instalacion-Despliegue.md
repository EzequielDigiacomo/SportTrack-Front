# 06 — Manual de Instalación y Despliegue

**Proyecto:** SportTrack — Frontend de Competencias
**Última actualización: 2026-09-27**
**Audiencia:** desarrolladores, DevOps y responsables de puesta en marcha

---

## Índice

1. [Requisitos previos](#1-requisitos-previos)
2. [Obtención del código](#2-obtención-del-código)
3. [Instalación de dependencias](#3-instalación-de-dependencias)
4. [Configuración del entorno](#4-configuración-del-entorno)
5. [Ejecución local](#5-ejecución-local)
6. [Build de producción](#6-build-de-producción)
7. [Despliegue web (Vercel)](#7-despliegue-web-vercel)
8. [Build Android con Capacitor](#8-build-android-con-capacitor)
9. [Verificación y checklist de entrega](#9-verificación-y-checklist-de-entrega)
10. [Resolución de problemas de instalación](#10-resolución-de-problemas-de-instalación)
11. [Pie del pack](#pie-del-pack)

---

## 1. Requisitos previos

### 1.1 Software requerido

| Requisito | Versión | Notas |
|-----------|---------|-------|
| **Node.js** | 18 LTS o superior (recomendado 20 LTS) | Requerido por Vite 5. |
| **npm** | 9+ | Incluido con Node. |
| **Git** | Reciente | Para clonar el repositorio. |
| **Navegador** | Chrome/Edge/Firefox actualizado | La app usa Web Audio y WebSocket. |

### 1.2 Requisitos opcionales

| Requisito | Uso |
|-----------|-----|
| **Java JDK 17** + **Android Studio** | Necesarios solo para el build Android (Capacitor). |
| **Android SDK** | Para compilar el APK/AAB. |

### 1.3 Acceso a servicios

| Servicio | Necesario para |
|----------|----------------|
| **API SportTrack / SIGDEF** | Consumir datos (`https://sporttrack-sigdef.onrender.com/api`). |
| **Hub SignalR** | Resultados en vivo (`https://sporttrack-sigdef.onrender.com/hubs/timing`). |
| **Cuenta Vercel** | Despliegue web. |
| **Cuenta SuperAdmin** | Validar funciones de administración. |

---

## 2. Obtención del código

```bash
git clone <URL-del-repositorio-SportTrack-Front>
cd SportTrack-Front
```

> Ruta local de referencia: `c:\Users\EZEQU\source\reposFront\SportTrack-Front`.

---

## 3. Instalación de dependencias

```bash
npm install
```

Esto instala las dependencias declaradas en `package.json` (React, Vite, SignalR, axios, jsPDF, Capacitor, etc.).

---

## 4. Configuración del entorno

### 4.1 Crear el archivo de entorno

Copiá la plantilla según el entorno:

```bash
# Desarrollo web
cp .env.example .env.development

# Producción (build / Vercel)
cp .env.example .env.production

# Build Android (Capacitor)
cp .env.example .env.capacitor
```

### 4.2 Variables de entorno

| Variable | Descripción | Ejemplo (dev) | Ejemplo (prod) |
|----------|-------------|---------------|----------------|
| `VITE_API_URL` | URL base de la API, incluye `/api` | `http://localhost:5029/api` | `https://sporttrack-sigdef.onrender.com/api` |
| `VITE_SIGNALR_HUB_URL` | Hub SignalR de tiempos | `http://localhost:5029/hubs/timing` | `https://sporttrack-sigdef.onrender.com/hubs/timing` |
| `VITE_PUBLIC_APP_URL` | URL pública de la app (links de live) | `http://localhost:5174` | `https://<tu-dominio>` |
| `VITE_API_TARGET` | Destino del proxy de Vite (solo dev) | `https://sporttrack-sigdef.onrender.com` | — |

> ⚠️ **Los archivos `.env*` no se versionan.** En **Vercel** se cargan en *Settings → Environment Variables*. Nunca subas credenciales reales al repositorio.

### 4.3 Proxy de desarrollo

`vite.config.js` define un proxy que redirige `/api` y `/hubs` (con `ws: true`) hacia `VITE_API_TARGET`. Esto permite trabajar con rutas relativas sin problemas de CORS en desarrollo.

---

## 5. Ejecución local

### 5.1 Modo desarrollo

```bash
npm run dev
```

- La app queda disponible en **`http://localhost:5174`** (configurado con `strictPort: true`).
- Si el puerto 5174 está ocupado, Vite **fallará** (no cambia de puerto). Liberá el puerto o ajustá `server.port`.
- El `host: true` permite abrir la app desde otro dispositivo de la red local (útil para probar en tablet/móvil).

> **Nota.** La documentación previa menciona `localhost:5173`; este proyecto usa **5174** por configuración explícita.

### 5.2 Verificar que la API responde

1. Abrí la app y navegá a `/login`.
2. Iniciá sesión con un usuario válido.
3. Si aparece un error de red, verificá `VITE_API_URL` y que el backend esté disponible.

### 5.3 Previsualizar el build

```bash
npm run build
npm run preview
```

---

## 6. Build de producción

```bash
npm run build
```

- Genera la carpeta `dist/` con los assets optimizados.
- `base` es `/` (salvo en modo `capacitor`, que usa `./`).

Verificá el resultado localmente con `npm run preview` antes de desplegar.

---

## 7. Despliegue web (Vercel)

### 7.1 Primera puesta en marcha

1. Ingresá a Vercel y **creá un nuevo proyecto** importando el repositorio.
2. Framework preset: **Vite**.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. En **Settings → Environment Variables**, cargá (para Production y Preview):

| Variable | Valor producción |
|----------|------------------|
| `VITE_API_URL` | `https://sporttrack-sigdef.onrender.com/api` |
| `VITE_SIGNALR_HUB_URL` | `https://sporttrack-sigdef.onrender.com/hubs/timing` |
| `VITE_PUBLIC_APP_URL` | URL pública del sitio en Vercel |

6. Deploy.

### 7.2 Consideraciones

- **Rutas del SPA:** Vercel sirve `index.html` para rutas desconocidas (rewrite). Verificá que `/resultados/:id` y `/planes/:id` funcionen al recargar.
- **CORS y cookies:** al ser cross-origin (Vercel → Render), la app usa **Bearer token**; las cookies third-party pueden bloquearse (esperado, ver documento 05 §11).
- **SignalR sobre HTTPS:** Vercel sirve por HTTPS; el hub debe ser accesible por WSS.

### 7.3 Actualizaciones

- Cada push a la rama de producción dispara un nuevo deploy.
- Los cambios de variables de entorno requieren **redeploy** para tomar efecto.

---

## 8. Build Android con Capacitor

### 8.1 Requisitos

- Java JDK 17 y Android Studio instalados.
- Proyecto Android sincronizado (`android/`).

### 8.2 Generar el build

```bash
# Build en modo capacitor + sincronización con Android
npm run build:android

# Abrir Android Studio
npm run open:android
```

### 8.3 Configuración

`capacitor.config.json` define:

| Clave | Valor |
|-------|-------|
| `appId` | `com.sporttrack.jueces` |
| `appName` | `SportTrack Jueces` |
| `webDir` | `dist` |
| `androidScheme` | `https` |
| `allowNavigation` | `https://sporttrack-sigdef.onrender.com/*` |
| `CapacitorHttp` | `enabled: true` |
| `Keyboard` | `resize: native`, `style: DARK` |
| `StatusBar` | `overlaysWebView: false`, `style: DARK` |

### 8.4 Notas específicas de Android

- En nativo, `api.js` usa **solo Bearer** (sin `withCredentials`) porque las cookies cross-origin rompen el login por CORS.
- El timeout de la API se amplía a **45 s** en nativo.
- Verificá que el dispositivo tenga acceso HTTPS al backend.

### 8.5 Generar el APK/AAB

1. Con Android Studio abierto, usá **Build → Generate Signed Bundle / APK**.
2. Firmá con tu keystore.
3. Distribuí el artefacto (instalación directa o Play Store).

---

## 9. Verificación y checklist de entrega

### 9.1 Verificación funcional mínima

| # | Verificación | Resultado esperado |
|---|--------------|--------------------|
| 1 | `npm run dev` levanta en 5174 | App carga sin errores en consola. |
| 2 | Login de Admin | Redirige a `/super`. |
| 3 | Login de Club | Redirige a `/club`. |
| 4 | Login de Largador/Cronometrista | Redirige a `/jueces/largador` o `/jueces/llegada` (con plan tier L). |
| 5 | Ruta pública `/resultados/:id` | Muestra resultados sin login. |
| 6 | Guard de plan | Un plan sin controles live muestra la pantalla de bloqueo. |
| 7 | Conexión SignalR | Estado "Conectado" en la consola de juez. |
| 8 | Largada de una serie | El cronometrista recibe la señal y suena el timbre. |
| 9 | Captura de tiempos | Los tiempos se reflejan en la pizarra. |
| 10 | Exportación PDF | Se descarga el archivo correcto. |
| 11 | Corte de red simulado | Los tiempos se encolan y se sincronizan al volver. |
| 12 | Colas temporales (Soporte) | Se listan, confirman y descartan entradas. |

### 9.2 Checklist de entrega

- [ ] Node 18+ y dependencias instaladas (`npm install` sin errores).
- [ ] `.env` configurado con `VITE_API_URL`, `VITE_SIGNALR_HUB_URL`, `VITE_PUBLIC_APP_URL`.
- [ ] `npm run build` finaliza sin errores.
- [ ] `dist/` generado y verificado con `npm run preview`.
- [ ] Variables de entorno cargadas en Vercel.
- [ ] Deploy web accesible y rutas del SPA funcionando al recargar.
- [ ] Login y guards por rol/plan probados.
- [ ] SignalR conectando en producción (WSS).
- [ ] Exportaciones PDF/CSV operativas.
- [ ] Cola offline y outbox verificados con Soporte.
- [ ] (Opcional) `npm run build:android` exitoso y APK generado.
- [ ] Documentación de entrega (`docs/Entrega/`) revisada y actualizada.

---

## 10. Resolución de problemas de instalación

| Problema | Causa | Solución |
|----------|-------|----------|
| `npm install` falla | Node desactualizado o caché corrupta | Actualizar Node; `npm cache clean --force`. |
| El puerto 5174 está en uso | Otro proceso ocupa el puerto | Cerrar el proceso o cambiar `server.port`; recordá `strictPort`. |
| Error de CORS en dev | Proxy mal configurado | Verificar `VITE_API_TARGET` y que `/api` y `/hubs` usen `changeOrigin`. |
| Login falla en Android | Cookies cross-origin | Ya mitigado: en nativo se usa solo Bearer. Verificar `CapacitorHttp`. |
| SignalR no conecta en prod | Hub/URL incorrectos | Verificar `VITE_SIGNALR_HUB_URL` y el redeploy tras cambiarla. |
| Rutas 404 al recargar en Vercel | Falta rewrite del SPA | Configurar fallback a `index.html`. |
| Build `capacitor` con assets rotos | `base` incorrecto | El modo `capacitor` debe usar `base: './'` (ya configurado). |
| El timbre no suena en móvil | Autoplay bloqueado | Requerir un gesto del usuario antes de la largada. |

---

## Pie del pack

| Documento anterior | Documento actual | Documento siguiente |
|--------------------|------------------|---------------------|
| [← 05 Manual Técnico](./05-Manual-Tecnico.md) | **06 — Manual de Instalación y Despliegue** | *(fin del pack)* |

[README](./README.md) · [01](./01-Requerimientos-Usuario.md) · [02](./02-Casos-de-Uso.md) · [03](./03-Diagramas-de-Flujo.md) · [04](./04-Manual-de-Usuario.md) · [05](./05-Manual-Tecnico.md) · [06](./06-Manual-Instalacion-Despliegue.md)
