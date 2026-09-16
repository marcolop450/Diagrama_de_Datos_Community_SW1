package com.sw1.casetool.dto.collab;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CollaborationSessionDto {

    private UUID sessionId;
    private String sessionCode;
    private UUID projectId;
    private String projectName;
    private UUID hostId;
    private String hostName;
    private String status; // 'active' | 'paused' | 'ended'
    private Instant startedAt;
    private Instant endedAt;
    private List<ParticipantDto> participants;
    private List<ElementLockDto> locks;
    private Object initialDiagram; // Contiene nodes y edges actuales para inicializar el canvas del invitado
    private String token;
    private java.util.Map<String, Object> userSession;
}
