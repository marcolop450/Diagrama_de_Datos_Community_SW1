package com.sw1.casetool.controller;

import com.sw1.casetool.dto.ApiResponse;
import com.sw1.casetool.dto.collab.ContinuousSessionResumeResponse;
import com.sw1.casetool.dto.collab.ContinuousSessionSaveRequest;
import com.sw1.casetool.dto.collab.ContinuousSessionSnapshotDto;
import com.sw1.casetool.model.UserProfile;
import com.sw1.casetool.repository.UserProfileRepository;
import com.sw1.casetool.service.collab.ContinuousSessionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/sessions/continuous")
@RequiredArgsConstructor
@Tag(name = "Sesiones Continuas NoSQL (CU16)", description = "Persistencia y reanudación exacta de sesiones colaborativas en MongoDB Atlas con tolerancia a fallos")
public class ContinuousSessionController {

    private final ContinuousSessionService continuousSessionService;
    private final UserProfileRepository userProfileRepository;

    @PostMapping("/save")
    @Operation(summary = "Suspender y guardar sesión colaborativa en MongoDB Atlas")
    public ResponseEntity<ApiResponse<ContinuousSessionSnapshotDto>> saveContinuousSession(
            @RequestBody ContinuousSessionSaveRequest request,
            @AuthenticationPrincipal String email
    ) {
        UUID hostId = resolveUserId(email);
        ContinuousSessionSnapshotDto snapshot = continuousSessionService.saveContinuousSession(
                request.getSessionCode(),
                hostId,
                request
        );
        return ResponseEntity.ok(ApiResponse.success(
                "Sesión " + request.getSessionCode() + " suspendida y guardada exitosamente en " + snapshot.getPersistenceSource(),
                snapshot
        ));
    }

    @GetMapping("/project/{projectId}")
    @Operation(summary = "Listar sesiones continuas guardadas de un proyecto")
    public ResponseEntity<ApiResponse<List<ContinuousSessionSnapshotDto>>> getProjectSnapshots(
            @PathVariable UUID projectId
    ) {
        List<ContinuousSessionSnapshotDto> snapshots = continuousSessionService.getProjectSnapshots(projectId);
        return ResponseEntity.ok(ApiResponse.success(
                "Snapshots de sesiones continuas recuperados exitosamente",
                snapshots
        ));
    }

    @PostMapping("/resume/{sessionCode}")
    @Operation(summary = "Reanudar sesión continua desde MongoDB Atlas")
    public ResponseEntity<ApiResponse<ContinuousSessionResumeResponse>> resumeContinuousSession(
            @PathVariable String sessionCode,
            @AuthenticationPrincipal String email
    ) {
        UUID requesterId = resolveUserId(email);
        ContinuousSessionResumeResponse response = continuousSessionService.resumeContinuousSession(
                sessionCode,
                requesterId
        );
        return ResponseEntity.ok(ApiResponse.success(
                "Sesión continua " + sessionCode + " reanudada exitosamente desde " + response.getPersistenceSource(),
                response
        ));
    }

    @DeleteMapping("/{snapshotId}")
    @Operation(summary = "Eliminar instantánea de sesión continua")
    public ResponseEntity<ApiResponse<Void>> deleteSnapshot(
            @PathVariable String snapshotId,
            @AuthenticationPrincipal String email
    ) {
        UUID requesterId = resolveUserId(email);
        continuousSessionService.deleteSnapshot(snapshotId, requesterId);
        return ResponseEntity.ok(ApiResponse.success("Instantánea eliminada exitosamente", null));
    }

    private UUID resolveUserId(String email) {
        if (email == null) return UUID.fromString("00000000-0000-0000-0000-000000000001");
        return userProfileRepository.findByEmailIgnoreCase(email)
                .map(UserProfile::getId)
                .orElse(UUID.fromString("00000000-0000-0000-0000-000000000001"));
    }
}
