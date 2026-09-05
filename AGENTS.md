# MEMORIA OPERATIVA Y GUIA PERMANENTE — CASE TOOL UML

> **FUENTE DE VERDAD Y MEMORIA EXTERNA DEL AGENTE:**
> La memoria persistente, histórica y técnica del sistema reside exclusivamente en la **Bóveda de Obsidian** ubicada en:
> `D:\Memoria Boveda\SW1_PrimerP`
> Cualquier consulta sobre fundamentos teóricos, perfiles, actas o registros de fases PUDS anteriores debe ser consultada y contrastada contra dicha bóveda.

---

## 1. Enfoque de Desarrollo y Estado Real de los Casos de Uso (CU)

El desarrollo del sistema se ejecuta **estrictamente Caso de Uso por Caso de Uso (CU por CU)** bajo el Proceso Unificado de Desarrollo de Software (PUDS).
* **Realizados Correctamente y Validados:** Exclusivamente hasta el **CU04**.
* **Todo lo posterior a CU04:** Eran maquetas/demos no definitivas que deben ser desarrolladas formalmente desde cero paso a paso.
* **Foco Inmediato de Construcción:** **CU05** (Consultar Historial y Trazabilidad).

### Matriz de Estado de Casos de Uso por Ciclos

| CU | Nombre del Caso de Uso | Ciclo | Actor(es) Principal(es) | Estado Real | Alcance Técnico / Entregable Formal |
|---|---|---|---|---|---|
| **CU00** | Autenticarse en el Sistema (Sesión Volátil) | Ciclo 1 | `USUARIO` | **Implementado** | Login seguro con JWT Bearer volátil en `sessionStorage`, filtro `OncePerRequestFilter`, validación stateless. |
| **CU01** | Registrarse en la Plataforma | Ciclo 1 | `USUARIO` | **Implementado** | Registro de nuevos usuarios, hashing BCrypt, asignación de rol base por defecto. |
| **CU02** | Gestionar Usuarios y Roles (RBAC) | Ciclo 1 | `A1: Super Admin` | **Implementado** | Vista `/admin/users`, alternancia de estado (activo/suspendido), asignación de roles y métricas de gobernanza. |
| **CU03** | Gestión de Proyectos y Espacios de Trabajo | Ciclo 1 | `A2: Arquitecto` / `A3: Colaborador` | **Implementado** | **Reemplazo íntegro del SaaS.** CRUD completo de proyectos, metadatos, tags, versionado `v1.0.0` y **clonación profunda** de nodos y relaciones. |
| **CU04** | Auditar Bitácora Global y Eventos de Seguridad | Ciclo 1 | `A1: Super Admin` | **Implementado** | Registro inmutable de eventos en `audit_logs` con IP, timestamp, enriquecimiento de usuarios, paginación (20/pág), filtros y exportación CSV/JSON. |
| **CU05** | Consultar Historial y Trazabilidad | Ciclo 1 | `A3: Colaborador` / `A2: Arquitecto` | **Siguiente a Implementar (Foco Actual)** | Timeline cronológico de mutaciones del proyecto y trazabilidad de cambios por usuario. |
| **CU06** | Ejecutar Tutorial Onboarding (< 2 min) | Ciclo 1 | `A3: Colaborador` | **Pendiente** | Guía interactiva paso a paso para adopción rápida del editor y herramientas CASE. |
| **CU07** | Crear Proyecto desde Plantilla Base | Ciclo 1 | `A2: Arquitecto` | **Pendiente** | Scaffolding de diagramas iniciales basados en patrones de diseño GoF y arquitecturas base. |
| **CU08** | Modelar Clases UML (Tipos y Visibilidad) | Ciclo 1 | `A2: Arquitecto` / `A3: Colaborador` | **Pendiente** | Lienzo `/editor` interactivo: creación/edición de clases, atributos, métodos y visibilidades (+, -, #, ~). |
| **CU09** | Conectar Relaciones y Cardinalidades | Ciclo 1 | `A2: Arquitecto` / `A3: Colaborador` | **Pendiente** | Trazado de asociaciones, agregaciones, composiciones, herencias y dependencias con multiplicidades. |
| **CU10** | Validar Normalización Lógica (1NF a 3NF) | Ciclo 1 | `A2: Arquitecto` / `A3: Colaborador` | **Pendiente** | Motor heurístico de auditoría de normalización para alertar atributos compuestos, transitivos o redundantes. |
| **CU11** | Exportar Modelo y Documentación Técnica | Ciclo 2 | `A2: Arquitecto` / `A3: Colaborador` | **Pendiente** | 4 formatos: OMG XMI 2.1 (ArchiTec/StarUML), PNG alta resolución, PDF técnico ejecutivo y Excel (.xlsx) con tipo de dato SQL/JPA por columna. |
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

---

## 4. Reglas Inviolables de Interfaz de Usuario (UI/UX)

1. **Pure Dark Mode Estricto:** Paleta visual de alto contraste (`bg-slate-950`, `bg-slate-900`, acentos `blue-500`, `purple-500`, `emerald-500`).
2. **Cero Emojis:** Toda la iconografía debe ser 100% vectorial con `lucide-react`. Sin emojis en ninguna vista o texto.
3. **Cero Redundancia de Navegación:**
   * El botón "Volver al Dashboard" reside únicamente en el Header principal para todas las subpáginas (`/admin/users`, `/settings`, `/editor`).
   * Píldora de usuario unificada (avatar + nombre + settings) sin controles duplicados.
4. **Identidad CASE Profesional:** Sin nomenclaturas académicas ni etiquetas tipo `(CU01)` visibles para el usuario final en la interfaz.

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
