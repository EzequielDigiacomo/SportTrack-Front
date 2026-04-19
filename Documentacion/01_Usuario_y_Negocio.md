# 📘 SportTrack: Documentación de Usuario y Negocio

Este documento contiene las reglas de negocio, historias de usuario aplicadas y el formato marco del manual para el usuario final del sistema SportTrack.

---

## 🔐 1. Explicación de Seguridad y Sesiones (Para Usuarios)

SportTrack maneja datos sensibles de cientos de atletas e instituciones. Por ende, cuenta con un protocolo de "Sesión Cero-Confianza". 

**¿Qué significa esto para el usuario?**
Cuando ingresas al sistema (ya sea como Club o como Administrador/Juez), el sistema te entrega una llave digital virtual. Para prevenir que alguien más use tu computadora si te levantas o te olvidas la sesión abierta en el club, **esta llave digital se autodestruye exactamente a las 5 horas de haber ingresado.**

- **Si estás a la mitad de un torneo:** Al cumplirse las 5 horas, la pantalla te pedirá gentilmente que vuelvas a iniciar sesión. 
- **¿Se pierden mis datos si se cierra la sesión?** ¡No! SportTrack guarda tus inscripciones y cronómetros de forma instantánea apenas haces clic. Si la sesión expira repentinamente, al volver a entrar todo estará exactamente donde lo dejaste.

---

## 📖 2. Historias de Usuario

A continuación se detallan las Historias de Usuario (HU) principales que construyeron las bases de los diferentes módulos logísticos.

### Módulo: Gestión de Eventos y Configuración de Regatas
* **HU01: Creación de Eventos Oficiales**
  * *Como* Administrador General, *Quiero* crear eventos deportivos definiendo fecha, localización e insignias, *Para* tener un entorno encapsulado donde englobar las carreras.
* **HU02: Parametrización de Carreras (Pruebas)**
  * *Como* Administrador de Evento, *Quiero* asociar pruebas específicas (Categoría, Tipo de Bote, Distancia, y Sexo), *Para* construir la parrilla oficial a la que los clubes podrán inscribirse.

### Módulo: Inscripciones y Cupos de Clubes
* **HU03: Inscripción Multibote (Equipos)**
  * *Como* Delegado de Club, *Quiero* inscribir simultáneamente embarcaciones de equipo (Ej: K2, K4), *Para* garantizar que mi tripulación esté unificada jerárquicamente sin romper el cupo de botes habilitados del torneo.
  * *Aceptación:* El sistema verifica si el límite del torneo es de "Botes A y B", y en el caso de botes Dobles (K2) me permite seleccionar 4 atletas, separándolos visualmente en dos botes independientes con posiciones del `1-` al `4-`.
* **HU04: Bloqueo de Categoría Única**
  * *Como* Sistema, *Quiero* impedir que un atleta se inscriba, *Para* respetar reglas de validación restrictivas como desajustes de Edad, Sexo, o límite de Botes de la pista.

### Módulo: Desarrollo Deportivo y Progresiones
* **HU05: Armado Autómata de Series (Heats)**
  * *Como* Juez Deportivo, *Quiero* que el sistema detecte cuando hay más de 9 inscriptos en una regata, *Para* fraccionarlos matemáticamente en Series (Heats) balanceadas de forma automática.
  * *Aceptación:* El sistema desplaza el reloj del cronograma original añadiendo intervalos de 10 minutos automáticamente a las pruebas siguientes para acomodar las nuevas carreras generadas.
* **HU06: Promoción Transaccional a Finales**
  * *Como* Árbitro de Regata, *Quiero* confirmar administrativamente mediante un botón cuándo promover los clasificados de las eliminatorias hacia las Finales correspondientes, *Para* evitar que una alteración temprana de tiempos corrompa el esquema de la competencia.

### Módulo: Resultados y Reportes
* **HU07: Operación de Cronómetros**
  * *Como* Cronometrista, *Quiero* una grilla robusta para rellenar Minutos, Segundos y Milisegundos por carril, *Para* oficializar las velocidades exactas.
* **HU08: Extracción de Reportes Oficiales (PDF)**
  * *Como* Espectador / Prensa, *Quiero* descargar las Grillas en formato PDF, *Para* contar con reportajes físicos donde Eliminatorias y Finales estén correlativas.

---

## ⚙️ 3. Casos de Uso Críticos del Sistema

* **CU01: Resolución de Empates Tácticos:** Durante la carga de cronómetros, si el Juez asigna exactamente el mismo tiempo a dos corredores en la posición límite de la Serie, el backend detecta el empate usando los milisegundos y exige resolución arbitral obligatoria (para habilitar o expandir un carril en Semis).
* **CU02: Límite Plural Multi-Bote A y B:** Al marcarse la directiva de torneo `limitacionBotesAB`, un Club que posee "Cupos de Kayak K4" bloquea la suma infinita de barcos forzando al selector que matemáticamente sólo englobe un cupo estricto del producto Barco * Boto Disponible.

---

## 👩‍💻 4. Resumen de Pantallas y Manual Visual

*(Nota de redacción: Integrar en esta plantilla base estructural los screenshots operacionales del sistema correspondientes si se extrae como manual de PDF/Papel)*

### Pantalla 1: Home y Live Dashboard Público
Panel público para familias y espectadores. Exhibe en grandes tarjetas interactivas el estado de la pista marcando qué carreras están `Programadas` (grises), `En Curso` (pulsantes) o `Finalizadas` (con medallas).
* `[ ] Insertar Captura del Dashboard`

### Pantalla 2: Consola de Club (Inscripciones)
Interfaz dividida intuitiva. A la izquierda, un listado de lista comprimido y legible de las carreras. A la derecha, un formulario de checkboxes y una grilla dual (bote por bote) que muestra cómo se estructura el barco oficial de izquierda a derecha de la tripulación en vivo.
* `[ ] Insertar Captura del armado del Bote K2/K4`

### Pantalla 3: Módulo de Gestión de Tiempos
Tabiquería de la torre de control de Jueces. Muestra qué atletas ocupan cada andarivel en grilla, proveyendo un panel de tres inputs (`Minuto` `Segundo` `Milisegundos` individuales) y el disparador de Inteligencia de Promociones a Semifinales.
* `[ ] Insertar Captura de la Tabla de cronómetros`
