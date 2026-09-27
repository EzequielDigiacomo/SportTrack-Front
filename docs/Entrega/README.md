# Pack de Entrega — Frontend SportTrack

**Última actualización: 2026-09-27**

Portada del paquete documental de entrega del **frontend** de gestión de competencias de remo y canotaje **SportTrack**. Este pack describe, en calidad de entrega formal, los requerimientos, casos de uso, flujos, manuales de usuario y la documentación técnica y de despliegue de la SPA React que consume la API unificada SportTrack / SIGDEF.

> **Nota de alcance.** Este pack documenta **exclusivamente el frontend `SportTrack-Front`**. La API, la base de datos y el frontend federativo SIGDEF tienen sus propios packs de entrega en sus respectivos repositorios.

> 📄 **PDF consolidado del pack:** [`Pack-Entrega-SportTrack-Front.pdf`](./Pack-Entrega-SportTrack-Front.pdf)
> Contiene los 7 documentos en orden, con todas las tablas y los **10 diagramas renderizados**. A4, 67 páginas, con índice navegable y marcadores (bookmarks) por sección.

---

## Índice del pack

| # | Documento | Contenido |
|---|-----------|-----------|
| — | **README.md** (este archivo) | Portada, ficha del proyecto, alcance, glosario y documentos históricos |
| 1 | [01 — Requerimientos de Usuario](./01-Requerimientos-Usuario.md) | Actores, RF, RNF (ISO 25010), Historias de Usuario (Gherkin), Reglas de Negocio y matriz de trazabilidad |
| 2 | [02 — Casos de Uso](./02-Casos-de-Uso.md) | Diagrama UML de casos de uso y especificación detallada de CU-01…CU-12 |
| 3 | [03 — Diagramas de Flujo](./03-Diagramas-de-Flujo.md) | Diagramas Mermaid: alta de evento, siembra/fases, progresión ICF, ciclo de vida de regata, cronometraje offline, auth/plan, maratón y auditoría |
| 4 | [04 — Manual de Usuario](./04-Manual-de-Usuario.md) | Guía paso a paso por rol, tablas de campos, notas y FAQ / troubleshooting |
| 5 | [05 — Manual Técnico](./05-Manual-Tecnico.md) | Arquitectura, stack real, estructura del código, contratos de API, SignalR, offline-first, seguridad, build y deuda técnica |
| 6 | [06 — Manual de Instalación y Despliegue](./06-Manual-Instalacion-Despliegue.md) | Requisitos, instalación, entorno, ejecución local, build, Vercel y Android/Capacitor |

---

## Ficha del proyecto

| Atributo | Valor |
|----------|-------|
| **Nombre** | SportTrack — Frontend de Competencias |
| **Tipo** | SPA (Single Page Application) web + app Android (Capacitor) |
| **Dominio** | Gestión y cronometraje de competencias de remo/canotaje (sprint y maratón) |
| **Versión** | `1.0.0` (`package.json`) |
| **Fecha del documento** | 2026-09-27 |
| **Repositorio** | `SportTrack-Front` (`c:\Users\EZEQU\source\reposFront\SportTrack-Front`) |
| **Framework** | React `^18.3.1` + React DOM `^18.3.1` |
| **Ruteo** | react-router-dom `^6.26.2` |
| **Bundler** | Vite `^5.4.10` |
| **Tiempo real** | `@microsoft/signalr ^8.0.7` (hub `/hubs/timing`) |
| **HTTP** | axios `^1.7.7` |
| **Reportes** | jspdf `^4.2.1` + jspdf-autotable `^5.0.7` (PDF) · exportación CSV propia |
| **Mapas** | react-simple-maps `^3.0.0`, d3-geo `^3.1.1`, topojson-client `^3.1.0` |
| **UI** | lucide-react `^1.8.0`, CSS propio |
| **Móvil** | `@capacitor/core` + `@capacitor/android` + `@capacitor/cli` `7.6.8` |
| **Backend consumido** | API unificada **SportTrack / SIGDEF** (ASP.NET Core, **.NET 10**) con PostgreSQL |
| **API (producción)** | `https://sporttrack-sigdef.onrender.com/api` |
| **Hub (producción)** | `https://sporttrack-sigdef.onrender.com/hubs/timing` |
| **Deploy web** | Vercel |
| **Deploy móvil** | Android (APK vía Capacitor) |

### Repositorios relacionados

| Repo | Rol | Deploy |
|------|-----|--------|
| **SportTrack-Front** (este) | Frontend de competencias: eventos, inscripciones, fases, jueces, cronometraje, live, SuperAdmin SaaS | Vercel |
| **SportTrack-Sigdef** | Backend unificado (regatas + SIGDEF + SaaS), API REST + SignalR, PostgreSQL | Render |
| **FrontSigdef** | Frontend de administración federativa: atletas, clubes, delegados, tutores, SaaS | Vercel |
| **WebSPA-SIGDEF** | SPA pública/administrativa SIGDEF | Vercel |

---

## Propósito y propuesta de valor

SportTrack permite operar una competencia completa de punta a punta:

- **Planificación**: alta de eventos, pruebas por categoría/bote/distancia/sexo, inscripciones de clubes y cronograma.
- **Siembra y progresión**: sorteo de carriles, generación automática de fases (eliminatorias → semifinales → finales) y promoción de etapas conforme al sistema de progresión ICF.
- **Operación en cancha**: consola de largador (starter), consola de cronometrista/finalizador, juez de control y control técnico, con **resiliencia offline-first**.
- **Difusión**: pizarra pública de resultados en vivo (`/resultados/:id`) vía SignalR, sin login.
- **Administración SaaS**: panel SuperAdmin multi-tenant (federaciones, clubes, planes, usuarios, auditoría, soporte).

**Diferenciador central:** resiliencia ante mala señal. El cronometraje usa **colas locales** (localStorage/sessionStorage) + **outbox en servidor** + **respaldo PDF**, de modo que un corte de red no pierde los tiempos registrados.

---

## Alcance del pack

**Dentro del alcance:**
- Requerimientos funcionales y no funcionales del frontend web y móvil.
- Casos de uso y flujos de los módulos implementados y activos en `main` a la fecha.
- Manuales de usuario por rol, técnico y de instalación/despliegue.
- Trazabilidad requerimiento ↔ caso de uso ↔ módulo de código.

**Fuera del alcance (documentado como referencia):**
- Implementación interna de la API, esquema de base de datos y migraciones (ver repo backend).
- Módulos federativos SIGDEF (atletas federativos, delegados, tutores) — ver `FrontSigdef`.
- Funcionalidades marcadas explícitamente en los documentos como **FUERA DE ALCANCE ACTUAL** (pendientes o comentadas en el código).

---

## Glosario

| Término | Definición |
|---------|------------|
| **SPA** | Single Page Application; aplicación web de página única basada en React. |
| **Evento** | Competencia completa (ej. "Campeonato Argentino de Sprint 2026"). Agrupa pruebas y fases. |
| **Prueba** | Combinación categoría + bote + distancia + sexo (ej. K1 200 m Masculino). |
| **EventoPrueba** | Instancia concreta de una prueba dentro de un evento; unidad sobre la que se generan fases. |
| **Fase / Etapa** | Instancia de competencia de un EventoPrueba (Eliminatorias, Semifinales, Finales). |
| **Serie / Heat** | Carrera individual dentro de una etapa. |
| **Siembra / Sorteo** | Asignación de carriles a inscripciones dentro de una serie. |
| **Progresión ICF** | Reglas de la Federación Internacional de Canotaje para avanzar atletas entre etapas (series → semis → finales, incluyendo repescas / best losers). |
| **Regata** | Carrera en operación (una fase en curso). Sobre ella se emiten largada, tiempos y resultados. |
| **t0 / Largada** | Instante oficial de partida sincronizado con el reloj del servidor. |
| **Outbox** | Cola de tiempos pendientes persistida en el servidor para su commit posterior por Soporte. |
| **Consola de juez** | Interfaz operativa de cancha: largador, cronometrista/finalizador, juez de control, control técnico. |
| **Finalizador** | Etiqueta de UI para el rol **Cronometrista** (toma de tiempos de llegada). |
| **Pizarra / Live** | Vista pública `/resultados/:id` con resultados en vivo vía SignalR. |
| **Plan SaaS** | Nivel comercial (SIGDEF, SportTrack, Pack Dúo × tiers S/M/L) que habilita features por flags. |
| **Flag de plan** | Booleano derivado del plan: `accesoSigdef`, `accesoSportTrack`, `accesoControlesLive`, `accesoDashboardClub`, `permitirCargaImagenes`, `resultadosTiempoReal`, `exportacionPdf`, `maxAtletas`. |
| **Guard** | Componente de ruteo que protege acceso por rol (`ProtectedRoute`) o por plan (`PlanGuard`). |
| **soporte_tecnico** | Alias especial de usuario tratado como SuperAdmin por `authHelpers`. |
| **X-Client-App** | Header `sporttrack` inyectado por `api.js` para identificar el cliente ante la API. |

---

## Documentos históricos

Los siguientes documentos **se conservan** pero fueron redactados para el **backend** (dicen "Pack de Entrega: Backend SportTrack-v1" y referencian .NET). Se listan como material histórico y **no describen este frontend**:

| Documento histórico | Motivo de la marca histórica |
|---------------------|------------------------------|
| [`ENTREGA_README.md`](./ENTREGA_README.md) | Portada orientada al backend. |
| [`PRESENTACION_TECNOLOGICA.md`](./PRESENTACION_TECNOLOGICA.md) | Presentación del stack del backend. |
| [`Analisis/ANALISIS_TECNICO.md`](./Analisis/ANALISIS_TECNICO.md) | Análisis de arquitectura de la API. |
| [`Diagramas/ARQUITECTURA_Y_DIAGRAMAS.md`](./Diagramas/ARQUITECTURA_Y_DIAGRAMAS.md) | Diagramas del sistema server-side. |
| [`Manuales/MANUAL_DE_USO.md`](./Manuales/MANUAL_DE_USO.md) | Manual orientado a API/backend. |
| [`Manuales/MANUAL_INSTALACION.md`](./Manuales/MANUAL_INSTALACION.md) | Instalación del backend (.NET). |
| [`Manuales/GUIA_CRONOMETRISTA_MALA_SENAL.md`](./Manuales/GUIA_CRONOMETRISTA_MALA_SENAL.md) | Guía operativa (versión previa). |
| [`Manuales/GUIA_SOPORTE_TIEMPOS_PENDIENTES.md`](./Manuales/GUIA_SOPORTE_TIEMPOS_PENDIENTES.md) | Guía de soporte (versión previa). |

### Resto de la documentación del repositorio

| Carpeta | Contenido |
|---------|-----------|
| [`../README.md`](../README.md) | Índice raíz de `docs/`. |
| [`../guias-usuario/`](../guias-usuario/) | Manuales de uso, instalación, maratón y módulos de control. |
| [`../casos-de-uso/`](../casos-de-uso/) | Casos de uso generales. |
| [`../criterios/`](../criterios/) | Requerimientos y criterios. |
| [`../tecnico/`](../tecnico/) | Arquitectura, SaaS, backup, admin DB, diagramas y modalidad maratón. |
| [`../referencia/`](../referencia/) | Material histórico y de referencia. |

> ⚠️ **Corrección de inconsistencias conocidas.** La documentación previa referencia el backend como **.NET 8** (real: **.NET 10**), menciona **SQL Server** (real: **PostgreSQL**) y describe la autenticación como "solo cookie HttpOnly" (real: esquema **híbrido** Bearer en `localStorage` + cookie `X-Access-Token`). El presente pack refleja el estado real verificado contra el código.

---

## Pie del pack

| Documento anterior | Documento actual | Documento siguiente |
|--------------------|------------------|---------------------|
| — | **README.md** | [01 — Requerimientos de Usuario →](./01-Requerimientos-Usuario.md) |

[Índice del pack](#índice-del-pack) · [01](./01-Requerimientos-Usuario.md) · [02](./02-Casos-de-Uso.md) · [03](./03-Diagramas-de-Flujo.md) · [04](./04-Manual-de-Usuario.md) · [05](./05-Manual-Tecnico.md) · [06](./06-Manual-Instalacion-Despliegue.md)
