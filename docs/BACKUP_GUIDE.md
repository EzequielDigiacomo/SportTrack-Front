# Guía de Backups - SportTrack

Esta guía detalla la configuración acordada para realizar respaldos manuales de la base de datos PostgreSQL hospedada en Render (Plan Free).

## 1. Estrategia de Backup Manual (pgAdmin)

Esta configuración genera un "Snapshot" completo (Estructura + Datos) diseñado para la máxima seguridad y portabilidad.

### Configuración en pgAdmin 4:

| Pestaña | Opción | Configuración | Razón |
| :--- | :--- | :--- | :--- |
| **General** | **Format** | `Plain` | Genera un archivo `.sql` legible y editable. |
| **Data Options** | **Do not save Owner** | `Yes` (Azul) | Permite restaurar el backup con cualquier usuario en otro servidor. |
| **Data Options** | **Do not save Privileges**| `Yes` (Azul) | Evita errores de permisos al restaurar en entornos diferentes. |
| **Data Options** | **Type of objects** | Todo en gris | Asegura que se guarde tanto la estructura (CREATE) como los datos (INSERT). |
| **Query Options** | **Include DROP DATABASE** | `No` (Gris) | **Configuración de Seguridad**: El backup no borrará nada por accidente al ejecutarse. |
| **Query Options** | **Include IF EXISTS** | `No` (Gris) | Mantiene el archivo limpio de sentencias de borrado. |
| **Objects** | **Selección** | Todo marcado | Asegura que se incluyan todos los esquemas (`public`, `catalogos`), tablas y secuencias. |

---

## 2. Procedimiento de Restauración (Disaster Recovery)

En caso de pérdida de datos en Render o migración a un nuevo servidor:

1.  Crear una base de datos **nueva y vacía** en el servidor de destino.
2.  Abrir la herramienta de consulta (Query Tool) o usar `psql`.
3.  Ejecutar el archivo `.sql` generado.
4.  Como el backup no contiene sentencias `DROP`, la base de datos de destino **debe estar limpia** para evitar errores de "objeto ya existe".

---

## 3. Automatización (Opcional - Sincronización Diaria)

Para mantener una copia espejo local actualizada automáticamente, se recomienda el uso de un script de PowerShell:

```powershell
# Ejemplo de comando para script automatizado
pg_dump --no-owner --no-privileges --clean --if-exists -d "CONNECTION_STRING" -f "sporttrack_backup.sql"
```
*Nota: El parámetro `--clean` en scripts automatizados es útil porque permite que el backup se sobreescriba a sí mismo en la base de datos local de espejo sin intervención manual.*
