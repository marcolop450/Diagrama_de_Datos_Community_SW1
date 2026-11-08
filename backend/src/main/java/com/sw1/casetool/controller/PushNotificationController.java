package com.sw1.casetool.controller;

import com.sw1.casetool.dto.ApiResponse;
import com.sw1.casetool.dto.notification.PushNotificationType;
import com.sw1.casetool.dto.notification.PushTestRequest;
import com.sw1.casetool.dto.notification.PushTokenRegistrationRequest;
import com.sw1.casetool.model.UserPushToken;
import com.sw1.casetool.service.notification.PushNotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@Tag(name = "Notificaciones Push", description = "Endpoints para registro de tokens push y pruebas remotas en móvil (CU18)")
public class PushNotificationController {

    private final PushNotificationService pushNotificationService;

    @PostMapping("/push-token")
    @Operation(summary = "Registra o actualiza el push token del dispositivo móvil")
    public ResponseEntity<ApiResponse<UserPushToken>> registerPushToken(
            @RequestBody PushTokenRegistrationRequest request,
            Authentication authentication
    ) {
        UUID userId = extractUserId(authentication);
        UserPushToken token = pushNotificationService.registerPushToken(userId, request);
        return ResponseEntity.ok(ApiResponse.success("Token push registrado exitosamente", token));
    }

    @DeleteMapping("/push-token")
    @Operation(summary = "Desactiva el push token del dispositivo móvil (al cerrar sesión)")
    public ResponseEntity<ApiResponse<Void>> deactivatePushToken(
            @RequestParam("token") String pushToken,
            Authentication authentication
    ) {
        UUID userId = extractUserId(authentication);
        pushNotificationService.deactivatePushToken(userId, pushToken);
        return ResponseEntity.ok(ApiResponse.success("Token push desactivado", null));
    }

    @PostMapping("/test-push")
    @Operation(summary = "Dispara una notificación push de prueba hacia el teléfono móvil físico")
    public ResponseEntity<ApiResponse<Map<String, Object>>> sendTestPush(
            @RequestBody(required = false) PushTestRequest request,
            Authentication authentication
    ) {
        UUID userId = extractUserId(authentication);
        String title = (request != null && request.getTitle() != null)
                ? request.getTitle()
                : "CASE Tool UML: Prueba de Notificación";
        String body = (request != null && request.getBody() != null)
                ? request.getBody()
                : "La conexión push remota con el teléfono físico funciona correctamente al 100%.";
        PushNotificationType type = (request != null && request.getNotificationType() != null)
                ? request.getNotificationType()
                : PushNotificationType.TEST_PING;

        if (request != null && request.getPushToken() != null && !request.getPushToken().isBlank()) {
            pushNotificationService.dispatchExpoPush(
                    java.util.List.of(request.getPushToken().trim()),
                    type,
                    title,
                    body,
                    Map.of("testTimestamp", System.currentTimeMillis())
            );
        } else {
            pushNotificationService.sendPushToUser(
                    userId,
                    type,
                    title,
                    body,
                    Map.of("testTimestamp", System.currentTimeMillis())
            );
        }

        return ResponseEntity.ok(ApiResponse.success("Solicitud de notificación push transmitida exitosamente a Expo Gateway", Map.of(
                "title", title,
                "body", body,
                "type", type.name()
        )));
    }

    private UUID extractUserId(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof UUID) {
            return (UUID) authentication.getPrincipal();
        }
        if (authentication != null && authentication.getName() != null) {
            try {
                return UUID.fromString(authentication.getName());
            } catch (IllegalArgumentException ignored) {}
        }
        // Fallback para pruebas rápidas
        return UUID.fromString("00000000-0000-0000-0000-000000000001");
    }
}
