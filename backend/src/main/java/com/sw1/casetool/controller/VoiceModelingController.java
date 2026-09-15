package com.sw1.casetool.controller;

import com.sw1.casetool.dto.ApiResponse;
import com.sw1.casetool.dto.ai.VoiceModelingRequest;
import com.sw1.casetool.dto.ai.VoiceModelingResponse;
import com.sw1.casetool.service.ai.VoiceModelingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai/voice")
@RequiredArgsConstructor
@Tag(name = "Modelado Asistido por Voz / PLN (CU16)", description = "Interpretación y traducción de comandos en lenguaje natural a mutaciones de grafos UML 2.5")
public class VoiceModelingController {

    private final VoiceModelingService voiceModelingService;

    @PostMapping("/parse")
    @Operation(summary = "Interpretar comando de voz o texto en lenguaje natural y generar mutaciones UML")
    public ResponseEntity<ApiResponse<VoiceModelingResponse>> parseVoiceCommand(
            @Valid @RequestBody VoiceModelingRequest request,
            @AuthenticationPrincipal String email,
            HttpServletRequest servletRequest
    ) {
        String ip = extractIp(servletRequest);
        String userAgent = servletRequest.getHeader(HttpHeaders.USER_AGENT);

        VoiceModelingResponse response = voiceModelingService.processVoiceCommand(request, email, ip, userAgent);

        return ResponseEntity.ok(ApiResponse.success(
                response.getMessage() != null ? response.getMessage() : "Comando interpretado exitosamente",
                response
        ));
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
