package com.sw1.casetool.controller;

import com.sw1.casetool.dto.ApiResponse;
import com.sw1.casetool.dto.collab.CollaborationSessionDto;
import com.sw1.casetool.dto.collab.JoinSessionRequest;
import com.sw1.casetool.dto.collab.StartSessionRequest;
import com.sw1.casetool.service.CollaborationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/collaboration")
@RequiredArgsConstructor
@Tag(name = "Colaboración en Vivo / WebSockets (CU18)", description = "Salas concurrentes en tiempo real para co-diseño ágil OMG UML 2.5 con acceso por DNI y código de sala")
public class CollaborationController {

    private final CollaborationService collaborationService;

    @PostMapping("/start")
    @Operation(summary = "Iniciar una nueva sala colaborativa en vivo (Host / Arquitecto)")
    public ResponseEntity<ApiResponse<CollaborationSessionDto>> startSession(
            @Valid @RequestBody StartSessionRequest request,
            @AuthenticationPrincipal String userEmail,
            HttpServletRequest servletRequest
    ) {
        String ip = extractIp(servletRequest);
        String userAgent = servletRequest.getHeader(HttpHeaders.USER_AGENT);

        CollaborationSessionDto session = collaborationService.startSession(request, userEmail, ip, userAgent);
        return new ResponseEntity<>(
                ApiResponse.success("Sesión colaborativa iniciada con éxito", session),
                HttpStatus.CREATED
        );
    }

    @PostMapping("/join")
    @Operation(summary = "Unirse a una sala colaborativa mediante código de sala y DNI (Guest / Colaborador)")
    public ResponseEntity<ApiResponse<CollaborationSessionDto>> joinSession(
            @Valid @RequestBody JoinSessionRequest request,
            @AuthenticationPrincipal String userEmail,
            HttpServletRequest servletRequest
    ) {
        String ip = extractIp(servletRequest);
        String userAgent = servletRequest.getHeader(HttpHeaders.USER_AGENT);

        CollaborationSessionDto session = collaborationService.joinSession(request, userEmail, ip, userAgent);
        return ResponseEntity.ok(
                ApiResponse.success("Te has unido a la sesión colaborativa", session)
        );
    }

    @PostMapping("/{sessionCode}/end")
    @Operation(summary = "Finalizar la sesión colaborativa (Host únicamente)")
    public ResponseEntity<ApiResponse<Void>> endSession(
            @PathVariable String sessionCode,
            @AuthenticationPrincipal String userEmail,
            HttpServletRequest servletRequest
    ) {
        String ip = extractIp(servletRequest);
        String userAgent = servletRequest.getHeader(HttpHeaders.USER_AGENT);

        collaborationService.endSession(sessionCode, userEmail, ip, userAgent);
        return ResponseEntity.ok(ApiResponse.success("Sesión colaborativa finalizada", null));
    }

    @PostMapping("/{sessionCode}/kick/{participantUserId}")
    @Operation(summary = "Expulsar a un participante de la sala colaborativa (Host únicamente)")
    public ResponseEntity<ApiResponse<Void>> kickParticipant(
            @PathVariable String sessionCode,
            @PathVariable java.util.UUID participantUserId,
            @AuthenticationPrincipal String userEmail,
            HttpServletRequest servletRequest
    ) {
        String ip = extractIp(servletRequest);
        String userAgent = servletRequest.getHeader(HttpHeaders.USER_AGENT);

        collaborationService.kickParticipant(sessionCode, participantUserId, userEmail, ip, userAgent);
        return ResponseEntity.ok(ApiResponse.success("Participante expulsado de la sala", null));
    }

    @PostMapping("/{sessionCode}/role/{participantUserId}")
    @Operation(summary = "Actualizar rol de participante en sala colaborativa (editor o viewer) (Host únicamente)")
    public ResponseEntity<ApiResponse<Void>> updateParticipantRole(
            @PathVariable String sessionCode,
            @PathVariable java.util.UUID participantUserId,
            @RequestParam String role,
            @AuthenticationPrincipal String userEmail,
            HttpServletRequest servletRequest
    ) {
        String ip = extractIp(servletRequest);
        String userAgent = servletRequest.getHeader(HttpHeaders.USER_AGENT);

        collaborationService.updateParticipantRole(sessionCode, participantUserId, role, userEmail, ip, userAgent);
        return ResponseEntity.ok(ApiResponse.success("Rol del participante actualizado a: " + role, null));
    }

    @PostMapping("/{sessionCode}/leave")
    @Operation(summary = "Abandonar voluntariamente la sala colaborativa (o cerrarla si es Host)")
    public ResponseEntity<ApiResponse<Void>> leaveSession(
            @PathVariable String sessionCode,
            @AuthenticationPrincipal String userEmail
    ) {
        collaborationService.leaveSession(sessionCode, userEmail);
        return ResponseEntity.ok(ApiResponse.success("Has salido de la sesión colaborativa", null));
    }

    @PostMapping("/{sessionCode}/access")
    @Operation(summary = "Alternar permiso de acceso a la sala (Host únicamente: activa o pausada)")
    public ResponseEntity<ApiResponse<Void>> toggleAccess(
            @PathVariable String sessionCode,
            @RequestParam boolean allowGuests,
            @AuthenticationPrincipal String userEmail
    ) {
        collaborationService.toggleGuestAccess(sessionCode, allowGuests, userEmail);
        return ResponseEntity.ok(ApiResponse.success("Acceso de la sala actualizado a: " + (allowGuests ? "Abierta" : "Pausada"), null));
    }

    @GetMapping("/{sessionCode}/status")
    @Operation(summary = "Consultar el estado de una sala colaborativa por código")
    public ResponseEntity<ApiResponse<CollaborationSessionDto>> getSessionStatus(@PathVariable String sessionCode) {
        CollaborationSessionDto status = collaborationService.getSessionStatus(sessionCode);
        return ResponseEntity.ok(ApiResponse.success("Estado de la sesión obtenido", status));
    }

    private String extractIp(HttpServletRequest req) {
        if (req == null) return "127.0.0.1";
        String xf = req.getHeader("X-Forwarded-For");
        if (xf != null && !xf.isBlank()) {
            return xf.split(",")[0].trim();
        }
        return req.getRemoteAddr() != null ? req.getRemoteAddr() : "127.0.0.1";
    }
}
