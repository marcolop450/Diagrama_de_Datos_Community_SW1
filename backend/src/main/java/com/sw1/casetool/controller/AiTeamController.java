package com.sw1.casetool.controller;

import com.sw1.casetool.dto.ApiResponse;
import com.sw1.casetool.dto.ai.AiTeamChatRequest;
import com.sw1.casetool.dto.ai.AiTeamResponseDto;
import com.sw1.casetool.model.UserProfile;
import com.sw1.casetool.repository.UserProfileRepository;
import com.sw1.casetool.service.ai.AiTeamMemberService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/ai/team")
@RequiredArgsConstructor
@Tag(name = "Asistente Co-Desarrollador IA (CU14)", description = "Interacción conversacional, auto-reparación, auditorías y mutaciones de modelado con IA")
public class AiTeamController {

    private final AiTeamMemberService aiTeamMemberService;
    private final UserProfileRepository userProfileRepository;

    @PostMapping("/chat")
    @Operation(summary = "Procesar consulta o comando con el Asistente Co-Desarrollador (Modo Solo o REST)")
    public ResponseEntity<ApiResponse<AiTeamResponseDto>> processTeamChat(
            @RequestBody AiTeamChatRequest request,
            @AuthenticationPrincipal String email
    ) {
        UUID userId = UUID.randomUUID();
        String userName = "Usuario";

        if (email != null && !email.isBlank()) {
            UserProfile profile = userProfileRepository.findByEmailIgnoreCase(email).orElse(null);
            if (profile != null) {
                userId = profile.getUserId() != null ? profile.getUserId() : profile.getId();
                userName = profile.getFullName() != null ? profile.getFullName() : profile.getUsername();
            } else {
                userName = email.contains("@") ? email.split("@")[0] : email;
            }
        }

        String sessionCode = request.getSessionCode();
        if (sessionCode == null || sessionCode.isBlank()) {
            sessionCode = request.getProjectId() != null ? "PROJ-" + request.getProjectId() : "SOLO-" + userId;
        }

        AiTeamResponseDto response = aiTeamMemberService.processTeamAiMessage(
                sessionCode,
                userId,
                userName,
                request.getPrompt() != null ? request.getPrompt() : "",
                request.getDiagramSnapshot()
        );

        return ResponseEntity.ok(ApiResponse.success(
                response.getActionSummary() != null ? response.getActionSummary() : "Respuesta del Asistente Co-Desarrollador generada exitosamente",
                response
        ));
    }
}
