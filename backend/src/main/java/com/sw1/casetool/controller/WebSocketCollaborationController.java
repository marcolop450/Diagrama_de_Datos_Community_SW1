package com.sw1.casetool.controller;

import com.sw1.casetool.dto.collab.CollabMessageDto;
import com.sw1.casetool.service.CollaborationService;
import com.sw1.casetool.service.ai.AiTeamMemberService;
import com.sw1.casetool.service.notification.PushNotificationService;
import com.sw1.casetool.dto.notification.PushNotificationType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

import java.util.Map;
import java.util.UUID;

@Slf4j
@Controller
@RequiredArgsConstructor
public class WebSocketCollaborationController {

    private final CollaborationService collaborationService;
    private final AiTeamMemberService aiTeamMemberService;
    private final PushNotificationService pushNotificationService;

    /**
     * Enrutador principal de eventos colaborativos STOMP en tiempo real (< 50ms).
     * Los clientes envían a /app/room/{code}/event y se retransmite a /topic/room/{code}.
     */
    @MessageMapping("/room/{code}/event")
    @SendTo("/topic/room/{code}")
    public CollabMessageDto handleRoomEvent(
            @DestinationVariable String code,
            @Payload CollabMessageDto message
    ) {
        message.setSessionCode(code);
        if (message.getTimestamp() <= 0) {
            message.setTimestamp(System.currentTimeMillis());
        }

        // Registrar eventos para el Catch-Up cronológico en vivo de la sala (CU14)
        if (message.getType() == CollabMessageDto.Type.NODE_CREATE) {
            aiTeamMemberService.recordSessionEvent(code, message.getSenderName(), "NODE_CREATE", "Modeló una nueva clase en el lienzo");
            try {
                pushNotificationService.sendPushToProjectCollaborators(
                        null,
                        message.getSenderId(),
                        PushNotificationType.CLASS_MUTATION,
                        "Nueva Clase en " + code,
                        message.getSenderName() + " agregó una nueva clase al modelo.",
                        Map.of("roomCode", code, "action", "NODE_CREATE")
                );
            } catch (Exception ex) {
                log.debug("Push NODE_CREATE ignorado: {}", ex.getMessage());
            }
        } else if (message.getType() == CollabMessageDto.Type.NODE_DELETE) {
            aiTeamMemberService.recordSessionEvent(code, message.getSenderName(), "NODE_DELETE", "Eliminó una clase del lienzo");
            try {
                pushNotificationService.sendPushToProjectCollaborators(
                        null,
                        message.getSenderId(),
                        PushNotificationType.CLASS_MUTATION,
                        "Clase Eliminada en " + code,
                        message.getSenderName() + " eliminó una clase del modelo.",
                        Map.of("roomCode", code, "action", "NODE_DELETE")
                );
            } catch (Exception ex) {
                log.debug("Push NODE_DELETE ignorado: {}", ex.getMessage());
            }
        } else if (message.getType() == CollabMessageDto.Type.EDGE_CREATE) {
            aiTeamMemberService.recordSessionEvent(code, message.getSenderName(), "EDGE_CREATE", "Conectó una nueva relación UML");
        } else if (message.getType() == CollabMessageDto.Type.EDGE_DELETE) {
            aiTeamMemberService.recordSessionEvent(code, message.getSenderName(), "EDGE_DELETE", "Eliminó una relación UML");
        } else if (message.getType() == CollabMessageDto.Type.JOIN) {
            aiTeamMemberService.recordSessionEvent(code, message.getSenderName(), "JOIN", "Se unió a la sala colaborativa");
        } else if (message.getType() == CollabMessageDto.Type.SAVE_SYNC) {
            aiTeamMemberService.recordSessionEvent(code, message.getSenderName(), "SAVE_SYNC", "Sincronizó cambios estructurales en el lienzo");
        }

        // Manejo especial de candados si el evento es de bloqueo
        if (message.getType() == CollabMessageDto.Type.LOCK && message.getPayload() instanceof Map<?, ?> payloadMap) {
            try {
                Object elemIdObj = payloadMap.get("elementId");
                if (elemIdObj != null && message.getSenderId() != null) {
                    UUID elementId = UUID.fromString(elemIdObj.toString());
                    boolean locked = collaborationService.acquireLock(
                            code,
                            elementId,
                            message.getSenderId(),
                            message.getSenderName(),
                            message.getSenderColor()
                    );
                    if (!locked) {
                        log.debug("Bloqueo denegado para elemento {} a {}", elementId, message.getSenderName());
                    }
                }
            } catch (Exception e) {
                log.warn("Error procesando bloqueo en evento STOMP: {}", e.getMessage());
            }
        } else if (message.getType() == CollabMessageDto.Type.UNLOCK && message.getPayload() instanceof Map<?, ?> payloadMap) {
            try {
                Object elemIdObj = payloadMap.get("elementId");
                if (elemIdObj != null && message.getSenderId() != null) {
                    UUID elementId = UUID.fromString(elemIdObj.toString());
                    collaborationService.releaseLock(code, elementId, message.getSenderId());
                }
            } catch (Exception e) {
                log.warn("Error procesando desbloqueo en evento STOMP: {}", e.getMessage());
            }
        } else if (message.getType() == CollabMessageDto.Type.CHAT && message.getPayload() instanceof Map<?, ?> payloadMap) {
            Object textObj = payloadMap.get("text");
            if (textObj != null) {
                String chatText = textObj.toString();
                try {
                    pushNotificationService.sendPushToProjectCollaborators(
                            null,
                            message.getSenderId(),
                            PushNotificationType.CHAT_MESSAGE,
                            "Mensaje de " + message.getSenderName() + " (" + code + ")",
                            chatText,
                            Map.of("roomCode", code, "action", "CHAT")
                    );
                } catch (Exception ex) {
                    log.debug("Push CHAT ignorado: {}", ex.getMessage());
                }
            }
            // CU14: Detección de invocación al Asistente Co-Desarrollador (@ai)
            if (textObj != null) {
                String text = textObj.toString();
                if (text.toLowerCase().contains("@ai")) {
                    Object snapshot = payloadMap.get("diagramSnapshot");
                    log.info("Invocación detectada al Asistente IA (@ai) en sala {} por {}", code, message.getSenderName());
                    aiTeamMemberService.processTeamAiMessageAsync(
                            code,
                            message.getSenderId(),
                            message.getSenderName(),
                            text,
                            snapshot
                    );
                }
            }
        } else if (message.getType() == CollabMessageDto.Type.LEAVE) {
            try {
                if (message.getSenderId() != null) {
                    collaborationService.handleStompLeave(code, message.getSenderId(), message.getSenderName());
                }
            } catch (Exception e) {
                log.warn("Error procesando salida STOMP: {}", e.getMessage());
            }
            return null;
        }

        return message;
    }
}
