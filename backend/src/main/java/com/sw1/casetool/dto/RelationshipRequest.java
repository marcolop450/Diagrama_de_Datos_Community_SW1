package com.sw1.casetool.dto;

import lombok.Data;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

@Data
public class RelationshipRequest {
    @NotNull
    private UUID sourceClassId;
    @NotNull
    private UUID targetClassId;
    @NotBlank
    private String type;
    private String sourceCardinality;
    private String targetCardinality;
    private String label;
    private String sourceRole;
    private String targetRole;
}
