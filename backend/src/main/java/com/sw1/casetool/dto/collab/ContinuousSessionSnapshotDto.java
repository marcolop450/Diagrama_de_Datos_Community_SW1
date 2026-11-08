package com.sw1.casetool.dto.collab;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ContinuousSessionSnapshotDto {

    private String id;
    private String sessionCode;
    private UUID projectId;
    private String projectName;
    private UUID hostId;
    private String hostName;
    private String status;
    private Instant savedAt;
    private Long elapsedMinutes;
    private int nodesCount;
    private int edgesCount;
    private int chatMessagesCount;
    private int participantsCount;
    private Integer normalizationScore;
    private String normalizationLevel;
    private String persistenceSource; // MONGODB_ATLAS o POSTGRES_FALLBACK

    // Aliases simétricos para compatibilidad total con Frontend (LiveCollabModal & continuousSessionService)
    @JsonProperty("createdAt")
    public Instant getCreatedAt() {
        return savedAt;
    }

    @JsonProperty("classesCount")
    public int getClassesCount() {
        return nodesCount;
    }

    @JsonProperty("relationshipsCount")
    public int getRelationshipsCount() {
        return edgesCount;
    }

    @JsonProperty("messagesCount")
    public int getMessagesCount() {
        return chatMessagesCount;
    }

    @JsonProperty("savedByUserName")
    public String getSavedByUserName() {
        return hostName != null && !hostName.isBlank() ? hostName : "Arquitecto (Host)";
    }

    @JsonProperty("savedByUserId")
    public String getSavedByUserId() {
        return hostId != null ? hostId.toString() : null;
    }

    @JsonProperty("sessionTitle")
    public String getSessionTitle() {
        return projectName != null && !projectName.isBlank() ? projectName : "Modelo UML";
    }

    @JsonProperty("reason")
    public String getReason() {
        return "Suspensión de sesión continua";
    }
}
