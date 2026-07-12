# 00 — Catálogo (SportTrack-Front)

## Tipos y ubicación

| Tipo | Categoría | Archivo |
|------|-----------|---------|
| Contexto | Obligatorio | [01](./01-globales.md#1-contexto) |
| Contenedores | Obligatorio | [01](./01-globales.md#2-contenedores) |
| Capas | Obligatorio | [01](./01-globales.md#3-capas) |
| Despliegue | Ops | [01](./01-globales.md#4-despliegue) |
| Despliegue ambientes | Opcional | [01](./01-globales.md#5-despliegue-detallado) |
| Paquetes | Recomendado | [01](./01-globales.md#6-paquetes) |
| Componentes | Recomendado | [01](./01-globales.md#7-componentes) |
| Casos de uso | Obligatorio | [02](./02-casos-actividad-estados.md) |
| Actividad | Recomendado | [02](./02-casos-actividad-estados.md) |
| Estados | Recomendado | [02](./02-casos-actividad-estados.md) |
| ER / dominio | Obligatorio* | [03](./03-er-clases-dominio.md) |
| Clases aplicación | Opcional | [04](./04-clases-aplicacion.md) |
| Secuencia / red | Obligatorio | [05](./05-secuencias-api.md) |

\* El ER canónico de tablas está en el repo API; aquí se documenta el **modelo que consume el front**.

## Dominios de este proyecto

- Auth / roles (Admin, SuperAdmin, Club, Largador, Cronometrista, JuezControl)
- Club: atletas, eventos, pagos, controles
- Super: federaciones, clubes, eventos, SaaS, auditoría, logins
- Jueces / timing / carga manual
- Live público (`LiveResults`)
- Mensajería (`X-Client-App: sporttrack`)
- SignalR TimingHub

## Lectura

1 → 01 · 2 → 02 · 3 → 03 · 4 → 04 · 5 → 05
