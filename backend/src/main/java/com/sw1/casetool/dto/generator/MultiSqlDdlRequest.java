package com.sw1.casetool.dto.generator;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MultiSqlDdlRequest {

    public enum SqlDialect {
        POSTGRESQL,
        MYSQL,
        SQL_SERVER,
        ORACLE;

        @com.fasterxml.jackson.annotation.JsonCreator
        public static SqlDialect fromString(String val) {
            if (val == null || val.isBlank()) return POSTGRESQL;
            String clean = val.trim().toUpperCase().replace("-", "_").replace(" ", "_");
            if (clean.equals("SQLSERVER")) return SQL_SERVER;
            try {
                return SqlDialect.valueOf(clean);
            } catch (Exception e) {
                return POSTGRESQL;
            }
        }
    }

    @Builder.Default
    private SqlDialect dialect = SqlDialect.POSTGRESQL;

    @Builder.Default
    private Boolean dropTables = true;

    @Builder.Default
    private Boolean createIndexes = true;

    @Builder.Default
    private Boolean includeComments = true;

    @Builder.Default
    private Boolean includeForeignKeys = true;

    public void setEngine(SqlDialect engine) {
        if (engine != null) {
            this.dialect = engine;
        }
    }

    public SqlDialect getEngine() {
        return this.dialect;
    }
}
