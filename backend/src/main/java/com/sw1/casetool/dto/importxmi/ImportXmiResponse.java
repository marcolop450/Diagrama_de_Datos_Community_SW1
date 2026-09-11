package com.sw1.casetool.dto.importxmi;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImportXmiResponse {
    private UUID projectId;
    private String projectName;
    private String version;
    private int classesCount;
    private int attributesCount;
    private int methodsCount;
    private int relationshipsCount;
    @Builder.Default
    private List<String> warnings = new ArrayList<>();
    private String message;
}
