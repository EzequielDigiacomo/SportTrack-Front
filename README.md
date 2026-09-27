# SportTrack Frontend - Aplicación Web 🌐🚣‍♂️

SportTrack es la plataforma pública y administrativa para la gestión en tiempo real de competencias de remo y canotaje. Este repositorio contiene el código fuente de la interfaz de usuario (Frontend), diseñada para ofrecer una experiencia rápida, moderna y responsiva.

## Documentación

➡️ **Toda la documentación está en [`docs/`](./docs/README.md)**  
(guías, casos de uso, criterios, técnico, entrega, referencia).

> Padrón federativo SIGDEF (tutores, accesos, clubes): ver repo **FrontSigdef** → `docs/`.  
> API: **SportTrack-Sigdef** → `docs/`.

---

## ✨ Características de la Plataforma

*   **Pizarra de Resultados en Vivo (Live Results):** Acceso público e instantáneo a los tiempos oficiales de cada regata mediante **SignalR**, sin necesidad de registro ni de recargar la página.
*   **Dashboards Basados en Roles:**
    *   **SuperAdministrador:** Gestión de clubes, usuarios, configuración global, modelos de suscripción SaaS y logs del sistema.
    *   **Clubes (Federaciones):** Inscripción de atletas en eventos, administración de perfiles y reportes.
    *   **Jueces (Largador/Cronometrista):** Interfaces especializadas para dar inicio a las competencias y marcar tiempos de llegada con alta precisión.
*   **Diseño Premium y Moderno:** Interfaz estilizada con efectos Glassmorphism, animaciones suaves, gráficos interactivos (globo terráqueo en 3D interactivo real) y paletas de colores cuidadosamente curadas.
*   **Modo Oscuro/Claro:** Implementado en todo el sistema con recordatorio de preferencia de usuario.

---

## 🛠️ Stack Tecnológico

El proyecto está construido con herramientas modernas para asegurar un rendimiento excepcional:

*   **Librería Principal:** React 18 (Vite)
*   **Enrutamiento:** React Router DOM v6
*   **Comunicación Real-Time:** `@microsoft/signalr`
*   **Mapas y Visualizaciones 3D:** `react-simple-maps` y `d3-geo` (Para el globo terráqueo ortográfico)
*   **Iconografía:** `lucide-react`
*   **Estilos:** Vanilla CSS con metodologías modernas (CSS Grid, Variables CSS, animaciones nativas).

---

## 📁 Estructura del Código

El proyecto sigue una estructura modular orientada a componentes:

*   `src/assets`: Recursos estáticos (imágenes, logos).
*   `src/components`: 
    *   `/Common`: Componentes reutilizables (Botones, Modales, Toggle de Tema, Notificaciones, el Globo 3D).
    *   `/Layout`: Componentes estructurales (Navbars, Sidebars, MainLayout, AdminLayout).
    *   `/SharedSections`: Secciones de uso cruzado entre distintos roles.
*   `src/context`: Manejadores de estado global (Ej: `AuthContext.jsx` para la sesión y el JWT).
*   `src/pages`: Las vistas principales divididas por dominio (Home, Super, Judges, Auth, etc.).
*   `src/services`: Capa de comunicación con el Backend (`api.js`, `AuthService.js`, `TimingSignalRService.js`, etc.).
*   `src/utils`: Constantes y funciones de ayuda (`constants.js`).

---

## 🚀 Instalación y Uso Local

Para correr este proyecto en tu máquina local, sigue estos pasos:

### 1. Clonar el repositorio
```bash
git clone https://github.com/EzequielDigiacomo/SportTrack-Front.git
cd SportTrack-Front
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Variables de Entorno
Copiá el ejemplo y ajustá URLs según tu backend local:

```bash
cp .env.example .env.development
```

Claves (ver `.env.example`):

```env
VITE_API_URL=http://localhost:5029/api
VITE_SIGNALR_HUB_URL=http://localhost:5029/hubs/timing
VITE_PUBLIC_APP_URL=http://localhost:5173
```

Los archivos `.env*` **no** se versionan. En Vercel, cargá las mismas claves en **Settings → Environment Variables** antes del deploy de producción.

### 4. Ejecutar el servidor de desarrollo
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5174` (puerto configurado con `strictPort: true` en `vite.config.js`).

---

## 🤝 Flujo de Autenticación
La aplicación utiliza un sistema de **autenticación JWT híbrido**: el token se envía como `Authorization: Bearer` (persistido en `localStorage`) y, además, el backend setea la cookie `X-Access-Token` (HttpOnly). El **Bearer es la fuente de verdad**, porque en el despliegue cross-origin (Vercel → Render) las cookies de terceros suelen bloquearse; en la app Android (Capacitor) se usa **solo Bearer**.
1. El usuario inicia sesión (`/login`); el servidor valida credenciales y devuelve el token, los datos del usuario y su plan, y setea la cookie.
2. `AuthContext.jsx` normaliza y persiste la sesión y mantiene el estado en React validando contra el endpoint `/auth/me`.
3. Cada request inyecta `Authorization: Bearer <token>` y el header `X-Client-App: sporttrack` (ver `services/api.js`).
4. Ante un `401`, el interceptor limpia el almacenamiento local y la sesión se considera expirada.
5. El cierre de sesión (`/auth/logout`) invalida la sesión en el servidor y limpia el estado local.
