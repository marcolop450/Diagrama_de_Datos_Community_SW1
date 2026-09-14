package com.sw1.casetool.dto.generator;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PostmanResponse {
    private String projectName;
    private String fileName;
    private String json;
    private int totalFolders;
    private int totalRequests;
    private int totalTests;
}
