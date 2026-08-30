package com.sw1.casetool.dto;

import lombok.Data;
import jakarta.validation.constraints.NotBlank;
import java.util.Map;
import java.util.UUID;

@Data
public class CreateProjectRequest {
    @NotBlank
    private String name;
    private String description;
    private UUID ownerId;
    private Map<String, Object> metadata;
}
