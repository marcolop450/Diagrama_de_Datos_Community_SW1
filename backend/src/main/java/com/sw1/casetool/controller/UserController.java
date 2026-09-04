package com.sw1.casetool.controller;

import com.sw1.casetool.dto.ApiResponse;
import com.sw1.casetool.dto.user.ChangePasswordRequest;
import com.sw1.casetool.dto.user.UpdatePreferencesRequest;
import com.sw1.casetool.dto.user.UpdateProfileRequest;
import com.sw1.casetool.dto.user.UserProfileDto;
import com.sw1.casetool.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/profile")
    public ResponseEntity<ApiResponse<UserProfileDto>> getProfile(@AuthenticationPrincipal String email) {
        if (email == null) {
            return ResponseEntity.status(401).body(ApiResponse.error(401, "No autenticado"));
        }
        UserProfileDto profile = userService.getProfileByEmail(email);
        return ResponseEntity.ok(ApiResponse.success("Perfil de usuario obtenido", profile));
    }

    @PutMapping("/profile")
    public ResponseEntity<ApiResponse<UserProfileDto>> updateProfile(
            @AuthenticationPrincipal String email,
            @Valid @RequestBody UpdateProfileRequest request
    ) {
        if (email == null) {
            return ResponseEntity.status(401).body(ApiResponse.error(401, "No autenticado"));
        }
        UserProfileDto updated = userService.updateProfile(email, request);
        return ResponseEntity.ok(ApiResponse.success("Perfil actualizado correctamente", updated));
    }

    @PutMapping("/preferences")
    public ResponseEntity<ApiResponse<UserProfileDto>> updatePreferences(
            @AuthenticationPrincipal String email,
            @RequestBody UpdatePreferencesRequest request
    ) {
        if (email == null) {
            return ResponseEntity.status(401).body(ApiResponse.error(401, "No autenticado"));
        }
        UserProfileDto updated = userService.updatePreferences(email, request);
        return ResponseEntity.ok(ApiResponse.success("Preferencias del editor actualizadas", updated));
    }

    @PutMapping("/change-password")
    public ResponseEntity<ApiResponse<String>> changePassword(
            @AuthenticationPrincipal String email,
            @Valid @RequestBody ChangePasswordRequest request
    ) {
        if (email == null) {
            return ResponseEntity.status(401).body(ApiResponse.error(401, "No autenticado"));
        }
        userService.changePassword(email, request);
        return ResponseEntity.ok(ApiResponse.success("Contraseña actualizada con éxito", "OK"));
    }

    @DeleteMapping("/account")
    public ResponseEntity<ApiResponse<String>> deleteAccount(
            @AuthenticationPrincipal String email,
            jakarta.servlet.http.HttpServletRequest servletRequest
    ) {
        if (email == null) {
            return ResponseEntity.status(401).body(ApiResponse.error(401, "No autenticado"));
        }
        String ip = servletRequest.getRemoteAddr();
        String userAgent = servletRequest.getHeader("User-Agent");
        userService.deleteAccount(email, ip, userAgent);
        return ResponseEntity.ok(ApiResponse.success("Tu cuenta ha sido eliminada y deshabilitada correctamente.", "DELETED"));
    }
}
