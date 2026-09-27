# Documentación SportTrack-Front

**Única carpeta de documentación del frontend de competencias / Live.**

La carpeta `Documentacion/` en la raíz solo conserva un puntero hacia aquí.

**Última actualización:** 2026-09-27

---

## Organización

| Carpeta | Para qué sirve |
|---------|----------------|
| [Entrega/](./Entrega/) | **Pack de entrega** (portada, requerimientos, casos de uso, diagramas, manuales). Empezá por [Entrega/README.md](./Entrega/README.md) |
| [guias-usuario/](./guias-usuario/) | Manuales de uso e instalación |
| [casos-de-uso/](./casos-de-uso/) | Casos de uso |
| [criterios/](./criterios/) | Requerimientos / criterios |
| [tecnico/](./tecnico/) | Arquitectura, SaaS, backup, admin DB, **diagramas**, modalidad Maratón |
| [referencia/](./referencia/) | Histórico traído desde `Documentacion/` |

## Entrega

El **Pack de Entrega** del frontend está en [`Entrega/`](./Entrega/) y su portada es [`Entrega/README.md`](./Entrega/README.md).

| Documento | Contenido |
|-----------|-----------|
| [Entrega/README.md](./Entrega/README.md) | Portada, ficha del proyecto, alcance, glosario y documentos históricos |
| [01 — Requerimientos de Usuario](./Entrega/01-Requerimientos-Usuario.md) | Actores, RF, RNF (ISO 25010), HU (Gherkin), RN y trazabilidad |
| [02 — Casos de Uso](./Entrega/02-Casos-de-Uso.md) | Diagrama UML y especificación CU-01…CU-12 |
| [03 — Diagramas de Flujo](./Entrega/03-Diagramas-de-Flujo.md) | 8 diagramas Mermaid (evento, fases, ICF, regata, offline, auth, maratón, auditoría) |
| [04 — Manual de Usuario](./Entrega/04-Manual-de-Usuario.md) | Guía por rol, campos, FAQ y troubleshooting |
| [05 — Manual Técnico](./Entrega/05-Manual-Tecnico.md) | Arquitectura, stack, servicios, API, SignalR, offline, seguridad y deuda técnica |
| [06 — Manual de Instalación y Despliegue](./Entrega/06-Manual-Instalacion-Despliegue.md) | Requisitos, entorno, build, Vercel y Android/Capacitor |

> 📄 **PDF consolidado:** [Entrega/Pack-Entrega-SportTrack-Front.pdf](./Entrega/Pack-Entrega-SportTrack-Front.pdf) — todo el pack en un único archivo (7 documentos, tablas y 10 diagramas, 67 páginas).

### Destacados recientes (ago–sep 2026)

| Tema | Documento |
|------|-----------|
| **Pack de Entrega (frontend)** | [Entrega/README.md](./Entrega/README.md) |
| Consola del cronometrista + resiliencia offline | [Entrega/05-Manual-Tecnico.md](./Entrega/05-Manual-Tecnico.md) · [guias-usuario/guia-cronometrista-mala-senal.md](./guias-usuario/guia-cronometrista-mala-senal.md) |
| Soporte de tiempos pendientes (colas/outbox) | [guias-usuario/guia-soporte-tiempos-pendientes.md](./guias-usuario/guia-soporte-tiempos-pendientes.md) |
| Auditoría de errores y de actividad | [Entrega/01-Requerimientos-Usuario.md](./Entrega/01-Requerimientos-Usuario.md) |
| Modalidad Maratón (usuario) | [guias-usuario/modalidad-maraton.md](./guias-usuario/modalidad-maraton.md) |
| Modalidad Maratón (técnico) | [tecnico/modalidad-maraton.md](./tecnico/modalidad-maraton.md) |
| Control de competencia / jueces | [guias-usuario/modulos-control-competencia.md](./guias-usuario/modulos-control-competencia.md) |
| Planes SaaS y guards | [tecnico/CONTROL_ACCESO_PLAN.md](./tecnico/CONTROL_ACCESO_PLAN.md) |
| Implementación SaaS | [tecnico/SAAS_IMPLEMENTATION.md](./tecnico/SAAS_IMPLEMENTATION.md) |

> Padrón federativo / tutores / accesos SIGDEF → repo **FrontSigdef** `docs/`.  
> API → **SportTrack-Sigdef** `docs/` (ER canónico en `docs/tecnico/diagramas/`).

## Diagramas

Índice: [tecnico/diagramas-sistema.md](./tecnico/diagramas-sistema.md) · carpeta [tecnico/diagramas/](./tecnico/diagramas/) · flujos del frontend en [Entrega/03-Diagramas-de-Flujo.md](./Entrega/03-Diagramas-de-Flujo.md)

## Notas de consistencia

- El backend real es **.NET 10** (documentos previos pueden mencionar .NET 8).
- La base de datos es **PostgreSQL** (no SQL Server).
- La autenticación es **híbrida**: JWT en `Authorization: Bearer` + `localStorage`, complementada por la cookie `X-Access-Token`.
