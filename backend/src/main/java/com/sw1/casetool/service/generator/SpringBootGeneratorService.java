package com.sw1.casetool.service.generator;

import com.sw1.casetool.dto.generator.GenerateBackendRequest;
import com.sw1.casetool.dto.generator.GenerationPreviewResponse;
import com.sw1.casetool.model.ClassNode;
import com.sw1.casetool.model.DiagramProject;
import com.sw1.casetool.model.Relationship;
import com.sw1.casetool.model.UserProfile;
import com.sw1.casetool.repository.ClassNodeRepository;
import com.sw1.casetool.repository.DiagramProjectRepository;
import com.sw1.casetool.repository.RelationshipRepository;
import com.sw1.casetool.repository.UserProfileRepository;
import com.sw1.casetool.service.AuditLogService;
import freemarker.template.Configuration;
import freemarker.template.Template;
import freemarker.template.TemplateExceptionHandler;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.stream.Collectors;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Slf4j
@Service
@RequiredArgsConstructor
public class SpringBootGeneratorService {

    private final DiagramProjectRepository projectRepository;
    private final ClassNodeRepository classNodeRepository;
    private final RelationshipRepository relationshipRepository;
    private final UserProfileRepository userProfileRepository;
    private final AuditLogService auditLogService;

    private Configuration freemarkerConfig;

    private synchronized Configuration getFreemarkerConfig() {
        if (freemarkerConfig == null) {
            Configuration cfg = new Configuration(Configuration.VERSION_2_3_33);
            cfg.setClassLoaderForTemplateLoading(getClass().getClassLoader(), "templates/generator/spring");
            cfg.setDefaultEncoding("UTF-8");
            cfg.setTemplateExceptionHandler(TemplateExceptionHandler.RETHROW_HANDLER);
            cfg.setLogTemplateExceptions(false);
            cfg.setWrapUncheckedExceptions(true);
            this.freemarkerConfig = cfg;
        }
        return freemarkerConfig;
    }

    // Intermediate model representations for FreeMarker rendering
    @Data
    @Builder
    public static class TemplateAttribute {
        private String fieldName;
        private String capitalizedFieldName;
        private String columnName;
        private String type;
        private boolean primaryKey;
        private boolean nullable;
        private String visibility;
        @Builder.Default
        private boolean duplicateJoinColumn = false;
    }

    @Data
    @Builder
    public static class TemplateRelationship {
        private String relationKind; // MANY_TO_ONE, ONE_TO_MANY, ONE_TO_ONE, MANY_TO_MANY
        private String targetClassName;
        private String fieldName;
        private String joinColumnName;
        private String mappedBy;
        private String joinTableName;
        private String inverseJoinColumnName;
        private boolean owner;
        private boolean nullable;
    }

    @Data
    @Builder
    public static class TemplateClass {
        private String className;
        private String tableName;
        private String endpointSlug;
        private String idType;
        private boolean isAbstract;
        private List<TemplateAttribute> attributes;
        private List<TemplateRelationship> relationships;
    }

    /**
     * Generates a preview of the files and structure that would be generated.
     */
    @Transactional(readOnly = true)
    public GenerationPreviewResponse getGenerationPreview(UUID projectId, GenerateBackendRequest request) {
        DiagramProject project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("El proyecto con ID " + projectId + " no existe."));

        List<ClassNode> classes = classNodeRepository.findByProjectId(projectId);
        if (classes.isEmpty()) {
            throw new IllegalArgumentException("No es posible generar código para un modelo sin clases definidas (Regla E1).");
        }

        String basePackage = (request.getPackageName() != null && !request.getPackageName().isBlank())
                ? request.getPackageName().trim() : "com.sw1.generated";
        String packagePath = basePackage.replace('.', '/');

        List<String> fileTree = new ArrayList<>();
        fileTree.add("pom.xml");
        fileTree.add("README.md");
        fileTree.add("src/main/resources/application.yml");
        fileTree.add("src/main/java/" + packagePath + "/Application.java");
        fileTree.add("src/main/java/" + packagePath + "/dto/ApiResponse.java");
        fileTree.add("src/main/java/" + packagePath + "/exception/ResourceNotFoundException.java");
        fileTree.add("src/main/java/" + packagePath + "/exception/GlobalExceptionHandler.java");
        fileTree.add("src/main/java/" + packagePath + "/config/H2ConsoleConfig.java");
        fileTree.add("src/test/java/" + packagePath + "/ApplicationTests.java");

        for (ClassNode node : classes) {
            String cName = sanitizeIdentifier(node.getName());
            fileTree.add("src/main/java/" + packagePath + "/entity/" + cName + ".java");
            fileTree.add("src/main/java/" + packagePath + "/repository/" + cName + "Repository.java");
            fileTree.add("src/main/java/" + packagePath + "/service/" + cName + "Service.java");
            fileTree.add("src/main/java/" + packagePath + "/service/impl/" + cName + "ServiceImpl.java");
            fileTree.add("src/main/java/" + packagePath + "/controller/" + cName + "Controller.java");
            fileTree.add("src/main/java/" + packagePath + "/dto/" + cName + "RequestDto.java");
            fileTree.add("src/main/java/" + packagePath + "/dto/" + cName + "ResponseDto.java");
        }

        if (request.isIncludeMavenWrapper()) {
            fileTree.add("mvnw");
            fileTree.add("mvnw.cmd");
            fileTree.add(".mvn/wrapper/maven-wrapper.properties");
        }

        return GenerationPreviewResponse.builder()
                .projectName(project.getName())
                .packageName(basePackage)
                .totalClasses(classes.size())
                .totalFiles(fileTree.size())
                .fileTree(fileTree)
                .build();
    }

    /**
     * Generates the entire Spring Boot backend project and streams it as a ZIP file.
     */
    @Transactional(readOnly = true)
    public byte[] generateSpringBootZip(
            UUID projectId,
            GenerateBackendRequest request,
            String userEmail,
            String ip,
            String userAgent
    ) {
        DiagramProject project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("El proyecto con ID " + projectId + " no existe."));

        List<ClassNode> classes = classNodeRepository.findByProjectId(projectId);
        if (classes.isEmpty()) {
            throw new IllegalArgumentException("No es posible generar código para un modelo sin clases definidas (Regla E1).");
        }

        List<Relationship> relationships = relationshipRepository.findByProjectId(projectId);

        String basePackage = (request.getPackageName() != null && !request.getPackageName().isBlank())
                ? request.getPackageName().trim() : "com.sw1.generated";
        String groupId = (request.getGroupId() != null && !request.getGroupId().isBlank())
                ? request.getGroupId().trim() : "com.sw1";
        String artifactId = (request.getArtifactId() != null && !request.getArtifactId().isBlank())
                ? toKebabCase(request.getArtifactId().trim()) : toKebabCase(project.getName());
        if (artifactId.isBlank()) artifactId = "backend-service";

        String javaVersion = (request.getJavaVersion() != null && !request.getJavaVersion().isBlank())
                ? request.getJavaVersion().trim() : "21";

        String packagePath = basePackage.replace('.', '/');

        // Transform Class Nodes into Template Classes
        List<TemplateClass> templateClasses = buildTemplateClasses(classes, relationships);

        // Root project folder inside ZIP
        String rootDir = artifactId + "/";

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(baos, StandardCharsets.UTF_8)) {

            // Global Model for templates
            Map<String, Object> rootModel = new HashMap<>();
            rootModel.put("projectName", project.getName());
            rootModel.put("groupId", groupId);
            rootModel.put("artifactId", artifactId);
            rootModel.put("basePackage", basePackage);
            rootModel.put("basePackagePath", packagePath);
            rootModel.put("javaVersion", javaVersion);
            rootModel.put("databaseType", request.getDatabaseType() != null ? request.getDatabaseType() : "h2_postgres");
            rootModel.put("includeSwagger", request.isIncludeSwagger());
            rootModel.put("classes", templateClasses);

            // 1. pom.xml
            writeZipEntry(zos, rootDir + "pom.xml", processTemplate("pom_xml.ftl", rootModel));

            // 2. README.md
            writeZipEntry(zos, rootDir + "README.md", processTemplate("readme_md.ftl", rootModel));

            // 3. application.yml
            writeZipEntry(zos, rootDir + "src/main/resources/application.yml", processTemplate("application_yml.ftl", rootModel));

            // 4. Application.java
            writeZipEntry(zos, rootDir + "src/main/java/" + packagePath + "/Application.java", processTemplate("application_java.ftl", rootModel));

            // 5. Common Infrastructure: ApiResponse, Exceptions
            writeZipEntry(zos, rootDir + "src/main/java/" + packagePath + "/dto/ApiResponse.java", processTemplate("api_response.ftl", rootModel));
            writeZipEntry(zos, rootDir + "src/main/java/" + packagePath + "/exception/ResourceNotFoundException.java", processTemplate("resource_not_found_exception.ftl", rootModel));
            writeZipEntry(zos, rootDir + "src/main/java/" + packagePath + "/exception/GlobalExceptionHandler.java", processTemplate("global_exception_handler.ftl", rootModel));
            writeZipEntry(zos, rootDir + "src/main/java/" + packagePath + "/config/H2ConsoleConfig.java", processTemplate("h2_console_config.ftl", rootModel));

            // 6. ApplicationTests.java
            writeZipEntry(zos, rootDir + "src/test/java/" + packagePath + "/ApplicationTests.java", processTemplate("application_test_java.ftl", rootModel));

            // 7. Per-Class Scaffolding in 4 Layers
            for (TemplateClass tc : templateClasses) {
                Map<String, Object> classModel = new HashMap<>(rootModel);
                classModel.put("className", tc.getClassName());
                classModel.put("tableName", tc.getTableName());
                classModel.put("endpointSlug", tc.getEndpointSlug());
                classModel.put("idType", tc.getIdType());
                classModel.put("isAbstract", tc.isAbstract());
                classModel.put("attributes", tc.getAttributes());
                classModel.put("relationships", tc.getRelationships());

                // Entity
                writeZipEntry(zos, rootDir + "src/main/java/" + packagePath + "/entity/" + tc.getClassName() + ".java",
                        processTemplate("entity.ftl", classModel));

                // Repository
                writeZipEntry(zos, rootDir + "src/main/java/" + packagePath + "/repository/" + tc.getClassName() + "Repository.java",
                        processTemplate("repository.ftl", classModel));

                // Service Interface
                writeZipEntry(zos, rootDir + "src/main/java/" + packagePath + "/service/" + tc.getClassName() + "Service.java",
                        processTemplate("service_interface.ftl", classModel));

                // Service Implementation
                writeZipEntry(zos, rootDir + "src/main/java/" + packagePath + "/service/impl/" + tc.getClassName() + "ServiceImpl.java",
                        processTemplate("service_impl.ftl", classModel));

                // Controller
                writeZipEntry(zos, rootDir + "src/main/java/" + packagePath + "/controller/" + tc.getClassName() + "Controller.java",
                        processTemplate("controller.ftl", classModel));

                // DTOs
                writeZipEntry(zos, rootDir + "src/main/java/" + packagePath + "/dto/" + tc.getClassName() + "RequestDto.java",
                        processTemplate("request_dto.ftl", classModel));
                writeZipEntry(zos, rootDir + "src/main/java/" + packagePath + "/dto/" + tc.getClassName() + "ResponseDto.java",
                        processTemplate("response_dto.ftl", classModel));
            }

            // 8. Maven Wrapper Inclusion
            if (request.isIncludeMavenWrapper()) {
                includeMavenWrapperFiles(zos, rootDir);
            }

            zos.finish();
        } catch (Exception e) {
            log.error("Error al generar proyecto Spring Boot en ZIP: {}", e.getMessage(), e);
            throw new RuntimeException("Error interno al empaquetar el proyecto Spring Boot: " + e.getMessage(), e);
        }

        // 9. Inmutable Audit Log
        UserProfile user = (userEmail != null && !userEmail.isBlank())
                ? userProfileRepository.findByEmail(userEmail).orElse(null) : null;
        recordAudit(project, user != null ? user.getId() : null, ip, userAgent, classes.size(), relationships.size());

        return baos.toByteArray();
    }

    private List<TemplateClass> buildTemplateClasses(List<ClassNode> classes, List<Relationship> relationships) {
        Map<UUID, TemplateClass> classMap = new HashMap<>();

        for (ClassNode node : classes) {
            String cName = sanitizeIdentifier(node.getName());
            String tName = toSnakeCase(cName);
            String slug = toKebabCase(pluralize(cName));

            List<TemplateAttribute> attrs = new ArrayList<>();
            String detectedIdType = "Long";

            if (node.getAttributes() != null) {
                for (Map<String, Object> rawAttr : node.getAttributes()) {
                    String rawName = (String) rawAttr.getOrDefault("name", "campo");
                    String aName = toCamelCase(rawName);
                    String sqlCol = toSnakeCase(rawName);
                    String rawType = (String) rawAttr.getOrDefault("type", "String");
                    String javaType = mapToJavaType(rawType);

                    boolean isPk = Boolean.TRUE.equals(rawAttr.get("isPrimaryKey"))
                            || Boolean.TRUE.equals(rawAttr.get("isId"))
                            || rawName.equalsIgnoreCase("id")
                            || aName.equalsIgnoreCase("id");

                    boolean isNotNull = Boolean.TRUE.equals(rawAttr.get("isNotNull"))
                            || !Boolean.TRUE.equals(rawAttr.get("isNullable"))
                            || isPk;

                    if (isPk) {
                        detectedIdType = javaType;
                    }

                    attrs.add(TemplateAttribute.builder()
                            .fieldName(aName)
                            .capitalizedFieldName(capitalize(aName))
                            .columnName(sqlCol)
                            .type(javaType)
                            .primaryKey(isPk)
                            .nullable(!isNotNull)
                            .visibility((String) rawAttr.getOrDefault("visibility", "private"))
                            .build());
                }
            }

            // If class has no primary key, synthesize default id: Long {PK} (1NF Defense)
            boolean hasPk = attrs.stream().anyMatch(TemplateAttribute::isPrimaryKey);
            if (!hasPk) {
                attrs.add(0, TemplateAttribute.builder()
                        .fieldName("id")
                        .capitalizedFieldName("Id")
                        .columnName("id")
                        .type("Long")
                        .primaryKey(true)
                        .nullable(false)
                        .visibility("private")
                        .build());
                detectedIdType = "Long";
            }

            TemplateClass tc = TemplateClass.builder()
                    .className(cName)
                    .tableName(tName)
                    .endpointSlug(slug)
                    .idType(detectedIdType)
                    .isAbstract(node.isAbstractClass())
                    .attributes(attrs)
                    .relationships(new ArrayList<>())
                    .build();

            classMap.put(node.getId(), tc);
        }

        // Process Relationships into JPA annotations
        if (relationships != null) {
            for (Relationship rel : relationships) {
                if (rel.getSourceClass() == null || rel.getTargetClass() == null) continue;
                TemplateClass src = classMap.get(rel.getSourceClass().getId());
                TemplateClass tgt = classMap.get(rel.getTargetClass().getId());
                if (src == null || tgt == null) continue;

                String relType = rel.getType() != null ? rel.getType().toLowerCase(Locale.ROOT) : "association";
                String srcCard = rel.getSourceCardinality() != null ? rel.getSourceCardinality().trim() : "1";
                String tgtCard = rel.getTargetCardinality() != null ? rel.getTargetCardinality().trim() : "1";

                boolean isSelf = src == tgt;

                if (isSelf) {
                    // Recursive self-association
                    src.getRelationships().add(TemplateRelationship.builder()
                            .relationKind("MANY_TO_ONE")
                            .targetClassName(src.getClassName())
                            .fieldName(sanitizeFieldName(rel.getTargetRole() != null && !rel.getTargetRole().isBlank() ? rel.getTargetRole() : "padre"))
                            .joinColumnName(toSnakeCase(src.getClassName()) + "_padre_id")
                            .nullable(true)
                            .build());

                    src.getRelationships().add(TemplateRelationship.builder()
                            .relationKind("ONE_TO_MANY")
                            .targetClassName(src.getClassName())
                            .fieldName(sanitizeFieldName(rel.getSourceRole() != null && !rel.getSourceRole().isBlank() ? rel.getSourceRole() : "subordinados"))
                            .mappedBy(sanitizeFieldName(rel.getTargetRole() != null && !rel.getTargetRole().isBlank() ? rel.getTargetRole() : "padre"))
                            .build());
                    continue;
                }

                if (isMany(tgtCard) && !isMany(srcCard)) {
                    // 1 to N: Source has 1, Target has Many
                    // Target has @ManyToOne -> Source
                    tgt.getRelationships().add(TemplateRelationship.builder()
                            .relationKind("MANY_TO_ONE")
                            .targetClassName(src.getClassName())
                            .fieldName(toCamelCase(src.getClassName()))
                            .joinColumnName(toSnakeCase(src.getClassName()) + "_id")
                            .nullable(!srcCard.equals("1"))
                            .build());

                    // Source has @OneToMany -> Target
                    src.getRelationships().add(TemplateRelationship.builder()
                            .relationKind("ONE_TO_MANY")
                            .targetClassName(tgt.getClassName())
                            .fieldName(toCamelCase(pluralize(tgt.getClassName())))
                            .mappedBy(toCamelCase(src.getClassName()))
                            .build());

                } else if (isMany(srcCard) && !isMany(tgtCard)) {
                    // N to 1: Source has Many, Target has 1
                    // Source has @ManyToOne -> Target
                    src.getRelationships().add(TemplateRelationship.builder()
                            .relationKind("MANY_TO_ONE")
                            .targetClassName(tgt.getClassName())
                            .fieldName(toCamelCase(tgt.getClassName()))
                            .joinColumnName(toSnakeCase(tgt.getClassName()) + "_id")
                            .nullable(!tgtCard.equals("1"))
                            .build());

                    // Target has @OneToMany -> Source
                    tgt.getRelationships().add(TemplateRelationship.builder()
                            .relationKind("ONE_TO_MANY")
                            .targetClassName(src.getClassName())
                            .fieldName(toCamelCase(pluralize(src.getClassName())))
                            .mappedBy(toCamelCase(tgt.getClassName()))
                            .build());

                } else if (isMany(srcCard) && isMany(tgtCard)) {
                    // N to N: ManyToMany
                    String joinTable = toSnakeCase(src.getClassName()) + "_" + toSnakeCase(tgt.getClassName());
                    src.getRelationships().add(TemplateRelationship.builder()
                            .relationKind("MANY_TO_MANY")
                            .targetClassName(tgt.getClassName())
                            .fieldName(toCamelCase(pluralize(tgt.getClassName())))
                            .joinTableName(joinTable)
                            .joinColumnName(toSnakeCase(src.getClassName()) + "_id")
                            .inverseJoinColumnName(toSnakeCase(tgt.getClassName()) + "_id")
                            .owner(true)
                            .build());

                    tgt.getRelationships().add(TemplateRelationship.builder()
                            .relationKind("MANY_TO_MANY")
                            .targetClassName(src.getClassName())
                            .fieldName(toCamelCase(pluralize(src.getClassName())))
                            .mappedBy(toCamelCase(pluralize(tgt.getClassName())))
                            .owner(false)
                            .build());
                } else {
                    // 1 to 1: OneToOne
                    src.getRelationships().add(TemplateRelationship.builder()
                            .relationKind("ONE_TO_ONE")
                            .targetClassName(tgt.getClassName())
                            .fieldName(toCamelCase(tgt.getClassName()))
                            .joinColumnName(toSnakeCase(tgt.getClassName()) + "_id")
                            .owner(true)
                            .build());

                    tgt.getRelationships().add(TemplateRelationship.builder()
                            .relationKind("ONE_TO_ONE")
                            .targetClassName(src.getClassName())
                            .fieldName(toCamelCase(src.getClassName()))
                            .mappedBy(toCamelCase(tgt.getClassName()))
                            .owner(false)
                            .build());
                }
            }
        }

        // Detect repeated column mappings between attributes and relationships to prevent JPA conflicts
        for (TemplateClass tc : classMap.values()) {
            Set<String> joinCols = tc.getRelationships().stream()
                    .filter(r -> "MANY_TO_ONE".equals(r.getRelationKind()) || ("ONE_TO_ONE".equals(r.getRelationKind()) && r.isOwner()))
                    .map(TemplateRelationship::getJoinColumnName)
                    .filter(Objects::nonNull)
                    .map(s -> s.toLowerCase(Locale.ROOT))
                    .collect(Collectors.toSet());

            for (TemplateAttribute attr : tc.getAttributes()) {
                if (attr.getColumnName() != null && joinCols.contains(attr.getColumnName().toLowerCase(Locale.ROOT))) {
                    attr.setDuplicateJoinColumn(true);
                }
            }
        }

        return new ArrayList<>(classMap.values());
    }

    private boolean isMany(String card) {
        return card != null && (card.contains("*") || card.contains("n") || card.contains("N") || card.equals("1..*") || card.equals("0..*"));
    }

    private String processTemplate(String templateName, Map<String, Object> model) {
        try {
            Template template = getFreemarkerConfig().getTemplate(templateName);
            StringWriter writer = new StringWriter();
            template.process(model, writer);
            return writer.toString();
        } catch (Exception e) {
            log.error("Error al procesar plantilla FreeMarker '{}': {}", templateName, e.getMessage(), e);
            throw new RuntimeException("Error en plantilla FreeMarker '" + templateName + "': " + e.getMessage(), e);
        }
    }

    private void writeZipEntry(ZipOutputStream zos, String entryPath, String content) throws IOException {
        ZipEntry entry = new ZipEntry(entryPath);
        zos.putNextEntry(entry);
        byte[] data = content.getBytes(StandardCharsets.UTF_8);
        zos.write(data, 0, data.length);
        zos.closeEntry();
    }

    private void includeMavenWrapperFiles(ZipOutputStream zos, String rootDir) {
        try {
            Path currentDir = Paths.get("").toAbsolutePath();
            Path mvnwSh = currentDir.resolve("mvnw");
            Path mvnwCmd = currentDir.resolve("mvnw.cmd");

            // If current dir is root or backend, locate them
            if (!Files.exists(mvnwSh)) {
                mvnwSh = currentDir.resolve("backend/mvnw");
                mvnwCmd = currentDir.resolve("backend/mvnw.cmd");
            }

            if (Files.exists(mvnwSh)) {
                writeZipBinaryEntry(zos, rootDir + "mvnw", Files.readAllBytes(mvnwSh));
            }
            if (Files.exists(mvnwCmd)) {
                writeZipBinaryEntry(zos, rootDir + "mvnw.cmd", Files.readAllBytes(mvnwCmd));
            }

            // Garantizar siempre que maven-wrapper.properties apunte a la versión oficial válida 3.9.9 de Apache
            String wrapperPropsContent = "wrapperVersion=3.3.4\n" +
                    "distributionType=only-script\n" +
                    "distributionUrl=https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/3.9.9/apache-maven-3.9.9-bin.zip\n";
            writeZipBinaryEntry(zos, rootDir + ".mvn/wrapper/maven-wrapper.properties",
                    wrapperPropsContent.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            log.warn("No se pudieron incluir los binarios del Maven Wrapper en el ZIP: {}", e.getMessage());
        }
    }

    private void writeZipBinaryEntry(ZipOutputStream zos, String entryPath, byte[] data) throws IOException {
        ZipEntry entry = new ZipEntry(entryPath);
        zos.putNextEntry(entry);
        zos.write(data, 0, data.length);
        zos.closeEntry();
    }

    private void recordAudit(DiagramProject project, UUID userId, String ip, String userAgent, int classCount, int relCount) {
        Map<String, Object> details = new HashMap<>();
        details.put("projectName", project.getName());
        details.put("classesGenerated", classCount);
        details.put("relationshipsGenerated", relCount);
        details.put("version", project.getVersion());
        details.put("generator", "SpringBoot4LayersGenerator");

        auditLogService.recordAction(
                userId,
                "BACKEND_GENERATED",
                "diagram_projects",
                project.getId(),
                ip != null ? ip : "127.0.0.1",
                userAgent != null ? userAgent : "CASE-Tool-CodeGenerator",
                details
        );
    }

    // String Utilities for Java & SQL naming conventions
    public static String sanitizeIdentifier(String raw) {
        if (raw == null || raw.isBlank()) return "Entidad";
        String clean = raw.replaceAll("[^a-zA-Z0-9_]", "");
        if (clean.isBlank()) return "Entidad";
        return Character.toUpperCase(clean.charAt(0)) + (clean.length() > 1 ? clean.substring(1) : "");
    }

    public static String sanitizeFieldName(String raw) {
        if (raw == null || raw.isBlank()) return "campo";
        String clean = raw.replaceAll("[^a-zA-Z0-9_]", "");
        if (clean.isBlank()) return "campo";
        return Character.toLowerCase(clean.charAt(0)) + (clean.length() > 1 ? clean.substring(1) : "");
    }

    public static String capitalize(String str) {
        if (str == null || str.isBlank()) return "";
        return Character.toUpperCase(str.charAt(0)) + (str.length() > 1 ? str.substring(1) : "");
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

    public static String toSnakeCase(String str) {
        if (str == null || str.isBlank()) return "tabla";
        return str.replaceAll("([a-z])([A-Z]+)", "$1_$2")
                .replaceAll("[^a-zA-Z0-9_]", "_")
                .replaceAll("_+", "_")
                .replaceAll("^_|_$", "")
                .toLowerCase(Locale.ROOT);
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

    public static String mapToJavaType(String raw) {
        if (raw == null || raw.isBlank()) return "String";
        String clean = raw.trim();
        if (clean.equalsIgnoreCase("int") || clean.equalsIgnoreCase("Integer")) return "Integer";
        if (clean.equalsIgnoreCase("Long")) return "Long";
        if (clean.equalsIgnoreCase("Double")) return "Double";
        if (clean.equalsIgnoreCase("BigDecimal") || clean.equalsIgnoreCase("decimal") || clean.equalsIgnoreCase("numeric")) return "BigDecimal";
        if (clean.equalsIgnoreCase("Boolean") || clean.equalsIgnoreCase("bool")) return "Boolean";
        if (clean.equalsIgnoreCase("LocalDate") || clean.equalsIgnoreCase("Date")) return "LocalDate";
        if (clean.equalsIgnoreCase("LocalDateTime") || clean.equalsIgnoreCase("Timestamp") || clean.equalsIgnoreCase("DateTime")) return "LocalDateTime";
        if (clean.equalsIgnoreCase("UUID")) return "UUID";
        if (clean.equalsIgnoreCase("byte[]") || clean.equalsIgnoreCase("bytearray") || clean.equalsIgnoreCase("blob")) return "byte[]";
        return "String"; // Default E1
    }
}
