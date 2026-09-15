package com.sw1.casetool.controller;

import com.sw1.casetool.dto.ApiResponse;
import com.sw1.casetool.dto.ai.VoiceModelingResponse;
import com.sw1.casetool.service.ai.WhiteboardVisionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@RestController
@RequestMapping("/api/ai/vision")
@RequiredArgsConstructor
@Tag(name = "Digitalizar Foto de Pizarra / IA Vision (CU17)", description = "Digitalizacion y vectorizacion de fotos de diagramas UML dibujados en pizarra fisica o papel a modelos interactivos")
public class WhiteboardVisionController {

    private final WhiteboardVisionService whiteboardVisionService;

    @PostMapping(value = "/digitize", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Digitalizar fotografia de diagrama UML dibujado en pizarra fisica a grafo interactivo")
    public ResponseEntity<ApiResponse<VoiceModelingResponse>> digitizeWhiteboard(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "projectId", required = false) UUID projectId,
            @RequestParam(value = "mergeMode", defaultValue = "false") boolean mergeMode,
            @AuthenticationPrincipal String email,
            HttpServletRequest servletRequest
    ) {
        String ip = extractIp(servletRequest);
        String userAgent = servletRequest.getHeader(HttpHeaders.USER_AGENT);

        VoiceModelingResponse response = whiteboardVisionService.digitizeWhiteboardImage(
                file,
                projectId,
                mergeMode,
                email,
                ip,
                userAgent
        );

        return ResponseEntity.ok(ApiResponse.success(
                response.getMessage() != null ? response.getMessage() : "Pizarra digitalizada exitosamente",
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