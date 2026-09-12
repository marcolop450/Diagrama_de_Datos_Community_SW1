package com.sw1.casetool.dto.generator;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GenerateBackendRequest {

    @Builder.Default
    private String packageName = "com.sw1.generated";

    @Builder.Default
    private String groupId = "com.sw1";

    private String artifactId;

    @Builder.Default
    private String javaVersion = "21";

    @Builder.Default
    private String databaseType = "h2_postgres"; // h2_postgres, postgres_only, h2_only

    @Builder.Default
    private boolean includeMavenWrapper = true;

    @Builder.Default
    private boolean includeSwagger = true;
}
