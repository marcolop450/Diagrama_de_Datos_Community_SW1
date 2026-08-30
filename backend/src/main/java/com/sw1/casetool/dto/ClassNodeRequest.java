package com.sw1.casetool.dto;

import lombok.Data;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.Map;

@Data
public class ClassNodeRequest {
    @NotBlank
    private String name;
    private String stereotype;
    private boolean abstractClass;
    private double positionX;
    private double positionY;
    private double width;
    private double height;
    private List<Map<String, Object>> attributes;
    private List<Map<String, Object>> methods;
}
