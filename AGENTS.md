# MEMORIA OPERATIVA Y GUIA PERMANENTE — CASE TOOL UML

> **FUENTE DE VERDAD Y MEMORIA EXTERNA DEL AGENTE:**
> La memoria persistente, histórica y técnica del sistema reside exclusivamente en la **Bóveda de Obsidian** ubicada en:
> `D:\Memoria Boveda\SW1_PrimerP`
> Cualquier consulta sobre fundamentos teóricos, perfiles, actas o registros de fases PUDS anteriores debe ser consultada y contrastada contra dicha bóveda.

---

## 1. Enfoque de Desarrollo y Estado Real de los Casos de Uso (CU)

El desarrollo del sistema se ejecuta **estrictamente Caso de Uso por Caso de Uso (CU por CU)** bajo el Proceso Unificado de Desarrollo de Software (PUDS).
* **Realizados Correctamente y Validados:** Exclusivamente hasta el **CU11**.
* **Todo lo posterior a CU11:** Eran maquetas/demos no definitivas que deben ser desarrolladas formalmente desde cero paso a paso.
* **Foco Inmediato Siguiente:** **CU12** (Importar Modelo desde XMI (ArchiTec)).

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
| **CU12** | Importar Modelo desde XMI (ArchiTec) | Ciclo 2 | `A2: Arquitecto` | **Pendiente** | Parser bidireccional XML/XMI OMG para importar modelos externos de ArchiTec y StarUML directamente al canvas. |
| **CU13** | Generar Backend Spring Boot (4 Capas en ZIP) | Ciclo 2 | `A2: Arquitecto` | **Pendiente** | Generación automatizada de código Java 21: Entities JPA, Repositories, Services y Controllers empaquetados en `.zip`. |
| **CU14** | Generar Esquema DDL SQL (PostgreSQL 17) | Ciclo 2 | `A2: Arquitecto` | **Pendiente** | Exportación de script SQL DDL para Supabase con tablas, PKs, FKs, tipos de datos y restricciones de integridad. |
| **CU15** | Generar Colección de Pruebas Postman v2.1 | Ciclo 2 | `A2: Arquitecto` | **Pendiente** | Generación de archivo JSON con colección de peticiones HTTP REST CRUD para cada entidad del diagrama. |
| **CU16** | Modelar por Dictado de Voz (IA PLN) | Ciclo 3 | `A2: Arquitecto (Host)` | **Pendiente** | Entrada por micrófono (Web Speech API / Whisper), procesamiento semántico con Gemini Flash y modelado automático. |
| **CU17** | Digitalizar Foto de Pizarra (IA Visión) | Ciclo 3 | `A2: Arquitecto (Host)` | **Pendiente** | Subida de fotografía de boceto en pizarra física, inferencia con Gemini 2.5 Flash y vectorización a nodos UML. |
| **CU18** | Sincronizar Sesión Colaborativa (WSS + DNI) | Ciclo 3 | `A2: Host` / `A3: Guest` | **Pendiente** | Salas concurrentes en tiempo real vía WebSockets STOMP sobre SockJS (< 50ms latencia) ingresando con DNI/nombre. |

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


