package com.sw1.casetool.service;

import com.sw1.casetool.dto.history.DiagramHistoryResponse;
import com.sw1.casetool.exception.ResourceNotFoundException;
import com.sw1.casetool.model.DiagramHistory;
import com.sw1.casetool.model.DiagramProject;
import com.sw1.casetool.model.UserProfile;
import com.sw1.casetool.repository.DiagramHistoryRepository;
import com.sw1.casetool.repository.DiagramProjectRepository;
import com.sw1.casetool.repository.UserProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class DiagramHistoryService {

    private final DiagramHistoryRepository diagramHistoryRepository;
    private final DiagramProjectRepository diagramProjectRepository;
    private final UserProfileRepository userProfileRepository;

    @Transactional
    public void recordHistory(
            DiagramProject project,
            UUID userId,
            String actionType,
            String entityType,
            UUID entityId,
            Map<String, Object> beforeState,
            Map<String, Object> afterState
    ) {
        if (project == null) {
            log.warn("No se puede registrar historial de diagrama sin referencia a proyecto");
            return;
        }

        try {
            DiagramHistory history = DiagramHistory.builder()
                    .id(UUID.randomUUID())
                    .project(project)
                    .userId(userId)
                    .actionType(actionType != null ? actionType : "UNKNOWN_ACTION")
                    .entityType(entityType != null ? entityType : "PROJECT")
                    .entityId(entityId)
                    .beforeState(beforeState)
                    .afterState(afterState)
                    .createdAt(Instant.now())
                    .build();

            diagramHistoryRepository.saveAndFlush(history);
        } catch (Exception e) {
            log.error("Error al persistir registro en diagram_history para proyecto {}: {}", project.getId(), e.getMessage(), e);
        }
    }

    @Transactional(readOnly = true)
    public List<DiagramHistoryResponse> getProjectHistory(UUID projectId, String userEmail) {
        UserProfile user = userProfileRepository.findByEmailIgnoreCase(userEmail)
                .orElseGet(() -> userProfileRepository.findByUsernameIgnoreCase(userEmail)
                        .orElseThrow(() -> new IllegalArgumentException("Usuario no autenticado")));

        // Buscar proyecto (incluso si está en papelera para permitir auditarlo)
        DiagramProject project = diagramProjectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Proyecto no encontrado con ID: " + projectId));

        boolean isSuperAdmin = "SUPER_ADMIN".equalsIgnoreCase(user.getRole());
        boolean isOwner = project.getOwnerId() != null && project.getOwnerId().equals(user.getId());

        if (!isSuperAdmin && !isOwner) {
            throw new AccessDeniedException("No tienes permisos para consultar la trazabilidad de este proyecto.");
        }

        List<DiagramHistory> historyList = diagramHistoryRepository.findByProjectIdOrderByCreatedAtDesc(projectId);
        if (historyList.isEmpty()) {
            return Collections.emptyList();
        }

        Set<UUID> userIds = historyList.stream()
                .map(DiagramHistory::getUserId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<UUID, UserProfile> userProfileMap = new HashMap<>();
        if (!userIds.isEmpty()) {
            List<UserProfile> profiles = userProfileRepository.findAllById(userIds);
            for (UserProfile p : profiles) {
                userProfileMap.put(p.getId(), p);
                if (p.getUserId() != null) {
                    userProfileMap.put(p.getUserId(), p);
                }
            }
        }

        return historyList.stream().map(h -> {
            UserProfile p = h.getUserId() != null ? userProfileMap.get(h.getUserId()) : null;
            return DiagramHistoryResponse.builder()
                    .id(h.getId())
                    .projectId(project.getId())
                    .projectName(project.getName())
                    .userId(h.getUserId())
                    .userFullName(p != null ? p.getFullName() : "Colaborador")
                    .userEmail(p != null ? p.getEmail() : null)
                    .userRole(p != null ? p.getRole() : "COLABORADOR")
                    .userAvatarUrl(p != null ? p.getAvatarUrl() : null)
                    .actionType(h.getActionType())
                    .actionLabelSpanish(formatActionLabelSpanish(h.getActionType()))
                    .entityType(h.getEntityType())
                    .entityId(h.getEntityId())
                    .beforeState(h.getBeforeState())
                    .afterState(h.getAfterState())
                    .createdAt(h.getCreatedAt())
                    .build();
        }).collect(Collectors.toList());
    }

    public String formatActionLabelSpanish(String actionType) {
        if (actionType == null) return "Acción Desconocida";
        return switch (actionType.trim().toUpperCase()) {
            case "PROJECT_CREATED" -> "Proyecto Creado";
            case "PROJECT_UPDATED" -> "Proyecto Actualizado";
            case "PROJECT_DELETED" -> "Proyecto Eliminado";
            case "PROJECT_RESTORED" -> "Proyecto Restaurado";
            case "PROJECT_CLONED" -> "Proyecto Clonado";
            case "NODE_CREATED", "CLASS_CREATED" -> "Clase Agregada";
            case "NODE_UPDATED", "CLASS_UPDATED" -> "Clase Modificada";
            case "NODE_DELETED", "CLASS_DELETED" -> "Clase Eliminada";
            case "RELATIONSHIP_CREATED" -> "Relación Creada";
            case "RELATIONSHIP_UPDATED" -> "Relación Modificada";
            case "RELATIONSHIP_DELETED" -> "Relación Eliminada";
            case "COLLABORATOR_JOINED" -> "Colaborador Conectado";
            default -> actionType;
        };
    }
}
