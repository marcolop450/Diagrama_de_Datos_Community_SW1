package com.sw1.casetool.dto.generator;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GenerationPreviewResponse {

    private String projectName;
    private String packageName;
    private int totalClasses;
    private int totalFiles;
    private List<String> fileTree;
}
