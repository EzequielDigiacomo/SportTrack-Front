# Manual de Instalación e Implementación

Este documento detalla los pasos necesarios para desplegar el backend de SportTrack-v1 en un entorno local o de producción.

## 1. Requisitos Previos
-   [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
-   [PostgreSQL](https://www.postgresql.org/download/) (v14 o superior)
-   Herramienta de base de datos (pgAdmin o DBeaver recomendado)

## 2. Configuración de la Base de Datos
1.  Crear una base de datos en PostgreSQL llamada `SportTrackDB`.
2.  Localizar el archivo `appsettings.json` en el proyecto `SportTrack-v1.Api`.
3.  Actualizar la sección `ConnectionStrings` con las credenciales correspondientes:
    ```json
    "DefaultConnection": "Host=localhost;Port=5432;Database=SportTrackDB;Username=TU_USUARIO;Password=TU_PASSWORD"
    ```

## 3. Despliegue del Esquema (Migrations)
Desde la consola del Administrador de Paquetes (PM) en Visual Studio:
1.  Seleccionar como proyecto predeterminado `SportTrack-v1.AccesoDatos`.
2.  Ejecutar:
    ```powershell
    Update-Database -StartupProject SportTrack-v1.Api
    ```
Esto creará las tablas y cargará los datos maestros (Sexos, Botes, Categorías, Distancias).

## 4. Configuración de Seguridad
En el mismo `appsettings.json`, configurar una clave secreta para los tokens JWT:
```json
"TokenKey": "Tu_Clave_Super_Secreta_Y_Larga_De_Minimo_64_Caracteres"
```

## 5. Ejecución
Presionar `F5` en Visual Studio o ejecutar el comando:
```bash
dotnet run --project SportTrack-v1.Api/SportTrack-v1.Api.csproj
```
El sistema estará disponible en `http://localhost:5029/swagger` para interactuar con la documentación interactiva.

## 6. Consideraciones para Producción
-   Cambiar el `LogLevel` a `Warning` o `Error`.
-   Asegurarse de que `CORS` esté configurado solo para los dominios permitidos del frontend en `Program.cs`.
-   Utilizar un secreto de entorno para la `TokenKey` en lugar de dejarla en el archivo JSON.
