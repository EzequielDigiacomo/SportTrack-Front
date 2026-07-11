# 🎨 Identidad Visual: Tríptico Ecuatoriano

El sistema utiliza la paleta de colores de la bandera de Ecuador para reforzar la identidad nacional en el deporte.

| Color | Variable CSS | Uso |
|-------|--------------|-----|
| **Amarillo** | `--color-accent` | Destacados, Ganadores, Oro, Seeded. |
| **Azul** | `--color-primary` | Cabezales, Botones principales, Estructura. |
| **Rojo** | `--color-secondary` | Acciones de peligro, Eliminatorias, Final. |

### 🛠️ Componentes Atomizados (Design System)

Hemos migrado el sistema a una arquitectura de **Atomic Design** para mejorar la reutilización:

- **SearchBox**: Componente de búsqueda premium con efectos de vidrio (glassmorphism).
- **ConfirmDialog**: Reemplazo de los diálogos nativos para una experiencia integrada.
- **AtletaGrid / EventGrid**: Visualización adaptable (Mobile First).

### 🔔 Notificaciones y Mensajes (Hooks)

Se ha implementado el hook `useAlert` para estandarizar las notificaciones de éxito y error en todos los formularios federativos.

```javascript
const { alert, showAlert } = useAlert();
// ...
showAlert('success', '¡Operación exitosa!');
```

### 🕒 Manejo de Fechas y Botes

Se han estandarizado las nomenclaturas de botes:
- **K1 / K2 / K4**: Kayak Individual, Doble y Cuádruple.
- **C1 / C2 / C4**: Canoa Individual, Doble y Cuádruple.
- Formato de fecha/hora: `HH:mm - DD/MM/YYYY`.

---

# 🎨 SportTrack: Guía de Estilo y Branding (Identidad Ecuador)

Este documento detalla el sistema de diseño visual de SportTrack, basado en la identidad nacional de Ecuador y optimizado para entornos deportivos de alto rendimiento.

---

## 1. Paleta de Colores Oficial (Tricolor 🇪🇨)

La paleta se fundamenta en los colores de la bandera nacional, equilibrados para un entorno de "Modo Oscuro" (Dark Mode) con estética premium.

### 1.1 Colores Nucleares
| Color | Uso | Hexadecimal | HSL | Variable CSS |
| :--- | :--- | :--- | :--- | :--- |
| **Azul Ecuador** | Primario: Botones, Cabeceras, Identidad | `#006BB6` | `204, 100%, 36%` | `--color-primary` |
| **Rojo Ecuador** | Secundario: Alertas, Peligro, Destacados | `#EF3340` | `356, 84%, 57%` | `--color-secondary` |
| **Amarillo Ecuador**| Acento: Indicadores, Glow, Reglas | `#FFDD00` | `51, 100%, 50%` | `--color-accent` |

### 1.2 Colores de Superficie (Dark Mode)
*   **Fondo Primario:** `hsl(220, 20%, 8%)` - Un azul oscuro profundo casi negro.
*   **Superficie (Cards/Modales):** `hsl(220, 15%, 14%)` - Con transparencia del 5% y desenfoque de fondo (glassmorphism).

---

## 2. Tipografía

*   **Fuente Principal:** `Inter`, Sans-serif.
*   **Estilos:** 
    *   Normal: 400
    *   Medium: 600
    *   Bold: 800 (Para títulos y énfasis técnico).

---

## 3. Implementación en Componentes

### 3.1 Chips de Reglas de Competencia (Dashboard)
Para diferenciar visualmente las reglas, se utiliza la lógica tricolor:
*   **Amarillo (`.chip-ecu-yellow`)**: Reglas de base o estructurales (Ej: Categoría Única).
*   **Azul (`.chip-ecu-blue`)**: Permisos especiales o identidad (Ej: Sub23 en Senior).
*   **Rojo (`.chip-ecu-red`)**: Limitaciones críticas o de seguridad (Ej: Límite de Botes A/B).

### 3.2 Exportación de Documentos (PDF)
El cronograma oficial utiliza un esquema tricolor para el membrete:
*   Título en **Rojo**.
*   Cabeceras de tabla en **Azul**.
*   Línea divisoria tricolor decorativa.
*   **Alternancia de Grilla**: Para legibilidad en pista, se usa un sombreado triple: Blanco -> Gris Claro -> Gris Medio.

---

## 4. Referencia Técnica (index.css)

Las variables maestras están centralizadas en el `root` de `src/index.css`. Para usar un color oficial, siempre referenciar la variable nativa:

```css
.mi-componente {
    background: var(--color-primary); /* Azul Ecuador */
    border-color: var(--color-accent); /* Amarillo Ecuador */
    color: var(--color-text-primary);
}
```
