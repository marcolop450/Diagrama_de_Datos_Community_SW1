package com.sw1.casetool.controller;

import com.sw1.casetool.dto.ApiResponse;
import com.sw1.casetool.dto.admin.AdminDashboardMetricsResponse;
import com.sw1.casetool.dto.admin.AdminUserResponse;
import com.sw1.casetool.dto.admin.UpdateRoleRequest;
import com.sw1.casetool.dto.admin.UpdateStatusRequest;
import com.sw1.casetool.service.AdminUserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class AdminUserController {

    private final AdminUserService adminUserService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<AdminUserResponse>>> getUsers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String status
    ) {
        List<AdminUserResponse> users = adminUserService.getAllUsers(search, role, status);
        return ResponseEntity.ok(ApiResponse.success("Lista de usuarios obtenida", users));
    }

    @GetMapping("/metrics")
    public ResponseEntity<ApiResponse<AdminDashboardMetricsResponse>> getMetrics() {
        AdminDashboardMetricsResponse metrics = adminUserService.getMetrics();
        return ResponseEntity.ok(ApiResponse.success("Métricas de gobernanza obtenidas", metrics));
    }

    @PutMapping("/{userId}/role")
    public ResponseEntity<ApiResponse<AdminUserResponse>> updateUserRole(
            @PathVariable UUID userId,
            @Valid @RequestBody UpdateRoleRequest request,
            @AuthenticationPrincipal String adminEmail,
            HttpServletRequest servletRequest
    ) {
        String ip = servletRequest.getRemoteAddr();
        String userAgent = servletRequest.getHeader("User-Agent");

        AdminUserResponse updated = adminUserService.updateUserRole(
                userId,
                request.getRole(),
                adminEmail,
                ip,
                userAgent
        );
        return ResponseEntity.ok(ApiResponse.success("Rol de usuario actualizado exitosamente", updated));
    }

    @PutMapping("/{userId}/status")
    public ResponseEntity<ApiResponse<AdminUserResponse>> updateUserStatus(
            @PathVariable UUID userId,
            @Valid @RequestBody UpdateStatusRequest request,
            @AuthenticationPrincipal String adminEmail,
            HttpServletRequest servletRequest
    ) {
        String ip = servletRequest.getRemoteAddr();
        String userAgent = servletRequest.getHeader("User-Agent");

        AdminUserResponse updated = adminUserService.updateUserStatus(
                userId,
                request.getIsActive(),
                adminEmail,
                ip,
                userAgent
        );
        String msg = Boolean.TRUE.equals(request.getIsActive())
                ? "Usuario reactivado exitosamente"
                : "Usuario suspendido exitosamente";
        return ResponseEntity.ok(ApiResponse.success(msg, updated));
    }
}
