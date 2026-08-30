package com.sw1.casetool.dto;

import lombok.Data;
import jakarta.validation.constraints.NotBlank;
import java.util.Map;

@Data
public class UpdateProjectRequest {
    @NotBlank
    private String name;
    private String description;
    private Map<String, Object> metadata;
}
