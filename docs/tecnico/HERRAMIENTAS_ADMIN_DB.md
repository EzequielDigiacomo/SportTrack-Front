# Guía de Herramientas de Emergencia y Gestión de Base de Datos
## SportTrack v1 - Soporte Técnico

Esta guía contiene los endpoints de emergencia habilitados para la gestión manual de la base de datos en producción (Render). Estos comandos se ejecutan directamente desde la barra de direcciones del navegador.

---

### 1. Diagnóstico de Datos
Usa este link para ver el estado actual de todos los eventos, clubes y usuarios (útil para encontrar IDs).
*   **URL:** `https://sporttrack-v1.onrender.com/api/debug-db`
*   **Uso:** Verás un JSON con la lista de eventos y sus respectivos `clubId`.

### 2. Recuperación de Eventos Huérfanos
Asigna **todos** los eventos que no tienen federación asignada (`clubId: null`) a una federación específica.
*   **Asignar a Fede Ecuatoriana (ID 1):**
    `https://sporttrack-v1.onrender.com/api/reclaim-orphans/1`
*   **Asignar a FACA (ID 15):**
    `https://sporttrack-v1.onrender.com/api/reclaim-orphans/15`

### 3. Asignación Individual de Eventos
Mueve un evento específico de una federación a otra usando sus IDs.
*   **URL:** `https://sporttrack-v1.onrender.com/api/assign-event/[ID_EVENTO]/[ID_FEDE]`
*   **Ejemplo:** Para mover el Evento con ID 5 a FACA (ID 15):
    `https://sporttrack-v1.onrender.com/api/assign-event/5/15`

### 4. Mantenimiento de Seguridad y Esquema
Si hay errores de "columna no existe" o problemas con las categorías base.
*   **URL:** `https://sporttrack-v1.onrender.com/api/fix-intentos-column`
*   **Función:** Crea la columna de intentos fallidos y asegura la existencia de la categoría "Control" sin errores de duplicidad.

---

> [!IMPORTANT]
> Estas herramientas son de **Uso Administrativo**. Una vez que la interfaz de SuperAdmin esté completa con estas opciones gráficas, estos endpoints podrán ser desactivados por seguridad.
