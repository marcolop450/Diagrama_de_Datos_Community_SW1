package com.sw1.casetool.service;

import com.sw1.casetool.dto.admin.AdminDashboardMetricsResponse;
import com.sw1.casetool.dto.admin.AdminUserResponse;
import com.sw1.casetool.model.UserProfile;
import com.sw1.casetool.repository.DiagramProjectRepository;
import com.sw1.casetool.repository.UserProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminUserService {

    private final UserProfileRepository userProfileRepository;
    private final DiagramProjectRepository diagramProjectRepository;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public List<AdminUserResponse> getAllUsers(String search, String role, String status) {
        List<UserProfile> users = userProfileRepository.findAllByOrderByCreatedAtDesc();

        return users.stream()
                .filter(u -> {
                    if (search == null || search.trim().isEmpty()) return true;
                    String q = search.trim().toLowerCase();
                    boolean matchName = u.getFullName() != null && u.getFullName().toLowerCase().contains(q);
                    boolean matchEmail = u.getEmail() != null && u.getEmail().toLowerCase().contains(q);
                    boolean matchUsername = u.getUsername() != null && u.getUsername().toLowerCase().contains(q);
                    return matchName || matchEmail || matchUsername;
                })
                .filter(u -> {
                    if (role == null || role.trim().isEmpty() || role.equalsIgnoreCase("ALL")) return true;
                    return u.getRole() != null && u.getRole().equalsIgnoreCase(role.trim());
                })
                .filter(u -> {
                    if (status == null || status.trim().isEmpty() || status.equalsIgnoreCase("ALL")) return true;
                    boolean isActive = Boolean.TRUE.equals(u.getIsActive());
                    if (status.equalsIgnoreCase("ACTIVE")) return isActive;
                    if (status.equalsIgnoreCase("INACTIVE") || status.equalsIgnoreCase("BLOCKED")) return !isActive;
                    return true;
                })
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public AdminDashboardMetricsResponse getMetrics() {
        long totalUsers = userProfileRepository.count();
        long totalSuperAdmins = userProfileRepository.countByRole("SUPER_ADMIN");
        long totalArchitects = userProfileRepository.countByRole("ARQUITECTO");
        long totalCollaborators = userProfileRepository.countByRole("COLABORADOR");
        long totalActiveUsers = userProfileRepository.countByIsActive(true);
        long totalInactiveUsers = userProfileRepository.countByIsActive(false);
        long totalProjects = diagramProjectRepository.count();

        return AdminDashboardMetricsResponse.builder()
                .totalUsers(totalUsers)
                .totalSuperAdmins(totalSuperAdmins)
                .totalArchitects(totalArchitects)
                .totalCollaborators(totalCollaborators)
                .totalActiveUsers(totalActiveUsers)
                .totalInactiveUsers(totalInactiveUsers)
                .totalProjects(totalProjects)
                .build();
    }

    @Transactional
    public AdminUserResponse updateUserRole(UUID targetUserId, String newRole, String adminIdentifier, String ip, String userAgent) {
        UserProfile adminUser = userProfileRepository.findByEmailIgnoreCase(adminIdentifier)
                .orElseGet(() -> userProfileRepository.findByUsernameIgnoreCase(adminIdentifier)
                        .orElseThrow(() -> new IllegalArgumentException("Administrador no autenticado")));

        UserProfile targetUser = userProfileRepository.findById(targetUserId)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado con ID: " + targetUserId));

        // Anti-self-degradation check (E1)
        UUID effectiveAdminId = adminUser.getId();
        UUID effectiveTargetId = targetUser.getId();

        if (effectiveAdminId.equals(effectiveTargetId) && !newRole.equalsIgnoreCase("SUPER_ADMIN")) {
            throw new IllegalArgumentException("Operación denegada: No puedes revocar tus propios privilegios de SUPER_ADMIN.");
        }

        String previousRole = targetUser.getRole();
        targetUser.setRole(newRole.toUpperCase());
        UserProfile saved = userProfileRepository.saveAndFlush(targetUser);

        // Record immutable audit log
        Map<String, Object> details = new HashMap<>();
        details.put("targetEmail", targetUser.getEmail());
        details.put("targetUsername", targetUser.getUsername());
        details.put("previousRole", previousRole);
        details.put("newRole", newRole.toUpperCase());

        auditLogService.recordAction(
                effectiveAdminId,
                "USER_ROLE_CHANGED",
                "user_profiles",
                effectiveTargetId,
                ip,
                userAgent,
                details
        );

        return mapToResponse(saved);
    }

    @Transactional
    public AdminUserResponse updateUserStatus(UUID targetUserId, Boolean isActive, String adminIdentifier, String ip, String userAgent) {
        UserProfile adminUser = userProfileRepository.findByEmailIgnoreCase(adminIdentifier)
                .orElseGet(() -> userProfileRepository.findByUsernameIgnoreCase(adminIdentifier)
                        .orElseThrow(() -> new IllegalArgumentException("Administrador no autenticado")));

        UserProfile targetUser = userProfileRepository.findById(targetUserId)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado con ID: " + targetUserId));

        // Anti-self-blocking check (E1)
        UUID effectiveAdminId = adminUser.getId();
        UUID effectiveTargetId = targetUser.getId();

        if (effectiveAdminId.equals(effectiveTargetId) && Boolean.FALSE.equals(isActive)) {
            throw new IllegalArgumentException("Operación denegada: No puedes suspender o desactivar tu propia cuenta de administrador.");
        }

        targetUser.setIsActive(isActive);
        UserProfile saved = userProfileRepository.saveAndFlush(targetUser);

        // Record immutable audit log
        Map<String, Object> details = new HashMap<>();
        details.put("targetEmail", targetUser.getEmail());
        details.put("targetUsername", targetUser.getUsername());
        details.put("isActive", isActive);

        auditLogService.recordAction(
                effectiveAdminId,
                Boolean.TRUE.equals(isActive) ? "USER_ACTIVATED" : "USER_SUSPENDED",
                "user_profiles",
                effectiveTargetId,
                ip,
                userAgent,
                details
        );

        return mapToResponse(saved);
    }

    private AdminUserResponse mapToResponse(UserProfile u) {
        return AdminUserResponse.builder()
                .id(u.getId())
                .userId(u.getUserId() != null ? u.getUserId() : u.getId())
                .fullName(u.getFullName())
                .username(u.getUsername())
                .email(u.getEmail())
                .role(u.getRole())
                .subscriptionPlan(u.getSubscriptionPlan())
                .subscriptionExpiresAt(u.getSubscriptionExpiresAt())
                .isActive(Boolean.TRUE.equals(u.getIsActive()))
                .avatarUrl(u.getAvatarUrl())
                .createdAt(u.getCreatedAt())
                .updatedAt(u.getUpdatedAt())
                .build();
    }
}
