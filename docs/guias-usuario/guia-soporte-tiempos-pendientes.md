# Guía — Soporte: tiempos pendientes del cronometrista

Para **SuperAdmin** y **soporte técnico**. Lenguaje operativo, sin detalles técnicos.

---

## Dónde está

1. Entrá al panel **SuperAdmin**.
2. Menú **Soporte** (auditoría y diagnóstico).
3. Buscá la sección **“Colas temporales de tiempos (cronometrista)”** (recuadro naranja, arriba de los logs).

---

## Qué es una “cola temporal”

Cuando un cronometrista aprieta **Enviar** pero la conexión falla a medias, el sistema puede guardar una **copia extra** de esos tiempos en el servidor, además de la copia en el dispositivo del cronometrista.

Esa copia **no es el resultado oficial** hasta que alguien la confirme o el cronometrista logre **Reintentar envío** con buena señal.

---

## Columnas de la tabla

| Columna | Qué indica |
|---------|------------|
| **Evento / Fase** | Qué regata y serie tienen tiempos pendientes |
| **Cronometrista** | Usuario que registró los tiempos |
| **Tiempos** | Cantidad de llegadas guardadas |
| **Capturado** | Fecha y hora del intento de envío |
| **Expira** | Límite para usar la copia (**24 h**) |
| **Intentos** | Cuántas veces el sistema ya trató de confirmarla |

---

## Botones

### Confirmar

- **Usalo cuando:** los tiempos **no están** en resultados oficiales y el cronometrista no pudo reenviar.
- **Qué hace:** carga los tiempos en el sistema como un envío normal y borra la cola.
- **Después:** la serie debería quedar en **Pendiente de Validación** para el juez de control.

### Descartar (ícono papelera)

- **Usalo cuando:** los tiempos **ya están** cargados (por reintento del cronometrista, carga manual del admin, etc.).
- **Qué hace:** solo borra la copia pendiente del servidor; **no modifica** resultados ya guardados.

---

## Flujo recomendado

```
1. Cronometrista reporta aviso naranja / tiempos faltantes
2. Verificá en juez de control si la serie tiene tiempos
3. Si NO están → Confirmar desde Soporte
4. Si SÍ están → Descartar la cola (limpieza)
5. Pedí al juez de control que valide la serie
```

---

## Cuándo la cola puede estar vacía pero el cronometrista tiene aviso naranja

Si el cronometrista estuvo **100 % sin internet**, la copia puede existir **solo en su dispositivo** y nunca llegó al servidor. En ese caso:

- Pedile que use **Reintentar envío** con señal, o
- Que pase el **PDF respaldo**, o
- Usá **Carga manual** como último recurso

---

## Manual completo

**[modulos-control-competencia.md](./modulos-control-competencia.md)** — secciones 7 y 14.
