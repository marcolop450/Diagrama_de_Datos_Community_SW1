package com.sw1.casetool.service;

import com.sw1.casetool.dto.*;
import com.sw1.casetool.exception.ResourceNotFoundException;
import com.sw1.casetool.model.ClassNode;
import com.sw1.casetool.model.DiagramProject;
import com.sw1.casetool.model.Relationship;
import com.sw1.casetool.model.UserProfile;
import com.sw1.casetool.model.DomainTemplate;
import com.sw1.casetool.repository.ClassNodeRepository;
import com.sw1.casetool.repository.DiagramHistoryRepository;
import com.sw1.casetool.repository.DiagramProjectRepository;
import com.sw1.casetool.repository.DomainTemplateRepository;
import com.sw1.casetool.repository.RelationshipRepository;
import com.sw1.casetool.repository.UserProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DiagramService {

    private final DiagramProjectRepository projectRepository;
    private final ClassNodeRepository classNodeRepository;
    private final RelationshipRepository relationshipRepository;
    private final UserProfileRepository userProfileRepository;
    private final AuditLogService auditLogService;
    private final DiagramHistoryService diagramHistoryService;
    private final DiagramHistoryRepository diagramHistoryRepository;
    private final DomainTemplateRepository domainTemplateRepository;

    @Transactional
    public ProjectResponse createProject(CreateProjectRequest request, String userEmail, String ip, String userAgent) {
        UserProfile user = resolveUser(userEmail);

        String version = (request.getVersion() != null && !request.getVersion().trim().isEmpty())
                ? request.getVersion().trim()
                : "v1.0.0";

        List<String> tags = request.getTags() != null ? new ArrayList<>(request.getTags()) : new ArrayList<>();

        DiagramProject project = DiagramProject.builder()
                .name(request.getName().trim())
                .description(request.getDescription())
                .version(version)
                .tags(tags)
                .ownerId(user.getId())
                .isDeleted(false)
                .metadata(request.getMetadata() != null ? request.getMetadata() : new HashMap<>())
                .build();

        DiagramProject saved = projectRepository.save(project);

        int nodeCount = 0;
        int relCount = 0;

        Map<String, Object> details = new HashMap<>();
        details.put("projectName", saved.getName());
        details.put("version", saved.getVersion());
        details.put("tags", saved.getTags());

        Map<String, Object> historyAfterState = new HashMap<>();
        historyAfterState.put("name", saved.getName());
        historyAfterState.put("version", saved.getVersion());
        historyAfterState.put("tags", saved.getTags());

        // CU07: Scaffolding de diagramas iniciales desde Plantilla Base
        String templateId = request.getTemplateId();
        if (templateId != null && !templateId.trim().isEmpty() && !"TEMPLATE_BLANK".equalsIgnoreCase(templateId.trim())) {
            Optional<DomainTemplate> optTemplate = domainTemplateRepository.findById(templateId.trim());
            if (optTemplate.isPresent()) {
                DomainTemplate template = optTemplate.get();
                Map<String, Object> schema = template.getInitialSchema();
                if (schema != null) {
                    Map<String, ClassNode> templateIdToNodeMap = new HashMap<>();

                    // 1. Scaffold ClassNodes
                    Object rawNodes = schema.get("nodes");
                    if (rawNodes instanceof List<?> nodeList) {
                        for (Object rawNode : nodeList) {
                            if (rawNode instanceof Map<?, ?> nodeMap) {
                                String tId = nodeMap.get("id") != null ? nodeMap.get("id").toString() : UUID.randomUUID().toString();
                                String name = nodeMap.get("name") != null ? nodeMap.get("name").toString() : "Clase";
                                String stereotype = nodeMap.get("stereotype") != null ? nodeMap.get("stereotype").toString() : null;
                                boolean isAbstract = Boolean.TRUE.equals(nodeMap.get("isAbstract"));

                                double posX = 100.0;
                                double posY = 100.0;
                                if (nodeMap.get("position") instanceof Map<?, ?> posMap) {
                                    if (posMap.get("x") instanceof Number numX) posX = numX.doubleValue();
                                    if (posMap.get("y") instanceof Number numY) posY = numY.doubleValue();
                                }

                                List<Map<String, Object>> attributes = new ArrayList<>();
                                if (nodeMap.get("attributes") instanceof List<?> attrList) {
                                    for (Object a : attrList) {
                                        if (a instanceof Map<?, ?> am) {
                                            Map<String, Object> attrClean = new HashMap<>();
                                            am.forEach((k, v) -> attrClean.put(k.toString(), v));
                                            attributes.add(attrClean);
                                        }
                                    }
                                }

                                List<Map<String, Object>> methods = new ArrayList<>();
                                if (nodeMap.get("methods") instanceof List<?> methList) {
                                    for (Object m : methList) {
                                        if (m instanceof Map<?, ?> mm) {
                                            Map<String, Object> methClean = new HashMap<>();
                                            mm.forEach((k, v) -> methClean.put(k.toString(), v));
                                            methods.add(methClean);
                                        }
                                    }
                                }

                                ClassNode classNode = ClassNode.builder()
                                        .project(saved)
                                        .name(name)
                                        .stereotype(stereotype)
                                        .abstractClass(isAbstract)
                                        .positionX(posX)
                                        .positionY(posY)
                                        .width(260.0)
                                        .height(180.0)
                                        .attributes(attributes)
                                        .methods(methods)
                                        .build();

                                ClassNode savedNode = classNodeRepository.save(classNode);
                                templateIdToNodeMap.put(tId, savedNode);
                                nodeCount++;
                            }
                        }
                    }

                    // 2. Scaffold Relationships
                    Object rawEdges = schema.get("edges");
                    if (rawEdges instanceof List<?> edgeList) {
                        for (Object rawEdge : edgeList) {
                            if (rawEdge instanceof Map<?, ?> edgeMap) {
                                String srcId = edgeMap.get("source") != null ? edgeMap.get("source").toString() : null;
                                String tgtId = edgeMap.get("target") != null ? edgeMap.get("target").toString() : null;

                                ClassNode srcNode = templateIdToNodeMap.get(srcId);
                                ClassNode tgtNode = templateIdToNodeMap.get(tgtId);

                                if (srcNode != null && tgtNode != null) {
                                    String type = edgeMap.get("type") != null ? edgeMap.get("type").toString() : "association";
                                    String srcCard = edgeMap.get("sourceCardinality") != null ? edgeMap.get("sourceCardinality").toString() : "1";
                                    String tgtCard = edgeMap.get("targetCardinality") != null ? edgeMap.get("targetCardinality").toString() : "1";
                                    String label = edgeMap.get("label") != null ? edgeMap.get("label").toString() : null;

                                    Relationship rel = Relationship.builder()
                                            .project(saved)
                                            .sourceClass(srcNode)
                                            .targetClass(tgtNode)
                                            .type(type)
                                            .sourceCardinality(srcCard)
                                            .targetCardinality(tgtCard)
                                            .label(label)
                                            .build();

                                    relationshipRepository.save(rel);
                                    relCount++;
                                }
                            }
                        }
                    }

                    details.put("templateId", template.getId());
                    details.put("templateName", template.getName());
                    details.put("nodesScaffolded", nodeCount);
                    details.put("relationshipsScaffolded", relCount);

                    historyAfterState.put("templateId", template.getId());
                    historyAfterState.put("templateName", template.getName());
                    historyAfterState.put("nodesScaffolded", nodeCount);
                    historyAfterState.put("relationshipsScaffolded", relCount);
                }
            }
        }

        String action = nodeCount > 0 ? "PROJECT_CREATED_FROM_TEMPLATE" : "PROJECT_CREATED";

        // Inmutable audit logging
        auditLogService.recordAction(
                user.getId(),
                action,
                "diagram_projects",
                saved.getId(),
                ip,
                userAgent,
                details
        );

        // Diagram history tracking (CU05)
        diagramHistoryService.recordHistory(
                saved,
                user.getId(),
                action,
                "PROJECT",
                saved.getId(),
                null,
                historyAfterState
        );

        return toProjectResponse(saved, nodeCount, relCount, user.getFullName());
    }

    @Transactional(readOnly = true)
    public List<ProjectResponse> getProjects(String userEmail, String search, String tag) {
        UserProfile user = resolveUser(userEmail);
        boolean isSuperAdmin = "SUPER_ADMIN".equalsIgnoreCase(user.getRole());

        List<DiagramProject> projects = isSuperAdmin
                ? projectRepository.findAllByIsDeletedFalseOrderByUpdatedAtDesc()
                : projectRepository.findByOwnerIdAndIsDeletedFalseOrderByUpdatedAtDesc(user.getId());

        // Cache user full names for response
        Map<UUID, String> userNames = new HashMap<>();
        userNames.put(user.getId(), user.getFullName());

        return projects.stream()
                .filter(p -> {
                    if (search == null || search.trim().isEmpty()) return true;
                    String q = search.trim().toLowerCase();
                    boolean matchName = p.getName() != null && p.getName().toLowerCase().contains(q);
                    boolean matchDesc = p.getDescription() != null && p.getDescription().toLowerCase().contains(q);
                    return matchName || matchDesc;
                })
                .filter(p -> {
                    if (tag == null || tag.trim().isEmpty() || tag.equalsIgnoreCase("ALL")) return true;
                    if (p.getTags() == null) return false;
                    return p.getTags().stream().anyMatch(t -> t.equalsIgnoreCase(tag.trim()));
                })
                .map(p -> {
                    long nodeCount = classNodeRepository.countByProjectId(p.getId());
                    long relCount = relationshipRepository.countByProjectId(p.getId());
                    String ownerName = userNames.computeIfAbsent(p.getOwnerId(), id ->
                            userProfileRepository.findById(id).map(UserProfile::getFullName).orElse("Desconocido")
                    );
                    return toProjectResponse(p, nodeCount, relCount, ownerName);
                })
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ProjectResponse getProjectResponse(UUID id) {
        DiagramProject project = projectRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Proyecto no encontrado o eliminado: " + id));

        long nodeCount = classNodeRepository.countByProjectId(project.getId());
        long relCount = relationshipRepository.countByProjectId(project.getId());
        String ownerName = userProfileRepository.findById(project.getOwnerId())
                .map(UserProfile::getFullName).orElse("Desconocido");

        return toProjectResponse(project, nodeCount, relCount, ownerName);
    }

    @Transactional(readOnly = true)
    public DiagramProject getProject(UUID id) {
        return projectRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Proyecto no encontrado con ID: " + id));
    }

    @Transactional
    public ProjectResponse updateProject(UUID id, UpdateProjectRequest request, String userEmail, String ip, String userAgent) {
        UserProfile user = resolveUser(userEmail);
        DiagramProject project = getProject(id);

        // Ownership validation (IDOR check)
        checkProjectOwnership(project, user);

        Map<String, Object> beforeState = new HashMap<>();
        beforeState.put("name", project.getName());
        beforeState.put("description", project.getDescription());
        beforeState.put("version", project.getVersion());
        beforeState.put("tags", project.getTags());

        project.setName(request.getName().trim());
        if (request.getDescription() != null) {
            project.setDescription(request.getDescription());
        }
        if (request.getVersion() != null && !request.getVersion().trim().isEmpty()) {
            project.setVersion(request.getVersion().trim());
        }
        if (request.getTags() != null) {
            project.setTags(new ArrayList<>(request.getTags()));
        }
        if (request.getMetadata() != null) {
            project.setMetadata(request.getMetadata());
        }

        DiagramProject saved = projectRepository.save(project);

        long nodeCount = classNodeRepository.countByProjectId(saved.getId());
        long relCount = relationshipRepository.countByProjectId(saved.getId());

        // Inmutable audit log
        Map<String, Object> details = new HashMap<>();
        details.put("projectName", saved.getName());
        details.put("version", saved.getVersion());
        details.put("tags", saved.getTags());

        auditLogService.recordAction(
                user.getId(),
                "PROJECT_UPDATED",
                "diagram_projects",
                saved.getId(),
                ip,
                userAgent,
                details
        );

        // Diagram history tracking (CU05)
        Map<String, Object> afterState = new HashMap<>();
        afterState.put("name", saved.getName());
        afterState.put("description", saved.getDescription());
        afterState.put("version", saved.getVersion());
        afterState.put("tags", saved.getTags());

        diagramHistoryService.recordHistory(
                saved,
                user.getId(),
                "PROJECT_UPDATED",
                "PROJECT",
                saved.getId(),
                beforeState,
                afterState
        );

        return toProjectResponse(saved, nodeCount, relCount, user.getFullName());
    }

    @Transactional
    public void deleteProject(UUID id, String userEmail, String ip, String userAgent) {
        UserProfile user = resolveUser(userEmail);
        DiagramProject project = getProject(id);

        // El Administrador solo puede supervisar y restaurar proyectos, mas no eliminarlos
        if ("SUPER_ADMIN".equalsIgnoreCase(user.getRole())) {
            throw new IllegalArgumentException("Operación denegada: El Administrador solo puede supervisar y restaurar proyectos, mas no eliminarlos.");
        }

        // Ownership validation (IDOR check)
        checkProjectOwnership(project, user);

        // Soft delete execution
        project.setIsDeleted(true);
        projectRepository.save(project);

        // Inmutable audit log
        Map<String, Object> details = new HashMap<>();
        details.put("deletedProjectName", project.getName());

        auditLogService.recordAction(
                user.getId(),
                "PROJECT_DELETED",
                "diagram_projects",
                project.getId(),
                ip,
                userAgent,
                details
        );

        // Diagram history tracking (CU05)
        diagramHistoryService.recordHistory(
                project,
                user.getId(),
                "PROJECT_DELETED",
                "PROJECT",
                project.getId(),
                Map.of("isDeleted", false),
                Map.of("isDeleted", true)
        );
    }

    /**
     * Clonación Profunda Atómica (CU03 - Deep Clone)
     * Re-vincula las relaciones hacia los nuevos IDs de nodos generados en la copia.
     */
    @Transactional(rollbackFor = Exception.class)
    public ProjectResponse cloneProject(UUID sourceProjectId, CloneProjectRequest request, String userEmail, String ip, String userAgent) {
        UserProfile user = resolveUser(userEmail);
        DiagramProject sourceProject = getProject(sourceProjectId);

        String cloneName = (request.getNewName() != null && !request.getNewName().trim().isEmpty())
                ? request.getNewName().trim()
                : sourceProject.getName() + " (Copia)";

        // 1. Clonar entidad DiagramProject
        DiagramProject clonedProject = DiagramProject.builder()
                .name(cloneName)
                .description(sourceProject.getDescription())
                .version(sourceProject.getVersion() != null ? sourceProject.getVersion() : "v1.0.0")
                .tags(sourceProject.getTags() != null ? new ArrayList<>(sourceProject.getTags()) : new ArrayList<>())
                .ownerId(user.getId())
                .isDeleted(false)
                .clonedFromId(sourceProject.getId())
                .metadata(sourceProject.getMetadata() != null ? new HashMap<>(sourceProject.getMetadata()) : new HashMap<>())
                .build();

        DiagramProject savedProject = projectRepository.save(clonedProject);

        // 2. Clonar ClassNodes y construir mapa de traducción de IDs
        List<ClassNode> sourceNodes = classNodeRepository.findByProjectId(sourceProjectId);
        Map<UUID, ClassNode> oldToNewNodeMap = new HashMap<>();

        for (ClassNode srcNode : sourceNodes) {
            ClassNode clonedNode = ClassNode.builder()
                    .project(savedProject)
                    .name(srcNode.getName())
                    .stereotype(srcNode.getStereotype())
                    .abstractClass(srcNode.isAbstractClass())
                    .positionX(srcNode.getPositionX())
                    .positionY(srcNode.getPositionY())
                    .width(srcNode.getWidth())
                    .height(srcNode.getHeight())
                    .attributes(srcNode.getAttributes() != null ? new ArrayList<>(srcNode.getAttributes()) : new ArrayList<>())
                    .methods(srcNode.getMethods() != null ? new ArrayList<>(srcNode.getMethods()) : new ArrayList<>())
                    .build();

            ClassNode savedNode = classNodeRepository.save(clonedNode);
            oldToNewNodeMap.put(srcNode.getId(), savedNode);
        }

        // 3. Clonar Relationships mapeando los nuevos nodos
        List<Relationship> sourceRels = relationshipRepository.findByProjectId(sourceProjectId);
        int clonedRelCount = 0;

        for (Relationship srcRel : sourceRels) {
            ClassNode newSource = oldToNewNodeMap.get(srcRel.getSourceClass().getId());
            ClassNode newTarget = oldToNewNodeMap.get(srcRel.getTargetClass().getId());

            if (newSource != null && newTarget != null) {
                Relationship clonedRel = Relationship.builder()
                        .project(savedProject)
                        .sourceClass(newSource)
                        .targetClass(newTarget)
                        .type(srcRel.getType())
                        .sourceCardinality(srcRel.getSourceCardinality())
                        .targetCardinality(srcRel.getTargetCardinality())
                        .label(srcRel.getLabel())
                        .sourceRole(srcRel.getSourceRole())
                        .targetRole(srcRel.getTargetRole())
                        .build();

                relationshipRepository.save(clonedRel);
                clonedRelCount++;
            }
        }

        // 4. Inmutable audit log
        Map<String, Object> details = new HashMap<>();
        details.put("sourceProjectId", sourceProject.getId());
        details.put("sourceProjectName", sourceProject.getName());
        details.put("clonedProjectId", savedProject.getId());
        details.put("clonedProjectName", savedProject.getName());
        details.put("nodesCloned", sourceNodes.size());
        details.put("relationshipsCloned", clonedRelCount);

        auditLogService.recordAction(
                user.getId(),
                "PROJECT_CLONED",
                "diagram_projects",
                savedProject.getId(),
                ip,
                userAgent,
                details
        );

        // Diagram history tracking (CU05)
        Map<String, Object> historyBeforeState = new HashMap<>();
        historyBeforeState.put("sourceProjectId", sourceProject.getId());
        historyBeforeState.put("sourceProjectName", sourceProject.getName());

        Map<String, Object> historyAfterState = new HashMap<>();
        historyAfterState.put("name", savedProject.getName());
        historyAfterState.put("nodesCloned", sourceNodes.size());
        historyAfterState.put("relationshipsCloned", clonedRelCount);

        diagramHistoryService.recordHistory(
                savedProject,
                user.getId(),
                "PROJECT_CLONED",
                "PROJECT",
                savedProject.getId(),
                historyBeforeState,
                historyAfterState
        );

        return toProjectResponse(savedProject, sourceNodes.size(), clonedRelCount, user.getFullName());
    }

    // --- Gestión de Papelera y Trazabilidad (CU05) ---

    @Transactional
    public ProjectResponse restoreProject(UUID id, String userEmail, String ip, String userAgent) {
        UserProfile user = resolveUser(userEmail);
        DiagramProject project = projectRepository.findByIdAndIsDeletedTrue(id)
                .orElseThrow(() -> new ResourceNotFoundException("Proyecto no encontrado en la papelera: " + id));

        // Ownership validation (IDOR check)
        checkProjectOwnership(project, user);

        project.setIsDeleted(false);
        DiagramProject restored = projectRepository.save(project);

        long nodeCount = classNodeRepository.countByProjectId(restored.getId());
        long relCount = relationshipRepository.countByProjectId(restored.getId());

        // Inmutable audit log
        Map<String, Object> details = new HashMap<>();
        details.put("restoredProjectName", restored.getName());

        auditLogService.recordAction(
                user.getId(),
                "PROJECT_RESTORED",
                "diagram_projects",
                restored.getId(),
                ip,
                userAgent,
                details
        );

        // Diagram history tracking (CU05)
        diagramHistoryService.recordHistory(
                restored,
                user.getId(),
                "PROJECT_RESTORED",
                "PROJECT",
                restored.getId(),
                Map.of("isDeleted", true),
                Map.of("isDeleted", false)
        );

        return toProjectResponse(restored, nodeCount, relCount, user.getFullName());
    }

    @Transactional(readOnly = true)
    public List<ProjectResponse> getTrashProjects(String userEmail) {
        UserProfile user = resolveUser(userEmail);
        boolean isSuperAdmin = "SUPER_ADMIN".equalsIgnoreCase(user.getRole());

        List<DiagramProject> projects = isSuperAdmin
                ? projectRepository.findAllByIsDeletedTrueOrderByUpdatedAtDesc()
                : projectRepository.findByOwnerIdAndIsDeletedTrueOrderByUpdatedAtDesc(user.getId());

        Map<UUID, String> userNames = new HashMap<>();
        userNames.put(user.getId(), user.getFullName());

        return projects.stream().map(p -> {
            long nodeCount = classNodeRepository.countByProjectId(p.getId());
            long relCount = relationshipRepository.countByProjectId(p.getId());
            String ownerName = userNames.computeIfAbsent(p.getOwnerId(), id ->
                    userProfileRepository.findById(id).map(UserProfile::getFullName).orElse("Desconocido")
            );
            return toProjectResponse(p, nodeCount, relCount, ownerName);
        }).collect(Collectors.toList());
    }

    @Transactional
    public void purgeProject(UUID id, String userEmail, String ip, String userAgent) {
        UserProfile user = resolveUser(userEmail);
        DiagramProject project = projectRepository.findByIdAndIsDeletedTrue(id)
                .orElseThrow(() -> new ResourceNotFoundException("Proyecto no encontrado en la papelera para purga: " + id));

        // El Administrador solo puede supervisar y restaurar proyectos, mas no eliminarlos definitivamente
        if ("SUPER_ADMIN".equalsIgnoreCase(user.getRole())) {
            throw new IllegalArgumentException("Operación denegada: El Administrador solo puede supervisar y restaurar proyectos, mas no eliminarlos definitivamente.");
        }

        // Solo el propietario del proyecto puede purgar definitivamente su proyecto
        if (!project.getOwnerId().equals(user.getId())) {
            throw new IllegalArgumentException("Operación denegada: Solo el propietario puede purgar definitivamente su proyecto.");
        }

        String projectName = project.getName();
        UUID projectId = project.getId();

        // 1. Eliminar relaciones dependientes
        relationshipRepository.deleteByProjectId(projectId);

        // 2. Eliminar nodos dependientes
        classNodeRepository.deleteByProjectId(projectId);

        // 3. Eliminar registros de historial del diagrama
        diagramHistoryRepository.deleteByProjectId(projectId);

        // 4. Eliminar físicamente el proyecto
        projectRepository.delete(project);

        // 5. Inmutable audit log (registro forense en audit_logs, inmutable)
        Map<String, Object> details = new HashMap<>();
        details.put("purgedProjectName", projectName);
        details.put("purgedProjectId", projectId);

        auditLogService.recordAction(
                user.getId(),
                "PROJECT_PURGED",
                "diagram_projects",
                projectId,
                ip,
                userAgent,
                details
        );
    }

    // --- Métodos de modelado (compatibilidad con lienzo CASE) ---

    @Transactional
    public ClassNode addClassNode(UUID projectId, ClassNodeRequest request) {
        DiagramProject project = getProject(projectId);
        ClassNode node = ClassNode.builder()
                .project(project)
                .name(request.getName())
                .stereotype(request.getStereotype())
                .abstractClass(request.isAbstractClass())
                .positionX(request.getPositionX())
                .positionY(request.getPositionY())
                .width(request.getWidth())
                .height(request.getHeight())
                .attributes(request.getAttributes())
                .methods(request.getMethods())
                .build();
        ClassNode saved = classNodeRepository.save(node);

        Map<String, Object> afterState = new HashMap<>();
        afterState.put("name", saved.getName());
        afterState.put("stereotype", saved.getStereotype());
        afterState.put("abstractClass", saved.isAbstractClass());
        afterState.put("attributesCount", saved.getAttributes() != null ? saved.getAttributes().size() : 0);
        afterState.put("methodsCount", saved.getMethods() != null ? saved.getMethods().size() : 0);

        diagramHistoryService.recordHistory(
                project,
                project.getOwnerId(),
                "NODE_CREATED",
                "CLASS_NODE",
                saved.getId(),
                null,
                afterState
        );

        return saved;
    }

    @Transactional
    public ClassNode updateClassNode(UUID projectId, UUID classId, ClassNodeRequest request) {
        ClassNode node = classNodeRepository.findById(classId)
                .filter(c -> c.getProject().getId().equals(projectId))
                .orElseThrow(() -> new ResourceNotFoundException("Class node not found in project"));

        Map<String, Object> beforeState = new HashMap<>();
        beforeState.put("name", node.getName());
        beforeState.put("stereotype", node.getStereotype());
        beforeState.put("abstractClass", node.isAbstractClass());
        beforeState.put("attributesCount", node.getAttributes() != null ? node.getAttributes().size() : 0);
        beforeState.put("methodsCount", node.getMethods() != null ? node.getMethods().size() : 0);

        node.setName(request.getName());
        node.setStereotype(request.getStereotype());
        node.setAbstractClass(request.isAbstractClass());
        node.setPositionX(request.getPositionX());
        node.setPositionY(request.getPositionY());
        node.setWidth(request.getWidth());
        node.setHeight(request.getHeight());
        node.setAttributes(request.getAttributes());
        node.setMethods(request.getMethods());

        ClassNode saved = classNodeRepository.save(node);

        Map<String, Object> afterState = new HashMap<>();
        afterState.put("name", saved.getName());
        afterState.put("stereotype", saved.getStereotype());
        afterState.put("abstractClass", saved.isAbstractClass());
        afterState.put("attributesCount", saved.getAttributes() != null ? saved.getAttributes().size() : 0);
        afterState.put("methodsCount", saved.getMethods() != null ? saved.getMethods().size() : 0);

        diagramHistoryService.recordHistory(
                node.getProject(),
                node.getProject().getOwnerId(),
                "NODE_UPDATED",
                "CLASS_NODE",
                saved.getId(),
                beforeState,
                afterState
        );

        return saved;
    }

    @Transactional
    public void deleteClassNode(UUID projectId, UUID classId) {
        ClassNode node = classNodeRepository.findById(classId)
                .filter(c -> c.getProject().getId().equals(projectId))
                .orElseThrow(() -> new ResourceNotFoundException("Class node not found in project"));

        Map<String, Object> beforeState = new HashMap<>();
        beforeState.put("name", node.getName());
        beforeState.put("stereotype", node.getStereotype());

        diagramHistoryService.recordHistory(
                node.getProject(),
                node.getProject().getOwnerId(),
                "NODE_DELETED",
                "CLASS_NODE",
                node.getId(),
                beforeState,
                null
        );

        classNodeRepository.delete(node);
    }

    @Transactional(readOnly = true)
    public List<ClassNode> getClassNodesByProject(UUID projectId) {
        return classNodeRepository.findByProjectId(projectId);
    }

    @Transactional
    public Relationship addRelationship(UUID projectId, RelationshipRequest request) {
        DiagramProject project = getProject(projectId);
        ClassNode source = classNodeRepository.findById(request.getSourceClassId())
                .orElseThrow(() -> new ResourceNotFoundException("Source class not found"));
        ClassNode target = classNodeRepository.findById(request.getTargetClassId())
                .orElseThrow(() -> new ResourceNotFoundException("Target class not found"));

        Relationship rel = Relationship.builder()
                .project(project)
                .sourceClass(source)
                .targetClass(target)
                .type(request.getType())
                .sourceCardinality(request.getSourceCardinality())
                .targetCardinality(request.getTargetCardinality())
                .label(request.getLabel())
                .sourceRole(request.getSourceRole())
                .targetRole(request.getTargetRole())
                .build();

        Relationship saved = relationshipRepository.save(rel);

        Map<String, Object> afterState = new HashMap<>();
        afterState.put("type", saved.getType());
        afterState.put("sourceClass", source.getName());
        afterState.put("targetClass", target.getName());
        afterState.put("sourceCardinality", saved.getSourceCardinality());
        afterState.put("targetCardinality", saved.getTargetCardinality());

        diagramHistoryService.recordHistory(
                project,
                project.getOwnerId(),
                "RELATIONSHIP_CREATED",
                "RELATIONSHIP",
                saved.getId(),
                null,
                afterState
        );

        return saved;
    }

    @Transactional
    public Relationship updateRelationship(UUID projectId, UUID relId, RelationshipRequest request) {
        Relationship rel = relationshipRepository.findById(relId)
                .filter(r -> r.getProject().getId().equals(projectId))
                .orElseThrow(() -> new ResourceNotFoundException("Relationship not found in project"));

        ClassNode source = classNodeRepository.findById(request.getSourceClassId())
                .orElseThrow(() -> new ResourceNotFoundException("Source class not found"));
        ClassNode target = classNodeRepository.findById(request.getTargetClassId())
                .orElseThrow(() -> new ResourceNotFoundException("Target class not found"));

        Map<String, Object> beforeState = new HashMap<>();
        beforeState.put("type", rel.getType());
        beforeState.put("sourceClass", rel.getSourceClass().getName());
        beforeState.put("targetClass", rel.getTargetClass().getName());
        beforeState.put("sourceCardinality", rel.getSourceCardinality());
        beforeState.put("targetCardinality", rel.getTargetCardinality());

        rel.setSourceClass(source);
        rel.setTargetClass(target);
        rel.setType(request.getType());
        rel.setSourceCardinality(request.getSourceCardinality());
        rel.setTargetCardinality(request.getTargetCardinality());
        rel.setLabel(request.getLabel());
        rel.setSourceRole(request.getSourceRole());
        rel.setTargetRole(request.getTargetRole());

        Relationship saved = relationshipRepository.save(rel);

        Map<String, Object> afterState = new HashMap<>();
        afterState.put("type", saved.getType());
        afterState.put("sourceClass", source.getName());
        afterState.put("targetClass", target.getName());
        afterState.put("sourceCardinality", saved.getSourceCardinality());
        afterState.put("targetCardinality", saved.getTargetCardinality());

        diagramHistoryService.recordHistory(
                rel.getProject(),
                rel.getProject().getOwnerId(),
                "RELATIONSHIP_UPDATED",
                "RELATIONSHIP",
                saved.getId(),
                beforeState,
                afterState
        );

        return saved;
    }

    @Transactional
    public void deleteRelationship(UUID projectId, UUID relId) {
        Relationship rel = relationshipRepository.findById(relId)
                .filter(r -> r.getProject().getId().equals(projectId))
                .orElseThrow(() -> new ResourceNotFoundException("Relationship not found in project"));

        Map<String, Object> beforeState = new HashMap<>();
        beforeState.put("type", rel.getType());
        beforeState.put("sourceClass", rel.getSourceClass().getName());
        beforeState.put("targetClass", rel.getTargetClass().getName());

        diagramHistoryService.recordHistory(
                rel.getProject(),
                rel.getProject().getOwnerId(),
                "RELATIONSHIP_DELETED",
                "RELATIONSHIP",
                rel.getId(),
                beforeState,
                null
        );

        relationshipRepository.delete(rel);
    }

    @Transactional(readOnly = true)
    public List<Relationship> getRelationshipsByProject(UUID projectId) {
        return relationshipRepository.findByProjectId(projectId);
    }

    @Transactional(readOnly = true)
    public FullDiagramResponse getFullDiagram(UUID projectId) {
        DiagramProject project = getProject(projectId);
        List<ClassNode> classes = getClassNodesByProject(projectId);
        List<Relationship> relationships = getRelationshipsByProject(projectId);

        return FullDiagramResponse.builder()
                .project(project)
                .classNodes(classes)
                .relationships(relationships)
                .build();
    }

    @Transactional
    public FullDiagramResponse syncFullDiagram(UUID projectId, SyncDiagramRequest request, String userEmail) {
        UserProfile user = resolveUser(userEmail);
        DiagramProject project = getProject(projectId);
        checkProjectOwnership(project, user);

        Map<String, ClassNode> idToNodeMap = new HashMap<>();

        // 1. Synchronize nodes
        List<ClassNode> existingNodes = classNodeRepository.findByProjectId(projectId);
        Map<String, ClassNode> existingNodeMap = existingNodes.stream()
                .collect(Collectors.toMap(n -> n.getId().toString(), n -> n));

        Set<UUID> keptNodeIds = new HashSet<>();

        if (request.getNodes() != null) {
            for (SyncDiagramRequest.SyncNodeItem item : request.getNodes()) {
                ClassNode node = null;
                if (item.getId() != null && existingNodeMap.containsKey(item.getId())) {
                    node = existingNodeMap.get(item.getId());
                } else {
                    node = ClassNode.builder()
                            .project(project)
                            .build();
                }

                node.setName(item.getName() != null && !item.getName().trim().isEmpty() ? item.getName().trim() : "Clase");
                node.setStereotype(item.getStereotype());
                node.setAbstractClass(item.isAbstract());
                node.setPositionX(item.getPositionX());
                node.setPositionY(item.getPositionY());
                node.setWidth(item.getWidth());
                node.setHeight(item.getHeight());
                node.setAttributes(item.getAttributes() != null ? item.getAttributes() : Collections.emptyList());
                node.setMethods(item.getMethods() != null ? item.getMethods() : Collections.emptyList());

                ClassNode savedNode = classNodeRepository.save(node);
                keptNodeIds.add(savedNode.getId());

                if (item.getId() != null) {
                    idToNodeMap.put(item.getId(), savedNode);
                }
                idToNodeMap.put(savedNode.getId().toString(), savedNode);
            }
        }

        // 2. Synchronize relationships
        List<Relationship> existingRels = relationshipRepository.findByProjectId(projectId);
        Map<String, Relationship> existingRelMap = existingRels.stream()
                .collect(Collectors.toMap(r -> r.getId().toString(), r -> r));

        Set<UUID> keptRelIds = new HashSet<>();

        if (request.getEdges() != null) {
            for (SyncDiagramRequest.SyncEdgeItem item : request.getEdges()) {
                ClassNode sourceNode = idToNodeMap.get(item.getSource());
                ClassNode targetNode = idToNodeMap.get(item.getTarget());

                if (sourceNode == null || targetNode == null) {
                    continue;
                }

                Relationship rel = null;
                if (item.getId() != null && existingRelMap.containsKey(item.getId())) {
                    rel = existingRelMap.get(item.getId());
                } else {
                    rel = Relationship.builder()
                            .project(project)
                            .build();
                }

                rel.setSourceClass(sourceNode);
                rel.setTargetClass(targetNode);
                rel.setType(item.getType() != null ? item.getType().toLowerCase() : "association");
                rel.setSourceCardinality(item.getSourceCardinality());
                rel.setTargetCardinality(item.getTargetCardinality());
                rel.setLabel(item.getLabel());
                rel.setSourceRole(item.getSourceRole());
                rel.setTargetRole(item.getTargetRole());

                Relationship savedRel = relationshipRepository.save(rel);
                keptRelIds.add(savedRel.getId());
            }
        }

        // 3. Remove deleted relationships first (cascade integrity)
        for (Relationship r : existingRels) {
            if (!keptRelIds.contains(r.getId())) {
                relationshipRepository.delete(r);
            }
        }

        // 4. Remove deleted nodes
        for (ClassNode n : existingNodes) {
            if (!keptNodeIds.contains(n.getId())) {
                classNodeRepository.delete(n);
            }
        }

        project.setUpdatedAt(Instant.now());
        projectRepository.save(project);

        List<ClassNode> finalClasses = classNodeRepository.findByProjectId(projectId);
        List<Relationship> finalRelationships = relationshipRepository.findByProjectId(projectId);

        return FullDiagramResponse.builder()
                .project(project)
                .classNodes(finalClasses)
                .relationships(finalRelationships)
                .build();
    }

    // --- Helpers de Seguridad y Mapeo ---

    private UserProfile resolveUser(String userIdentifier) {
        return userProfileRepository.findByEmailIgnoreCase(userIdentifier)
                .orElseGet(() -> userProfileRepository.findByUsernameIgnoreCase(userIdentifier)
                        .orElseThrow(() -> new IllegalArgumentException("Usuario no autenticado: " + userIdentifier)));
    }

    private void checkProjectOwnership(DiagramProject project, UserProfile user) {
        boolean isOwner = project.getOwnerId().equals(user.getId());
        boolean isSuperAdmin = "SUPER_ADMIN".equalsIgnoreCase(user.getRole());

        if (!isOwner && !isSuperAdmin) {
            throw new IllegalArgumentException("Operación denegada: No tienes privilegios para modificar o eliminar este proyecto.");
        }
    }

    private ProjectResponse toProjectResponse(DiagramProject p, long nodeCount, long relCount, String ownerName) {
        return ProjectResponse.builder()
                .id(p.getId())
                .name(p.getName())
                .description(p.getDescription())
                .version(p.getVersion())
                .tags(p.getTags())
                .isDeleted(Boolean.TRUE.equals(p.getIsDeleted()))
                .clonedFromId(p.getClonedFromId())
                .ownerId(p.getOwnerId())
                .ownerName(ownerName)
                .nodeCount(nodeCount)
                .relationshipCount(relCount)
                .metadata(p.getMetadata())
                .createdAt(p.getCreatedAt())
                .updatedAt(p.getUpdatedAt())
                .build();
    }
}
