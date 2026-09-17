# CASE Tool UML — Entorno de Modelado Visual, Normalización Lógica y Generación de Software

Plataforma integral Computer-Aided Software Engineering (CASE) de ingeniería de software para el modelado visual de diagramas de clases OMG UML 2.5+, auditoría y certificación de normalización relacional (1NF a 3NF), generación automatizada de código de producción backend Spring Boot en 4 capas desacopladas, esquemas DDL SQL PostgreSQL 17, interoperabilidad XMI 2.1, asistencia por Inteligencia Artificial multimodal con arquitectura Circuit Breaker y colaboración concurrente en tiempo real mediante WebSockets STOMP.

Desarrollada bajo la metodología **PUDS (Proceso Unificado de Desarrollo de Software)** y Desarrollo Basado en Componentes (**CBD**), con arquitectura desacoplada, seguridad stateless JWT en memoria volátil y persistencia inmutable en **PostgreSQL 17**.

---

## 1. Estado de Madurez y Ciclos del Proyecto (PUDS)

El sistema se encuentra completado y validado en sus 3 ciclos fundamentales de desarrollo, con una suite automatizada de **117 pruebas unitarias e integración superadas al 100%** y cero errores de compilación en frontend y backend:

```
[ Ciclo 1: Fundación y Modelado ] ──► [ Ciclo 2: Generación CASE e Interoperabilidad ] ──► [ Ciclo 3: IA Multimodal y Tiempo Real ]
         100% Implementado                        100% Implementado                                100% Implementado
```

### Ciclo 1: Fundación, Seguridad, Gobernanza y Modelado Canónico
* **Autenticación y Seguridad Volátil (CU00 - CU01):** Sesión segura stateless con token JWT Bearer almacenado exclusivamente en `sessionStorage` (volátil), protección con `OncePerRequestFilter`, cifrado BCrypt (factor 12) y gestión de preferencias de usuario persistidas en JSONB.
* **Control de Acceso Basado en Roles RBAC (CU02):** Consola administrativa para `SUPER_ADMIN` con alternancia de estado (activo/suspendido), asignación de privilegios (`SUPER_ADMIN`, `ARQUITECTO`, `COLABORADOR`) y reglas anti auto-degradación.
* **Gestión Integral de Proyectos y Clonación Profunda (CU03):** Espacio de trabajo dedicado con tags, búsqueda, metadatos y algoritmo de clonación profunda con remapeo consistente de IDs de nodos y relaciones.
* **Auditoría Forense y Trazabilidad (CU04 - CU05):** Registro inmutable en `audit_logs` con IP del cliente y enriquecimiento de autor; timeline cronológico de mutaciones (`diagram_history`) con inspección de diffs antes/después y papelera de reciclaje con restauración reversible y purga física definitiva.
* **Tutorial Onboarding Guiado (CU06):** Asistente interactivo paso a paso (< 120 segundos) con máscara SVG de recorte transparente sin desenfoque ni distorsión visual.
* **Catálogo de Plantillas Base (CU07):** Scaffolding profundo transaccional de modelos de dominio (Académico, Hospitalario, Facturación y Lienzo en Blanco).
* **Modelado Canónico OMG UML 2.5 (CU08 - CU09):** Nodos de 3 compartimentos con visibilidades canónicas (`+`, `-`, `#`, `~`), estereotipos con guillemets, cursiva en clases abstractas, subrayado en miembros estáticos, insignia `{PK}` en claves primarias, 6 tipos de relaciones canónicas (asociación, agregación, composición, herencia, realización y dependencia), prevención de ciclos de herencia directos y transitivos vía DFS y motor de historial en lienzo con atajos (`Ctrl+Z`, `Ctrl+Y`).
* **Certificación de Normalización Relacional (CU10):** Motor heurístico de auditoría de reglas de Codd y TOM. Detección preventiva de claves primarias faltantes en 1NF, validación de llaves foráneas en 2NF y descomposición asociativa de relaciones N:N en 3NF con semáforo de cumplimiento (0 a 100%) y resolución asistida.

### Ciclo 2: Interoperabilidad e Ingeniería CASE Automatizada
* **Exportador Multiformato (CU11):** Generación de 4 entregables oficiales: estándar OMG XMI 2.1 (compatible con StarUML / Enterprise Architect), imágenes rasterizadas PNG en alta resolución (1x, 2x, 3x Ultra HD), Memoria Técnica ejecutiva en PDF con diagrama vectorial incrustado y Libro de Datos en Excel (.xlsx) con mapeo estricto de tipos Java 21 / PostgreSQL 17.
* **Importador Bidireccional XMI OMG (CU12):** Parser XML con defensas contra ataques XXE, extracción de entidades, visibilidad, tipos, multiplicidades y auto-layout jerárquico no colisionante.
* **Generador de Backend Spring Boot en 4 Capas (CU13):** Compilación automatizada y empaquetado en archivo `.zip` de una solución backend completa en Java 21 estructurada limpiamente en `Controller`, `Service`, `Repository` y `Entity` (JPA / Hibernate), con Maven Wrapper, Swagger OpenAPI 3 y perfiles listos para ejecución.
* **Generador de Esquemas DDL SQL PostgreSQL 17 (CU14):** Producción de scripts SQL con tablas normalizadas, claves primarias autoincrementales IDENTITY, restricciones de integridad referencial (`ON DELETE CASCADE`), tablas intermedias asociativas e índices B-Tree optimizados.
* **Generador de Suites de Pruebas Postman v2.1.0 (CU15):** Colección oficial JSON con carpetas modulares por entidad, suite REST CRUD completa (5 peticiones por entidad), aserciones automáticas de tiempo de respuesta y status code en Javascript (`pm.test`), captura de variables dinámicas y mock data semántico contextual.

### Ciclo 3: Asistencia por Inteligencia Artificial y Sincronización Concurrente
* **Modelado por Dictado de Voz PLN (CU16):** Captura de audio y transcripción en tiempo real con procesamiento de lenguaje natural asistido por arquitectura Circuit Breaker en 4 niveles de resiliencia (Gemini Flash -> Groq Llama 3.3 -> OpenRouter -> Motor Heurístico Local Offline). Permite mutaciones incrementales del modelo sin destruir el lienzo y con reversibilidad total (`Ctrl+Z`).
* **Digitalización de Pizarras Físicas con IA Visión (CU17):** Procesamiento de imágenes capturadas por cámara web o archivos fotográficos, extracción de entidades, motor de auto-layout y opción dual de sustitución total o fusión incremental.
* **Sincronización Colaborativa en Tiempo Real WSS (CU18):** Salas multiusuario sobre WebSockets STOMP y SockJS (< 50ms de latencia), cursores remotos con transformación geométrica de viewport, candados optimistas de edición sobre elementos, chat colaborativo en vivo con aislamiento estricto de teclado y consola de gobernanza para expulsión y control por parte del anfitrión.

---

## 2. Arquitectura de Software

El sistema implementa una arquitectura en 4 capas estrictamente desacopladas bajo principios SOLID y Clean Architecture:

```
+─────────────────────────────────────────────────────────────────────────────+
│                       CAPA DE PRESENTACIÓN (Frontend)                       │
│  React 18 + TypeScript + Vite + Tailwind CSS + Lucide Icons + React Flow 12 │
│  Zustand Stores: authStore, diagramStore, collabStore, uiStore              │
+──────────────────────────────────────┬──────────────────────────────────────+
                                       │ (HTTPS REST JSON / WSS STOMP)
                                       ▼
+─────────────────────────────────────────────────────────────────────────────+
│                       CAPA DE CONTROLADORES (REST API)                      │
│  AuthController | UserController | AdminUserController | DiagramController  │
│  GeneratorController | ImportController | ArchitectCollaboratorController    │
+──────────────────────────────────────┬──────────────────────────────────────+
                                       │
                                       ▼
+─────────────────────────────────────────────────────────────────────────────+
│                       CAPA DE SERVICIOS (Lógica de Negocio)                 │
│  AuthService | DiagramService | NormalizationValidationService              │
│  SpringBootGeneratorService | SqlDdlGeneratorService | PostmanGenerator     │
│  CircuitBreakerAiService | WhiteboardVisionService | VoiceModelingService   │
+──────────────────────────────────────┬──────────────────────────────────────+
                                       │
                                       ▼
+─────────────────────────────────────────────────────────────────────────────+
│                     CAPA DE PERSISTENCIA (Spring Data JPA)                  │
│  UserProfileRepository | DiagramProjectRepository | AuditLogRepository      │
│  ClassNodeRepository | RelationshipRepository | DiagramHistoryRepository    │
+──────────────────────────────────────┬──────────────────────────────────────+
                                       │ (HikariCP Connection Pool)
                                       ▼
+─────────────────────────────────────────────────────────────────────────────+
│                    MOTOR DE BASE DE DATOS (PostgreSQL 17)                   │
│  Esquema relacional inmutable, columnas estructuradas JSONB e integridad FK │
+─────────────────────────────────────────────────────────────────────────────+
```

---

## 3. Identidad Visual y Experiencia de Usuario (UI/UX)

La plataforma incorpora una paleta de ingeniería sobria y ergonómica diseñada para sesiones prolongadas de arquitectura de software, erradicando elementos genéricos:

* **Paleta de Ingeniería:**
  * Fondo base: `#0f1115`
  * Contenedores y modales principales: `#14171d`
  * Superficies secundarias e items de lista: `#181c24`
  * Líneas estructurales y bordes: `#242934`
  * Visores de código fuente (Java, SQL, JSON): `#0a0c10`
  * Acento primario: Índigo de precisión (`#5c68e2`)
* **Tríada Tipográfica Oficial:**
  * `Syne` (`font-display`): Títulos de página, modales, logotipo y métricas numéricas destacadas.
  * `Plus Jakarta Sans` (`font-sans`): Tipografía base de lectura, formularios y controles.
  * `JetBrains Mono` (`font-mono`): Firmas de métodos UML, identificadores UUID, visores de código y payloads.
* **Iconografía 100% Vectorial:** Empleo exclusivo de `lucide-react`. Sin emojis en la interfaz.
* **Canvas con 6 Temas Configurables:** `warm-titanium`, `obsidian-graphite`, `dark`, `light`, `blue` y `cream`.
* **Cursor Reactivo de Precisión:** Efecto inercial ambiental con ondas táctiles en interacción.

---

## 4. Stack Tecnológico

### Frontend
* **Core:** React 18.3 con TypeScript 5.2
* **Empaquetador y Servidor Dev:** Vite 5
* **Lienzo Gráfico Interactivo:** React Flow v12 (`@xyflow/react`)
* **Gestión de Estado Reactivo:** Zustand 4.5
* **Estilos:** Tailwind CSS v4 con variables CSS nativas
* **Comunicación en Tiempo Real:** `@stomp/stompjs` + SockJS Client
* **Iconografía:** Lucide React

### Backend
* **Lenguaje y Plataforma:** Java 21 LTS / Spring Boot 4.1.0
* **Seguridad:** Spring Security 6 + JJWT 0.12.5 (HMAC-SHA256) + BCrypt (factor 12)
* **Persistencia:** Spring Data JPA + Hibernate 7 con mapeo nativo `SqlTypes.JSON`
* **Motor de Plantillas CASE:** Apache FreeMarker 2.3.33
* **Protocolo WebSocket:** Spring WebSocket + STOMP Broker
* **Integración de IA:** Circuit Breaker multimodal resiliente (Gemini 2.5 / Groq Llama 3.3 / Fallback Heurístico Local)

### Base de Datos y Almacenamiento
* **Motor Relacional:** PostgreSQL 17 (Supabase Cloud / AWS RDS)
* **Almacenamiento Estructurado:** Columnas `jsonb` para snapshots de diagramas, metamodelo UML y preferencias
* **Trazabilidad:** Tablas `audit_logs` y `diagram_history` de escritura inmutable

---

## 5. Endpoints REST API de la Plataforma

| Módulo | Método y Ruta | Descripción Funcional |
|---|---|---|
| **Seguridad** | `POST /api/auth/login` | Emisión de Token JWT Bearer para sesión volátil. |
| | `POST /api/auth/register` | Registro de nuevos usuarios con rol base y preferencias. |
| | `GET /api/auth/me` | Consulta de perfil del usuario en sesión activa. |
| | `POST /api/auth/logout` | Cierre de sesión y desvinculación de cliente. |
| **Gobernanza RBAC** | `GET /api/admin/users` | Listado paginado de usuarios con filtros por rol y estado. |
| | `PUT /api/admin/users/{id}/role` | Asignación de roles con prevención de auto-degradación. |
| | `PUT /api/admin/users/{id}/status` | Alternancia de estado (activo/suspendido) con regla anti auto-bloqueo. |
| | `GET /api/admin/audit` | Consulta de bitácora forense de auditoría con exportación CSV/JSON. |
| **Espacio de Trabajo** | `GET /api/projects` | Listado de proyectos activos con metadatos y conteo de nodos. |
| | `POST /api/projects` | Creación de nuevo proyecto UML. |
| | `POST /api/projects/{id}/clone` | Clonación profunda transaccional de grafo de nodos y relaciones. |
| | `DELETE /api/projects/{id}` | Borrado lógico (traslado a papelera de reciclaje). |
| | `POST /api/projects/{id}/restore` | Restauración de proyecto desde la papelera. |
| | `DELETE /api/projects/{id}/purge` | Purga definitiva (hard delete físico en cascada). |
| **Lienzo y Modelo** | `POST /api/diagrams/{id}/sync` | Sincronización atómica de nodos, posiciones y relaciones. |
| | `GET /api/diagrams/{id}/history` | Timeline cronológico de mutaciones con diff antes/después. |
| | `POST /api/diagrams/{id}/validate` | Certificación de normalización relacional 1NF, 2NF y 3NF. |
| **Generación CASE** | `POST /api/generator/spring-boot/{id}` | Empaquetado de Backend Spring Boot Java 21 en ZIP. |
| | `POST /api/generator/sql-ddl/{id}` | Generación de script SQL DDL para PostgreSQL 17. |
| | `POST /api/generator/postman/{id}` | Generación de suite de pruebas Postman Collection v2.1.0. |
| | `GET /api/generator/xmi/{id}` | Exportación de modelo en estándar canónico OMG XMI 2.1. |
| | `POST /api/generator/import-xmi` | Deserialización de modelos XMI e inyección con auto-layout. |
| **Inteligencia Artificial**| `POST /api/ai/voice-model` | Interpretación semántica de dictado por voz para mutación del grafo. |
| | `POST /api/ai/vision-whiteboard` | Digitalización de fotografías de diagramas en pizarras físicas. |
| **Colaboradores** | `GET /api/architect/collaborators` | Directorio de colaboradores asignados al espacio de trabajo. |
| | `POST /api/architect/collaborators` | Creación y enrolamiento de colaboradores con credenciales directas. |

---

## 6. Instalación y Ejecución Local

### Requisitos Previos
* **Java Development Kit (JDK):** Versión 21 o superior.
* **Apache Maven:** Versión 3.9 o superior (o utilizar el wrapper `./mvnw`).
* **Node.js:** Versión 18.x o 20.x LTS.
* **Instancia PostgreSQL 17:** Cadena de conexión JDBC configurada.

### Paso 1: Configurar Variables de Entorno
En el directorio raíz del proyecto, copia el archivo de ejemplo:
```bash
cp .env.example .env
```
Configura los valores de conexión a PostgreSQL (`DB_URL`, `DB_USER`, `DB_PASSWORD`), la clave secreta JWT (`JWT_SECRET`) y las llaves de API para los proveedores de IA (`GEMINI_API_KEY`, `GROQ_API_KEY`).

### Paso 2: Ejecutar el Backend (Spring Boot)
```bash
cd backend
./mvnw spring-boot:run
```
El servidor backend iniciará en el puerto `8080` (`http://localhost:8080`).

### Paso 3: Ejecutar el Frontend (React + Vite)
En una nueva terminal:
```bash
cd frontend
npm install
npm run dev
```
La aplicación web estará disponible en `http://localhost:5173`.

---

## 7. Verificación de Pruebas y Compilación

Para certificar la integridad del sistema antes de cualquier despliegue:

```bash
# Pruebas automatizadas del backend (117 tests)
cd backend
./mvnw test

# Verificación de tipos TypeScript y empaquetado de producción
cd ../frontend
npm run build
```

---

## 8. Licencia y Atribución

Proyecto desarrollado con fines de ingeniería de software e investigación académica bajo la metodología PUDS. Prohibida su comercialización como servicio de suscripción (SaaS). Todos los derechos reservados.
