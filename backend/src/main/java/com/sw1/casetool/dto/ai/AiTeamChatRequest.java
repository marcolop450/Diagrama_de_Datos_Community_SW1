package com.sw1.casetool.dto.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiTeamChatRequest {
    private String prompt;
    private String sessionCode;
    private UUID projectId;
    private Object diagramSnapshot;
}
