# Manual de Uso de la API y Casos de Uso

## 1. Flujo de Autenticación
El sistema utiliza roles para la gestión de permisos:
-   **Anónimo:** Ver resultados y eventos próximos.
-   **Club:** Registrar atletas propios e inscribirlos en pruebas.
-   **Admin:** Crear eventos, pruebas y validar resultados.

### Proceso de Login:
1.  Enviar credenciales a `POST /api/auth/login`.
2.  Recibir el `token`.
3.  Incluir el token en la cabecera de todas las peticiones protegidas:
    `Authorization: Bearer <TU_TOKEN>`

## 2. Gestión de Clubes y Atletas
Un club debe estar registrado en el sistema antes de que sus usuarios puedan operar.
1.  **Crear Club:** `POST /api/clubes`.
2.  **Registrar Atleta:** `POST /api/participantes` (requiere `clubId`).
3.  **Inscripción:** `POST /api/inscripciones`. Aquí se asocia un atleta con una carrera específica de un evento.

## 3. Dinámica de Resultados en Vivo
Este es el componente central para la sostenibilidad y atractivo del sistema.

### Caso de Uso: Carga de Tiempos
1.  Un juez selecciona una inscripción desde su tablet.
2.  Envía el resultado mediante `POST /api/resultados/upsert`.
3.  **Acción del Back:** El sistema calcula las posiciones si es necesario y emite una señal a través del WebSocket.

### Suscripción del Frontend:
El frontend debe conectarse al hub `/hubs/results`. Una vez conectado, debe invocar el método de hub para unirse a un grupo basado en el ID de la carrera que está visualizando.

## 4. Endpoints Principales (Ejemplos)
-   `GET /api/eventos/proximos`: Ideal para la home page.
-   `GET /api/resultados/prueba/{id}`: Trae el listado completo de tiempos de una regata específica.
-   `GET /api/participantes/club/{id}`: Permite al club ver su nómina de atletas.

## 5. Manejo de Errores
El sistema devuelve respuestas estandarizadas en caso de error:
```json
{
  "statusCode": 404,
  "message": "Participante no encontrado",
  "innerMessage": "null",
  "details": "...stack trace..."
}
```
*Nota: El campo `details` solo se muestra en entorno de desarrollo por seguridad.*
