# Documentación Técnica Formal — Casos de Uso del Segundo Parcial
## Sistema CASE Tool UML con Inteligencia Artificial Multimodal, Persistencia Continua y Movilidad Periférica

**Universidad Autónoma Gabriel René Moreno (UAGRM)**  
**Facultad de Ingeniería en Ciencias de la Computación y Telecomunicaciones (FICCT)**  
**Carrera:** Ingeniería Informática / Ingeniería en Sistemas  
**Materia:** Ingeniería de Software 1 (INF-422) SC  
**Docente:** Ing. Rolando Antonio Martínez Canedo  
**Autor:** Lopez Velazquez Marco Alejandro — Registro: 222008891  
**Gestión:** Semestre 2 - 2026, Santa Cruz de la Sierra - Bolivia  

---

## 1. Alcance Oficial del Segundo Parcial: Ciclos 4 y 5 (CU14 al CU18)

> **Delimitación de Fases PUDS:**
> * **Primer Parcial (Ciclos 1, 2 y 3 — CU01 al CU13):** Autenticación, RBAC, CRUD de Proyectos, Auditoría Forense, Modelador Canónico UML 2.5, Certificación 1NF-3NF, Exportación Multiformato, Importación XMI 2.1, Generador Spring Boot en 4 Capas, Generador DDL SQL/Postman, Dictado por Voz PLN, Visión Óptica de Pizarras y Sincronización Concurrente WSS STOMP.
> * **Segundo Parcial (Ciclos 4 y 5 — CU14 al CU18):** Asistencia Co-Desarrolladora con IA, Motor Híbrido de Inferencia Local/Cloud con Test Harness, Persistencia Continua NoSQL en MongoDB Atlas y Generador DDL Multi-Motor, Vista Periférica Móvil en React Native (Expo), y Sistema de Notificaciones Push Remotas en Segundo Plano.

### Matriz Oficial de Casos de Uso del Segundo Parcial

| CU | Nombre Oficial del Caso de Uso | Subsistema PUDS | Ciclo | Actor(es) Principal(es) | Estado Técnico |
|---|---|---|---|---|---|
| **CU14** | Asistencia Co-Desarrolladora con IA, Memoria Contextual y Consultoría Teórica | Sub 5: IA Multimodal & Concurrencia | Ciclo 4 | `A2: Arquitecto` / `A3: Colaborador` | **100% Implementado y Certificado** |
| **CU15** | Motor Híbrido de Inferencia IA: Servidores Locales (LM Studio & Ollama), BYOK Libre y Test Harness | Sub 5: IA Multimodal & Concurrencia | Ciclo 4 | `A2: Arquitecto` | **100% Implementado y Certificado** |
| **CU16** | Persistencia de Sesiones Continuas NoSQL (MongoDB Atlas) y Soporte Multi-Motor DDL | Sub 5: IA Multimodal & Concurrencia / MDD | Ciclo 4 | `A2: Arquitecto (Host)` / `A3: Colaborador` | **100% Implementado y Certificado** |
| **CU17** | Vista Periférica Móvil React Native (Expo), Inspección Táctil y Espejo en Tiempo Real | Sub 6: Movilidad & Telemetría | Ciclo 5 | `A3: Colaborador` / `A2: Arquitecto` | **100% Implementado y Certificado** |
| **CU18** | Sistema de Notificaciones Push en Segundo Plano para Colaboración Móvil | Sub 6: Movilidad & Telemetría | Ciclo 5 | `A3: Colaborador (Móvil)` / `A2: Arquitecto` | **100% Implementado y Certificado** |

---

## 2. Especificación Técnica por Caso de Uso para Diagramación UML

---

### CU14: Asistencia Co-Desarrolladora con IA, Memoria Contextual y Consultoría Teórica

* **Propósito:** Proveer un asistente bot inteligente `@ai` dentro del chat colaborativo en vivo y en modo individual capaz de auditar la sesión en curso (*Catch-Up* cronológico), verificar normalización relacional 1NF-3NF sin alucinaciones, despachar consultas teóricas de ingeniería de software y ejecutar acciones operativas directas (`SAVE_PROJECT` hacia PostgreSQL 17 y catálogo directo de 6 formatos de exportación sin modales emergentes).
* **Actores:** `A2: Arquitecto de Software` (Primario), `A3: Colaborador` (Secundario).
* **Subsistema:** Sub 5: IA Multimodal & Concurrencia.

#### Paquetes y Módulos
* **Backend (Spring Boot 4.1.0 / Java 21):**
  * `com.sw1.casetool.controller`: `AiTeamController.java`
  * `com.sw1.casetool.service.ai`: `AiTeamMemberService.java`
  * `com.sw1.casetool.dto.ai`: `AiTeamChatRequest.java`, `AiTeamResponseDto.java`
  * `com.sw1.casetool.model`: `CollaborationSession.java`, `DiagramProject.java`, `ClassNode.java`
* **Frontend Web (React 18 + TypeScript):**
  * `frontend/src/components/collab`: `LiveCollabChat.tsx`
  * `frontend/src/stores`: `collabStore.ts`, `diagramStore.ts`
  * `frontend/src/services`: `aiVoiceService.ts`, `collabWebSocketService.ts`

#### Clases y Métodos Clave
* **`AiTeamController.java`:**
  * `POST /api/ai/team/chat`: `processTeamChat(@RequestBody AiTeamChatRequest request)` -> Procesa mensajes dirigidos a `@ai`, clasifica la intención semántica y devuelve un `AiTeamResponseDto`.
* **`AiTeamMemberService.java`:**
  * `processTeamMessage(AiTeamChatRequest request): AiTeamResponseDto`: Motor de orquestación que extrae el contexto del diagrama (`nodes`, `edges`), analiza la sesión y despacha la respuesta con proveedor, resumen y acción operativa.
  * `handleProjectAction(String prompt, String sessionCode, String senderName, String projectName, DiagramSnapshotDto snapshot)`: Detecta órdenes directas:
    - Guardado: `SAVE_PROJECT` -> Instruye la persistencia inmediata en PostgreSQL 17.
    - Exportación: `EXPORT_OPTIONS` -> Despliega el catálogo de 6 especificaciones (XMI 2.1, PNG UHD, PDF Memoria, Excel .xlsx, DDL SQL, Postman v2.1).
  * `handleSessionCatchUp(String sessionCode, String senderName)`: Genera un resumen ejecutivo cronológico de la sesión con tiempo transcurrido y participantes activos.
  * `auditNormalizationRules(DiagramSnapshotDto snapshot, String senderName)`: Aplica las reglas heurísticas de Codd (PK requeridas, FK en 1..*, tablas intermedias en *..*) de forma determinista y estricta sin alucinaciones.
* **`LiveCollabChat.tsx` (Frontend):**
  * `handleDirectExport(formatKey: string): Promise<void>`: Descarga inmediata a un solo clic del archivo correspondiente sin desplegar modales invasivos.
  * `renderFormattedText(text: string)`: Parser Markdown ágil para resaltar código en monoespaciado y negritas.

#### Elementos para Diagramas UML
* **Análisis (BCE):**
  * `<<boundary>>`: `LiveCollabChat`, `QuickPromptsBar`
  * `<<control>>`: `AiTeamController`, `AiTeamMemberService`, `NormalizationValidationService`
  * `<<entity>>`: `CollaborationSession`, `DiagramProject`, `ClassNode`, `Relationship`
* **Secuencia (Lifelines):**
  * `Colaborador` -> `LiveCollabChat` -> `collabWebSocketService` -> `WebSocketCollaborationController` -> `AiTeamMemberService` -> `LiveCollabChat` -> `DownloadTrigger`

---

### CU15: Motor Híbrido de Inferencia IA: Servidores Locales, BYOK Libre y Test Harness

* **Propósito:** Permitir al Arquitecto desacoplar el sistema de proveedores únicos de IA, posibilitando la conexión de servidores locales On-Premise (LM Studio en `:1234`, Ollama en `:11434`), llaves Cloud propias BYOK (OpenAI, Groq, Anthropic) cifradas con AES-256 GCM, y un Test Harness con telemetría de latencia en milisegundos y auto-descubrimiento dinámico de modelos.
* **Actores:** `A2: Arquitecto de Software`.
* **Subsistema:** Sub 5: IA Multimodal & Concurrencia.

#### Paquetes y Módulos
* **Backend (Spring Boot 4.1.0 / Java 21):**
  * `com.sw1.casetool.controller`: `ProjectAiConfigController.java`
  * `com.sw1.casetool.service.ai`: `ProjectAiConfigService.java`
  * `com.sw1.casetool.service.security`: `EncryptionService.java`
  * `com.sw1.casetool.model`: `ProjectAiConfig.java`
  * `com.sw1.casetool.repository`: `ProjectAiConfigRepository.java`
  * `com.sw1.casetool.dto.ai`: `ProjectAiConfigDto.java`, `ProjectAiTestRequest.java`, `ProjectAiTestResponse.java`, `OllamaModelsResponse.java`
* **Frontend Web (React 18 + TypeScript):**
  * `frontend/src/components/modals`: `AiConfigModal.tsx`
  * `frontend/src/services`: `projectAiService.ts`
  * `frontend/src/stores`: `projectAiStore.ts`

#### Clases y Métodos Clave
* **`ProjectAiConfigController.java`:**
  * `GET /api/projects/{projectId}/ai-config`: `getConfig(@PathVariable UUID projectId)` -> Obtiene la configuración activa del proyecto sin exponer llaves privadas.
  * `PUT /api/projects/{projectId}/ai-config`: `updateConfig(@PathVariable UUID projectId, @RequestBody ProjectAiConfigDto dto)` -> Guarda el proveedor seleccionado cifrando credenciales.
  * `POST /api/projects/{projectId}/ai-config/test`: `testConnection(@PathVariable UUID projectId, @RequestBody ProjectAiTestRequest request)` -> Ejecuta prueba de conectividad en vivo.
  * `POST /api/projects/{projectId}/ai-config/discover-models`: `discoverModels(@PathVariable UUID projectId, @RequestBody ProjectAiTestRequest request)` -> Inspecciona el servidor remoto y devuelve la lista de modelos instalados.
* **`ProjectAiConfigService.java`:**
  * `testProviderConnection(ProjectAiTestRequest request): ProjectAiTestResponse`: Utiliza el cliente nativo `java.net.http.HttpClient` de Java 21 para evitar problemas con respuestas `octet-stream`, computando la latencia en ms.
  * `discoverLocalModels(String endpoint, ProviderType provider): List<String>`: Consulta `GET /v1/models` para LM Studio y `GET /api/tags` para Ollama.
* **`EncryptionService.java`:**
  * `encrypt(String plainText): String` / `decrypt(String cipherText): String`: Implementa cifrado simétrico robusto **AES-256 GCM** con IV de 12 bytes y autenticación de integridad.

#### Elementos para Diagramas UML
* **Análisis (BCE):**
  * `<<boundary>>`: `AiConfigModal`, `TestHarnessConsole`
  * `<<control>>`: `ProjectAiConfigController`, `ProjectAiConfigService`, `EncryptionService`, `HttpClient`
  * `<<entity>>`: `ProjectAiConfig`, `DiagramProject`
* **Secuencia (Lifelines):**
  * `Arquitecto` -> `AiConfigModal` -> `projectAiService.ts` -> `ProjectAiConfigController` -> `ProjectAiConfigService` -> `LM Studio (:1234) / Ollama (:11434)` -> `EncryptionService` -> `PostgreSQL 17`

---

### CU16: Persistencia Continua NoSQL (MongoDB Atlas) y Soporte Multi-Motor DDL

* **Propósito:** Almacenar instantáneas continuas de sesiones colaborativas en clúster cloud MongoDB Atlas (`collab_session_snapshots`) con tolerancia a fallos mediante fallback automático en PostgreSQL 17, permitiendo suspender y reanudar sesiones exactas (diagrama, chat y participantes), auto-reconexión ante F5, y generación de esquemas DDL para 4 motores de bases de datos.
* **Actores:** `A2: Arquitecto (Host)`, `A3: Colaborador`.
* **Subsistema:** Sub 5: IA Multimodal & Concurrencia / MDD.

#### Paquetes y Módulos
* **Backend (Spring Boot 4.1.0 / Java 21):**
  * `com.sw1.casetool.controller`: `ContinuousSessionController.java`, `GeneratorController.java`
  * `com.sw1.casetool.service.collab`: `ContinuousSessionService.java`
  * `com.sw1.casetool.service.generator`: `MultiSqlDdlGeneratorService.java`
  * `com.sw1.casetool.model.nosql`: `ContinuousSessionSnapshot.java` (`@Document(collection = "collab_session_snapshots")`)
  * `com.sw1.casetool.model`: `SessionSnapshotFallback.java` (`@Entity`)
  * `com.sw1.casetool.repository.nosql`: `ContinuousSessionSnapshotRepository.java` (`MongoRepository`)
  * `com.sw1.casetool.repository`: `SessionSnapshotFallbackRepository.java` (`JpaRepository`)
  * `com.sw1.casetool.dto.collab`: `ContinuousSessionSaveRequest.java`, `ContinuousSessionSnapshotDto.java`, `ContinuousSessionResumeResponse.java`
  * `com.sw1.casetool.dto.generator`: `MultiSqlDdlRequest.java`, `MultiSqlDdlResponse.java`
* **Frontend Web (React 18 + TypeScript):**
  * `frontend/src/components/modals`: `LiveCollabModal.tsx` (Sección Suspensiones MongoDB), `SqlDdlModal.tsx`
  * `frontend/src/services`: `continuousSessionService.ts`

#### Clases y Métodos Clave
* **`ContinuousSessionController.java`:**
  * `POST /api/collab/sessions/snapshot`: `saveSnapshot(@RequestBody ContinuousSessionSaveRequest req)`
  * `GET /api/collab/sessions/snapshots/project/{projectId}`: `getProjectSnapshots(@PathVariable UUID projectId)`
  * `POST /api/collab/sessions/resume/{snapshotId}`: `resumeSession(@PathVariable String snapshotId)`
* **`ContinuousSessionService.java`:**
  * `saveContinuousSnapshot(ContinuousSessionSaveRequest req): ContinuousSessionSnapshotDto`: Guarda el estado del canvas, chat e historial de participantes en MongoDB Atlas con timeout de 3000 ms. Si MongoDB está offline o excede el tiempo, activa contingencia transaccional guardando el snapshot en la tabla `session_snapshot_fallbacks` de PostgreSQL 17.
  * `resumeSessionFromSnapshot(String snapshotId): ContinuousSessionResumeResponse`: Reconstruye la sala con nuevo código de sesión y retransmite a los colaboradores.
* **`MultiSqlDdlGeneratorService.java`:**
  * `generateDdl(UUID projectId, SqlDialect dialect): String`: Genera sintaxis DDL rigurosa:
    - **PostgreSQL 17:** `GENERATED ALWAYS AS IDENTITY`, tipos `TIMESTAMPTZ`, índices B-Tree.
    - **MySQL 8.x:** `AUTO_INCREMENT`, tipos `DATETIME(6)`, backticks.
    - **SQL Server:** `IDENTITY(1,1)`, tipos `DATETIME2`, corchetes `[columna]`.
    - **Oracle Database:** `GENERATED BY DEFAULT AS IDENTITY`, tipos `NUMBER(19)`.

#### Elementos para Diagramas UML
* **Análisis (BCE):**
  * `<<boundary>>`: `LiveCollabModal`, `SqlDdlModal`
  * `<<control>>`: `ContinuousSessionController`, `ContinuousSessionService`, `MultiSqlDdlGeneratorService`
  * `<<entity>>`: `ContinuousSessionSnapshot` (MongoDB), `SessionSnapshotFallback` (PostgreSQL)
* **Secuencia (Lifelines):**
  * `Host` -> `LiveCollabModal` -> `ContinuousSessionController` -> `ContinuousSessionService` -> `MongoDB Atlas` (Fallback: `PostgreSQL 17`)

---

### CU17: Vista Periférica Móvil React Native (Expo), Inspección Táctil y Espejo en Tiempo Real

* **Propósito:** Proveer un cliente móvil independiente (`/mobile`) en React Native y Expo SDK 58 para colaboradores y arquitectos en viaje, permitiendo consultar modelos UML, inspeccionar clases mediante un Bottom Sheet táctil, reflejar en vivo las mutaciones del lienzo con WebSockets STOMP y participar en el chat de sala con el asistente `@ai`.
* **Actores:** `A3: Colaborador (Móvil)`, `A2: Arquitecto (En Viaje / Observador)`.
* **Subsistema:** Sub 6: Movilidad & Telemetría.

#### Paquetes y Módulos
* **Cliente Móvil (`/mobile`):**
  * `mobile/src/screens`: `LoginScreen.tsx`, `ProjectsListScreen.tsx`, `DiagramViewerScreen.tsx`
  * `mobile/src/components/canvas`: `CanvasSvgViewer.tsx`
  * `mobile/src/components/sheets`: `ClassDetailSheet.tsx`
  * `mobile/src/components/chat`: `MobileLiveChatSheet.tsx`
  * `mobile/src/components/common`: `HeaderBar.tsx`, `NotificationToast.tsx`
  * `mobile/src/services`: `api.ts`, `collabWsService.ts`, `storage.ts`
  * `mobile/src/stores`: `authStore.ts`, `projectStore.ts`, `collabStore.ts`
  * `mobile/src/constants`: `theme.ts` (Paleta Grafito Obsidiana)

#### Clases y Métodos Clave
* **`collabWsService.ts`:**
  * `connect(sessionCode, onMessage, onConnect, onDisconnect): void`: Conexión STOMP nativa mediante `@stomp/stompjs` al broker WebSocket `ws://<host>:8080/ws-case`.
  * `sendMessage(message: any): void`: Despacho de eventos y mensajes de chat hacia `/app/room/{code}/event`.
* **`projectStore.ts`:**
  * `applyNodeMove(nodeId: string, position: {x, y}, className?: string): void`: Movimiento reactivo con coincidencia flexible por UUID y nombre canónico.
  * `applyNodeUpdate(nodeId: string, nodeData: any, className?: string): void`: Actualización de atributos y métodos en tiempo real.
  * `applySyncState(nodes: any[], edges: any[]): void`: Sincronización íntegra tras guardado en el servidor.
* **`collabStore.ts`:**
  * `joinSession(code: string, dni?: string, fullName?: string): Promise<boolean>`
  * `sendChatMessage(text: string): void`: Envío de mensajes al equipo y consultas al bot `@ai` con snapshot del diagrama.
  * `leaveSession(): void`: Desconexión de WebSocket y limpieza de estado.
* **`CanvasSvgViewer.tsx`:**
  * Soporte gestual nativo para paneo táctil en 360° y zoom con dos dedos (*pinch-to-zoom*), renderizando compartimentos UML canónicos con badges `{PK}`, atributos tipados y líneas de relación.

#### Elementos para Diagramas UML
* **Análisis (BCE):**
  * `<<boundary>>`: `DiagramViewerScreen`, `CanvasSvgViewer`, `ClassDetailSheet`, `MobileLiveChatSheet`
  * `<<control>>`: `MobileCollabWsService`, `MobileCollabStore`, `MobileProjectStore`, `WebSocketCollaborationController`
  * `<<entity>>`: `MobileClassNode`, `MobileRelationshipEdge`, `CollabParticipant`, `CollabChatMessage`
* **Secuencia (Lifelines):**
  * `Colaborador Móvil` -> `CanvasSvgViewer` -> `ClassDetailSheet` -> `projectStore` -> `mobileApi`
  * `Host (Web)` -> `diagramStore` -> `STOMP Broker` -> `mobileCollabWs` -> `projectStore` -> `CanvasSvgViewer`

---

### CU18: Sistema de Notificaciones Push en Segundo Plano para Colaboración Móvil

* **Propósito:** Alertar al colaborador móvil cuando se encuentra fuera de la aplicación o con el teléfono bloqueado ante eventos críticos del proyecto (guardado del modelo, inicio de sala en vivo, menciones urgentes o infracciones de normalización 1NF-3NF), despertando el teléfono con sonido, vibración y un banner nativo en la bandeja de notificaciones de Android.
* **Actores:** `A3: Colaborador Móvil`, `A2: Arquitecto de Software`.
* **Subsistema:** Sub 6: Movilidad & Telemetría.

#### Paquetes y Módulos
* **Backend (Spring Boot 4.1.0 / Java 21):**
  * `com.sw1.casetool.controller`: `PushNotificationController.java`
  * `com.sw1.casetool.service.notification`: `PushNotificationService.java`
  * `com.sw1.casetool.model`: `UserPushToken.java`
  * `com.sw1.casetool.repository`: `UserPushTokenRepository.java`
  * `com.sw1.casetool.dto.notification`: `PushTokenRegistrationRequest.java`, `PushMessagePayload.java`
* **Cliente Móvil (`/mobile`):**
  * `mobile/src/services`: `pushNotificationService.ts`
  * `mobile/src/stores`: `authStore.ts` (Envío de push token al autenticarse)
  * `mobile/App.tsx`: Manejador de respuesta a notificaciones (`Notifications.addNotificationResponseReceivedListener`)

#### Clases y Métodos Clave
* **`PushNotificationController.java`:**
  * `POST /api/notifications/push-token`: `registerToken(@RequestBody PushTokenRegistrationRequest req)` -> Asocia o actualiza el `ExponentPushToken` del usuario autenticado en la base de datos PostgreSQL 17.
* **`PushNotificationService.java`:**
  * `sendPushToUser(UUID userId, PushNotificationType type, String title, String body, Map<String, Object> data): void`
  * `sendPushToProjectCollaborators(UUID projectId, UUID excludeActorId, PushNotificationType type, String title, String body, Map<String, Object> data): void`
  * `dispatchExpoPush(List<String> pushTokens, String title, String body, Map<String, Object> data): void`: Despacha solicitudes HTTP hacia `https://exp.host/--/api/v2/push/send` con canal prioritario `case_updates` y sonido nativo.
* **`pushNotificationService.ts` (Móvil):**
  * `registerForPushNotificationsAsync(): Promise<string | null>`: Solicita permisos del sistema operativo y obtiene el token push.
  * `setupNotificationChannel(): Promise<void>`: Configura el canal de Android con importancia máxima (`MAX`).

#### Elementos para Diagramas UML
* **Análisis (BCE):**
  * `<<boundary>>`: `AndroidNotificationDrawer`, `AppLifecycleHandler`
  * `<<control>>`: `PushNotificationController`, `PushNotificationService`, `ExpoPushGateway`
  * `<<entity>>`: `UserPushToken`, `DiagramProject`, `CollaborationSession`
* **Secuencia (Lifelines):**
  * `Host (Web)` -> `DiagramController` -> `PushNotificationService` -> `Expo Push API` -> `Google Play Services (FCM)` -> `Android OS` -> `Usuario Toca Banner` -> `Mobile App (Apertura Directa)`

---

## 3. Catálogo Oficial de Tipos de Notificaciones Push Remotas (CU18)

Para garantizar un flujo de trabajo profesional sin saturar al usuario, el sistema implementa una **taxonomía de 5 tipos oficiales de notificaciones push**:

| Tipo de Notificación | Disparador en el Sistema | Contenido Típico del Banner | Acción al Pulsar en el Móvil |
|---|---|---|---|
| **1. Sala en Vivo Iniciada** (`ROOM_STARTED`) | El Anfitrión crea o reanuda una sesión de co-diseño colaborativo (`SW1-XXX`). | *"Sala en Vivo Iniciada: El Arquitecto abrió la sala SW1-S7D para 'Sistema Académico'. Toca para unirte."* | Despierta la app y conecta directamente a la sala como observador en tiempo real. |
| **2. Modelo Actualizado y Guardado** (`MODEL_SAVED`) | Un colaborador o arquitecto guarda y sincroniza el diagrama en PostgreSQL 17. | *"Modelo Actualizado: Se guardaron cambios en 'Sistema Académico' (8 Clases, 7 Relaciones)."* | Abre el visor móvil y descarga el nuevo estado del diagrama. |
| **3. Mención o Mensaje Urgente** (`CHAT_MENTION`) | Un compañero menciona tu usuario (`@marco`) o el bot `@ai` emite una conclusión relevante en el chat. | *"Mensaje en Sala: @marco por favor revisa la cardinalidad de Inscripcion."* | Abre directamente el panel deslizante del chat en la sala activa. |
| **4. Alerta de Normalización Relacional** (`NORMALIZATION_ALERT`) | La auditoría automática detecta que se agregaron entidades sin clave primaria `{PK}` o relaciones Many-to-Many sin tabla intermedia. | *"Alerta 1NF-3NF: Se detectaron 2 entidades sin clave primaria en 'Sistema Académico'."* | Abre la pantalla del proyecto con la ficha técnica de auditoría relacional. |
| **5. Sesión Suspendida en MongoDB** (`SESSION_SUSPENDED`) | El Anfitrión suspende la sesión colaborativa y resguarda la instantánea en MongoDB Atlas. | *"Sesión Suspendida: El estado de la sala SW1-S7D fue resguardado en MongoDB Atlas."* | Actualiza la lista de sesiones suspendidas en el móvil. |
