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
Crea un archivo `.env` en la raíz del proyecto (basado en el archivo `.env.example` si existe) con la URL de tu backend local:
```env
VITE_API_URL=http://localhost:5029/api
VITE_SIGNALR_URL=http://localhost:5029/timingHub
```

### 4. Ejecutar el servidor de desarrollo
```bash
npm run dev
```

La aplicación estará disponible típicamente en `http://localhost:5173`.

---

## 🤝 Flujo de Autenticación
La aplicación utiliza un sistema de **autenticación JWT seguro mediante Cookies HttpOnly**.
1. El usuario inicia sesión (`/login`).
2. El servidor responde validando credenciales y setea una cookie inaccesible por JavaScript (para prevenir XSS).
3. `AuthContext.jsx` mantiene el estado de la sesión en React basándose en validaciones al endpoint `/auth/me`.
4. El cierre de sesión (`/auth/logout`) limpia la cookie de forma segura en el servidor.
