package com.sw1.casetool.dto.generator;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SqlDdlResponse {
    private String projectName;
    private String fileName;
    private String sql;
    private int totalTables;
    private int totalColumns;
    private int totalForeignKeys;
    private int totalIndexes;
}
