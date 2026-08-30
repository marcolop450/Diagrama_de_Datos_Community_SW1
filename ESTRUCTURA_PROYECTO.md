# 📁 Estructura del Proyecto — CASE Tool Colaborativo con IA

## Visión General

```
Primer Parcial/
│
├── 📄 DOCUMENTACION_PROYECTO.md    ← Documento completo del tema (4 partes)
├── 📄 ESTRUCTURA_PROYECTO.md       ← Este archivo
├── 📄 README.md                    ← Descripción general + instalación
├── 📄 .env                         ← Variables de entorno (NO se sube a Git)
├── 📄 .env.example                 ← Plantilla de variables de entorno
├── 📄 .gitignore                   ← Archivos excluidos de Git
│
├── backend/                         ← API Spring Boot 4.1.0 (Java 26)
├── frontend/                        ← App React + TypeScript + Vite
└── docs/                            ← Documentación complementaria
```

---

## Backend — Spring Boot 4.1.0

```
backend/
├── pom.xml                                         ← Dependencias Maven
├── mvnw / mvnw.cmd                                 ← Maven Wrapper
├── src/main/java/com/sw1/casetool/
│   ├── CaseToolApplication.java                    ← Clase principal
│   ├── config/
│   │   ├── CorsConfig.java                         ← Configuración CORS
│   │   ├── SecurityConfig.java                     ← Seguridad (JWT Supabase)
│   │   └── WebSocketConfig.java                    ← WebSocket STOMP
│   ├── model/
│   │   ├── DiagramProject.java                     ← Proyecto de diagrama
│   │   ├── ClassNode.java                          ← Nodo clase UML
│   │   ├── Relationship.java                       ← Relación entre clases
│   │   ├── CollaborationSession.java               ← Sesión colaborativa
│   │   ├── SessionParticipant.java                 ← Participante de sesión
│   │   └── DiagramHistory.java                     ← Historial de cambios
│   ├── repository/
│   │   ├── DiagramProjectRepository.java
│   │   ├── ClassNodeRepository.java
│   │   ├── RelationshipRepository.java
│   │   ├── CollaborationSessionRepository.java
│   │   ├── SessionParticipantRepository.java
│   │   └── DiagramHistoryRepository.java
│   ├── service/
│   │   ├── DiagramService.java                     ← CRUD de diagramas
│   │   ├── CollaborationService.java               ← Lógica colaborativa
│   │   ├── AIService.java                          ← Integración Gemini API
│   │   ├── GeneratorService.java                   ← Orquestador generación
│   │   └── XmiService.java                         ← Import/Export XMI
│   ├── controller/
│   │   ├── DiagramController.java                  ← REST API diagramas
│   │   ├── GeneratorController.java                ← API generación código
│   │   ├── AIController.java                       ← API IA (voz + foto)
│   │   ├── XmiController.java                      ← API import/export
│   │   └── WebSocketController.java                ← Mensajes WebSocket
│   ├── generator/
│   │   ├── SpringBootGenerator.java                ← Genera proyecto Spring Boot
│   │   ├── EntityGenerator.java                    ← Genera @Entity
│   │   ├── RepositoryGenerator.java                ← Genera @Repository
│   │   ├── ServiceGenerator.java                   ← Genera @Service
│   │   ├── ControllerGenerator.java                ← Genera @RestController
│   │   ├── DDLGenerator.java                       ← Genera SQL DDL
│   │   ├── PostmanGenerator.java                   ← Genera colección Postman
│   │   └── PomGenerator.java                       ← Genera pom.xml
│   ├── xmi/
│   │   ├── XmiImporter.java                        ← XMI → modelo interno
│   │   ├── XmiExporter.java                        ← modelo interno → XMI
│   │   └── XmiMapper.java                          ← Mapeo bidireccional
│   ├── dto/
│   │   ├── CreateProjectRequest.java
│   │   ├── ClassNodeRequest.java
│   │   ├── RelationshipRequest.java
│   │   ├── FullDiagramResponse.java
│   │   └── ApiResponse.java
│   └── exception/
│       ├── ResourceNotFoundException.java
│       └── GlobalExceptionHandler.java
└── src/main/resources/
    ├── application.yml                             ← Configuración principal
    └── templates/                                  ← Templates FreeMarker
        ├── entity.ftl
        ├── repository.ftl
        ├── service.ftl
        └── controller.ftl
```

---

## Frontend — React + TypeScript + Vite

```
frontend/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── index.html
├── .env                                            ← Variables Supabase
└── src/
    ├── main.tsx                                    ← Punto de entrada
    ├── App.tsx                                     ← Router + Providers
    ├── components/
    │   ├── canvas/
    │   │   ├── DiagramCanvas.tsx                   ← Canvas React Flow
    │   │   ├── ClassNodeComponent.tsx              ← Nodo visual UML
    │   │   ├── RelationshipEdge.tsx                ← Edge con estilos UML
    │   │   └── MiniMap.tsx                         ← Minimapa
    │   ├── toolbar/
    │   │   ├── Toolbar.tsx                         ← Barra de herramientas
    │   │   ├── VoiceButton.tsx                     ← Botón comando de voz
    │   │   └── PhotoButton.tsx                     ← Botón importar foto
    │   ├── panels/
    │   │   ├── PropertiesPanel.tsx                 ← Edición de propiedades
    │   │   ├── CollaboratorsPanel.tsx              ← Usuarios online
    │   │   ├── GeneratedCodePanel.tsx              ← Vista previa código
    │   │   └── AIAssistantPanel.tsx                ← Panel asistente IA
    │   ├── modals/
    │   │   ├── CreateProjectModal.tsx              ← Crear proyecto
    │   │   ├── JoinSessionModal.tsx                ← Unirse a sesión
    │   │   └── GenerateCodeModal.tsx               ← Generar código
    │   ├── auth/
    │   │   ├── LoginPage.tsx                       ← Inicio de sesión
    │   │   └── RegisterPage.tsx                    ← Registro
    │   └── layout/
    │       ├── Header.tsx                          ← Barra superior
    │       ├── Sidebar.tsx                         ← Panel lateral
    │       └── MainLayout.tsx                      ← Layout principal
    ├── hooks/
    │   ├── useCollaboration.ts                     ← Hook WebSocket + Yjs
    │   ├── useVoiceCommand.ts                      ← Hook Web Speech API
    │   ├── useDiagram.ts                           ← Hook estado diagrama
    │   └── useAI.ts                                ← Hook llamadas IA
    ├── stores/
    │   ├── diagramStore.ts                         ← Estado del diagrama
    │   ├── authStore.ts                            ← Estado autenticación
    │   └── uiStore.ts                              ← Estado UI
    ├── services/
    │   ├── api.ts                                  ← Cliente HTTP
    │   ├── supabase.ts                             ← Cliente Supabase
    │   └── websocket.ts                            ← Conexión WebSocket
    ├── types/
    │   ├── diagram.ts                              ← Tipos UML
    │   ├── api.ts                                  ← Tipos API
    │   └── collaboration.ts                        ← Tipos colaboración
    ├── utils/
    │   ├── diagramValidator.ts                     ← Validación diagrama
    │   └── codeFormatter.ts                        ← Formateo código
    └── styles/
        └── globals.css                             ← Estilos + Tailwind
```

---

## Base de Datos — Supabase (PostgreSQL 17)

### Tablas
| Tabla | Descripción | RLS |
|---|---|---|
| `diagram_projects` | Proyectos de diagramas | ✅ |
| `class_nodes` | Nodos de clase UML | ✅ |
| `relationships` | Relaciones entre clases | ✅ |
| `collaboration_sessions` | Sesiones colaborativas | ✅ |
| `session_participants` | Participantes de sesión | ✅ |
| `diagram_history` | Historial de cambios | ✅ |

### Proyecto Supabase
- **Nombre**: SW1_CASE
- **Región**: us-east-2
- **PostgreSQL**: 17
- **URL**: `https://ttopqwgoilgqkphwptjf.supabase.co`
