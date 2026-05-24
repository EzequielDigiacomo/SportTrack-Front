# Manual de Usuario: SportTrack

Este manual describe el uso de la plataforma desde las dos perspectivas principales: el **Administrador de la Federación** y el **Representante del Club**.

---

## Parte 1: Manual del Administrador (Federación)

El usuario Administrador tiene acceso completo al sistema para configurar la plataforma, crear eventos y administrar la situación financiera de los clubes.

### 1.1. Iniciar Sesión como Administrador
1. Ingrese a la URL de la plataforma.
2. Introduzca sus credenciales de acceso de administrador.
3. El sistema lo redirigirá al **Dashboard Principal** de la Federación, donde verá el resumen estadístico de Atletas, Clubes y recaudación.

### 1.2. Gestión de Eventos y Pruebas
Para organizar un nuevo torneo de canotaje/regatas:
1. En el menú lateral, haga clic en **"Organizar Eventos"**.
2. Haga clic en **"Nuevo Evento"**.
3. Complete el título, la fecha de inicio/fin y la fecha límite de inscripción. Guarde los cambios.
4. Una vez creado el evento, seleccione **"Configurar Pruebas"**.
5. En el panel modal, añada las pruebas especificando: Categoría de edad, Distancia (ej. 500m), Tipo de Bote (ej. K1) y Rama.
> `[INSERTAR CAPTURA DE PANTALLA: Modal de ConfigurarPruebasModal.jsx]`

### 1.3. Generación del Cronograma
Una vez cerrada la fecha de inscripción:
1. Dentro del evento, seleccione **"Motor de Cronograma"**.
2. Haga clic en **"Generar Fases Automáticamente"**.
3. El sistema analizará la cantidad de inscritos en cada prueba y creará Eliminatorias, Semifinales y Finales.
4. Ajuste manualmente el horario de inicio si es necesario y confirme.
> `[INSERTAR CAPTURA DE PANTALLA: Vista del Cronograma Generado]`

### 1.4. Control de Pagos y Acceso SaaS
Para revisar qué clubes están en mora:
1. Diríjase a **"Gestión de Pagos"** en el panel de súper administración.
2. Utilice los filtros para seleccionar un club específico.
3. Puede ver el estado ("Al Día", "Vencido", "Bloqueado") y registrar cobros manuales. Si un club no paga, el sistema bloqueará automáticamente su capacidad de inscribir nuevos atletas.
> `[INSERTAR CAPTURA DE PANTALLA: Panel GestionPagosSection.jsx]`

---

## Parte 2: Manual del Club

El representante del club utiliza el sistema para administrar la lista de sus propios palistas y anotarlos en los distintos eventos.

### 2.1. Panel de Control del Club
Al iniciar sesión, verá un Dashboard con las estadísticas exclusivas de su club.
*Tenga en cuenta que si el plan SaaS del club está bloqueado por morosidad, verá una alerta roja y varias funciones estarán deshabilitadas.*

### 2.2. Administrar Atletas
1. En el menú, vaya a **"Mis Atletas"**.
2. Verá una grilla con los deportistas de su club.
3. Para agregar uno nuevo, haga clic en **"Nuevo Atleta"**, complete los datos personales (incluyendo Fecha de Nacimiento).
4. *El sistema calculará automáticamente la categoría de competición a la que pertenece según su edad.*

### 2.3. Inscripción a un Evento
1. Vaya a **"Inscripciones"**.
2. Seleccione el evento próximo disponible en el calendario.
3. Seleccione las pruebas en las que desea participar.
4. El sistema le pedirá elegir a qué atleta asignar a la prueba. Solo aparecerán los atletas cuya edad y rama coincidan con los requisitos de la prueba seleccionada.
5. Confirme la inscripción. La inscripción quedará en estado "Pendiente de Pago".
> `[INSERTAR CAPTURA DE PANTALLA: Modal de Inscripción de Atleta]`

### 2.4. Resultados en Vivo
Durante el día de la competencia:
1. Desde su panel, ingrese a la solapa **"Resultados en Vivo"** del evento actual.
2. A medida que la federación cargue los tiempos en la línea de llegada, la tabla de posiciones se actualizará de forma instantánea sin necesidad de recargar la página.
