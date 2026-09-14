package com.sw1.casetool.service.generator;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.sw1.casetool.dto.generator.GeneratePostmanRequest;
import com.sw1.casetool.dto.generator.PostmanResponse;
import com.sw1.casetool.model.ClassNode;
import com.sw1.casetool.model.DiagramProject;
import com.sw1.casetool.model.UserProfile;
import com.sw1.casetool.repository.ClassNodeRepository;
import com.sw1.casetool.repository.DiagramProjectRepository;
import com.sw1.casetool.repository.UserProfileRepository;
import com.sw1.casetool.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class PostmanGeneratorService {

    private final DiagramProjectRepository projectRepository;
    private final ClassNodeRepository classNodeRepository;
    private final UserProfileRepository userProfileRepository;
    private final AuditLogService auditLogService;
    private final ObjectMapper objectMapper = new ObjectMapper().enable(SerializationFeature.INDENT_OUTPUT);

    /**
     * Generates a canonical Postman Collection v2.1.0 for all entities of the diagram project.
     */
    @Transactional(readOnly = true)
    public PostmanResponse generatePostmanCollection(
            UUID projectId,
            GeneratePostmanRequest request,
            String userEmail,
            String ip,
            String userAgent
    ) {
        DiagramProject project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("El proyecto con ID " + projectId + " no existe."));

        List<ClassNode> classes = classNodeRepository.findByProjectId(projectId);
        if (classes.isEmpty()) {
            throw new IllegalArgumentException("No es posible generar colección Postman para un modelo sin clases definidas (Regla E1).");
        }

        GeneratePostmanRequest finalReq = request != null ? request : new GeneratePostmanRequest();
        String baseUrl = (finalReq.getBaseUrl() != null && !finalReq.getBaseUrl().isBlank())
                ? finalReq.getBaseUrl().trim().replaceAll("/+$", "")
                : "http://localhost:8081";

        ObjectNode root = objectMapper.createObjectNode();

        // 1. Info block
        ObjectNode info = root.putObject("info");
        info.put("_postman_id", UUID.randomUUID().toString());
        info.put("name", project.getName() + " - API Suite");
        info.put("description", "Colección de pruebas automáticas generada por CASE Tool UML para el backend Spring Boot de " + project.getName());
        info.put("schema", "https://schema.getpostman.com/json/collection/v2.1.0/collection.json");

        // 2. Collection Variables
        ArrayNode variables = root.putArray("variable");
        ObjectNode varBaseUrl = variables.addObject();
        varBaseUrl.put("key", "baseUrl");
        varBaseUrl.put("value", baseUrl);
        varBaseUrl.put("type", "string");

        for (ClassNode node : classes) {
            String cName = sanitizeIdentifier(node.getName());
            String s = toKebabCase(pluralize(cName));
            ObjectNode varId = variables.addObject();
            varId.put("key", "last_created_" + s + "_id");
            varId.put("value", "1");
            varId.put("type", "string");
        }

        // 3. Item array (Folders per Entity)
        ArrayNode itemsArray = root.putArray("item");
        int totalRequests = 0;
        int totalTests = 0;

        for (ClassNode node : classes) {
            String className = sanitizeIdentifier(node.getName());
            String slug = toKebabCase(pluralize(className));

            ObjectNode folder = itemsArray.addObject();
            folder.put("name", className);
            folder.put("description", "Endpoints REST CRUD para la entidad " + className);

            ArrayNode folderItems = folder.putArray("item");

            // 1. GET All (Listado general de la entidad)
            folderItems.add(buildGetAllRequest(className, slug, finalReq.isIncludeTests()));
            totalRequests++;
            if (finalReq.isIncludeTests()) totalTests += 3;

            // 2. POST Create (Crea el registro y guarda last_created_{slug}_id)
            folderItems.add(buildPostCreateRequest(node, className, slug, finalReq));
            totalRequests++;
            if (finalReq.isIncludeTests()) totalTests += 2;

            // 3. GET by ID (Consulta el registro recién creado por ID)
            folderItems.add(buildGetByIdRequest(className, slug, finalReq.isIncludeTests()));
            totalRequests++;
            if (finalReq.isIncludeTests()) totalTests += 2;

            // 4. PUT Update (Actualiza el registro por ID)
            folderItems.add(buildPutUpdateRequest(node, className, slug, finalReq));
            totalRequests++;
            if (finalReq.isIncludeTests()) totalTests += 2;

            // 5. DELETE by ID (Elimina el registro por ID)
            folderItems.add(buildDeleteRequest(className, slug, finalReq.isIncludeTests()));
            totalRequests++;
            if (finalReq.isIncludeTests()) totalTests += 2;
        }

        String jsonString;
        try {
            jsonString = objectMapper.writeValueAsString(root);
        } catch (Exception e) {
            log.error("Error al serializar colección Postman v2.1: {}", e.getMessage(), e);
            throw new RuntimeException("Error al serializar JSON de colección Postman: " + e.getMessage(), e);
        }

        String cleanProjectName = toKebabCase(project.getName());
        if (cleanProjectName.isBlank()) cleanProjectName = "api";
        String fileName = cleanProjectName + "-postman-collection.json";

        // 4. Inmutable Audit Log
        UserProfile user = (userEmail != null && !userEmail.isBlank())
                ? userProfileRepository.findByEmail(userEmail).orElse(null) : null;
        recordAudit(project, user != null ? user.getId() : null, ip, userAgent, classes.size(), totalRequests, totalTests, finalReq);

        return PostmanResponse.builder()
                .projectName(project.getName())
                .fileName(fileName)
                .json(jsonString)
                .totalFolders(classes.size())
                .totalRequests(totalRequests)
                .totalTests(totalTests)
                .build();
    }

    /**
     * Download bytes for postman_collection.json.
     */
    @Transactional(readOnly = true)
    public byte[] generatePostmanCollectionBytes(
            UUID projectId,
            GeneratePostmanRequest request,
            String userEmail,
            String ip,
            String userAgent
    ) {
        PostmanResponse response = generatePostmanCollection(projectId, request, userEmail, ip, userAgent);
        return response.getJson().getBytes(StandardCharsets.UTF_8);
    }

    private ObjectNode buildGetAllRequest(String className, String slug, boolean includeTests) {
        ObjectNode item = objectMapper.createObjectNode();
        item.put("name", "Listar " + pluralize(className) + " (GET All)");

        if (includeTests) {
            addTestsEvent(item, Arrays.asList(
                    "pm.test(\"Status code is 200 OK\", function () {",
                    "    pm.response.to.have.status(200);",
                    "});",
                    "pm.test(\"Response conforms to ApiResponse wrapper\", function () {",
                    "    var jsonData = pm.response.json();",
                    "    pm.expect(jsonData.success).to.be.true;",
                    "    pm.expect(jsonData.data).to.be.an(\"array\");",
                    "});",
                    "pm.test(\"Response time is acceptable (< 1000ms)\", function () {",
                    "    pm.expect(pm.response.responseTime).to.be.below(1000);",
                    "});"
            ));
        }

        ObjectNode request = item.putObject("request");
        request.put("method", "GET");

        ArrayNode headers = request.putArray("header");
        ObjectNode acceptH = headers.addObject();
        acceptH.put("key", "Accept");
        acceptH.put("value", "application/json");

        ObjectNode url = request.putObject("url");
        url.put("raw", "{{baseUrl}}/api/" + slug);
        ArrayNode host = url.putArray("host");
        host.add("{{baseUrl}}");
        ArrayNode path = url.putArray("path");
        path.add("api");
        path.add(slug);

        return item;
    }

    private ObjectNode buildGetByIdRequest(String className, String slug, boolean includeTests) {
        ObjectNode item = objectMapper.createObjectNode();
        item.put("name", "Obtener " + className + " por ID (GET by ID)");

        if (includeTests) {
            addTestsEvent(item, Arrays.asList(
                    "pm.test(\"Status code is 200 OK\", function () {",
                    "    pm.response.to.have.status(200);",
                    "});",
                    "pm.test(\"Entity data is returned correctly\", function () {",
                    "    var jsonData = pm.response.json();",
                    "    pm.expect(jsonData.success).to.be.true;",
                    "    pm.expect(jsonData.data).to.be.an(\"object\");",
                    "});"
            ));
        }

        ObjectNode request = item.putObject("request");
        request.put("method", "GET");

        ArrayNode headers = request.putArray("header");
        ObjectNode acceptH = headers.addObject();
        acceptH.put("key", "Accept");
        acceptH.put("value", "application/json");

        ObjectNode url = request.putObject("url");
        url.put("raw", "{{baseUrl}}/api/" + slug + "/{{last_created_" + slug + "_id}}");
        ArrayNode host = url.putArray("host");
        host.add("{{baseUrl}}");
        ArrayNode path = url.putArray("path");
        path.add("api");
        path.add(slug);
        path.add("{{last_created_" + slug + "_id}}");

        return item;
    }

    private ObjectNode buildPostCreateRequest(ClassNode node, String className, String slug, GeneratePostmanRequest req) {
        ObjectNode item = objectMapper.createObjectNode();
        item.put("name", "Crear " + className + " (POST Create)");

        if (req.isIncludeTests()) {
            addTestsEvent(item, Arrays.asList(
                    "pm.test(\"Status code is 200 or 201 Created\", function () {",
                    "    pm.expect(pm.response.code).to.be.oneOf([200, 201]);",
                    "});",
                    "pm.test(\"Record created with valid generated ID\", function () {",
                    "    var jsonData = pm.response.json();",
                    "    pm.expect(jsonData.success).to.be.true;",
                    "    var createdId = (jsonData.data && jsonData.data.id) ? jsonData.data.id : jsonData.id;",
                    "    if (createdId) {",
                    "        pm.collectionVariables.set(\"last_created_" + slug + "_id\", createdId);",
                    "        pm.environment.set(\"last_created_" + slug + "_id\", createdId);",
                    "    }",
                    "});"
            ));
        }

        ObjectNode request = item.putObject("request");
        request.put("method", "POST");

        ArrayNode headers = request.putArray("header");
        ObjectNode ct = headers.addObject();
        ct.put("key", "Content-Type");
        ct.put("value", "application/json");

        ObjectNode acceptH = headers.addObject();
        acceptH.put("key", "Accept");
        acceptH.put("value", "application/json");

        // Body
        ObjectNode body = request.putObject("body");
        body.put("mode", "raw");
        String payloadJson = buildMockPayload(node, false);
        body.put("raw", payloadJson);
        ObjectNode options = body.putObject("options");
        ObjectNode rawOpt = options.putObject("raw");
        rawOpt.put("language", "json");

        ObjectNode url = request.putObject("url");
        url.put("raw", "{{baseUrl}}/api/" + slug);
        ArrayNode host = url.putArray("host");
        host.add("{{baseUrl}}");
        ArrayNode path = url.putArray("path");
        path.add("api");
        path.add(slug);

        return item;
    }

    private ObjectNode buildPutUpdateRequest(ClassNode node, String className, String slug, GeneratePostmanRequest req) {
        ObjectNode item = objectMapper.createObjectNode();
        item.put("name", "Actualizar " + className + " (PUT Update)");

        if (req.isIncludeTests()) {
            addTestsEvent(item, Arrays.asList(
                    "pm.test(\"Status code is 200 OK\", function () {",
                    "    pm.response.to.have.status(200);",
                    "});",
                    "pm.test(\"Update confirmed and persisted\", function () {",
                    "    var jsonData = pm.response.json();",
                    "    pm.expect(jsonData.success).to.be.true;",
                    "});"
            ));
        }

        ObjectNode request = item.putObject("request");
        request.put("method", "PUT");

        ArrayNode headers = request.putArray("header");
        ObjectNode ct = headers.addObject();
        ct.put("key", "Content-Type");
        ct.put("value", "application/json");

        ObjectNode acceptH = headers.addObject();
        acceptH.put("key", "Accept");
        acceptH.put("value", "application/json");

        // Body
        ObjectNode body = request.putObject("body");
        body.put("mode", "raw");
        String payloadJson = buildMockPayload(node, true);
        body.put("raw", payloadJson);
        ObjectNode options = body.putObject("options");
        ObjectNode rawOpt = options.putObject("raw");
        rawOpt.put("language", "json");

        ObjectNode url = request.putObject("url");
        url.put("raw", "{{baseUrl}}/api/" + slug + "/{{last_created_" + slug + "_id}}");
        ArrayNode host = url.putArray("host");
        host.add("{{baseUrl}}");
        ArrayNode path = url.putArray("path");
        path.add("api");
        path.add(slug);
        path.add("{{last_created_" + slug + "_id}}");

        return item;
    }

    private ObjectNode buildDeleteRequest(String className, String slug, boolean includeTests) {
        ObjectNode item = objectMapper.createObjectNode();
        item.put("name", "Eliminar " + className + " por ID (DELETE by ID)");

        if (includeTests) {
            addTestsEvent(item, Arrays.asList(
                    "pm.test(\"Status code is 200 or 204 Deleted\", function () {",
                    "    pm.expect(pm.response.code).to.be.oneOf([200, 204]);",
                    "});",
                    "pm.test(\"Delete operation reported success\", function () {",
                    "    var jsonData = pm.response.json();",
                    "    pm.expect(jsonData.success).to.be.true;",
                    "});"
            ));
        }

        ObjectNode request = item.putObject("request");
        request.put("method", "DELETE");

        ArrayNode headers = request.putArray("header");
        ObjectNode acceptH = headers.addObject();
        acceptH.put("key", "Accept");
        acceptH.put("value", "application/json");

        ObjectNode url = request.putObject("url");
        url.put("raw", "{{baseUrl}}/api/" + slug + "/{{last_created_" + slug + "_id}}");
        ArrayNode host = url.putArray("host");
        host.add("{{baseUrl}}");
        ArrayNode path = url.putArray("path");
        path.add("api");
        path.add(slug);
        path.add("{{last_created_" + slug + "_id}}");

        return item;
    }

    private void addTestsEvent(ObjectNode item, List<String> scriptLines) {
        ArrayNode events = item.putArray("event");
        ObjectNode testEvent = events.addObject();
        testEvent.put("listen", "test");

        ObjectNode scriptObj = testEvent.putObject("script");
        scriptObj.put("type", "text/javascript");

        ArrayNode exec = scriptObj.putArray("exec");
        for (String line : scriptLines) {
            exec.add(line);
        }
    }

    /**
     * Builds intelligent, semantically representative mock JSON for create or update.
     */
    private String buildMockPayload(ClassNode node, boolean isUpdate) {
        Map<String, Object> map = new LinkedHashMap<>();

        if (node.getAttributes() != null) {
            for (Map<String, Object> rawAttr : node.getAttributes()) {
                String rawName = (String) rawAttr.getOrDefault("name", "campo");
                String aName = toCamelCase(rawName);

                boolean isPk = Boolean.TRUE.equals(rawAttr.get("isPrimaryKey"))
                        || Boolean.TRUE.equals(rawAttr.get("isId"))
                        || rawName.equalsIgnoreCase("id")
                        || aName.equalsIgnoreCase("id");

                // Primary key is managed in URL and omitted in RequestDto
                if (isPk) {
                    continue;
                }

                String rawType = (String) rawAttr.getOrDefault("type", "String");
                map.put(aName, generateMockValue(aName, rawType, isUpdate));
            }
        }

        // If class had only ID or 0 non-pk attributes, provide fallback demo attribute
        if (map.isEmpty()) {
            map.put("descripcion", isUpdate ? "Registro de prueba actualizado" : "Nuevo registro de prueba");
        }

        try {
            return objectMapper.writeValueAsString(map);
        } catch (Exception e) {
            return "{}";
        }
    }

    private Object generateMockValue(String fieldName, String rawType, boolean isUpdate) {
        String name = fieldName.toLowerCase(Locale.ROOT);
        String type = rawType != null ? rawType.trim().toLowerCase(Locale.ROOT) : "string";

        // 1. Strict Type-first matching to guarantee deserialization compatibility
        if (type.contains("localdatetime") || type.contains("timestamp")) {
            return isUpdate ? "2026-10-01T15:00:00Z" : "2026-09-12T10:30:00Z";
        }

        if (type.contains("localdate") || type.contains("date") || name.contains("fecha")) {
            return isUpdate ? "2026-10-01" : "2026-09-12";
        }

        if (type.contains("bigdecimal") || type.contains("double") || type.contains("float")
                || name.contains("precio") || name.contains("monto") || name.contains("total") || name.contains("saldo")
                || name.contains("nota") || name.contains("calificacion") || name.contains("promedio")) {
            return isUpdate ? 249.99 : 149.50;
        }

        if (type.contains("int") || type.contains("long") || type.contains("short")
                || name.contains("cantidad") || name.contains("stock") || name.contains("numero")
                || name.contains("edad") || name.contains("semestre") || name.contains("credito") || name.contains("cupo")) {
            return isUpdate ? 25 : 10;
        }

        if (type.contains("bool")) {
            return !isUpdate;
        }

        if (type.contains("uuid")) {
            return UUID.randomUUID().toString();
        }

        if (type.contains("byte") || type.contains("blob") || name.contains("foto") || name.contains("archivo") || name.contains("imagen")) {
            // Valid Base64 string for Jackson byte[] deserialization
            return isUpdate ? "dXBkYXRlZC1ieXRlcy1kYXRh" : "aW5pdGlhbC1ieXRlcy1kYXRh";
        }

        // 2. Semantic text/string matching
        if (name.contains("email") || name.contains("correo")) {
            return isUpdate ? "usuario.actualizado@ejemplo.com" : "usuario.nuevo@ejemplo.com";
        }
        if (name.contains("telefono") || name.contains("phone") || name.contains("celular")) {
            return isUpdate ? "+591 79998877" : "+591 71234567";
        }
        if (name.contains("nombre") || name.contains("name")) {
            return isUpdate ? "Carlos Andrés (Editado)" : "Carlos Andrés";
        }
        if (name.contains("apellido") || name.contains("lastname")) {
            return isUpdate ? "Gonzales López" : "Gonzales";
        }
        if (name.contains("direccion") || name.contains("address")) {
            return isUpdate ? "Av. Las Américas #789" : "Calle Principal #123";
        }
        if (name.equals("ci") || name.startsWith("ci_") || name.endsWith("_ci")
                || name.contains("cedula") || name.contains("dni") || name.contains("documento")
                || name.contains("identidad") || name.contains("passport") || name.contains("pasaporte")) {
            return "84729103";
        }
        if (name.contains("codigo") || name.contains("code") || name.contains("matricula")) {
            return isUpdate ? "COD-UPD-002" : "COD-NEW-001";
        }
        if (name.contains("sigla") || name.contains("siglas") || name.contains("acronym")) {
            return isUpdate ? "SIS-202" : "SIS-101";
        }
        if (name.contains("especialidad") || name.contains("specialty")) {
            return isUpdate ? "Ingeniería de Software y Sistemas Distribuidos" : "Ingeniería de Software";
        }
        if (name.contains("titulo") || name.contains("grado") || name.contains("title")) {
            return isUpdate ? "Licenciatura en Ingeniería de Sistemas" : "Ingeniero de Sistemas";
        }
        if (name.contains("periodo") || name.contains("gestion") || name.contains("semestre_academico")) {
            return isUpdate ? "2/2026" : "1/2026";
        }
        if (name.contains("estado") || name.contains("status")) {
            return isUpdate ? "ACTIVO" : "REGISTRADO";
        }

        return isUpdate ? "Valor modificado de " + fieldName : "Valor inicial de " + fieldName;
    }

    private void recordAudit(
            DiagramProject project,
            UUID userId,
            String ip,
            String userAgent,
            int folders,
            int requests,
            int tests,
            GeneratePostmanRequest request
    ) {
        Map<String, Object> details = new HashMap<>();
        details.put("projectName", project.getName());
        details.put("totalFolders", folders);
        details.put("totalRequests", requests);
        details.put("totalTests", tests);
        details.put("baseUrl", request.getBaseUrl());
        details.put("includeTests", request.isIncludeTests());
        details.put("generator", "PostmanCollectionV21Generator");

        auditLogService.recordAction(
                userId,
                "POSTMAN_COLLECTION_GENERATED",
                "diagram_projects",
                project.getId(),
                ip != null ? ip : "127.0.0.1",
                userAgent != null ? userAgent : "CASE-Tool-PostmanGenerator",
                details
        );
    }

    public static String sanitizeIdentifier(String raw) {
        if (raw == null || raw.isBlank()) return "Entidad";
        String clean = raw.replaceAll("[^a-zA-Z0-9_]", "");
        if (clean.isBlank()) return "Entidad";
        return Character.toUpperCase(clean.charAt(0)) + (clean.length() > 1 ? clean.substring(1) : "");
    }

    public static String toCamelCase(String str) {
        if (str == null || str.isBlank()) return "campo";
        String clean = str.replaceAll("[^a-zA-Z0-9_\\-\\s]", " ").trim();
        if (clean.isBlank()) return "campo";
        String[] tokens = clean.split("[_\\-\\s]+");
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < tokens.length; i++) {
            String token = tokens[i];
            if (token.isEmpty()) continue;
            if (sb.length() == 0) {
                sb.append(token.substring(0, 1).toLowerCase(Locale.ROOT));
                if (token.length() > 1) {
                    sb.append(token.substring(1));
                }
            } else {
                sb.append(token.substring(0, 1).toUpperCase(Locale.ROOT));
                if (token.length() > 1) {
                    sb.append(token.substring(1));
                }
            }
        }
        return sb.length() > 0 ? sb.toString() : "campo";
    }

    public static String toKebabCase(String str) {
        if (str == null || str.isBlank()) return "recurso";
        return str.replaceAll("([a-z])([A-Z]+)", "$1-$2")
                .replaceAll("[^a-zA-Z0-9-]", "-")
                .replaceAll("-+", "-")
                .toLowerCase(Locale.ROOT);
    }

    public static String pluralize(String singular) {
        if (singular == null || singular.isBlank()) return "items";
        String s = singular.toLowerCase(Locale.ROOT);
        if (s.endsWith("y")) return singular.substring(0, singular.length() - 1) + "ies";
        if (s.endsWith("s") || s.endsWith("x") || s.endsWith("z") || s.endsWith("ch") || s.endsWith("sh")) {
            return singular + "es";
        }
        return singular + "s";
    }
}
