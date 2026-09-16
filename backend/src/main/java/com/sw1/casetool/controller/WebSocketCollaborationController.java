package com.sw1.casetool.controller;

import com.sw1.casetool.dto.collab.CollabMessageDto;
import com.sw1.casetool.service.CollaborationService;
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
