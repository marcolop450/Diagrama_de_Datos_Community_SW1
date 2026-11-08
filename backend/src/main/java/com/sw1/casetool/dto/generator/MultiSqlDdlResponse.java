package com.sw1.casetool.dto.generator;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MultiSqlDdlResponse {

    private String dialect;
    private String dialectDisplayName;
    private String ddlScript;
    private String fileName;
    private int tableCount;
    private int totalColumns;
    private int relationshipCount;
    private int indexCount;

    @Builder.Default
    private List<String> warnings = new ArrayList<>();

    @JsonProperty("sql")
    public String getSql() {
        return ddlScript;
    }

    @JsonProperty("totalTables")
    public int getTotalTables() {
        return tableCount;
    }

    @JsonProperty("totalForeignKeys")
    public int getTotalForeignKeys() {
        return relationshipCount;
    }

    @JsonProperty("totalIndexes")
    public int getTotalIndexes() {
        return indexCount;
    }

    @JsonProperty("engine")
    public String getEngine() {
        return dialect;
    }

    @JsonProperty("engineLabel")
    public String getEngineLabel() {
        return dialectDisplayName;
    }
}
