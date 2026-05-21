# 📂 SportTrack - Contexto del Proyecto y Lecciones Aprendidas

Este archivo actúa como la **memoria activa y bitácora de desarrollo** para el asistente de IA y el desarrollador. Su objetivo es:
1. **Reducir el consumo de tokens** al proporcionar un contexto consolidado y preciso sin necesidad de reanalizar todo el código fuente en cada inicio.
2. **Prevenir la repetición de errores** registrando lecciones aprendidas, "gotchas", fallos resueltos y particularidades técnicas.
3. **Mantener el estado de la tarea actual** para retomar el desarrollo de manera inmediata y sin fricciones.

---

## 🏗️ 1. Arquitectura y Estructura del Sistema

SportTrack es un sistema de gestión deportiva y cronogramas de regatas (kayak/canoa) compuesto por:

### 💻 Frontend (`SportTrack-Front`)
* **Framework / Librerías**: React, Vanilla CSS para estilos, `jsPDF` y `jspdf-autotable` para reportes.
* **Componentes Principales**:
  * [ConfigurarPruebasModal.jsx](file:///c:/Users/EZEQU/source/reposFront/SportTrack-Front/src/components/SharedSections/ConfigurarPruebasModal.jsx): Modal administrativo para gestionar pruebas (categorías, botes, distancias, ramas, fechas/horas) y configurar las reglas del cronograma.
  * [useResultados.js](file:///c:/Users/EZEQU/source/reposFront/SportTrack-Front/src/components/SharedSections/useResultados.js): Hook personalizado para consumir y gestionar los resultados de las pruebas.
* **Lógica de Negocio Destacada**:
  * **Motor de Pateo en Vivo (`SchedulerService`)**: Recalcula dinámicamente las horas de las regatas aplicando reglas de gap base, gap de recuperación entre series/finales, uso de gap variable por distancia y bloques fijos para finales.

### ⚙️ Backend (`SportTrack-v1`)
* **Tecnología**: ASP.NET Core (C#), Arquitectura en Capas/Limpia.
* **Estructura**:
  * `SportTrack-v1.Api` ([Program.cs](file:///c:/Users/EZEQU/source/repos/SportTrack-v1/SportTrack-v1.Api/Program.cs)): Punto de entrada, controladores y endpoints.
  * `SportTrack-v1.Controladores` ([EventoDtos.cs](file:///c:/Users/EZEQU/source/repos/SportTrack-v1/SportTrack-v1.Controladores/Evento/Dtos/EventoDtos.cs)): DTOs y lógica de transferencia de datos.
  * `SportTrack-v1.Entidades` ([Evento.cs](file:///c:/Users/EZEQU/source/repos/SportTrack-v1/SportTrack-v1.Entidades/Entidades/Evento.cs)): Modelos de base de datos.

---

## 🧠 2. Lecciones Aprendidas y Prevención de Errores

> [!TIP]
> *Aquí registramos los bugs que solucionamos y reglas técnicas críticas para no cometer los mismos errores.*

### 🟢 Reglas del Motor de Cronograma (`SchedulerService`)
* **Prioridad de Fases**: Al ordenar las fases, las eliminatorias/series deben ir siempre antes de las semifinales o finales (`etapa.orden` o `etapaOrden` es fundamental para el orden correcto).
* **Gap Variable**: El gap de largada depende del tipo de distancia. Si está activado `usarGapVariable`, se debe consultar el `gapSugerido` configurado para la distancia.

### 🟢 React y Renderizado de Cronograma
* **Inscritos y Fases**: Para renderizar la cantidad de inscritos en una fase frente a una prueba sin sortear:
  * Si es una fase activa (`isF`): usar `resultados.length` (o cantidad calculada de palistas en la fase).
  * Si es una prueba base: usar `cantidadInscritos`.

### 🟢 Control de Accesos por Rol
* **Ocultar 'Organizar Evento' a Clubes**: Se ocultó la tarjeta "Organizar Evento" del Dashboard si el usuario no tiene rol `'Admin'` (Federación), previniendo que los clubes accedan a funcionalidades de organización reservadas por ahora solo para la federación.
* **Ocultar Plan de la Federación a Clubes**: Se removió el borde izquierdo coloreado según el plan y la insignia con el nombre del plan (ej. `'ORO'`) en la cabecera del panel cuando el usuario tiene rol `'Club'` (solo visible para el rol `'Admin'`).

---

## 📝 3. Bitácora de Desarrollo e Historial de Cambios

| Fecha | Tarea / Cambio Realizado | Estado | Notas Técnicas |
| :--- | :--- | :--- | :--- |
| **2026-05-21** | Creación del archivo de contexto unificado. | ✅ Completado | Documento inicial en ambos repositorios. |
| **2026-05-21** | Ocultar módulo 'Organizar Evento' para clubes. | ✅ Completado | Se limitó el acceso a `user?.rol === 'Admin'` en `ClubDashboard.jsx`. |
| **2026-05-21** | Ocultar insignia y borde de plan a clubes. | ✅ Completado | Se condicionó la visualización a `user?.rol === 'Admin'` en `ClubDashboard.jsx`. |

---

## 🎯 4. Estado Actual y Próximos Pasos

* **Contexto Inmediato**: Estamos enfocados en la configuración de pruebas y regatas en `ConfigurarPruebasModal.jsx` y su sincronización con los DTOs y Entidades del Backend (`EventoDtos.cs`, `Evento.cs`).
* **Próxima acción**: *[Esperando instrucciones específicas del usuario sobre la tarea a realizar]*
