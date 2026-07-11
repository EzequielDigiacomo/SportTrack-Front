# SportTrack — Control de Acceso por Plan SaaS

> **Última actualización:** julio 2026

---

## ¿Qué es el Plan Guard?

SportTrack-Front verifica dos niveles de acceso basados en el plan SaaS:

1. **Acceso al sistema**: si el plan incluye SportTrack (o es Pack Dúo)
2. **Acceso a features avanzados**: si el plan es de talla L (controles en vivo)

---

## Planes y accesos

| Plan             | Acceso SportTrack | Tiempo Real | Controles Live |
|------------------|:-----------------:|:-----------:|:--------------:|
| SportTrack (S)   | ✅                | ❌          | ❌             |
| SportTrack (M)   | ✅                | ✅          | ❌             |
| SportTrack (L)   | ✅                | ✅          | ✅             |
| Pack Dúo (S)    | ✅                | ❌          | ❌             |
| Pack Dúo (M)    | ✅                | ✅          | ❌             |
| Pack Dúo (L)    | ✅                | ✅          | ✅             |
| SIGDEF (S/M/L)   | ❌                | —           | —              |

---

## Flujo de verificación

```
Usuario abre SportTrack-Front
    │
    ▼
AuthContext.checkSession()
    ├─ Llama a /auth/me (valida token/cookie)
    ├─ Restaura plan desde localStorage (ya que /auth/me no retorna el plan)
    └─ setUser({ ...userData, plan })
           │
           ▼
ProtectedRoute
    ├─ ¿Autenticado? No → /login
    ├─ ¿plan.accesoSportTrack === false? → PlanGuard (pantalla completa)
    ├─ ¿requiereControlesLive && !plan.accesoControlesLive? → PlanGuard (feature)
    └─ ¿Rol correcto? No → redirect a /
           └─ ✅ Renderiza la ruta
```

---

## Archivos clave

### `src/context/AuthContext.jsx`

Al hacer login, el `plan` llega en el response body (`AuthResponseDto.plan`) y se guarda en `localStorage` junto con el resto del usuario.

Al restaurar sesión (refresh de página), el plan **no está en `/auth/me`** (ese endpoint retorna `UsuarioDto` sin plan), por lo que se recupera del `localStorage`:

```js
const stored = localStorage.getItem(STORAGE_KEYS.USER_DATA);
if (stored) {
    const storedUser = JSON.parse(stored);
    if (storedUser.plan) normalized.plan = storedUser.plan;
}
```

### `src/components/Common/PlanGuard.jsx`

Dos variantes de pantalla de bloqueo:

**`PlanBloqueado`** — Pantalla completa, para acceso al sistema:
```jsx
<PlanGuard requiereSportTrack user={user}>
    {children}
</PlanGuard>
```

**`PlanBloqueadoFeature`** — Panel inline, para features de Plan L:
```jsx
<PlanGuard requiereControlesLive user={user}>
    {children}
</PlanGuard>
```

### `src/components/Common/ProtectedRoute.jsx`

El `ProtectedRoute` integra ambas verificaciones:

```jsx
const ProtectedRoute = ({ children, requiredRole, requiereControlesLive }) => {
    // ... loading y auth check ...

    const isSuperAdmin = rol === 'SuperAdmin' || rol === 'SUPERADMIN';

    if (!isSuperAdmin) {
        // 1. Verifica acceso al sistema
        if (user?.plan && !user.plan.accesoSportTrack) {
            return <PlanGuard requiereSportTrack user={user}>{children}</PlanGuard>;
        }
        // 2. Verifica acceso a controles live (solo Plan L)
        if (requiereControlesLive) {
            return <PlanGuard requiereControlesLive user={user}>{children}</PlanGuard>;
        }
    }

    // 3. Verifica rol
    // ...
};
```

### `src/App.jsx` — rutas protegidas con controles live

Todas las rutas de jueces llevan el prop `requiereControlesLive`:

```jsx
{/* Solo Plan L */}
<Route path="/jueces/largador" element={
    <ProtectedRoute requiredRole={['Admin','SuperAdmin','Largador']} requiereControlesLive>
        <JudgesLayout><StarterDashboard /></JudgesLayout>
    </ProtectedRoute>
} />

<Route path="/jueces/llegada" element={
    <ProtectedRoute requiredRole={['Admin','SuperAdmin','Cronometrista']} requiereControlesLive>
        <JudgesLayout><FinisherDashboard /></JudgesLayout>
    </ProtectedRoute>
} />

<Route path="/juez-control/*" element={
    <ProtectedRoute requiredRole={['Admin','SuperAdmin','JuezControl']} requiereControlesLive>
        <JudgesLayout><JuezControlDashboard /></JudgesLayout>
    </ProtectedRoute>
} />
```

---

## Features disponibles por talla

### Plan S
- Gestión de eventos y regatas
- Inscripciones y resultados básicos
- Exportación a Excel

### Plan M (todo S, más:)
- **Resultados en tiempo real** vía SignalR

### Plan L (todo M, más:)
- **Panel de Largador** (`/jueces/largador`) — `StarterDashboard.jsx`
- **Panel de Cronometrista** (`/jueces/llegada`) — `FinisherDashboard.jsx`
- **Juez de Control** (`/juez-control/*`) — `JuezControlDashboard.jsx`
- **Carga manual de tiempos** (`/jueces/carga-manual`)
- Soporte prioritario

---

## Pantallas de bloqueo

### Acceso al sistema (plan no compatible)
Fondo oscuro, ícono `ShieldOff` en rojo, mensaje explicativo y lista de planes disponibles. Se muestra cuando el plan es solo SIGDEF y el usuario intenta acceder a SportTrack.

### Feature exclusiva Plan L
Panel amarillo/ámbar, ícono `ShieldOff`, título "Función exclusiva del Plan L", mensaje con nombre del plan actual. Se muestra dentro de la app cuando el plan es S o M y el usuario navega a rutas de jueces.

---

## Casos de error comunes

| Situación | Resultado |
|-----------|-----------|
| Federación con plan SIGDEF entra a SportTrack | Pantalla "Acceso no disponible" |
| Plan M intenta abrir `/jueces/largador` | Pantalla "Función exclusiva del Plan L" |
| Sin plan asignado | Pantalla "Sin plan asignado" |
| Token/cookie expirado | Redirect a `/login` |
| Suscripción vencida o bloqueada | Backend rechaza el login |
