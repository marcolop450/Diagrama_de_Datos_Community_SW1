# CASE Tool UML — Modelado Visual & Generador Spring Boot en 4 Capas

Plataforma Computer-Aided Software Engineering (CASE) orientada al modelado visual de diagramas de clases UML 2.5+, generacion automatica de proyectos backend Spring Boot en 4 capas limpias (Controller, Service, Repository, Entity), scripts DDL PostgreSQL 17, interoperabilidad XMI ArchiTec y colaboracion multiusuario en tiempo real.

Desarrollada bajo la metodologia PUDS (Proceso Unificado de Desarrollo de Software) con arquitectura desacoplada, seguridad JWT stateless y almacenamiento persistente en PostgreSQL 17.

---

## 1. Estado de Desarrollo del Proyecto (PUDS)

### Ciclo 1: Fase de Inicio y Elaboracion

| Caso de Uso | Denominacion Tecnica | Estado | Especificacion Funcional |
| :--- | :--- | :---: | :--- |
| **CU00** | Autenticacion con Sesion Volatil | Completado | Autenticacion con JWT Bearer (HMAC-SHA256), almacenamiento exclusivo en memoria `sessionStorage`, proteccion de rutas con Spring Security 6, hashing de contraseñas con BCrypt (factor 12) y Landing Page publica. |
| **CU01** | Registrarse, Perfil y Configuracion de Usuario | Completado | Registro de nuevos arquitectos con nombre de usuario obligatorio y plan Community, login dual por correo o usuario sin restricciones de formato, pagina dedicada de perfil y ajustes (`/settings`), interfaz profesional en modo oscuro de alto contraste, gestion de avatar, preferencias de canvas (grid, snap, auto-save, zoom) con persistencia JSONB en PostgreSQL y cambio seguro de contraseña con hash BCrypt. |
| **CU02** | Gestion de Usuarios y Roles (RBAC) | Completado | Control de acceso basado en roles con consola administrativa para SUPER_ADMIN (`/admin/users`), endpoints protegidos en `/api/admin/**`, asignacion de roles (SUPER_ADMIN, ARQUITECTO, COLABORADOR), suspension y reactivacion de cuentas (`is_active`), regla anti auto-degradacion y anti auto-bloqueo, bitacora inmutable en `audit_logs` con IP y JSONB, Dashboard adaptativo por rol (`/dashboard`) y Sidebar segmentado segun privilegios. |
| **CU03** | Adquisicion de Suscripcion SaaS (30 Dias) | Planificado | Pasarela de pago con PayPal Sandbox y facturacion automatica de 30 dias. |
| **CU04** | Auditoria de Bitacora Global y Transacciones | Planificado | Registro inmutable de eventos administrativos y mutaciones. |
| **CU05** | Trazabilidad de Proyecto y Papelera | Planificado | Historial cronologico de cambios por autor y restauracion de proyectos. |
| **CU06** | Tutorial Guiado de Onboarding | Planificado | Induccion interactiva paso a paso en el lienzo en menos de 2 minutos. |
| **CU07** | Creacion de Proyectos desde Plantilla Base | Planificado | Carga automatica de dominios predefinidos (E-Commerce, Clinica, etc.). |
| **CU08** | Modelado de Clases UML (Tipos y Visibilidad) | Planificado | Creacion y edicion reactiva de clases, atributos tipados y metodos. |
| **CU09** | Conexion de Relaciones y Cardinalidades | Planificado | Asociacion, herencia, composicion, agregacion y dependencias. |
| **CU10** | Validacion de Normalizacion Logica (1NF a 3NF) | Planificado | Motor cliente de verificacion relacional de reglas TOM. |

---

## 2. Arquitectura del Sistema

El sistema implementa una separacion rigurosa en 4 capas de software:

```
+-------------------------------------------------------------------------+
|                         CAPA DE PRESENTACION                            |
|  React 18 + TypeScript + Vite + Tailwind CSS + Lucide Icons + React Flow |
+-------------------------------------------------------------------------+
                                    |  (HTTPS / REST / JSON + WSS STOMP)
                                    v
+-------------------------------------------------------------------------+
|                  CAPA DE CONTROLADORES (Spring Boot 4.1.0)              |
|  AuthController | UserController | AdminUserController | DiagramController|
+-------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
|                  CAPA DE SERVICIOS (Logica de Negocio)                  |
|  AuthService | UserService | AdminUserService | AuditLogService         |
+-------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
|                 CAPA DE REPOSITORIOS (Spring Data JPA)                  |
|  UserProfileRepository | AuditLogRepository | DiagramProjectRepository  |
+-------------------------------------------------------------------------+
                                    |  (JDBC Connection Pool HikariCP)
                                    v
+-------------------------------------------------------------------------+
|                   BASE DE DATOS (Supabase PostgreSQL 17)                |
|  user_profiles | audit_logs | diagram_projects | class_nodes            |
+-------------------------------------------------------------------------+
```

---

## 3. Endpoints REST API Implementados

### Autenticacion y Seguridad (`/api/auth`)
* `POST /api/auth/login`: Autentica credenciales y emite Token JWT Bearer.
* `POST /api/auth/register`: Registra un nuevo usuario con rol ARQUITECTO y preferencias por defecto.
* `GET /api/auth/me`: Retorna el perfil del usuario autenticado a partir del Token.
* `POST /api/auth/logout`: Invalida la presencia del cliente.

### Perfil y Configuracion de Usuario (`/api/users`)
* `GET /api/users/profile`: Consulta datos de perfil y preferencias del editor CASE.
* `PUT /api/users/profile`: Actualiza nombre completo, username y avatar URL.
* `PUT /api/users/preferences`: Persiste configuraciones del lienzo (theme, grid, snapToGrid, autoSaveInterval, defaultZoom) en formato JSONB.
* `PUT /api/users/change-password`: Modifica la contraseña tras validar la clave actual con BCrypt.
* `DELETE /api/users/account`: Desactiva la cuenta propia (`is_active = false`), registra auditoria inmutable y cierra la sesion del usuario.

### Administracion y Control de Acceso RBAC (`/api/admin/users`)
* `GET /api/admin/users`: Listado de usuarios con filtros por texto, rol y estado de activacion.
* `GET /api/admin/users/metrics`: Metricas consolidadas de gobernanza (total usuarios, desglose por rol, activos y suspendidos).
* `PUT /api/admin/users/{userId}/role`: Actualiza el rol del usuario impidiendo la auto-degradacion del administrador en sesion.
* `PUT /api/admin/users/{userId}/status`: Suspende o reactiva el acceso de una cuenta con prevencion de auto-bloqueo.

---

## 4. Stack Tecnologico

* **Frontend:**
  * Framework: React 18.3 con TypeScript
  * Build Tool: Vite 5
  * Canvas Grafico: React Flow v12
  * Iconografia: Lucide React (vectorial estricta, sin emojis)
  * Gestion de Estado: Zustand 4.5
  * Estilos: Tailwind CSS v4 con interfaz profesional en Modo Oscuro de alto contraste
  * Iconografia: Lucide React (sin emojis)
  * Almacenamiento Cliente: `sessionStorage` (sesion volatil de alta seguridad)

* **Backend:**
  * Framework: Spring Boot 4.1.0 (Java 21/26)
  * Seguridad: Spring Security 6 + JJWT 0.12.5 (HMAC-SHA256) + BCrypt (factor 12)
  * Persistencia: Spring Data JPA + Hibernate 7 con mapeo nativo `SqlTypes.JSON`
  * Motor de Plantillas: Apache FreeMarker 2.3
  * WebSockets: Spring STOMP + SockJS

* **Base de Datos:**
  * Motor: PostgreSQL 17 (Supabase Cloud)
  * Columnas Estructuradas: JSONB para preferencias de usuario y metadata de diagramas
  * Tipos Temporales: `Instant` con compatibilidad `timestamptz`

---

## 5. Instrucciones de Instalacion y Ejecucion

### Opcion A: Despliegue con Docker Compose (Recomendado)
Ejecuta todo el stack (Backend Spring Boot + Frontend Nginx) con un solo comando:

```bash
docker compose up --build
```
* Frontend accesible en: `http://localhost:5173` o `http://localhost`
* Backend accesible en: `http://localhost:8080`

---

### Opcion B: Ejecucion Local Manual

#### 1. Backend (Spring Boot)
Requiere JDK 21+ y Maven 3.9+:

```bash
cd backend
mvn spring-boot:run
```
El servidor iniciara en el puerto `8080`.

#### 2. Frontend (React)
Requiere Node.js 18+:

```bash
cd frontend
npm install
npm run dev
```
La aplicacion estara disponible en `http://localhost:5173`.

---

## 6. Estructura de Directorios

```
├── backend/
│   ├── src/main/java/com/sw1/casetool/
│   │   ├── config/            # Configuraciones de Seguridad, CORS y WebSockets
│   │   ├── controller/        # Controladores REST (Auth, Users, Diagram, etc.)
│   │   ├── dto/               # Objetos de Transferencia de Datos (Auth, User, Diagram)
│   │   ├── model/             # Entidades JPA (UserProfile, DiagramProject, ClassNode)
│   │   ├── repository/        # Repositorios Spring Data JPA
│   │   ├── security/          # Filtros JWT y Proveedor Criptografico
│   │   └── service/           # Servicios de Negocio (Auth, User, Generator)
│   ├── Dockerfile             # Multi-stage build con OpenJDK 21
│   └── pom.xml                # Dependencias Maven y plugins
├── frontend/
│   ├── src/
│   │   ├── components/        # Componentes UI (Auth, Canvas, Modales, Layout)
│   │   ├── pages/             # Vistas de pagina (LandingPage, SettingsPage)
│   │   ├── services/          # Cliente Axios y llamadas API
│   │   ├── stores/            # Estados globales Zustand (authStore, diagramStore)
│   │   └── styles/            # Estilos globales y anulaciones de autofill
│   ├── Dockerfile             # Multi-stage build con Nginx
│   └── nginx.conf             # Proxy inverso para API y WebSockets
├── docker-compose.yml         # Orquestacion de contenedores
└── README.md                  # Documentacion tecnica del proyecto
```
