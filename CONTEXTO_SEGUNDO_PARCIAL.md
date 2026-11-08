# GUÍA TÉCNICA Y CONTEXTO MAESTRO — SEGUNDO PARCIAL (CASE TOOL UML)
> **Destinatario:** Documento de transferencia técnica para el equipo de desarrollo, arquitectura y asistentes de IA encargados de la elaboración de los diagramas canónicos (Casos de Uso, Análisis BCE, Secuencia, Clases y Estados) correspondientes a los **Ciclos 4 y 5 (CU14 al CU18)** bajo la metodología **PUDS + CBD (INF-422)**.

---

## 1. Visión Global del Sistema y Marco Metodológico

* **Nombre del Sistema:** CASE Tool UML Colaborativa con Asistencia IA Multimodal, Persistencia Híbrida y Visor Periférico Móvil.
* **Cátedra:** Sistemas de Información I (INF-422) — Proceso Unificado de Desarrollo de Software (PUDS) y Desarrollo Basado en Componentes (CBD), M.Sc. Rolando Martínez Canedo.
* **Arquitectura de Software:** 4 capas desacopladas en Backend (Java 21 LTS / Spring Boot 4.1.0), SPA React 18 + TypeScript + Tailwind CSS en Web, y Cliente Móvil periférico en React Native (Expo SDK 58).
* **Persistencia Híbrida:** 
  - Relacional: Supabase PostgreSQL 17 (16 tablas transaccionales fuertemente tipadas).
  - Documental NoSQL: MongoDB Atlas SW1 Cluster (`collab_session_snapshots` con fallback relacional JSONB).
* **Concurrencia en Tiempo Real:** WebSockets STOMP sobre SockJS (< 50 ms latencia bidireccional).

---

## 2. Detalle Exhaustivo de Casos de Uso del Segundo Parcial (CU14 a CU18)

### CU14 — Asistencia Co-Desarrolladora con IA, Memoria Contextual y Consultoría Teórica
* **Ciclo PUDS:** Ciclo 4 (Co-Desarrollo Inteligente).
* **Paquete:** Paquete 4 (Asistencia con Inteligencia Artificial y Concurrencia Colaborativa).
* **Actores:** `A2: Arquitecto de Software`, `A3: Colaborador`.
* **Propósito:** Brindar asistencia inteligente co-desarrolladora dentro del chat en vivo mediante la invocación explícita del bot `@ai` o comandos de voz, ejecutando inducción de contexto cronológico (*Catch-Up* en vivo con tiempo y participantes), auditoría relacional 1NF-3NF sin alucinaciones, y despacho operativo de acciones CASE directas (`SAVE_PROJECT`, `EXPORT_BACKEND`, `EXPORT_SQL`, `EXPORT_PNG`).
* **Archivos Clave Utilizados:**
  - `backend/src/main/java/com/sw1/casetool/service/ai/AiTeamMemberService.java`: Motor central de despacho semántico de intenciones, registro cronológico en memoria de eventos de sala y consulta a LLMs.
  - `backend/src/main/java/com/sw1/casetool/controller/AiTeamController.java`: Endpoint REST `POST /api/ai/team/chat`.
  - `backend/src/main/java/com/sw1/casetool/controller/WebSocketCollaborationController.java`: Intercepción de `@ai` en mensajes de chat STOMP y retransmisión asíncrona hacia `/topic/room/{code}`.
  - `backend/src/main/java/com/sw1/casetool/dto/ai/AiTeamChatRequest.java` y `AiTeamResponseDto.java`: Contratos de transferencia del asistente.
  - `frontend/src/components/collab/LiveCollabChat.tsx`: Panel de chat interactivo con 4 accesos rápidos (`Resumen`, `Auditar`, `Guardar`, `Exportar`) y aislamiento de teclado.
  - `frontend/src/services/collabWebSocketService.ts`: Despacho del payload STOMP con `diagramSnapshot`.
* **Métodos Principales:**
  - `AiTeamMemberService.processTeamAiMessageAsync(roomCode, senderId, senderName, messageText, diagramSnapshot)`: Procesa la consulta en hilo asíncrono, evalúa intención mediante regex/LLM y emite respuesta a la sala por STOMP.
  - `AiTeamMemberService.recordSessionEvent(roomCode, actorName, eventType, description)`: Registra eventos cronológicos en RAM para alimentar el prompt de Catch-Up.
  - `AiTeamMemberService.generateLiveCatchUpSummary(roomCode)`: Sintetiza los cambios de la sala indicando duración de sesión, participantes y acciones.
  - `AiTeamMemberService.auditDiagramContext(diagramSnapshot)`: Ejecuta reglas deterministas de TOM y Codd (1NF, 2NF, 3NF).
* **Análisis BCE (Robustez):**
  - **Boundary:** `LiveCollabChat.tsx` (Web), `MobileLiveChatSheet.tsx` (Móvil).
  - **Control:** `WebSocketCollaborationController`, `AiTeamController`, `AiTeamMemberService`, `NormalizationValidationService`.
  - **Entity:** `AiPromptLog`, `CollaborationMessage`, `DiagramProject`.

---

### CU15 — Motor Híbrido de Inferencia IA: Servidores Locales (LM Studio & Ollama), BYOK Libre y Test Harness
* **Ciclo PUDS:** Ciclo 4 (Inferencia Híbrida).
* **Paquete:** Paquete 5 (Inferencia Híbrida y Gobernanza Tecnológica).
* **Actores:** `A2: Arquitecto de Software`.
* **Propósito:** Permitir al Arquitecto seleccionar de forma flexible el motor de inferencia de IA para su proyecto entre tres modalidades (Servidor Local On-Premise con auto-detección de modelos en LM Studio y Ollama, Llave Privada BYOK en la nube con cifrado AES-256 GCM, o Motor Gratuito Integrado con Circuit Breaker), validando conectividad y latencia milimétrica mediante un Test Harness nativo en Java 21 sin bloqueos de flujo.
* **Archivos Clave Utilizados:**
  - `backend/src/main/java/com/sw1/casetool/service/ai/ProjectAiConfigService.java`: Lógica de negocio, auto-descubrimiento HTTP de modelos locales (`GET /v1/models` y `GET /api/tags`) y Test Harness.
  - `backend/src/main/java/com/sw1/casetool/controller/ProjectAiConfigController.java`: Endpoints REST `GET/PUT /api/projects/{projectId}/ai-config`, `POST .../test`, `GET .../local-models`.
  - `backend/src/main/java/com/sw1/casetool/model/ProjectAiConfig.java`: Entidad JPA mapeada a `project_ai_configs` en PostgreSQL 17.
  - `backend/src/main/java/com/sw1/casetool/repository/ProjectAiConfigRepository.java`: Interfaz Spring Data JPA.
  - `backend/src/main/java/com/sw1/casetool/service/security/EncryptionService.java`: Cifrado y descifrado simétrico AES-256 GCM con vector de inicialización seguro.
  - `frontend/src/components/modals/AiConfigModal.tsx`: Interfaz modal en 3 pestañas con sandbox de prueba interactivo.
  - `frontend/src/stores/projectAiStore.ts` y `projectAiService.ts`: Estado reactivo y cliente Axios.
* **Métodos Principales:**
  - `ProjectAiConfigService.getEffectiveConfig(projectId)`: Retorna la configuración activa desencriptando llaves BYOK si existen.
  - `ProjectAiConfigService.saveOrUpdateConfig(projectId, dto)`: Valida y persiste con cifrado AES-256 GCM.
  - `ProjectAiConfigService.testModelExecution(request)`: Envía un prompt estándar al motor elegido mediante `java.net.http.HttpClient` nativo de Java 21, midiendo `latencyMs`, tokens y respuesta devuelta.
  - `ProjectAiConfigService.discoverLocalModels(serverUrl, engine)`: Consulta el catálogo dinámico de modelos cargados en el servidor local.
* **Análisis BCE (Robustez):**
  - **Boundary:** `AiConfigModal.tsx`.
  - **Control:** `ProjectAiConfigController`, `ProjectAiConfigService`, `EncryptionService`.
  - **Entity:** `ProjectAiConfig`.

---

### CU16 — Persistencia de Sesiones Continuas NoSQL (MongoDB Atlas) y Soporte Multi-Motor DDL
* **Ciclo PUDS:** Ciclo 4 (Persistencia Continua NoSQL & MDA).
* **Paquete:** Paquete 5 (Inferencia Híbrida y Gobernanza Tecnológica).
* **Actores:** `A2: Arquitecto de Software (Host)`, `A3: Colaborador`.
* **Propósito:** Suspender y reanudar sesiones colaborativas en tiempo real preservando el estado integral (nodos, aristas, historial completo de chat y participantes) en documentos BSON dentro de MongoDB Atlas (`collab_session_snapshots`) con failover automático hacia PostgreSQL 17 ante indisponibilidad cloud, y compilar esquemas DDL optimizados para múltiples motores de bases de datos relacionales (PostgreSQL 17, MySQL 8.x, SQL Server y Oracle Database).
* **Archivos Clave Utilizados:**
  - `backend/src/main/java/com/sw1/casetool/model/nosql/ContinuousSessionSnapshot.java`: Documento Spring Data MongoDB mapeado a `collab_session_snapshots`.
  - `backend/src/main/java/com/sw1/casetool/repository/nosql/ContinuousSessionSnapshotRepository.java`: Repositorio MongoRepository cloud.
  - `backend/src/main/java/com/sw1/casetool/model/SessionSnapshotFallback.java`: Entidad JPA de contingencia en `session_snapshot_fallbacks` (PostgreSQL).
  - `backend/src/main/java/com/sw1/casetool/repository/SessionSnapshotFallbackRepository.java`: Repositorio JPA de fallback.
  - `backend/src/main/java/com/sw1/casetool/service/collab/ContinuousSessionService.java`: Servicio transaccional con tolerancia a fallos, timeout de 3000 ms y recuperación ante F5.
  - `backend/src/main/java/com/sw1/casetool/service/generator/MultiSqlDdlGeneratorService.java`: Compilador MDA hacia dialectos SQL estándar y específicos.
  - `backend/src/main/java/com/sw1/casetool/controller/ContinuousSessionController.java`: Endpoints REST `POST /suspend`, `POST /resume`, `GET /project/{id}`.
  - `frontend/src/components/collab/LiveCollabModal.tsx` y `SqlDdlModal.tsx`: Vistas web reactivas.
* **Métodos Principales:**
  - `ContinuousSessionService.saveSessionSnapshot(request)`: Serializa la sesión y la almacena en MongoDB Atlas. Si ocurre error o timeout, la almacena en PostgreSQL con flag `storageEngine: "POSTGRESQL_FALLBACK"`.
  - `ContinuousSessionService.resumeSession(request)`: Reconstituye el lienzo y el historial de chat restituyendo el código de sala.
  - `MultiSqlDdlGeneratorService.generateDdl(project, engine)`: Genera sentencias CREATE TABLE, PKs, FKs e índices respetando la sintaxis nativa de PostgreSQL 17 (`IDENTITY`, `TIMESTAMPTZ`), MySQL (`AUTO_INCREMENT`, `DATETIME`), SQL Server (`IDENTITY(1,1)`, `DATETIME2`) u Oracle (`GENERATED ALWAYS AS IDENTITY`).
* **Análisis BCE (Robustez):**
  - **Boundary:** `LiveCollabModal.tsx`, `SqlDdlModal.tsx`.
  - **Control:** `ContinuousSessionController`, `ContinuousSessionService`, `MultiSqlDdlGeneratorService`, `GeneratorController`.
  - **Entity:** `ContinuousSessionSnapshot` (MongoDB), `SessionSnapshotFallback` (PostgreSQL), `DiagramProject`.

---

### CU17 — Vista Periférica Móvil React Native (Expo) y Espejo en Tiempo Real
* **Ciclo PUDS:** Ciclo 5 (Movilidad y Notificaciones Periféricas).
* **Paquete:** Paquete 6 (Movilidad Periférica y Telemetría de Notificaciones).
* **Actores:** `A3: Colaborador`, `A2: Arquitecto de Software`.
* **Propósito:** Ofrecer un cliente móvil independiente desarrollado en React Native (Expo SDK 58 + TypeScript) para lectura, supervisión remota en viaje, espejo sincronizado bidireccionalmente por WebSockets STOMP (< 50ms) con cálculo ortogonal magnético de aristas, flechas y cardinalidades, e inspección táctil detallada de clases mediante Bottom Sheets.
* **Archivos Clave Utilizados:**
  - `mobile/src/screens/DiagramViewerScreen.tsx`: Pantalla principal del visor con barra de estado, indicador en vivo y botón flotante elevado (`bottom: 96`).
  - `mobile/src/components/canvas/CanvasSvgViewer.tsx`: Lienzo táctil reactivo SVG en 3 capas (Capa 1: Trazos ortogonales; Capa 2: Nodos de 3 compartimentos; Capa 3: Puntas de flecha, cardinalidades `{PK}`, `{FK}` y etiquetas).
  - `mobile/src/components/sheets/ClassDetailSheet.tsx`: Ficha técnica deslizable con detalle de visibilidad, tipos Java/SQL y métodos.
  - `mobile/src/stores/projectStore.ts`: Store Zustand móvil con sincronización atómica de nodos y aristas con handles magnéticos.
  - `mobile/src/stores/collabStore.ts` y `collabWsService.ts`: Cliente STOMP sobre WebSocket nativo.
* **Métodos Principales:**
  - `CanvasSvgViewer.computeOrthogonalPath(p1, p2)`: Calcula las trayectorias en ángulo recto no colisionantes entre los handles `top`, `bottom`, `left`, `right`.
  - `CanvasSvgViewer.renderArrowHead(p2, relType)`: Proyecta la punta de flecha UML (abierta, herencia, composición o agregación) según el ángulo de incidencia en el handle destino.
  - `projectStore.applySyncState(nodes, edges)`: Mapea el estado recibido por WebSocket preservando multiplicidades y coordenadas espaciales.
* **Análisis BCE (Robustez):**
  - **Boundary:** `DiagramViewerScreen.tsx`, `CanvasSvgViewer.tsx`, `ClassDetailSheet.tsx`.
  - **Control:** `collabWsService.ts`, `projectStore.ts`, `collabStore.ts`.
  - **Entity:** `MobileClassNode`, `MobileRelationshipEdge`, `DiagramProjectSummary`.

---

### CU18 — Notificaciones Push en Segundo Plano para Colaboración Móvil y Telemetría Forense
* **Ciclo PUDS:** Ciclo 5 (Movilidad y Notificaciones Periféricas).
* **Paquete:** Paquete 6 (Movilidad Periférica y Telemetría de Notificaciones).
* **Actores:** `A3: Colaborador`, `A2: Arquitecto de Software`, `A1: Super Administrador`.
* **Propósito:** Mantener informados a los arquitectos y colaboradores mediante notificaciones push en segundo plano en sus dispositivos móviles ante eventos críticos de modelado (apertura de sala por el Arquitecto, creación o eliminación de clases y mensajes en el chat de sala), registrando tokens de dispositivo (`user_push_tokens`) y despachando alertas mediante Expo Push Gateway.
* **Archivos Clave Utilizados:**
  - `backend/src/main/java/com/sw1/casetool/service/notification/PushNotificationService.java`: Servicio de registro de tokens, filtrado de destinatarios y transmisión HTTP/2 hacia Expo Gateway (`https://exp.host/--/api/v2/push/send`).
  - `backend/src/main/java/com/sw1/casetool/controller/PushNotificationController.java`: Endpoints REST `POST /api/notifications/push/register` y `POST .../test`.
  - `backend/src/main/java/com/sw1/casetool/model/UserPushToken.java`: Entidad JPA mapeada a `user_push_tokens` (PostgreSQL 17).
  - `backend/src/main/java/com/sw1/casetool/repository/UserPushTokenRepository.java`: Interfaz Spring Data JPA.
  - `backend/src/main/java/com/sw1/casetool/controller/CollaborationController.java`: Despacho push ante `startSession` (`ROOM_STARTED`).
  - `backend/src/main/java/com/sw1/casetool/controller/WebSocketCollaborationController.java`: Despacho push ante `NODE_CREATE`, `NODE_DELETE` (`CLASS_MUTATION`) y `CHAT` (`CHAT_MESSAGE`).
  - `mobile/src/services/pushNotificationService.ts`: Registro del token nativo con `expo-notifications` y listeners de eventos en primer y segundo plano.
* **Métodos Principales:**
  - `PushNotificationService.registerPushToken(userId, request)`: Registra o actualiza el token de notificación activo del dispositivo.
  - `PushNotificationService.sendPushToProjectCollaborators(projectId, excludeActorId, type, title, body, data)`: Notifica a todos los colaboradores del proyecto excluyendo al actor que ejecutó la mutación.
  - `PushNotificationService.dispatchExpoPush(tokens, type, title, body, data)`: Construye el lote JSON y ejecuta la petición HTTP POST hacia el Gateway de Expo.
* **Análisis BCE (Robustez):**
  - **Boundary:** `NotificationToast.tsx` (Móvil), Bandeja de Notificaciones de Android/iOS.
  - **Control:** `PushNotificationController`, `PushNotificationService`, `CollaborationController`, `WebSocketCollaborationController`.
  - **Entity:** `UserPushToken`, `UserProfile`, `CollaborationSession`.

---

## 3. Matriz de Mapeo Físico de Base de Datos (Segundo Parcial)

| N.º | Entidad (Java 21 / Spring Data) | Tabla / Colección Física | Motor de Base de Datos | Columnas / Campos Principales |
|---|---|---|---|---|
| **15** | `ProjectAiConfig` | `project_ai_configs` | PostgreSQL 17 | `id` (UUID, PK), `project_id` (UUID, FK UNIQUE), `inference_mode` (VARCHAR), `local_server_url`, `local_model_id`, `byok_provider`, `byok_encrypted_key` (TEXT AES-256), `byok_model_id`, `updated_at`. |
| **16** | `ContinuousSessionSnapshot` | `collab_session_snapshots` | MongoDB Atlas (Cluster SW1) | `_id` (ObjectId), `room_code` (String, Unique Index), `project_id`, `host_username`, `canvas_snapshot` (Document), `chat_history` (Array), `participants` (Array), `status`, `saved_at`. |
| **17** | `SessionSnapshotFallback` | `session_snapshot_fallbacks` | PostgreSQL 17 | `id` (UUID, PK), `room_code` (VARCHAR, UNIQUE), `project_id` (UUID, FK), `host_user_id` (UUID, FK), `snapshot_payload` (JSONB), `status`, `saved_at`. |
| **18** | `UserPushToken` | `user_push_tokens` | PostgreSQL 17 | `id` (UUID, PK), `user_id` (UUID, FK), `device_token` (VARCHAR, UNIQUE), `platform` (VARCHAR), `device_name`, `is_active` (BOOLEAN), `last_seen_at`. |

---

## 4. Prompt Maestro para la IA Encargada de los Diagramas

Copia y pega el siguiente bloque en la IA que asistirá en la elaboración y exportación de diagramas:

```text
Actúa como Arquitecto de Software Experto en Metodología PUDS + CBD (Proceso Unificado de Desarrollo de Software y Desarrollo Basado en Componentes) bajo la cátedra de Sistemas de Información I (INF-422, M.Sc. Rolando Martínez Canedo).

Tu misión es asistir en la diagramación técnica canónica y formal del SEGUNDO PARCIAL de la plataforma CASE Tool UML. El sistema abarca los Ciclos 4 y 5 y comprende los Casos de Uso del CU14 al CU18:
- CU14: Asistencia Co-Desarrolladora con IA, Memoria Contextual y Consultoría Teórica
- CU15: Motor Híbrido de Inferencia IA: Servidores Locales (LM Studio & Ollama), BYOK Libre y Test Harness
- CU16: Persistencia de Sesiones Continuas NoSQL (MongoDB Atlas) y Soporte Multi-Motor DDL
- CU17: Vista Periférica Móvil React Native (Expo) y Espejo en Tiempo Real
- CU18: Notificaciones Push en Segundo Plano para Colaboración Móvil y Telemetría Forense

Reglas Inviolables de Diagramación y Estilo:
1. Cero Emojis: No utilices emojis bajo ninguna circunstancia en títulos, descripciones, estereotipos ni notas.
2. Estructura Canónica de Casos de Uso (7 Campos Estrictos):
   - Propósito
   - Actores
   - Actor Iniciador
   - Pre-Condición
   - Flujo de Proceso Principal
   - Post-Condición
   - Excepciones
   Queda terminantemente prohibido agregar campos extra como "Reglas de Negocio / Integración".
3. Análisis de Casos de Uso (BCE / Robustez):
   - Utiliza estereotipos canónicos de análisis: <<boundary>>, <<control>>, <<entity>>.
   - Actores: Arquitecto (A2), Colaborador (A3), Super Admin (A1).
   - Respeta las reglas de comunicación: Los actores solo interactúan con Boundaries; los Boundaries interactúan con Controles; los Controles gestionan Entidades; las Entidades no llaman a Controles ni Boundaries.
4. Diagramas de Secuencia (Diseño 4 Capas):
   - Lifelines exactas correspondientes a la implementación:
     * Capa Boundary: React SPA (vistas Web) o React Native (pantallas Móviles).
     * Capa 1 (Controller): Endpoints REST o Controllers STOMP WebSocket.
     * Capa 2 (Service): Lógica de negocio (@Service de Spring Boot).
     * Capa 3 (Repository): Interfaces Spring Data JPA o MongoRepository.
     * Capa 4 (Database): Supabase PostgreSQL 17 o MongoDB Atlas.
5. Diagrama General de Casos de Uso (PlantUML Flanqueado en 3 Columnas):
   - Columna Izquierda: Gobernanza, Auditoría y Persistencia NoSQL.
   - Columna Central: Actores en columna vertical (Super Admin, Arquitecto, Colaborador) con Autenticación en el centro.
   - Columna Derecha: Modelador Visual Core, IA Co-Desarrolladora, Generadores MDA y Movilidad Periférica.
   - Marco encapsulado en rectangle " " as Marco sin títulos invasivos.

Cuando generes código PlantUML, scripts de automatización para Enterprise Architect o descripciones técnicas, adhiérete de forma rigurosa a estas especificaciones.
```

---

## 5. Recomendación y Script de Automatización para Enterprise Architect (Sparx Systems)

### 5.1 Recomendación Estratégica
Modelar manualmente en Enterprise Architect decenas de diagramas de secuencia, clases y casos de uso consume horas y es propenso a inconsistencias de nombres y tipos.
* **Enfoque Recomendado:** Utilizar la **API COM de Automatización de Enterprise Architect** (`EA.App` / `EA.Repository`) para generar los elementos, paquetes, diagramas y conectores de forma programática en segundos.
* Enterprise Architect expone una interfaz COM nativa en Windows accesible mediante **Python (`win32com.client`)** o directamente desde el motor interno de scripts de EA (**Tools -> Scripting -> JScript / VBScript**).

---

### 5.2 Script Automatizado en Python (`generate_ea_second_partial.py`)

Guarda y ejecuta el siguiente script en la máquina donde esté instalado Enterprise Architect con el proyecto `.qea`, `.feap` o `.eapx` abierto:

```python
"""
Script de Automatización para Enterprise Architect (Sparx Systems)
Crea automáticamente el Paquete del Segundo Parcial, los Casos de Uso CU14 a CU18,
sus Diagramas de Secuencia con Lifelines de 4 Capas y el Diagrama de Clases de Persistencia.
Requisitos: pip install pywin32
"""

import sys
import win32com.client

def main():
    print("Conectando con la instancia activa de Enterprise Architect...")
    try:
        ea_app = win32com.client.GetActiveObject("EA.App")
        repo = ea_app.Repository
    except Exception as e:
        print("Error: No se encontró Enterprise Architect en ejecución.")
        print("Abre Enterprise Architect con tu proyecto antes de ejecutar este script.")
        return

    print(f"Conectado exitosamente al proyecto: {repo.ConnectionString}")

    # 1. Obtener el modelo raíz
    models = repo.Models
    if models.Count == 0:
        print("El proyecto no contiene modelos.")
        return
    root_model = models.GetAt(0)

    # 2. Crear o ubicar el Paquete 'Segundo Parcial - Ciclos 4 y 5'
    packages = root_model.Packages
    pkg_name = "Segundo Parcial (Ciclos 4 y 5)"
    target_pkg = None
    for i in range(packages.Count):
        p = packages.GetAt(i)
        if p.Name == pkg_name:
            target_pkg = p
            break

    if not target_pkg:
        target_pkg = packages.AddNew(pkg_name, "Package")
        target_pkg.Update()
        packages.Refresh()
        print(f"Paquete creado: {pkg_name}")

    # 3. Definición de los Casos de Uso (CU14 a CU18)
    use_cases_data = [
        ("CU14", "Asistencia Co-Desarrolladora con IA, Memoria Contextual y Consultoria Teorica", "Arquitecto / Colaborador"),
        ("CU15", "Motor Hibrido de Inferencia IA: Servidores Locales, BYOK y Test Harness", "Arquitecto"),
        ("CU16", "Persistencia Continua NoSQL (MongoDB Atlas) y Soporte Multi-Motor DDL", "Arquitecto / Colaborador"),
        ("CU17", "Vista Periferica Movil React Native (Expo) y Espejo en Tiempo Real", "Colaborador"),
        ("CU18", "Notificaciones Push en Segundo Plano para Colaboracion Movil", "Colaborador / Arquitecto")
    ]

    elements = target_pkg.Elements
    diagrams = target_pkg.Diagrams

    # Crear Diagrama General de Casos de Uso del Segundo Parcial
    uc_diag = diagrams.AddNew("Diagrama de Casos de Uso - Segundo Parcial", "Use Case")
    uc_diag.Update()

    for code, title, actor_name in use_cases_data:
        full_title = f"{code}: {title}"
        uc_elem = elements.AddNew(full_title, "UseCase")
        uc_elem.Notes = f"Caso de Uso del Segundo Parcial bajo metodologia PUDS.\nActor Principal: {actor_name}"
        uc_elem.Update()
        elements.Refresh()

        # Agregar al diagrama de Casos de Uso
        diag_obj = uc_diag.DiagramObjects.AddNew("", "")
        diag_obj.ElementID = uc_elem.ElementID
        diag_obj.Update()

        # Crear Diagrama de Secuencia individual para cada CU
        seq_diag = target_pkg.Diagrams.AddNew(f"Secuencia - {code}", "Sequence")
        seq_diag.Update()

        # Lifelines estándar de 4 capas
        lifelines = [
            (f"Actor_{actor_name.split('/')[0].strip()}", "Actor"),
            (f"{code}_BoundaryView", "Boundary"),
            (f"{code}_Controller", "Control"),
            (f"{code}_Service", "Control"),
            (f"{code}_Repository", "Control"),
            ("Database_Storage", "Entity")
        ]

        left_pos = 50
        for ll_name, ll_type in lifelines:
            ll_elem = target_pkg.Elements.AddNew(ll_name, "Sequence")
            ll_elem.Stereotype = ll_type
            ll_elem.Update()
            
            do = seq_diag.DiagramObjects.AddNew("", "")
            do.ElementID = ll_elem.ElementID
            do.left = left_pos
            do.right = left_pos + 90
            do.top = -50
            do.bottom = -450
            do.Update()
            left_pos += 140

        seq_diag.DiagramObjects.Refresh()
        seq_diag.Update()
        print(f"Generado {code} con diagrama de secuencia y lifelines.")

    # 4. Crear Diagrama de Clases de Persistencia (PostgreSQL + MongoDB Atlas)
    cd_diag = diagrams.AddNew("Modelo de Clases de Persistencia - Segundo Parcial", "Logical")
    cd_diag.Update()

    entities_data = [
        ("ProjectAiConfig", "Entity", ["id: UUID", "projectId: UUID", "inferenceMode: String", "localServerUrl: String", "byokProvider: String", "byokEncryptedKey: String"]),
        ("ContinuousSessionSnapshot", "Document", ["id: String", "roomCode: String", "projectId: String", "hostUsername: String", "canvasSnapshot: Object", "status: String", "savedAt: Date"]),
        ("SessionSnapshotFallback", "Entity", ["id: UUID", "roomCode: String", "projectId: UUID", "hostUserId: UUID", "snapshotPayload: JSONB", "status: String"]),
        ("UserPushToken", "Entity", ["id: UUID", "userId: UUID", "deviceToken: String", "platform: String", "deviceName: String", "isActive: Boolean"])
    ]

    left_pos = 60
    for ent_name, stype, attrs in entities_data:
        c_elem = target_pkg.Elements.AddNew(ent_name, "Class")
        c_elem.Stereotype = stype
        c_elem.Update()

        for a_str in attrs:
            a_name, a_type = [x.strip() for x in a_str.split(":")]
            attr = c_elem.Attributes.AddNew(a_name, a_type)
            attr.Update()

        c_elem.Attributes.Refresh()
        c_elem.Update()

        do = cd_diag.DiagramObjects.AddNew("", "")
        do.ElementID = c_elem.ElementID
        do.left = left_pos
        do.right = left_pos + 180
        do.top = -80
        do.bottom = -250
        do.Update()
        left_pos += 220

    cd_diag.DiagramObjects.Refresh()
    cd_diag.Update()

    repo.RefreshModelView(target_pkg.PackageID)
    print("\n=======================================================")
    print("¡GENERACIÓN EN ENTERPRISE ARCHITECT COMPLETADA CON ÉXITO!")
    print("Revisa el árbol del proyecto en el paquete: 'Segundo Parcial (Ciclos 4 y 5)'")
    print("=======================================================")

if __name__ == "__main__":
    main()
```

---

### 5.3 Alternativa en JScript Nativo dentro de Enterprise Architect
Si se prefiere ejecutar directamente dentro de Enterprise Architect sin instalar Python:
1. En EA, ir a la barra superior: **Tools -> Scripting** (o presionar `Ctrl + F9`).
2. En la ventana **Scripts**, hacer clic derecho en **Local Scripts** -> **New JScript**.
3. Nombrar el script `GenerarSegundoParcial`.
4. Pegar el código que recorre `Repository.GetTreeSelectedPackage()` y llama a `package.Elements.AddNew(name, "UseCase")` y `package.Diagrams.AddNew(name, "Sequence")`.
5. Presionar **Run Script** para generar la estructura en segundos.
