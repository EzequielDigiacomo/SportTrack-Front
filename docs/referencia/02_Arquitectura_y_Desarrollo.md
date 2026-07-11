# 💻 SportTrack: Documentación de Arquitectura y Configuración B2B

Este documento es de uso estrictamente técnico. Establece las convenciones arquitecturales, la puesta en marcha, la configuración de seguridad y la topografía de la API para cualquier desarrollador (.NET/React) que tome control del código base de SportTrack.

---

## 1. Topología del Sistema y Stack Tecnológico

SportTrack está dividido en un ecosistema clásico cliente-servidor:
1.  **Frontend (SPA):** Construido en Vite + React. 
    *   **Estilos:** CSS puro, altamente modular, basado en variables nativas en `:root` (glassmorphism/paletas oscuras).
    *   **Conectividad:** `axios` administrado vía instancias centralizadas en `src/services/api.js`.
2.  **Backend (API Restful):** .NET 8 Web API.
    *   **ORM:** Entity Framework Core (PostgreSQL).
    *   **Mapeo:** AutoMapper (con fuertes salvedades de diseño detalladas debajo).
    *   **Autenticación:** Microsoft.AspNetCore.Authentication.JwtBearer.

---

## 2. Puesta en Marcha y Configuración Inicial (Setup)

### 2.1 Archivos de Preferencias Críticos
Las variables maestras del Backend residen en `SportTrack-v1.Api/appsettings.json` o `appsettings.Production.json`.

*   **ConnectionStrings -> DefaultConnection:**
    `"Host=localhost;Port=5432;Database=SportTrackDB;Username=...;Password=..."`
    *Nota: Asegurarse de ejecutar `Update-Database` desde la consola del administrador de paquetes para aplicar las migraciones de PostgreSQL.*
*   **TokenKey:**
    Esta es la firma simétrica secreta del JWT. *Obligatorio:* Debe ser sobreescrita y almacenada en Variables de Entorno Seguras antes de un pase a Producción para garantizar la integridad de los tokens emitidos.

### 2.2 Dependencias Nativas de Frontend / CORS
El servidor de .NET está provisto para aceptar CORS.
En Frontend, todas las direcciones del backend están orquestadas en `src/utils/constants.js`.
*   Asegúrate de alinear la variable `API_BASE_URL` al puerto expuesto de Kestrel/IIS Express (Ej: `http://localhost:5207/api`).

---

## 3. Seguridad y Lifecycles: Mecánica del JWT

El módulo de Autenticación de la plataforma asume responsabilidad sobre el multi-tenancy temporal (Cero-Confianza).

1.  **Lugar Físico:** `SportTrack-v1.Api/Services/TokenService.cs`.
2.  **Expiración TTL (Time To Live):** Hardcodeado a `Expires = DateTime.Now.AddHours(5)`.
    *   **Justificación de Diseño:** Las regatas o campeonatos duran de 8 a 10 horas y las computadoras en las carpas del campeonato suelen compartirse. 5 horas mitiga riesgos si un club no desloguea su máquina.
3.  **Claims Incorporados:** El motor encripta el `Username`, `Role`, y vitalmente el `ClubId`. Gracias a esto, todos los repositorios filtran accesos automáticamente leyendo el Token y no perfiles HTTP en crudo.
4.  **Respuesta Frontend:**
    *   `src/services/api.js` está dotado de un interceptor de red global. Ante cualquier rechazo de petición por código HTTP HTTP `401 Unauthorized`, purga el navegador (`localStorage.removeItem...`) rebotando al usuario al `/login` orgánicamente sin corromper crasheos de estado de React.

---

## 4. Convenciones Obligatorias y Patrones Críticos

Para garantizar el rendimiento, previniendo crashes, se definen estrictas reglas que todo desarrollador de la plataforma debe acatar al trabajar en los controladores.

### 4.1 La regla de Oro de `AutoMapper` y Modelos Complejos
**Prohibido utilizar `AutoMapper` explícitamente en el enrutamiento complejo o consultas de alto nivel de anidación (Ej: Recuperar Pruebas de Todo Un Evento).**
*   **El Problema Existente:** Los objetos del núcleo, como `EventoPrueba` están fuertemente bidireccionados a `Prueba` -> `Bote` -> `Categoria`. Al intentar mapear árboles masivos (de cientos de registros en memoria flash), `AutoMapper` pierde rastro de la profundidad utilizando "Reflexión" (Reflection), causando la saturación absoluta de la memoria y arrojando Exceptions irrecuperables (StackOverflow `0xffffffff`).
*   **La Solución Implementada:** Utilizar el patrón de **Proyección Manual LINQ** en las llamadas costosas. Ejemplo vivo de arquitectura sana en `EventoService.cs`:
    ```csharp
    return pruebas.Select(ep => new EventoPruebaDto {
        Id = ep.Id,
        EventoId = ep.EventoId,
        // ... (asiganción manual prop x prop anulando reflectividad infinita)
    });
    ```

### 4.2 Control y Protección de Ciclos (JSON Cycles)
Para asegurar que .NET no lance excepciones de bucle al escupir grandes respuestas HTTP de Entity Framework, en el archivo base `Program.cs` se ha incorporado la directiva estricta en la configuración MVC:
`options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;`

### 4.3 Control de Inclusiones Locales (Evitando Productos Cartesianos)
**Las llamadas al Repositorio usando EF Core `Include(...)` deben limitarse estáticamente y auditarse.**
1.  Puesto que un "Participante" posee "Resultados", que poseen "Eventos", que poseen "Categorías", anidar inclusiones de profundidad 3+ (`.ThenInclude().ThenInclude()`) colapsará el SQL generado y la memoria del servidor producto de la explosión cartesiana generada.
2.  Si necesitas una tabla intermedia pero grande (ej: Tripulaciones de Atletas) filtra siempre y de antemano el Query principal con `.Where()`, reduciendo a tu target exacto.

---

## 5. Endpoints Transaccionales (Motor Base)

Existen procedimientos arquitectónicos robustificados que ameritan cuidado extra antes de alterarse:

*   **`POST` /fases/promover/{idPrueba}**: 
    Motor transaccional autómata. Revisa todos los *Resultados* cargados. Aplica algoritmo de progresión (filtrado lógico tipo top clasificados 1-2-3 irán directos a Semis o Finales basado en cantidades matemáticas de Heat). Es **Destructivo:** Si se ejecuta dos veces, detecta su propio avance, y borra las carreras mal-promovidas en el paso anterior y rearma toda la matriz.
*   **`GET` /inscripciones/evento/...**:
    Servicio de recolección de embarcaciones. Trabaja basando validación de nulls. Es el único algoritmo de lectura en la API que sabe entender que un Bote Multi-Tripulación (K4) podría no tener definido el modelo `ParticipanteId` directamente en su pilar (sino adentro de su Lista Navigation T`ripulantes`), obligando a consultar los ID de los tripulantes mediante expresiones genéricas `(i.Tripulantes.Any(t => t.Participante.ClubId == id))`.
