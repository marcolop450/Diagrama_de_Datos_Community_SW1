package com.sw1.casetool.service;

import com.sw1.casetool.dto.*;
import com.sw1.casetool.exception.ResourceNotFoundException;
import com.sw1.casetool.model.ClassNode;
import com.sw1.casetool.model.DiagramProject;
import com.sw1.casetool.model.Relationship;
import com.sw1.casetool.repository.ClassNodeRepository;
import com.sw1.casetool.repository.DiagramProjectRepository;
import com.sw1.casetool.repository.RelationshipRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DiagramService {
    
    private final DiagramProjectRepository projectRepository;
    private final ClassNodeRepository classNodeRepository;
    private final RelationshipRepository relationshipRepository;

    @Transactional
    public DiagramProject createProject(CreateProjectRequest request) {
        DiagramProject project = DiagramProject.builder()
                .name(request.getName())
                .description(request.getDescription())
                .ownerId(request.getOwnerId())
                .metadata(request.getMetadata())
                .build();
        return projectRepository.save(project);
    }

    public DiagramProject getProject(UUID id) {
        return projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + id));
    }

    @Transactional
    public DiagramProject updateProject(UUID id, UpdateProjectRequest request) {
        DiagramProject project = getProject(id);
        project.setName(request.getName());
        project.setDescription(request.getDescription());
        project.setMetadata(request.getMetadata());
        return projectRepository.save(project);
    }

    @Transactional
    public void deleteProject(UUID id) {
        if (!projectRepository.existsById(id)) {
            throw new ResourceNotFoundException("Project not found with id: " + id);
        }
        projectRepository.deleteById(id);
    }

    public List<DiagramProject> getProjectsByOwner(UUID ownerId) {
        return projectRepository.findByOwnerId(ownerId);
    }

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
}
