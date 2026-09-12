# ${projectName} — Backend Spring Boot (4 Capas)

Proyecto backend autogenerado mediante la herramienta CASE Tool UML bajo metodología PUDS y arquitectura desacoplada CBD.

---

## 1. Requisitos de Ejecución
* **Java:** Java 21 LTS o superior.
* **Gestor de Construcción:** Maven (el proyecto incluye Maven Wrapper ejecutable `mvnw`, por lo que no requieres instalar Maven manualmente).

---

## 2. Puesta en Marcha Inmediata (< 10 segundos)

El proyecto viene preconfigurado con el perfil `dev` activo por defecto sobre una base de datos **H2 en memoria**, permitiendo ejecutar y probar las APIs al instante sin dependencias externas:

### En Linux / macOS:
```bash
./mvnw spring-boot:run
```

### En Windows (PowerShell / CMD):
```powershell
.\mvnw.cmd spring-boot:run
```

Una vez iniciado el servidor:
* **API Base:** `http://localhost:8080/api`
* **Consola H2 en Memoria:** `http://localhost:8080/h2-console`
  - *JDBC URL:* `jdbc:h2:mem:${artifactId}_db`
  - *User:* `sa`
  - *Password:* (dejar vacío)
<#if includeSwagger!true>
* **Swagger UI / Documentación OpenAPI:** `http://localhost:8080/swagger-ui.html`
</#if>

---

## 3. Ejecución con Base de Datos PostgreSQL 17 / Supabase

Para conectar a una base de datos PostgreSQL real, ejecuta con el perfil `prod`:

```bash
./mvnw spring-boot:run -Dspring-boot.run.profiles=prod
```

Variables de entorno configurables:
* `SPRING_DATASOURCE_URL`: `jdbc:postgresql://host:5432/nombre_bd`
* `SPRING_DATASOURCE_USERNAME`: `tu_usuario`
* `SPRING_DATASOURCE_PASSWORD`: `tu_contraseña`

---

## 4. Catálogo de Endpoints REST Generados

| Entidad | Verbo HTTP | Endpoint | Descripción |
|---|---|---|---|
<#list classes as cls>
| **${cls.className}** | `GET` | `/api/${cls.endpointSlug}` | Listar todas las instancias |
| **${cls.className}** | `GET` | `/api/${cls.endpointSlug}/{id}` | Obtener registro por ID |
| **${cls.className}** | `POST` | `/api/${cls.endpointSlug}` | Crear nuevo registro (Payload JSON) |
| **${cls.className}** | `PUT` | `/api/${cls.endpointSlug}/{id}` | Actualizar registro existente |
| **${cls.className}** | `DELETE` | `/api/${cls.endpointSlug}/{id}` | Eliminar registro por ID |
</#list>

---

## 5. Arquitectura del Proyecto en 4 Capas
```
src/main/java/${basePackagePath}/
├── controller/     # Endpoints REST stateless y contratos HTTP (@RestController)
├── service/        # Contratos de interfaz y lógica de negocio pura (@Service, @Transactional)
│   └── impl/       # Implementaciones transaccionales desacopladas
├── repository/     # Interfaces Spring Data JPA (@Repository, JpaRepository)
├── entity/         # Entidades de persistencia ORM mapeadas a base de datos (@Entity)
├── dto/            # Objetos de transferencia de datos desacoplados (Request & Response)
└── exception/      # Manejo global de excepciones uniformes (@RestControllerAdvice)
```
