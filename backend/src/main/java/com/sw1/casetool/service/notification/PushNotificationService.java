package com.sw1.casetool.service.notification;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sw1.casetool.dto.notification.PushNotificationType;
import com.sw1.casetool.dto.notification.PushTokenRegistrationRequest;
import com.sw1.casetool.model.CollaborationSession;
import com.sw1.casetool.model.DiagramProject;
import com.sw1.casetool.model.UserPushToken;
import com.sw1.casetool.model.UserProfile;
import com.sw1.casetool.repository.UserProfileRepository;
import com.sw1.casetool.repository.CollaborationSessionRepository;
import com.sw1.casetool.repository.DiagramProjectRepository;
import com.sw1.casetool.repository.UserPushTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.CompletableFuture;

@Slf4j
@Service
@RequiredArgsConstructor
public class PushNotificationService {

    private static final String EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
    private static final String NOTIFICATION_CHANNEL = "case_updates";

    private final UserPushTokenRepository pushTokenRepository;
    private final DiagramProjectRepository projectRepository;
    private final CollaborationSessionRepository sessionRepository;
    private final UserProfileRepository userProfileRepository;
    private final ObjectMapper objectMapper;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .version(HttpClient.Version.HTTP_2)
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    @Transactional
    public UserPushToken registerPushToken(UUID userId, PushTokenRegistrationRequest request) {
        if (userId == null || request == null || request.getPushToken() == null || request.getPushToken().isBlank()) {
            throw new IllegalArgumentException("El token push y el usuario son requeridos");
        }

        String token = request.getPushToken().trim();
        Optional<UserPushToken> existingOpt = pushTokenRepository.findByUserIdAndPushToken(userId, token);

        UserPushToken entity;
        if (existingOpt.isPresent()) {
            entity = existingOpt.get();
            entity.setIsActive(true);
            entity.setDeviceType(request.getDeviceType() != null ? request.getDeviceType() : "android");
            entity.setDeviceName(request.getDeviceName());
            entity.setUpdatedAt(Instant.now());
        } else {
            entity = UserPushToken.builder()
                    .userId(userId)
                    .pushToken(token)
                    .deviceType(request.getDeviceType() != null ? request.getDeviceType() : "android")
                    .deviceName(request.getDeviceName())
                    .isActive(true)
                    .build();
        }

        log.info("Token push registrado exitosamente para usuario {}: {}", userId, token);
        return pushTokenRepository.save(entity);
    }

    @Transactional
    public void deactivatePushToken(UUID userId, String pushToken) {
        if (userId == null || pushToken == null) return;
        pushTokenRepository.findByUserIdAndPushToken(userId, pushToken.trim()).ifPresent(tokenEntity -> {
            tokenEntity.setIsActive(false);
            tokenEntity.setUpdatedAt(Instant.now());
            pushTokenRepository.save(tokenEntity);
            log.info("Token push desactivado por logout para usuario {}", userId);
        });
    }

    @Async
    public CompletableFuture<Void> sendPushToUser(
            UUID userId,
            PushNotificationType type,
            String title,
            String body,
            Map<String, Object> data
    ) {
        if (userId == null) return CompletableFuture.completedFuture(null);
        List<UserPushToken> tokens = pushTokenRepository.findByUserIdAndIsActiveTrue(userId);
        if (tokens.isEmpty()) {
            log.debug("No hay tokens push activos registrados para usuario {}", userId);
            return CompletableFuture.completedFuture(null);
        }

        List<String> rawTokens = tokens.stream().map(UserPushToken::getPushToken).toList();
        return dispatchExpoPush(rawTokens, type, title, body, data);
    }

    @Async
    public CompletableFuture<Void> sendPushToProjectCollaborators(
            UUID projectId,
            UUID excludeActorId,
            PushNotificationType type,
            String title,
            String body,
            Map<String, Object> data
    ) {
        try {
            Set<UUID> recipientUserIds = new HashSet<>();

            // 1. Propietario del proyecto
            if (projectId != null) {
                projectRepository.findById(projectId).ifPresent(p -> {
                    if (p.getOwnerId() != null && !p.getOwnerId().equals(excludeActorId)) {
                        recipientUserIds.add(p.getOwnerId());
                    }
                });
            }

            // 2. Colaboradores asignados al Arquitecto / Anfitrión del proyecto
            UUID architectId = excludeActorId;
            if (projectId != null) {
                UUID ownerId = projectRepository.findById(projectId).map(p -> p.getOwnerId()).orElse(null);
                if (ownerId != null) {
                    architectId = ownerId;
                }
            }
            if (architectId != null) {
                List<UserProfile> assigned = userProfileRepository.findByRoleAndArchitectIdOrderByCreatedAtDesc("COLABORADOR", architectId);
                for (UserProfile u : assigned) {
                    if (excludeActorId == null || !u.getId().equals(excludeActorId)) {
                        recipientUserIds.add(u.getId());
                    }
                }
            }

            if (recipientUserIds.isEmpty()) {
                log.debug("No hay colaboradores ni destinatarios válidos para notificar en proyecto {}", projectId);
                return CompletableFuture.completedFuture(null);
            }

            List<UserPushToken> activeTokens = pushTokenRepository.findByUserIdInAndIsActiveTrue(new ArrayList<>(recipientUserIds));
            List<String> targetTokens = activeTokens.stream()
                    .filter(t -> excludeActorId == null || !t.getUserId().equals(excludeActorId))
                    .map(UserPushToken::getPushToken)
                    .distinct()
                    .toList();

            if (targetTokens.isEmpty()) {
                log.debug("No hay colaboradores móviles activos para notificar push en proyecto {}", projectId);
                return CompletableFuture.completedFuture(null);
            }

            log.info("Despachando push '{}' a {} dispositivo(s) móvil(es)", type, targetTokens.size());
            return dispatchExpoPush(targetTokens, type, title, body, data);
        } catch (Exception e) {
            log.error("Error al preparar notificación push para colaboradores del proyecto: {}", e.getMessage(), e);
            return CompletableFuture.completedFuture(null);
        }
    }

    public CompletableFuture<Void> dispatchExpoPush(
            List<String> pushTokens,
            PushNotificationType type,
            String title,
            String body,
            Map<String, Object> customData
    ) {
        if (pushTokens == null || pushTokens.isEmpty()) {
            return CompletableFuture.completedFuture(null);
        }

        return CompletableFuture.runAsync(() -> {
            try {
                List<Map<String, Object>> messages = new ArrayList<>();
                Map<String, Object> safeData = customData != null ? new HashMap<>(customData) : new HashMap<>();
                safeData.put("notificationType", type.name());

                for (String token : pushTokens) {
                    if (token != null && (token.startsWith("ExponentPushToken") || token.startsWith("ExpoPushToken"))) {
                        Map<String, Object> msg = new HashMap<>();
                        msg.put("to", token);
                        msg.put("title", title);
                        msg.put("body", body);
                        msg.put("sound", "default");
                        msg.put("priority", "high");
                        msg.put("channelId", NOTIFICATION_CHANNEL);
                        msg.put("data", safeData);
                        messages.add(msg);
                    }
                }

                if (messages.isEmpty()) {
                    log.warn("Ninguno de los tokens proporcionados tiene formato válido de Expo Push: {}", pushTokens);
                    return;
                }

                String requestJson = objectMapper.writeValueAsString(messages);

                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(EXPO_PUSH_URL))
                        .header("Content-Type", "application/json")
                        .header("Accept", "application/json")
                        .header("Accept-Encoding", "gzip, deflate")
                        .timeout(Duration.ofSeconds(10))
                        .POST(HttpRequest.BodyPublishers.ofString(requestJson))
                        .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

                if (response.statusCode() >= 200 && response.statusCode() < 300) {
                    log.info("Notificación Push enviada exitosamente a Expo Gateway (HTTP {}): {}", response.statusCode(), response.body());
                } else {
                    log.warn("Expo Gateway respondió con código HTTP no exitoso {}: {}", response.statusCode(), response.body());
                }
            } catch (Exception e) {
                log.error("Excepción al transmitir notificación push remota a Expo: {}", e.getMessage(), e);
            }
        });
    }
}
