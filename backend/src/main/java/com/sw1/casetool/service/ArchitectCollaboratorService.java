package com.sw1.casetool.service;

import com.sw1.casetool.dto.architect.CollaboratorResponse;
import com.sw1.casetool.dto.architect.CreateCollaboratorRequest;
import com.sw1.casetool.model.UserProfile;
import com.sw1.casetool.repository.UserProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ArchitectCollaboratorService {

    private final UserProfileRepository userProfileRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public List<CollaboratorResponse> getCollaborators(String callerEmail, String search) {
        UserProfile caller = getCaller(callerEmail);
        boolean isSuperAdmin = "SUPER_ADMIN".equalsIgnoreCase(caller.getRole());

        List<UserProfile> list;
        if (isSuperAdmin) {
            list = userProfileRepository.findAllByOrderByCreatedAtDesc().stream()
                    .filter(u -> "COLABORADOR".equalsIgnoreCase(u.getRole()))
                    .collect(Collectors.toList());
        } else {
            // Collaborators belonging to this architect or unassigned
            list = userProfileRepository.findAllByOrderByCreatedAtDesc().stream()
                    .filter(u -> "COLABORADOR".equalsIgnoreCase(u.getRole()))
                    .filter(u -> caller.getId().equals(u.getArchitectId()) || u.getArchitectId() == null)
                    .collect(Collectors.toList());
        }

        if (search != null && !search.isBlank()) {
            String q = search.trim().toLowerCase();
            list = list.stream().filter(u ->
                    (u.getFullName() != null && u.getFullName().toLowerCase().contains(q)) ||
                    (u.getEmail() != null && u.getEmail().toLowerCase().contains(q)) ||
                    (u.getUsername() != null && u.getUsername().toLowerCase().contains(q))
            ).collect(Collectors.toList());
        }

        Map<UUID, String> architectNames = new HashMap<>();
        return list.stream().map(c -> {
            String archName = "Sin asignar";
            if (c.getArchitectId() != null) {
                archName = architectNames.computeIfAbsent(c.getArchitectId(), id ->
                        userProfileRepository.findById(id).map(UserProfile::getFullName).orElse("Arquitecto")
                );
            }
            return toResponse(c, archName);
        }).collect(Collectors.toList());
    }

    @Transactional
    public CollaboratorResponse createCollaborator(
            CreateCollaboratorRequest request,
            String callerEmail,
            String ip,
            String userAgent
    ) {
        UserProfile architect = getCaller(callerEmail);
        if (!"ARQUITECTO".equalsIgnoreCase(architect.getRole()) && !"SUPER_ADMIN".equalsIgnoreCase(architect.getRole())) {
            throw new AccessDeniedException("Solo los Arquitectos de Software pueden registrar colaboradores en su equipo.");
        }

        String email = request.getEmail().trim().toLowerCase();
        if (userProfileRepository.existsByEmailIgnoreCase(email)) {
            throw new IllegalArgumentException("El correo electrónico '" + email + "' ya se encuentra registrado en el sistema.");
        }

        String username = request.getUsername().trim();
        if (userProfileRepository.existsByUsernameIgnoreCase(username)) {
            throw new IllegalArgumentException("El nombre de usuario '" + username + "' ya se encuentra en uso. Elige otro.");
        }

        UUID newId = UUID.randomUUID();
        UserProfile collaborator = UserProfile.builder()
                .id(newId)
                .userId(newId)
                .fullName(request.getFullName().trim())
                .username(username)
                .email(email)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role("COLABORADOR")
                .architectId(architect.getId())
                .subscriptionPlan("COMMUNITY")
                .isActive(true)
                .preferences(buildDefaultPreferences())
                .build();

        UserProfile saved = userProfileRepository.saveAndFlush(collaborator);

        // Audit inmutable
        try {
            Map<String, Object> details = new HashMap<>();
            details.put("collaboratorEmail", saved.getEmail());
            details.put("collaboratorUsername", saved.getUsername());
            details.put("collaboratorName", saved.getFullName());
            details.put("architectEmail", architect.getEmail());
            details.put("architectId", architect.getId().toString());

            auditLogService.recordAction(
                    architect.getId(),
                    "COLLABORATOR_REGISTERED_BY_ARCHITECT",
                    "user_profiles",
                    saved.getId(),
                    ip,
                    userAgent,
                    details
            );
        } catch (Exception e) {
            log.error("Error al auditar registro de colaborador: {}", e.getMessage());
        }

        return toResponse(saved, architect.getFullName());
    }

    @Transactional
    public CollaboratorResponse toggleCollaboratorStatus(
            UUID collaboratorId,
            String callerEmail,
            String ip,
            String userAgent
    ) {
        UserProfile caller = getCaller(callerEmail);
        UserProfile collaborator = userProfileRepository.findById(collaboratorId)
                .orElseThrow(() -> new IllegalArgumentException("Colaborador no encontrado con ID: " + collaboratorId));

        if (!"COLABORADOR".equalsIgnoreCase(collaborator.getRole())) {
            throw new IllegalArgumentException("El usuario seleccionado no es un Colaborador.");
        }

        boolean isSuperAdmin = "SUPER_ADMIN".equalsIgnoreCase(caller.getRole());
        boolean isOwnerArchitect = caller.getId().equals(collaborator.getArchitectId());

        if (!isSuperAdmin && !isOwnerArchitect) {
            throw new AccessDeniedException("No tienes permisos para modificar este colaborador.");
        }

        boolean newStatus = !Boolean.TRUE.equals(collaborator.getIsActive());
        collaborator.setIsActive(newStatus);
        UserProfile saved = userProfileRepository.saveAndFlush(collaborator);

        try {
            Map<String, Object> details = new HashMap<>();
            details.put("collaboratorEmail", saved.getEmail());
            details.put("isActive", newStatus);

            auditLogService.recordAction(
                    caller.getId(),
                    newStatus ? "COLLABORATOR_ACTIVATED" : "COLLABORATOR_SUSPENDED",
                    "user_profiles",
                    saved.getId(),
                    ip,
                    userAgent,
                    details
            );
        } catch (Exception e) {
            log.error("Error al auditar cambio de estado de colaborador: {}", e.getMessage());
        }

        String archName = caller.getFullName();
        return toResponse(saved, archName);
    }

    private UserProfile getCaller(String identifier) {
        return userProfileRepository.findByEmailIgnoreCase(identifier)
                .orElseGet(() -> userProfileRepository.findByUsernameIgnoreCase(identifier)
                        .orElseThrow(() -> new AccessDeniedException("Usuario no autenticado o no encontrado: " + identifier)));
    }

    private CollaboratorResponse toResponse(UserProfile u, String architectName) {
        return CollaboratorResponse.builder()
                .id(u.getId())
                .userId(u.getUserId() != null ? u.getUserId() : u.getId())
                .fullName(u.getFullName())
                .username(u.getUsername())
                .email(u.getEmail())
                .role(u.getRole())
                .isActive(Boolean.TRUE.equals(u.getIsActive()))
                .architectId(u.getArchitectId())
                .architectName(architectName)
                .createdAt(u.getCreatedAt())
                .updatedAt(u.getUpdatedAt())
                .build();
    }

    private Map<String, Object> buildDefaultPreferences() {
        Map<String, Object> prefs = new HashMap<>();
        prefs.put("theme", "DARK");
        prefs.put("appPalette", "warm-titanium");
        prefs.put("canvasGrid", true);
        prefs.put("canvasSnapToGrid", true);
        prefs.put("autoSaveIntervalSec", 30);
        return prefs;
    }
}
