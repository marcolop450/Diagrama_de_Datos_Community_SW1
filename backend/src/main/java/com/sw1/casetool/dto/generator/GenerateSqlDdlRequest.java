package com.sw1.casetool.dto.generator;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GenerateSqlDdlRequest {

    @Builder.Default
    private boolean dropTables = true;

    @Builder.Default
    private boolean createIndexes = true;

    @Builder.Default
    private boolean includeComments = true;

    @Builder.Default
    private boolean includeForeignKeys = true;

    @Builder.Default
    private String schema = "public";
}
