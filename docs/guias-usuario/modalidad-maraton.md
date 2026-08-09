# Manual de uso — Modalidad Maratón

Guía operativa para **eventos de modalidad Maratón** en SportTrack: configuración del evento, armado de largadas, Start List (números de competidor), cronometraje y oficialización de resultados.

Complementa el [manual de módulos de control](./modulos-control-competencia.md), que describe sobre todo el flujo de **velocidad / pista**.

---

## Índice

1. [Qué es Maratón en SportTrack](#1-qué-es-maratón-en-sporttrack)
2. [Glosario (evitar confusiones)](#2-glosario-evitar-confusiones)
3. [Diferencias vs Velocidad](#3-diferencias-vs-velocidad)
4. [Crear y configurar un evento Maratón](#4-crear-y-configurar-un-evento-maratón)
5. [Armar el programa (largadas)](#5-armar-el-programa-largadas)
6. [Inscripciones](#6-inscripciones)
7. [Panel de Resultados / Start List](#7-panel-de-resultados--start-list)
8. [Sortear números y armar la fase](#8-sortear-números-y-armar-la-fase)
9. [Día de competencia (jueces)](#9-día-de-competencia-jueces)
10. [Resultados y oficialización](#10-resultados-y-oficialización)
11. [Roles y permisos](#11-roles-y-permisos)
12. [Preguntas frecuentes](#12-preguntas-frecuentes)

---

## 1. Qué es Maratón en SportTrack

En Maratón **varias categorías, botes y ramas salen juntas** en una misma salida (misma hora y distancia). Esa unidad se llama **Largada**.

Después de la carrera, los tiempos se muestran y se oficializan **por clasificación** (categoría · sexo · bote), aunque todos hayan largado juntos.

No hay heats/series ni promoción de etapas al estilo ICF de pista.

---

## 2. Glosario (evitar confusiones)

| Término | En Maratón | En Velocidad / jueces |
|---------|------------|------------------------|
| **Largada** (programa) | Unidad del schedule: varias pruebas agrupadas que salen juntas | — |
| **Largada** (botón del Largador) | Misma acción: disparar la carrera (`LARGAR CARRERA`) | Disparo oficial de la fase |
| **Prueba / EventoPrueba** | Cada combinación cat × bote × sexo × distancia; un miembro del grupo | Unidad habitual del schedule |
| **Grupo de largada** | Varios `EventoPrueba` unidos por el mismo `grupoLargadaId` | No aplica |
| **Clasificación** | Partición de resultados: categoría · sexo · bote | Suele coincidir 1:1 con la prueba |
| **Número de competidor** | Dorsal sorteado 1…N en la nómina unificada | No se usa; se usan carriles 1–9 |
| **Carril (API / pad)** | En cronometraje, el “carril” es el **número de competidor** | Carril físico de la pista |

---

## 3. Diferencias vs Velocidad

| Aspecto | Velocidad | Maratón |
|---------|-----------|---------|
| Unidad del programa | Prueba + heats/series | **Largada** (grupo de EP) |
| Horarios | Gaps, pateo, scheduler | **Manual** (día/hora por largada) |
| Start List | Carriles, cabezas de serie | **Números de competidor** 1…N |
| Selector en el panel | Evento → Prueba → Regata | Evento → **Largada** |
| Generación de fases | Heats / manual por prueba | Una fase por largada (`GenerarLargadaMaraton`) |
| Resultados | Una grilla por fase/serie | **Varias grillas** por clasificación |
| Promoción de etapas | Sí (series → semis → final) | No |
| Carriles físicos | 8 / 9 | No; dorsal = identificador de llegada |
| Reglas federativas de pista | Sí | Desactivadas al elegir Maratón |
| Distancias típicas | Hasta 6000 m | **≥ 1000 m** |
| Categorías típicas | Todas | Desde **Cadete** en adelante |

---

## 4. Crear y configurar un evento Maratón

1. Ir a la gestión de eventos (panel Admin / SuperAdmin).
2. Crear o editar el evento y elegir modalidad **Maratón**.
3. Al pasar a Maratón el sistema:
   - Filtra distancias elegibles (≥ 1000 m).
   - Filtra categorías desde Cadete.
   - Limpia reglas de pista (gaps, combinadas federativas, etc.).
4. Completar datos del evento (nombre, fechas, ubicación / recorrido).
5. Guardar.

El chip **Maratón** aparece en el dashboard del evento.

> **Eventos viejos sin campo modalidad:** si todas las distancias habilitadas son ≥ 1000 m, el frontend puede tratarlos como Maratón por compatibilidad.

---

## 5. Armar el programa (largadas)

Desde el evento → **Armar Schedule** (modal Maratón).

### Crear una largada

1. Elegir **categorías**, **botes** y **ramas** (selección múltiple).
2. Elegir **distancia** y **día/hora** de salida.
3. Guardar.

El sistema crea el producto cartesiano de las combinaciones elegidas, todas con la misma distancia/hora y el mismo **grupo de largada**.

### Programa provisorio

- Lista de largadas del evento (filtro por día).
- Badge de largada **combinada** cuando hay más de un miembro.
- Exportación PDF del programa.

No hay cálculo automático de gaps entre largadas: los horarios son responsabilidad del organizador.

---

## 6. Inscripciones

Los clubes se inscriben a un **EventoPrueba** concreto (miembro del grupo), igual que en velocidad.

En Start List / Resultados, SportTrack **une** todos los inscritos de los miembros de la largada en una sola nómina.

---

## 7. Panel de Resultados / Start List

### Dónde entrar

| Rol | Ruta |
|-----|------|
| Admin / SuperAdmin | Mesa de control / Start List del evento (`/super/resultados`, etc.) |
| Juez de Control | `/juez-control` |

### Header en Maratón

1. **Evento** — selector del evento.
2. **Largada** — selector de la salida a controlar (agrupa las pruebas del mismo grupo).
3. Pill **Modalidad Maratón**.
4. Pestañas **Start List** | **Resultados**.

No aparece el selector de **Regata específica** ni los PDF de schedule/heats de pista.

> El selector de Largada / Prueba está disponible para Admin **y** Juez de Control: sin él no se puede elegir qué largada controlar.

### Start List Maratón

- Nómina unificada de todos los botes de la largada.
- Columnas orientadas a número, clasificación, tripulación y club (no grilla de carriles 1–9).
- Acciones de administración (ver [§11](#11-roles-y-permisos)).

---

## 8. Sortear números y armar la fase

**Solo Admin / SuperAdmin** (en Start List):

1. Seleccionar evento y largada.
2. Revisar la nómina.
3. Pulsar **Sortear números y armar largada** (o regenerar si ya existía).

Eso:

- Asigna `numeroCompetidor` 1…N en orden aleatorio.
- Genera (o regenera) la **fase de cronometraje** de la largada.
- Sincroniza el campo de resultado usado por jueces: el **carril** del pad equivale al dorsal.

Sin esta paso, Largador / Cronometrista no tienen una fase útil para esa salida.

---

## 9. Día de competencia (jueces)

El flujo de estados es el mismo que en pista:

```
Programada  →  En Carrera  →  Pendiente de Validación  →  Finalizada
```

### Secuencia recomendada (Maratón)

```
1. ADMIN — Arma largadas, inscripciones y sortea números (/ Start List)
2. LARGADOR + CRONOMETRISTA — Abren la misma fase y verifican sync
3. LARGADOR — Check-in / DNS si corresponde → LARGAR CARRERA
4. CRONOMETRISTA — Registra llegadas por número de competidor (dorsal)
5. JUEZ DE CONTROL / ADMIN — Revisa grillas por clasificación → Guardar y Hacer Oficial
```

### Particularidades

- En el pad del cronometrista, si hay dorsales **> 9**, se usan **todos los números** de la nómina (no solo carriles 1–9).
- No hay **Promover Etapa** típica de series/semis/finales.
- La barra de sincronización en vivo funciona igual que en velocidad.

Detalle de cada consola: [módulos de control](./modulos-control-competencia.md).

---

## 10. Resultados y oficialización

En la pestaña **Resultados**, con una largada seleccionada:

- Se muestra la fase de esa largada.
- Los tiempos se presentan en **varias grillas**, una por clasificación (Categoría · Sexo · Bote).
- Admin y Juez de Control pueden corregir tiempos / estados según permisos del panel y **Guardar y Hacer Oficial**.

Live público (`/resultados/:id`) también usa el desglose por clasificación cuando el evento es Maratón.

---

## 11. Roles y permisos

| Acción | Admin / SuperAdmin | JuezControl |
|--------|--------------------|-------------|
| Crear evento / armar largadas | Sí | No |
| Ver Start List / nómina | Sí | Sí |
| Sortear números y generar fase | Sí | No |
| Editar / borrar filas de nómina | Sí | No |
| Ver resultados en vivo | Sí | Sí |
| Editar tiempos en verificación | Sí | Sí (panel de control) |
| Guardar y Hacer Oficial / Reiniciar fase | Sí | Sí |
| Carga manual de emergencia | Sí | No |
| Promover etapa (pista) | Sí | Sí — **no aplica** en Maratón |

---

## 12. Preguntas frecuentes

### No veo el selector de Largada / Prueba

Debe aparecer debajo de **Evento** para Admin y Juez de Control. Si el evento es Maratón, el label es **Largada**; si es Velocidad, **Prueba / Categoría**.

### Solo veo “Modalidad Maratón” y las pestañas, pero no hay datos

Seleccioná una **Largada** en el selector. Sin largada no hay nómina ni resultados de esa salida.

### El cronometrista no encuentra el “carril”

En Maratón el identificador es el **número de competidor**. Debe coincidir con el sorteo de la Start List. Si regeneraste números, pedí que refresquen la fase.

### ¿Puedo mezclar Velocidad y Maratón en el mismo evento?

No. La modalidad es del **evento** completo.

### ¿Hay promoción de semis/finales?

No en el flujo Maratón actual. Cada largada se corre y se oficializa; los podios se arman por clasificación dentro de esa salida.

### ¿Qué PDF uso para el programa?

Desde el modal de schedule Maratón: exportación del **programa provisorio** de largadas. Los PDF de “Series / Semis / Finales” son lenguaje de pista.

---

## Referencias

- Operación día de regata (pista y consolas): [modulos-control-competencia.md](./modulos-control-competencia.md)
- Detalle técnico (componentes, APIs, detección): [../tecnico/modalidad-maraton.md](../tecnico/modalidad-maraton.md)
