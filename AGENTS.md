# MEMORIA OPERATIVA Y GUIA PERMANENTE — CASE TOOL UML

> **FUENTE DE VERDAD Y MEMORIA EXTERNA DEL AGENTE:**
> La memoria persistente, histórica y técnica del sistema reside exclusivamente en la **Bóveda de Obsidian** ubicada en:
> `D:\Memoria Boveda\SW1_PrimerP`
> Cualquier consulta sobre fundamentos teóricos, perfiles, actas o registros de fases PUDS anteriores debe ser consultada y contrastada contra dicha bóveda.

---

## 1. Enfoque de Desarrollo y Estado Real de los Casos de Uso (CU)

El desarrollo del sistema se ejecuta **estrictamente Caso de Uso por Caso de Uso (CU por CU)** bajo el Proceso Unificado de Desarrollo de Software (PUDS).
* **Realizados Correctamente y Validados:** Exclusivamente hasta el **CU18** (Ciclo 3 completado al 100%).
* **Todo lo posterior a CU18:** Casos de uso futuros o estabilización de ciclo.
* **Foco Inmediato Siguiente:** Consolidación y validación integral de Ciclo 3.

### Matriz de Estado de Casos de Uso por Ciclos

| CU | Nombre del Caso de Uso | Ciclo | Actor(es) Principal(es) | Estado Real | Alcance Técnico / Entregable Formal |
|---|---|---|---|---|---|
| **CU00** | Autenticarse en el Sistema (Sesión Volátil) | Ciclo 1 | `USUARIO` | **Implementado** | Login seguro con JWT Bearer volátil en `sessionStorage`, filtro `OncePerRequestFilter`, validación stateless. |
| **CU01** | Registrarse en la Plataforma | Ciclo 1 | `USUARIO` | **Implementado** | Registro de nuevos usuarios, hashing BCrypt, asignación de rol base por defecto. |
| **CU02** | Gestionar Usuarios y Roles (RBAC) | Ciclo 1 | `A1: Super Admin` | **Implementado** | Vista `/admin/users`, alternancia de estado (activo/suspendido), asignación de roles y métricas de gobernanza. |
| **CU03** | Gestión de Proyectos y Espacios de Trabajo | Ciclo 1 | `A2: Arquitecto` / `A3: Colaborador` | **Implementado** | **Reemplazo íntegro del SaaS.** CRUD completo de proyectos, metadatos, tags, versionado `v1.0.0` y **clonación profunda** de nodos y relaciones. |
| **CU04** | Auditar Bitácora Global y Eventos de Seguridad | Ciclo 1 | `A1: Super Admin` | **Implementado** | Registro inmutable de eventos en `audit_logs` con IP, timestamp, enriquecimiento de usuarios, paginación (20/pág), filtros y exportación CSV/JSON. |
| **CU05** | Consultar Historial y Trazabilidad | Ciclo 1 | `A3: Colaborador` / `A2: Arquitecto` | **Implementado** | Timeline cronológico de mutaciones (`diagram_history`) con diff antes/después, enriquecimiento de autores, papelera de reciclaje con restauración reversible y purga definitiva (hard delete) en cascada física. |
| **CU06** | Ejecutar Tutorial Onboarding (< 2 min) | Ciclo 1 | `A3: Colaborador` / `A2: Arquitecto` | **Implementado** | Guía interactiva paso a paso para adopción rápida del editor y herramientas CASE (< 120s), spotlight no invasivo, gatillado automático/manual ("Guía Rápida") y persistencia en `user_profiles.preferences`. |
| **CU07** | Crear Proyecto desde Plantilla Base | Ciclo 1 | `A2: Arquitecto` | **Implementado** | Catálogo interactivo de plantillas de dominio (Académico, Hospitalario, Facturación y Blanco), scaffolding profundo transaccional de nodos y relaciones OMG UML 2.5, remapeo consistente de IDs y trazabilidad en bitácora e historial. |
| **CU08** | Modelar Clases UML (Tipos y Visibilidad) | Ciclo 1 | `A2: Arquitecto` / `A3: Colaborador` | **Implementado** | Modelado canónico OMG UML 2.5 (3 compartimentos, visibilidades `+`, `-`, `#`, `~`, estereotipos con guillemets, cursiva abstract, subrayado static, badge `{PK}`, catálogo Java 21 / PostgreSQL 17, firmas con parámetros tipados `(p: Type)`), validación de unicidad de nombre en frontend/backend (`E1: Nombre Duplicado`), clonación atómica profunda (`cloneClassNode`) con offset `(+48, +48)` y trazabilidad completa. |
| **CU09** | Conectar Relaciones y Cardinalidades | Ciclo 1 | `A2: Arquitecto` / `A3: Colaborador` | **Implementado** | Trazado canónico OMG UML 2.5 (asociación dirigida con flecha abierta, agregación con rombo hueco, composición con rombo relleno, generalización y realización con triángulo cerrado, dependencia con línea discontinua), omisión de cardinalidad en relaciones estructurales, restricción de composición simple en contenedor, roles (source/target), prevención de ciclos de herencia directos y transitivos vía DFS en backend y frontend (E1: Herencia Circular), botón de inversión de dirección atómica, y sistema de historial en lienzo con atajos de teclado Deshacer/Rehacer (Ctrl+Z, Ctrl+Y). |
| **CU10** | Validar Normalización Lógica (1NF a 3NF) | Ciclo 1 | `A2: Arquitecto` / `A3: Colaborador` | **Implementado** | Motor heurístico de auditoría de normalización relacional (TOM y Codd). Detección de claves primarias faltantes en 1NF con inyección asistida de `{PK}`, atributos multivaluados y repetitivos, verificación de FKs en relaciones $1..*$ en 2NF, descomposición de relaciones $*..*$ en clases intermedias asociativas en 3NF, dependencias transitivas y campos calculados. Semáforo de calidad (0 a 100%), modal interactivo con filtros, certificación de auditoría inmutable en backend (`audit_logs`) y suite de pruebas unitarias al 100%. |
| **CU11** | Exportar Modelo y Documentación Técnica | Ciclo 2 | `A2: Arquitecto` / `A3: Colaborador` | **Implementado** | 4 formatos canónicos: OMG XMI 2.1 (ArchiTec/StarUML), PNG alta resolución (1x, 2x, 3x Ultra HD con fondos configurables), Memoria Técnica PDF ejecutiva con diagrama rasterizado incrustado, y Libro Excel (.xlsx) de 3 hojas con tipos PostgreSQL 17 / Java 21 JPA. Modal ergonómico, validación preventiva de modelo vacío (E1) y auditoría inmutable en `audit_logs`. |
| **CU12** | Importar Modelo desde XMI (ArchiTec) | Ciclo 2 | `A2: Arquitecto` | **Implementado** | Parser bidireccional XML/XMI OMG (ArchiTec, Enterprise Architect, StarUML) con protección XXE, extracción completa de clases, visibilidad, PKs, NOT NULL, métodos y relaciones, motor de auto-layout jerárquico por capas (LayoutEngineUtil), opción dual (Nuevo Proyecto vs Incorporar), modal drag & drop y registro en audit_logs. |
| **CU13** | Generar Backend Spring Boot (4 Capas en ZIP) | Ciclo 2 | `A2: Arquitecto` | **Implementado** | Generación automatizada de código Java 21: Entities JPA, Repositories, Services y Controllers empaquetados en `.zip` con Maven Wrapper, Swagger y perfiles H2/PostgreSQL. |
| **CU14** | Generar Esquema DDL SQL (PostgreSQL 17) | Ciclo 2 | `A2: Arquitecto` | **Implementado** | Exportación de script SQL DDL para Supabase/PostgreSQL 17 con tablas, PKs autoincrementales IDENTITY, FKs con ON DELETE CASCADE, tablas intermedias N:N, índices B-Tree, comentarios y auditoría inmutable. |
| **CU15** | Generar Colección de Pruebas Postman v2.1 | Ciclo 2 | `A2: Arquitecto` | **Implementado** | Colección JSON oficial Postman v2.1.0 con carpetas por entidad, suite REST CRUD completa (5 requests/entidad), tests automáticos pm.test (status 200/201/204, <1000ms), captura de IDs en variables de entorno, generación semántica de datos mock, variable {{baseUrl}}, visor de código y auditoría inmutable. |
| **CU16** | Modelar por Dictado de Voz (IA PLN) | Ciclo 3 | `A2: Arquitecto` / `A3: Colaborador` | **Implementado** | Entrada por micrófono (Web Speech API) y texto libre, arquitectura de resiliencia Circuit Breaker en 4 niveles (Gemini Flash, Groq Llama 3.3, OpenRouter y Motor Heurístico Local Offline), mutaciones incrementales en React Flow, reversibilidad total con Ctrl+Z/Ctrl+Y, y persistencia inmutable en `ai_prompt_logs` y `audit_logs`. |
| **CU17** | Digitalizar Foto de Pizarra (IA Visión) | Ciclo 3 | `A2: Arquitecto (Host)` | **Implementado** | Subida Drag & Drop y captura por cámara web, Circuit Breaker multimodal (Gemini 3.6 Flash, OpenRouter Vision y Fallback Local), motor de auto-layout jerárquico no colisionante (LayoutEngineUtil), defensa preventiva 1NF relacional ({PK} id: Long), opción dual Reemplazar vs Fusionar, reversibilidad total con Ctrl+Z, y auditoría inmutable en `ai_prompt_logs` y `audit_logs`. |
| **CU18** | Sincronizar Sesión Colaborativa (WSS + Chat + Gobernanza) | Ciclo 3 | `A2: Arquitecto (Host)` / `A3: Colaborador` | **Implementado** | Salas concurrentes en tiempo real vía WebSockets STOMP sobre SockJS (< 50ms latencia) exclusivas para usuarios registrados (Arquitecto y Colaborador, con bloqueo a Super Admin), expulsión inmediata de participantes por el Host (Kick), candados optimistas de edición, chat colaborativo en vivo no invasivo con aislamiento de teclado, cursores remotos con transformación geométrica de viewport y persistencia en Supabase (PostgreSQL 17). |

---

## 2. Metodología de Trabajo y Estándares Técnicos

### 2.1 Metodología de Desarrollo: PUDS + CBD (Riguroso CU por CU)
1. **PUDS (Proceso Unificado de Desarrollo de Software):**
   * Cada CU se aborda de forma integral y secuencial: **Requisitos -> Análisis -> Diseño -> Implementación -> Pruebas -> Documentación en Bóveda**.
   * No se avanza al siguiente CU hasta que el actual esté 100% probado y funcional en backend y frontend.
2. **CBD (Desarrollo Basado en Componentes):**
   * **Backend (Spring Boot 4.1.0 / Java 21):** Arquitectura estricta en 4 capas desacopladas:
     - `controller`: Endpoints REST stateless y contratos DTO.
     - `service`: Lógica de negocio pura, validaciones de dominio y transaccionalidad `@Transactional`.
     - `repository`: Interfaces Spring Data JPA conectadas a Supabase PostgreSQL 17.
     - `model / entity`: Entidades JPA mapeadas a esquema relacional.
   * **Frontend (React 18 + TypeScript + Vite):** Componentes funcionales reutilizables, Tailwind CSS, estado reactivo limpio y Lucide React.

### 2.2 Prohibición Permanente de SaaS / Pagos
* Totalmente erradicado. La plataforma es una herramienta CASE de ingeniería de software pura.

---

## 3. Reglas Inviolables de Gobernanza y Operación del Agente

### 3.1 Consulta Obligatoria de la Bóveda de Obsidian (Contexto Permanente)
* La **Bóveda de Obsidian (`D:\Memoria Boveda\SW1_PrimerP`)** es la fuente de verdad inmutable y la memoria persistente del sistema.
* Para mantener siempre el contexto técnico, histórico y metodológico a lo largo de las sesiones, se debe consultar y contrastar activamente la información contra dicha bóveda antes de diseñar o implementar.

### 3.2 Manejo Riguroso y Correcto de las Skills
* El agente debe utilizar proactivamente sus herramientas y paquetes de habilidades (skills) especializadas según la tarea (TDD, Spring Boot / Java, React / TypeScript, PostgreSQL, seguridad, etc.).
* Se deben revisar las instrucciones de `SKILL.md` para garantizar las mejores prácticas de ingeniería y ejecución sin desvíos metodológicos.

### 3.3 Política Estricta de Subida a GitHub (Cero Pushes Parciales o Prematuros)
* **Toda subida (commit y push) al repositorio de GitHub se realizará ÚNICAMENTE cuando el Caso de Uso (CU) en curso esté TOTALMENTE CORRECTO y finalizado.**
* Criterio de aceptación para Git Push:
  1. Backend implementado bajo las 4 capas y compilando sin errores (`mvn test-compile` SUCCESS).
  2. Frontend implementado, limpio y compilando sin errores (`npm run build` SUCCESS).
  3. Pruebas funcionales del CU superadas al 100%.
  4. Documentación y trazabilidad del CU debidamente registradas en la Bóveda de Obsidian.
* Queda terminantemente prohibido hacer commit o push con código roto, incompleto o a medio implementar.
* **Control Estricto por el Usuario:** El usuario es quien indica de forma explícita cuándo realizar `git commit` y `git push`, y cuándo planificar el siguiente Caso de Uso. El agente NUNCA debe ejecutar commits/pushes ni pasar a planificar un nuevo CU por iniciativa propia.

### 3.4 Restricciones de Privilegios de Super Admin en Proyectos
* El Administrador Principal (`SUPER_ADMIN`) **únicamente puede supervisar y restaurar** proyectos desde la papelera de reciclaje (`/admin/projects`).
* **Prohibición de Eliminación:** El Super Admin **JAMÁS puede eliminar lógicamente ni purgar definitivamente** proyectos ajenos. 
* No deben existir controles ni botones de eliminación para el Super Admin en el frontend, y el backend bloquea cualquier intento arrojando `IllegalArgumentException` ("El Administrador solo puede supervisar y restaurar proyectos, mas no eliminarlos").

### 3.5 Arquitectura de Vistas: Dashboard Ejecutivo vs Páginas Dedicadas
* **`/dashboard`:** Es exclusivamente un resumen ejecutivo y cuadro de mando adaptado al rol:
  - Super Admin: Métricas globales de RBAC, eventos de seguridad y enlaces a gobernanza.
  - Arquitecto / Colaborador: KPIs de clases/relaciones modeladas, accesos directos y modelos recientes trabajados.
* **`/projects`:** Espacio de trabajo dedicado para Arquitectos y Colaboradores con CRUD completo, tags, clonación profunda, papelera y purga física.
* **`/admin/projects`:** Espacio de trabajo dedicado para Super Admin con auditoría global y restauración de proyectos en papelera.
* La separación y acceso entre vistas reside exclusivamente en el `Sidebar` lateral por rol.

---

## 4. Reglas Inviolables de Interfaz de Usuario (UI/UX)

1. **Identidad Visual Profesional e IHC Equilibrada (Prohibición de Colores Excesivamente Oscuros):**
   * Queda erradicado el modo ultra oscuro opresivo (`bg-slate-950` monocromático fúnebre).
   * La plataforma implementa las 2 paletas ergonómicas oficiales de alta fidelidad: **Titanio Cálido** (antracita cálido con acentos ámbar dorado y calidez orgánica) y **Grafito Obsidiana** (grafito neutro de precisión con acentos índigo y zafiro cósmico).
   * **Conservación de la Aurora Boreal:** Se mantiene intacta la Aurora Boreal multicapa ambiental como fondo atmosférico vivo y sutil.
   * **Cursor Reactivo Distintivo:** Cursor de baja luminosidad ambiental, cola corta de seguimiento inercial y punto seguidor de precisión con ondas ripple táctiles.
2. **Cero Emojis:** Toda la iconografía debe ser 100% vectorial con `lucide-react`. Sin emojis en ninguna vista o texto.
3. **Cero Redundancia de Navegación:**
   * El botón "Volver al Dashboard" reside únicamente en el Header principal para todas las subpáginas (`/admin/users`, `/settings`, `/editor`).
   * Píldora de usuario unificada (avatar + nombre + settings) sin controles duplicados.
4. **Identidad CASE Profesional y Prohibición Estricta de Sobrecontexto en Paréntesis:**
   * Sin nomenclaturas académicas, códigos de caso de uso ni referencias normativas entre paréntesis visibles para el usuario final en la interfaz (ej. PROHIBIDO: `(CU01)`, `(Clonar CU08)`, `(ISO/IEC 19505)`).
   * Los textos de botones, etiquetas, modales y tooltips deben ser limpios, directos y profesionales (ej. 'Duplicar Clase', 'Es Clase Abstracta', 'Clonar Proyecto'). Queda estrictamente prohibido contaminar las etiquetas visuales con sobrecontexto técnico interno.
5. **Separación y Espaciado de Layout (Respeto de Límites):**
   * Todo contenedor principal de página debe poseer padding generoso (`p-4 sm:p-6 lg:p-8 pb-20`).
   * Queda estrictamente prohibido que el contenido quede pegado al `Sidebar` lateral izquierdo o al borde derecho de la pantalla.
6. **Cero Desbordamiento de Componentes e Iconos:**
   * Ningún icono, botón, badge o texto debe salirse jamás de su recuadro, card o contenedor.
   * Todos los cards deben declarar `overflow-hidden`.
   * Los encabezados de cards con badges y botones de acción deben implementar `flex-wrap`, `min-w-0` y `shrink-0` con márgenes adecuados (`gap-2`), de modo que en pantallas o columnas estrechas los botones se acomoden limpiamente sin desbordar el ancho de la tarjeta.
7. **Distribución Limpia del Editor (Header vs Canvas Sidebar):**
   * El `Header` superior del editor `/editor` se mantiene ultraligero y despejado: únicamente el estado del proyecto (nombre + badge 'Guardado'), el botón principal 'Guardar', la burbuja circular de ayuda '?' (`HelpCircle`) para el tutorial onboarding, y el perfil de usuario.
   * Las herramientas técnicas CASE (Historial/Trazabilidad CU05, Generación Backend Spring Boot CU13, Script DDL SQL PostgreSQL 17 CU14 y futuros exportadores) residen exclusivamente en la barra lateral vertical del lienzo (`Toolbar.tsx`), aprovechando el espacio vertical con tooltips descriptivos hacia la derecha y evitando cualquier congestión o solapamiento horizontal en pantallas medianas o estrechas.

---

## 5. Reglas Estrictas para Diagramas PlantUML

1. **Disposición Flanqueada de 3 Columnas:**
   * **Columna Izquierda:** Casos de uso de gobernanza, auditoría, trazabilidad e importación.
   * **Columna Central:** Actores en columna vertical (`Arquitecto`, `Colaborador`, `Administrador Principal`) y en medio `CU1: Registrarse` y `CU0: Autenticarse`.
   * **Columna Derecha:** Casos de uso de modelado técnico y herramientas CASE, finalizando en esquina inferior derecha con `USUARIO`.
2. **Cuadro Bounding Box Único y Limpio:**
   * Encapsulado en `rectangle " " as Marco { ... }` sin texto ni títulos de ciclos en el marco.
3. **Asociaciones Direccionales:**
   * Flechas hacia la izquierda con `-left->` y hacia la derecha con `-right->`.
   * Generalización hacia `USUARIO` (`--|> U`).
   * Asociaciones de `USUARIO` hacia el centro (`U -left-> CU1`, `U -left-> CU0`).

---

## 6. Bitácora de Lecciones Aprendidas e Incidentes Resueltos

### Incidente BD-01: Constraint Check Obsoleto en `diagram_history`
* **Síntoma:** Al crear, editar, clonar, borrar o restaurar proyectos, Spring Boot respondía HTTP 500 con el mensaje `Transaction silently rolled back because it has been marked as rollback-only`.
* **Causa Raíz:** Existía una restricción CHECK en PostgreSQL 17 (`diagram_history_action_type_check`) que solo permitía un subconjunto restringido de strings (`create_class`, `update_class`, etc.) y rechazaba `PROJECT_CREATED`, `PROJECT_UPDATED`, `PROJECT_DELETED`, `PROJECT_RESTORED`, `PROJECT_CLONED`. La excepción SQL en Hibernate marcaba la transacción activa como `rollback-only`.
* **Solución Aplicada:**
  1. Se eliminó la restricción CHECK restrictiva en Supabase PostgreSQL (`ALTER TABLE diagram_history DROP CONSTRAINT IF EXISTS diagram_history_action_type_check;`).
  2. Se configuró enriquecimiento defensivo en frontend para extraer `err.response?.data?.message` en lugar de mensajes genéricos en los toasts.

### Incidente BD-02: Pérdida de Handles y Colapso de Relaciones al Guardar Diagrama
* **Síntoma:** Al guardar el diagrama, una flecha recién conectada entre dos clases desaparecía visualmente o se superponía con otra relación preexistente generando cardinalidades montadas ("1 1 *"), y a continuación el lienzo no permitía volver a conectar las clases.
* **Causa Raíz:**
  1. Ni la tabla `relationships` en PostgreSQL 17 ni la entidad `Relationship` ni los DTOs persistían `source_handle` y `target_handle`. Al sincronizar (`syncFullDiagram`), React Flow recibía `mappedEdges` sin handles y colapsaba todas las relaciones entre las mismas clases al primer handle disponible (`bottom` -> `top`), ocultando la nueva arista detrás de la anterior y superponiendo los textos de cardinalidad.
  2. En React Flow por defecto (`ConnectionMode.Strict`), los handles de tipo `target` no pueden iniciar conexiones y los de tipo `source` no pueden recibirlas, y la función `addEdge` descartaba como duplicadas las aristas con mismos extremos sin handles explícitos.
* **Solución Aplicada:**
  1. Se agregaron las columnas `source_handle` y `target_handle` en PostgreSQL 17 (`relationships`), mapeadas en `Relationship.java`, `RelationshipRequest.java`, `SyncDiagramRequest.java`, `DiagramService.java` y `diagramStore.ts`.
  2. Se configuró `connectionMode={ConnectionMode.Loose}` en `DiagramCanvas.tsx` y `isConnectable={true}` en los 4 puertos magnéticos de `ClassNodeComponent.tsx`, permitiendo conexiones libres y fluidas en cualquier dirección entre cualquier handle.
  3. En `diagramStore.ts` (`onConnect`), se eliminó el descarte de duplicados de `addEdge` para permitir múltiples relaciones UML válidas entre clases.
  4. En `RelationshipEdge.tsx`, se implementó cálculo geométrico ortogonal de posición de etiquetas según la orientación real del puerto (`sourcePosition` y `targetPosition`), eliminando el solapamiento de cardinalidades y roles.

### Incidente BD-03: Duplicación de Proyectos en Guardado y Solapamiento de Header sobre Sidebar
* **Síntoma:**
  1. Cada vez que se guardaba el diagrama (manual o auto-guardado en segundo plano), se creaba una copia redundante del proyecto "Sistema de Gestión Académica" en la base de datos PostgreSQL 17, llenando la papelera y el listado de proyectos.
  2. Al ingresar al lienzo `/editor`, el navbar superior (`Header.tsx`) cubría y ocultaba la cabecera del `Sidebar.tsx` ("Gobernanza / Arquitectura", rol y botón de cierre).
  3. La barra lateral mostraba "Modelo Activo" con un punto verde vacío y sin texto cuando no había ningún proyecto seleccionado.
* **Causa Raíz:**
  1. `diagramStore.ts` iniciaba con un estado mock fijo (`sampleProject` con id `'sample-project-id'`). En `saveDiagram`, la condición `if (!currentProject?.id || !isUUID(currentProject.id))` trataba el ID como no persistido y disparaba silenciosamente `api.createProject()`. Además, el auto-guardado en `MainLayout.tsx` se disparaba cada 30 segundos, creando copias continuas sin control.
  2. En `MainLayout.tsx` y `AppLayout.tsx`, el drawer del `aside` declaraba `fixed ... inset-y-0 left-0`. Al tener `inset-y-0` (`top: 0`), su cabecera quedaba oculta detrás del `Header` (`h-14`, 56px) debido al contexto de apilamiento (`z-30` del header vs `z-10` del contenedor).
  3. No se persistía en `localStorage` el último proyecto abierto, provocando que al entrar a `/editor` se inyectaran nuevamente los datos dummy.
* **Solución Aplicada:**
  1. Se eliminaron por completo `sampleProject`, `sampleNodes` y `sampleEdges`. El estado inicial de `diagramStore` es estrictamente limpio (`project: null`, `nodes: []`, `edges: []`).
  2. `saveDiagram()` ahora valida que exista un proyecto con UUID persistido y ejecuta exclusivamente `api.syncDiagram()`. Nunca crea proyectos silenciosamente.
  3. En `MainLayout.tsx`, al navegar a `/editor` sin ID de ruta, se consulta `localStorage.getItem('case_last_project_id')`. Si existe, redirige y carga dicho proyecto; si no existe, permanece en el lienzo limpio mostrando un estado vacío profesional ("Ningún modelo UML abierto") con acciones para ir a "Mis Proyectos" o "Crear Modelo".
  4. Se corrigió el posicionamiento del sidebar en `MainLayout.tsx` y `AppLayout.tsx` a `fixed top-14 bottom-0 left-0 z-40 md:relative md:top-0 md:h-full md:z-20` (y el backdrop móvil a `fixed top-14 bottom-0 inset-x-0`), garantizando que la barra lateral comience exactamente a 56px debajo del navbar y nunca sea solapada.
  5. En `Sidebar.tsx`, el card "Modelo Activo" valida la existencia de un proyecto real; en su ausencia muestra "Ningún modelo activo" con un botón de acceso directo a "Ver Mis Proyectos".

### Incidente GEN-01: Heurísticas Débiles de Subcadena en Generación de Mocks y Prioridad Invertida sobre Tipos Fuertes
* **Síntoma:** Al ejecutar la suite Postman generada (CU15) contra el backend Spring Boot (CU13) del Sistema Académico Universitario, 20 peticiones pasaron con 200 OK, pero `POST /api/inscripcions` devolvió HTTP 500: `JSON parse error: Cannot deserialize value of type java.time.LocalDate from String "84729103"`.
* **Causa Raíz:** En `PostmanGeneratorService.java`, el método `generateMockValue` evaluaba heurísticas de nombres antes del tipo de dato: `if (name.contains("ci") || name.contains("dni") ...) return "84729103";`. En español, el sustantivo `inscripcion` contiene la subcadena `"ci"` (`in-s-ci-o-n`), provocando que cualquier campo como `fechaInscripcion` fuera evaluado como un documento de identidad antes de comprobar si era un `LocalDate`. Jackson rechazó correctamente el formato no ISO.
* **Regla Preventiva Inviolable para Todo Generador:**
  1. **Precedencia de Tipos Estrictos:** El tipo de dato fuerte Java / SQL (`LocalDate`, `LocalDateTime`, `BigDecimal`, `Boolean`, `UUID`, etc.) SIEMPRE tiene precedencia absoluta sobre cualquier heurística de nombre.
  2. **Delimitación Estricta de Palabras (Token Boundaries):** Queda terminantemente prohibido usar `name.contains("ci")` o subcadenas cortas de 2 o 3 caracteres para nombres de campos. Se debe usar coincidencia exacta (`name.equals("ci")`), delimitadores con guión bajo (`name.startsWith("ci_")`, `name.endsWith("_ci")`) o palabras completas (`cedula`, `dni`, `documento`).
  3. **Pruebas de Deserialización Automatizadas:** Todo generador de mocks debe incluir pruebas unitarias con campos de entidades reales que validen la deserialización contra Jackson en `mvn test`.
### Incidente AI-01: Constraint Check en `ai_prompt_logs` y Diseño de Modelado No Invasivo Flotante
* **Síntoma:** Al procesar peticiones con voz o texto, PostgreSQL 17 arrojaba `ERROR: new row for relation "ai_prompt_logs" violates check constraint "ai_prompt_logs_modality_check"` debido a valores `"VOICE"` o `"TEXT"`. Asimismo, la interfaz presentaba un modal opaco centrado que tapaba el lienzo y obligaba a una doble confirmación manual en lugar de aplicar cambios en tiempo real.
* **Causa Raíz:**
  1. Restricción CHECK en PostgreSQL 17 requería los valores canónicos `'VOICE_SPEECH_PLN'`, `'VISION_PHOTO_OCR'`, `'TEXT_COPILOT'`.
  2. En el frontend, el diálogo centrado con backdrop opaco cubría las tablas y no reflejaba los cambios inmediatamente sobre React Flow.
  3. `LocalNlpParser` carecía de vocabulario para "tabla", "entidad", "generame", y no procesaba acciones compuestas de creación + conexión en un solo enunciado ("generame una tabla llamado gatos conectado con la tabla estudiante").
* **Solución Aplicada:**
  1. Se armonizó la restricción CHECK en Supabase (`CHECK (modality IN ('VOICE_SPEECH_PLN', 'VISION_PHOTO_OCR', 'TEXT_COPILOT', 'VOICE', 'TEXT'))`) y se fijó el envío canónico en `VoiceModelingService.java` y `VoiceModelingRequest.java`.
  2. En `LocalNlpParser.java`, se implementó `tryParseCompoundCreateAndConnect` para crear la entidad con defensa 1NF y la relación simultáneamente, enriqueciendo el vocabulario con sinónimos (`tabla`, `entidad`, `modelo`, `creame`, `generame`, `llamado`, `llamada`).
  3. Se rediseñó `VoiceModelingModal.tsx` como un **Dock Flotante No Invasivo** (`bottom-6 z-40`) sin backdrop, que aplica los cambios en tiempo real directamente sobre el lienzo (`applyVoiceMutations`), notificando al usuario y recordando la reversibilidad inmediata con `Ctrl+Z`.

### Incidente AI-02: Bloqueo de Tecla Espacio, Duplicación Espuria de Clases y Filtrado de Stop Words
* **Síntoma:**
  1. Al teclear en el input del dock de IA, la barra espaciadora no producía espacios.
  2. Al dictar o escribir *"modificar la tabla estudiante agregando los campos telefono String y direccion String"*, no modificaba la tabla sino que creaba una clase duplicada `"Estudiante1"` con campos espurios.
  3. En enunciados como *"generame una tabla llamado gatos con id, nombre y fecha conectado con la tabla estudiante"*, se generaban atributos absurdos como `que: String` o `de: String`, y comandos con verbos imperativos como *"conecta la tabla estudiante con la tabla docente de uno a uno"* no eran reconocidos.
* **Causa Raíz:**
  1. React Flow interceptaba la tecla `Space` para paneo del lienzo (`panActivationKeyCode="Space"` por defecto), y el input no detenía la propagación de eventos de teclado. Adicionalmente, el hook de voz sincronizaba `transcript` sobreescrito sin verificar si el micrófono estaba activo.
  2. `LocalNlpParser` no capturaba verbos de modificación (`modifica`, `actualiza`, `cambia`), cayendo en `CREATE_CLASS`. En el frontend, `diagramStore.ts` contenía un bucle `while (exists) { finalName = name + counter++ }` que creaba `Estudiante1` en vez de actualizar.
  3. El tokenizador de atributos no filtraba preposiciones ni artículos de enlace en español (`que`, `de`, `la`, `el`, `con`), y las expresiones regulares de relaciones exigían infinitivos (`conectar`) ignorando formas imperativas (`conecta`, `relaciona`).
* **Solución Aplicada:**
  1. Se configuró `panActivationKeyCode={null}` en `<ReactFlow>`, `e.stopPropagation()` en el input, y sincronización condicional a `isListening === true`.
  2. Se implementó `tryParseModifyOrAddAttributes` en `LocalNlpParser.java`, y en `diagramStore.ts` (`applyVoiceMutations`) se sustituyó la duplicación por **fusión y enriquecimiento de la entidad existente**.
  3. Se incorporó una lista negra `STOP_WORDS`, tipado semántico inteligente (`inferTypeFromName`: `fecha` $\to$ `LocalDate`, `id` $\to$ `Long PK`, etc.), y patrones RegEx imperativos para relaciones y cardinalidades (`uno a uno` $\to 1..1$).

### Incidente AI-03: Desacoplamiento de Mutaciones Compuestas de LLMs y Ajuste de Slugs en Circuit Breaker
* **Síntoma:**
  1. Al dictar *"la clase gato y conecta con la clase estudiante coma clase gato tendrá y de nombre y apellido"*, se creó la clase `Gato` en el lienzo pero la arista de relación con `Estudiante` no se dibujó.
  2. En los logs del backend se observaron errores HTTP 404 en Nivel 1 (Gemini) y Nivel 2 (Groq) con conmutación automática exitosa a Nivel 3 (OpenRouter) y Nivel 4 (Local).
* **Causa Raíz:**
  1. OpenRouter (`llama-3.1-8b-instruct`) interpretó el comando correctamente y devolvió un único objeto con `action: "CREATE_CLASS"` conteniendo en su interior tanto `classData` como `relationshipData`. En el frontend, `diagramStore.ts` evaluaba `else if (mut.action === 'CREATE_RELATIONSHIP')`, ignorando la relación anidada dentro de `CREATE_CLASS`.
  2. En el backend, las claves de Gemini y Groq sufrieron cambios de políticas en los proveedores: Google descontinuó `gemini-2.5-flash` y `gemini-1.5-flash` en ciertas regiones para `generateContent`, y Groq restringió `llama-3.3-70b-versatile` en planes free exigiendo `llama-3.1-8b-instant`.
* **Solución Aplicada:**
  1. **Desacoplamiento Atómico en Backend:** En `VoiceModelingService.java` (`postProcessMutations`), si una mutación trae `classData` y `relationshipData` juntos, se descompone automáticamente en dos mutaciones separadas: `CREATE_CLASS` limpia y `CREATE_RELATIONSHIP`.
  2. **Trazado Resiliente en Frontend:** En `diagramStore.ts` (`applyVoiceMutations`), se desacopló la lectura de `mut.relationshipData` de modo que si una orden de creación o modificación incluye datos de relación, busca los nodos involucrados y añade inmediatamente el edge al lienzo.
  3. **Ajuste de Slugs en Circuit Breaker:** En `CircuitBreakerAiService.java`, se fijó `llama-3.1-8b-instant` como primario de Groq, bucle multi-modelo resiliente en Gemini (`gemini-2.0-flash`, `gemini-1.5-flash`), y comprobación de que OpenRouter (`llama-3.1-8b-instruct`) y LocalNlpParser responden al 100%.

### Incidente AI-04: Robustecimiento Integral de Circuit Breaker Multi-IA, Normalización Semántica Fonética y Prevención de Ciclos UML
* **Síntoma:**
  1. Proveedores Nivel 1 (Gemini) y Nivel 2 (Groq) presentaban errores 404/400 al utilizar slugs de modelos descontinuados o restringidos en cuentas gratuitas (`gemini-2.5-flash`, `llama-3.3-70b-versatile`).
  2. Al dictar comandos de voz con plurales o tildes (*"la clase gato y conecta con los estudiantes"* o *"categoría"*), la relación no se conectaba porque la arista no encontraba coincidencia exacta (`"gato"` !== `"gatos"`, `"estudiante"` !== `"estudiantes"`).
  3. LLMs de razonamiento (como Qwen o GPT-OSS) emiten etiquetas internas de pensamiento (`<think>...</think>`), provocando `JsonParseException` si no son filtradas.
  4. La Web Speech API en español transcribe habitualmente la palabra hablada `"coma"` o `"punto"` como texto literal en vez de puntuación física, degradando la interpretación gramatical.
* **Causa Raíz:**
  1. Falta de verificación empírica en vivo contra los catálogos activos de cada proveedor (Gemini, Groq, OpenRouter).
  2. Búsqueda de clases en frontend mediante coincidencia estricta `===` sin normalización NFD ni lematización de singular/plural.
  3. Deserializador JSON rígido que esperaba exclusivamente `VoiceModelingResponse.class` sin aislar los bloques de texto explicativo o razonamiento previo del LLM.
  4. Ausencia de una capa de saneamiento fonético de transcripción verbal.
* **Solución Aplicada:**
  1. **Alineación Empírica de Modelos:** Se verificó en vivo con las claves del sistema y se configuraron los modelos activos confirmados:
     - **Gemini:** `gemini-flash-latest` (con fallback dinámico a `gemini-2.5-flash-lite`, `gemini-3.6-flash`, `gemini-3.5-flash`).
     - **Groq:** `openai/gpt-oss-20b` (con fallback a `qwen/qwen3.8-27b`, `groq/compound-mini`, `llama-3.1-8b-instant`).
     - **OpenRouter:** `meta-llama/llama-3.1-8b-instruct` (con fallback a `openrouter/free`).
     - **Local Heurístico:** `LocalNlpParser.java` optimizado para comandos verbales en cascada.
  2. **Deserializador Tolerante a Esquemas:** En `CircuitBreakerAiService.java`, se implementó purga de `<think>...</think>`, extracción precisa entre el primer `{` y último `}`, y compatibilidad tanto para `{ "mutations": [...] }` como para objetos de mutación raíz.
  3. **Limpieza Fonética de Puntuación:** En frontend (`VoiceModelingModal.tsx`) y backend (`cleanSpeechPrompt`), se reemplazan términos hablados (`coma` $\to$ `,`, `punto` $\to$ `.`, `y de nombre` $\to$ `nombre`).
  4. **Coincidencia Semántica y Fonética (`matchesClassName`):** En `diagramStore.ts` y `LocalNlpParser.java`, se implementó normalización NFD y desinencia plural (`-s`, `-es`), resolviendo automáticamente `"gatos"` $\leftrightarrow$ `"Gato"`, `"estudiantes"` $\leftrightarrow$ `"Estudiante"`, `"inscripción"` $\leftrightarrow$ `"Inscripcion"`.
  5. **Prevención de Ciclos de Herencia:** Control DFS (`hasInheritancePath`) en el trazado de aristas generadas por IA, evitando herencia reflexiva o circular.
  6. **Distribución Espacial Inteligente:** Algoritmo en rejilla (`120 + col*340`, `100 + row*270`) para nuevas entidades, eliminando el solapamiento visual en el lienzo.

### Incidente AI-05: Import Faltante de `UmlMutationDto` en Deserializador Resiliente y Bloqueo de Teclas
* **Síntoma:**
  1. Al invocar Nivel 1 (Gemini) o Nivel 2 (Groq), el backend arrojaba `jakarta.servlet.ServletException: Handler dispatch failed: java.lang.Error: Unresolved compilation problems: UmlMutationDto cannot be resolved to a type` en `extractAndParseJsonContent(CircuitBreakerAiService.java:346)`.
  2. En el dock de voz, teclear caracteres especiales o espacios podía verse interferido por el bubbling de eventos nativos en navegadores Chromium.
* **Causa Raíz:**
  1. Durante la incorporación del deserializador tolerante en `CircuitBreakerAiService.java`, se utilizó `UmlMutationDto.class` sin declarar el import `import com.sw1.casetool.dto.ai.UmlMutationDto;`, provocando que la compilación incremental de la JVM generara un stub con `java.lang.Error`.
  2. En `VoiceModelingModal.tsx`, `handleKeyDown` solo llamaba a `e.stopPropagation()` sin invocar `e.nativeEvent.stopImmediatePropagation()`, y el `<input>` carecía de la clase CSS `select-text` dentro de un contenedor padre con `select-none`.
* **Solución Aplicada:**
  1. Se agregó el import `import com.sw1.casetool.dto.ai.UmlMutationDto;` en `CircuitBreakerAiService.java`.
  2. Se configuraron fallbacks predeterminados en `@Value` para todas las claves y modelos de IA validados (`gemini-flash-latest`, `openai/gpt-oss-20b`, `meta-llama/llama-3.1-8b-instruct`).
  3. Se ejecutó `mvn clean compile test-compile` verificando 98/98 tests aprobados y se reinició el servicio Spring Boot en puerto 8080 (conectado a Supabase PostgreSQL 17).
  4. Se añadió `e.nativeEvent.stopImmediatePropagation()` y `select-text` en `VoiceModelingModal.tsx`, garantizando la digitación fluida y sin supresión de espacios.
  5. Se validaron en vivo invocaciones reales con 200 OK en Gemini Flash (`gemini-3.6-flash`), registrando correctamente las mutaciones UML (`CREATE_CLASS`, `CREATE_RELATIONSHIP`) y la auditoría en `ai_prompt_logs`.

### Incidente AI-06: Extracción `application/octet-stream` en Gemini y Posicionamiento Central de Etiquetas Relacionales
* **Síntoma:**
  1. Nivel 1 (Gemini) fallaba con `Error while extracting response for type [java.lang.String] and content type [application/octet-stream]`.
  2. En el lienzo, las relaciones generadas por IA colocaban nombres de relación como `"uso"` pegados a las cardinalidades de extremo (`sourceRole` y `targetRole`), mostrando `"1 uso"` en ambos lados en vez de una sola etiqueta `"uso"` centrada sobre la línea de asociación.
* **Causa Raíz:**
  1. Spring `RestClient` por defecto con `body(String.class)` no procesa `Content-Type: application/octet-stream` cuando Google responde a través de gateways de streaming o proxies de alta demanda.
  2. En frontend (`diagramStore.ts`), `newEdge.data` omitía asignar el campo `label`, y los LLMs volcaban el nombre o verbo de relación a los roles de extremo.
* **Solución Aplicada:**
  1. En `CircuitBreakerAiService.java`, se añadió `.accept(MediaType.APPLICATION_JSON, MediaType.ALL)` y se extrae la respuesta mediante `byte[].class` decodificada explícitamente a UTF-8.
  2. Se ajustó el prompt del sistema para ordenar al LLM colocar los nombres de relación en `label` y no en los roles.
  3. En `VoiceModelingService.java` (`postProcessMutations`) y `diagramStore.ts`, se implementó normalización automática para promover roles idénticos o verbos comunes (`uso`, `inscribe`, etc.) a `label` central, limpiando los roles de extremo redundantes.
  4. En `aiVoiceService.ts`, se tipó formalmente `label?: string;` en `relationshipData`.
