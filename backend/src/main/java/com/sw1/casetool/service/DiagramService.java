package com.sw1.casetool.service;

import com.sw1.casetool.dto.*;
import com.sw1.casetool.exception.ResourceNotFoundException;
import com.sw1.casetool.model.ClassNode;
import com.sw1.casetool.model.DiagramProject;
import com.sw1.casetool.model.Relationship;
import com.sw1.casetool.model.UserProfile;
import com.sw1.casetool.repository.ClassNodeRepository;
import com.sw1.casetool.repository.DiagramProjectRepository;
import com.sw1.casetool.repository.RelationshipRepository;
import com.sw1.casetool.repository.UserProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

        // Inmutable audit logging
        Map<String, Object> details = new HashMap<>();
        details.put("projectName", saved.getName());
        details.put("version", saved.getVersion());
        details.put("tags", saved.getTags());

        auditLogService.recordAction(
                user.getId(),
                "PROJECT_CREATED",
                "diagram_projects",
                saved.getId(),
                ip,
                userAgent,
                details
        );

        return toProjectResponse(saved, 0, 0, user.getFullName());
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

        return toProjectResponse(saved, nodeCount, relCount, user.getFullName());
    }

    @Transactional
    public void deleteProject(UUID id, String userEmail, String ip, String userAgent) {
        UserProfile user = resolveUser(userEmail);
        DiagramProject project = getProject(id);

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

        return toProjectResponse(savedProject, sourceNodes.size(), clonedRelCount, user.getFullName());
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
        return classNodeRepository.save(node);
    }

    @Transactional
    public ClassNode updateClassNode(UUID projectId, UUID classId, ClassNodeRequest request) {
        ClassNode node = classNodeRepository.findById(classId)
                .filter(c -> c.getProject().getId().equals(projectId))
                .orElseThrow(() -> new ResourceNotFoundException("Class node not found in project"));

        node.setName(request.getName());
        node.setStereotype(request.getStereotype());
        node.setAbstractClass(request.isAbstractClass());
        node.setPositionX(request.getPositionX());
        node.setPositionY(request.getPositionY());
        node.setWidth(request.getWidth());
        node.setHeight(request.getHeight());
        node.setAttributes(request.getAttributes());
        node.setMethods(request.getMethods());

        return classNodeRepository.save(node);
    }

    @Transactional
    public void deleteClassNode(UUID projectId, UUID classId) {
        ClassNode node = classNodeRepository.findById(classId)
                .filter(c -> c.getProject().getId().equals(projectId))
                .orElseThrow(() -> new ResourceNotFoundException("Class node not found in project"));
        classNodeRepository.delete(node);
    }

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

        return relationshipRepository.save(rel);
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

        rel.setSourceClass(source);
        rel.setTargetClass(target);
        rel.setType(request.getType());
        rel.setSourceCardinality(request.getSourceCardinality());
        rel.setTargetCardinality(request.getTargetCardinality());
        rel.setLabel(request.getLabel());
        rel.setSourceRole(request.getSourceRole());
        rel.setTargetRole(request.getTargetRole());

        return relationshipRepository.save(rel);
    }

    @Transactional
    public void deleteRelationship(UUID projectId, UUID relId) {
        Relationship rel = relationshipRepository.findById(relId)
                .filter(r -> r.getProject().getId().equals(projectId))
                .orElseThrow(() -> new ResourceNotFoundException("Relationship not found in project"));
        relationshipRepository.delete(rel);
    }

    public List<Relationship> getRelationshipsByProject(UUID projectId) {
        return relationshipRepository.findByProjectId(projectId);
    }

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
