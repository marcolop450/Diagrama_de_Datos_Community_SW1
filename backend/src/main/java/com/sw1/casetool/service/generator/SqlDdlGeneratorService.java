package com.sw1.casetool.service.generator;

import com.sw1.casetool.dto.generator.GenerateSqlDdlRequest;
import com.sw1.casetool.dto.generator.SqlDdlResponse;
import com.sw1.casetool.model.ClassNode;
import com.sw1.casetool.model.DiagramProject;
import com.sw1.casetool.model.Relationship;
import com.sw1.casetool.model.UserProfile;
import com.sw1.casetool.repository.ClassNodeRepository;
import com.sw1.casetool.repository.DiagramProjectRepository;
import com.sw1.casetool.repository.RelationshipRepository;
import com.sw1.casetool.repository.UserProfileRepository;
import com.sw1.casetool.service.AuditLogService;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class SqlDdlGeneratorService {

    private final DiagramProjectRepository projectRepository;
    private final ClassNodeRepository classNodeRepository;
    private final RelationshipRepository relationshipRepository;
    private final UserProfileRepository userProfileRepository;
    private final AuditLogService auditLogService;

    private static final Set<String> RESERVED_KEYWORDS = Set.of(
            "all", "analyse", "analyze", "and", "any", "array", "as", "asc", "asymmetric",
            "authorization", "binary", "both", "case", "cast", "check", "collate", "collation",
            "column", "concurrently", "constraint", "create", "cross", "current_catalog",
            "current_date", "current_role", "current_schema", "current_time", "current_timestamp",
            "current_user", "default", "deferrable", "desc", "distinct", "do", "else", "end",
            "except", "false", "fetch", "for", "foreign", "freeze", "from", "full", "grant",
            "group", "having", "ilike", "in", "initially", "inner", "intersect", "into", "is",
            "isnull", "join", "lateral", "leading", "left", "like", "limit", "localtime",
            "localtimestamp", "natural", "not", "notnull", "null", "offset", "on", "only",
            "or", "order", "outer", "overlaps", "placing", "primary", "references", "returning",
            "right", "select", "session_user", "similar", "some", "symmetric", "table",
            "tablesample", "then", "to", "trailing", "true", "union", "unique", "user",
            "using", "variadic", "verbose", "when", "where", "window", "with"
    );

    @Data
    @Builder
    public static class ColumnMeta {
        private String columnName;
        private String originalFieldName;
        private String dataType;
        private boolean primaryKey;
        private boolean identity;
        private boolean nullable;
        private boolean unique;
        private String defaultValue;
        private String comment;
    }

    @Data
    @Builder
    public static class TableMeta {
        private UUID id;
        private String originalClassName;
        private String tableName;
        private String quotedTableName;
        private List<ColumnMeta> columns;
        private ColumnMeta primaryKeyColumn;
        private boolean isAbstract;
    }

    @Data
    @Builder
    public static class ForeignKeyMeta {
        private String constraintName;
        private String fromTable;
        private String fromColumn;
        private String toTable;
        private String toColumn;
        private String onDelete;
        private String onUpdate;
    }

    @Data
    @Builder
    public static class JunctionTableMeta {
        private String tableName;
        private String quotedTableName;
        private String sourceTable;
        private String sourceColumn;
        private String targetTable;
        private String targetColumn;
        private String sourceFkConstraint;
        private String targetFkConstraint;
        private String comment;
    }

    @Data
    @Builder
    public static class IndexMeta {
        private String indexName;
        private String tableName;
        private String columnName;
    }

    /**
     * Generates a complete PostgreSQL 17 DDL script from the classes and relationships of a project.
     */
    @Transactional(readOnly = true)
    public SqlDdlResponse generateSqlDdl(
            UUID projectId,
            GenerateSqlDdlRequest request,
            String userEmail,
            String ip,
            String userAgent
    ) {
        DiagramProject project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("El proyecto con ID " + projectId + " no existe."));

        List<ClassNode> classes = classNodeRepository.findByProjectId(projectId);
        if (classes.isEmpty()) {
            throw new IllegalArgumentException("No es posible generar esquema DDL SQL para un modelo sin clases definidas (Regla E1).");
        }

        List<Relationship> relationships = relationshipRepository.findByProjectId(projectId);
        if (relationships == null) {
            relationships = Collections.emptyList();
        }

        GenerateSqlDdlRequest finalReq = request != null ? request : new GenerateSqlDdlRequest();

        // 1. Build table metadata
        Map<UUID, TableMeta> tableMap = buildTableMetas(classes);

        // 2. Process relationships into foreign keys, junction tables, and indexes
        List<ForeignKeyMeta> foreignKeys = new ArrayList<>();
        List<JunctionTableMeta> junctionTables = new ArrayList<>();
        List<IndexMeta> indexes = new ArrayList<>();

        processRelationships(relationships, tableMap, foreignKeys, junctionTables, indexes);

        // 3. Render complete PostgreSQL 17 DDL script
        String ddlSql = renderPostgresDdl(project, tableMap.values(), junctionTables, foreignKeys, indexes, finalReq);

        // 4. Calculate metrics
        int totalTables = tableMap.size() + junctionTables.size();
        int totalColumns = tableMap.values().stream().mapToInt(t -> t.getColumns().size()).sum() + (junctionTables.size() * 2);
        int totalFks = foreignKeys.size() + (junctionTables.size() * 2);
        int totalIdx = indexes.size();

        String cleanProjectName = toKebabCase(project.getName());
        if (cleanProjectName.isBlank()) cleanProjectName = "schema";
        String fileName = cleanProjectName + "-schema.sql";

        // 5. Inmutable Audit Log
        UserProfile user = (userEmail != null && !userEmail.isBlank())
                ? userProfileRepository.findByEmail(userEmail).orElse(null) : null;
        recordAudit(project, user != null ? user.getId() : null, ip, userAgent, totalTables, totalColumns, totalFks, totalIdx, finalReq);

        return SqlDdlResponse.builder()
                .projectName(project.getName())
                .fileName(fileName)
                .sql(ddlSql)
                .totalTables(totalTables)
                .totalColumns(totalColumns)
                .totalForeignKeys(totalFks)
                .totalIndexes(totalIdx)
                .build();
    }

    /**
     * Helper to download raw byte array of generated SQL script.
     */
    @Transactional(readOnly = true)
    public byte[] generateSqlDdlBytes(
            UUID projectId,
            GenerateSqlDdlRequest request,
            String userEmail,
            String ip,
            String userAgent
    ) {
        SqlDdlResponse response = generateSqlDdl(projectId, request, userEmail, ip, userAgent);
        return response.getSql().getBytes(StandardCharsets.UTF_8);
    }

    private Map<UUID, TableMeta> buildTableMetas(List<ClassNode> classes) {
        Map<UUID, TableMeta> map = new LinkedHashMap<>();

        for (ClassNode node : classes) {
            String origName = node.getName() != null && !node.getName().isBlank() ? node.getName().trim() : "Entidad";
            String tName = toSnakeCase(origName);
            String quotedTName = quoteIdentifierIfNeeded(tName);

            List<ColumnMeta> columns = new ArrayList<>();
            ColumnMeta pkColumn = null;

            if (node.getAttributes() != null) {
                for (Map<String, Object> rawAttr : node.getAttributes()) {
                    String rawName = (String) rawAttr.getOrDefault("name", "campo");
                    String colName = toSnakeCase(rawName);
                    String rawType = (String) rawAttr.getOrDefault("type", "String");

                    boolean isPk = Boolean.TRUE.equals(rawAttr.get("isPrimaryKey"))
                            || Boolean.TRUE.equals(rawAttr.get("isId"))
                            || rawName.equalsIgnoreCase("id")
                            || colName.equalsIgnoreCase("id");

                    boolean isNotNull = Boolean.TRUE.equals(rawAttr.get("isNotNull"))
                            || !Boolean.TRUE.equals(rawAttr.get("isNullable"))
                            || isPk;

                    boolean isUnique = Boolean.TRUE.equals(rawAttr.get("isUnique"));

                    String pgType = mapToPostgreSqlType(rawType, colName, isPk);
                    boolean isIdentity = isPk && (pgType.contains("IDENTITY") || isAutoIncrementCandidate(rawType));

                    ColumnMeta col = ColumnMeta.builder()
                            .columnName(colName)
                            .originalFieldName(rawName)
                            .dataType(pgType)
                            .primaryKey(isPk)
                            .identity(isIdentity)
                            .nullable(!isNotNull)
                            .unique(isUnique)
                            .comment("Atributo: " + rawName)
                            .build();

                    columns.add(col);

                    if (isPk && pkColumn == null) {
                        pkColumn = col;
                    }
                }
            }

            // 1NF Defense: If no PK attribute exists in model, synthesize default id: BIGINT GENERATED ALWAYS AS IDENTITY
            if (pkColumn == null) {
                pkColumn = ColumnMeta.builder()
                        .columnName("id")
                        .originalFieldName("id")
                        .dataType("BIGINT GENERATED ALWAYS AS IDENTITY")
                        .primaryKey(true)
                        .identity(true)
                        .nullable(false)
                        .unique(true)
                        .comment("Clave primaria sintetizada automáticamente (Defensa 1NF)")
                        .build();
                columns.add(0, pkColumn);
            }

            TableMeta tm = TableMeta.builder()
                    .id(node.getId())
                    .originalClassName(origName)
                    .tableName(tName)
                    .quotedTableName(quotedTName)
                    .columns(columns)
                    .primaryKeyColumn(pkColumn)
                    .isAbstract(node.isAbstractClass())
                    .build();

            map.put(node.getId(), tm);
        }

        return map;
    }

    private void processRelationships(
            List<Relationship> relationships,
            Map<UUID, TableMeta> tableMap,
            List<ForeignKeyMeta> foreignKeys,
            List<JunctionTableMeta> junctionTables,
            List<IndexMeta> indexes
    ) {
        Set<String> processedJunctions = new HashSet<>();

        for (Relationship rel : relationships) {
            if (rel.getSourceClass() == null || rel.getTargetClass() == null) continue;

            TableMeta src = tableMap.get(rel.getSourceClass().getId());
            TableMeta tgt = tableMap.get(rel.getTargetClass().getId());
            if (src == null || tgt == null) continue;

            String srcCard = rel.getSourceCardinality() != null ? rel.getSourceCardinality().trim() : "1";
            String tgtCard = rel.getTargetCardinality() != null ? rel.getTargetCardinality().trim() : "1";

            boolean isSelf = src.getId().equals(tgt.getId());

            if (isSelf) {
                // Recursive self-association
                String parentCol = src.getTableName() + "_padre_id";
                ensureColumnExists(src, parentCol, "BIGINT", true, false, "Referencia recursiva al registro padre");

                String fkName = safeConstraintName("fk_" + src.getTableName() + "_padre");
                foreignKeys.add(ForeignKeyMeta.builder()
                        .constraintName(fkName)
                        .fromTable(src.getQuotedTableName())
                        .fromColumn(quoteIdentifierIfNeeded(parentCol))
                        .toTable(src.getQuotedTableName())
                        .toColumn(quoteIdentifierIfNeeded(src.getPrimaryKeyColumn().getColumnName()))
                        .onDelete("SET NULL")
                        .onUpdate("CASCADE")
                        .build());

                indexes.add(IndexMeta.builder()
                        .indexName(safeConstraintName("idx_" + src.getTableName() + "_" + parentCol))
                        .tableName(src.getQuotedTableName())
                        .columnName(quoteIdentifierIfNeeded(parentCol))
                        .build());

                continue;
            }

            boolean manySrc = isMany(srcCard);
            boolean manyTgt = isMany(tgtCard);

            if (manyTgt && !manySrc) {
                // 1 to N: Target has FK pointing to Source
                String fkCol = src.getTableName() + "_id";
                boolean isNullable = srcCard.equals("0..1");
                ensureColumnExists(tgt, fkCol, getFkColumnType(src.getPrimaryKeyColumn()), isNullable, false, "Clave foránea hacia " + src.getOriginalClassName());

                String fkName = safeConstraintName("fk_" + tgt.getTableName() + "_" + src.getTableName());
                foreignKeys.add(ForeignKeyMeta.builder()
                        .constraintName(fkName)
                        .fromTable(tgt.getQuotedTableName())
                        .fromColumn(quoteIdentifierIfNeeded(fkCol))
                        .toTable(src.getQuotedTableName())
                        .toColumn(quoteIdentifierIfNeeded(src.getPrimaryKeyColumn().getColumnName()))
                        .onDelete("CASCADE")
                        .onUpdate("CASCADE")
                        .build());

                indexes.add(IndexMeta.builder()
                        .indexName(safeConstraintName("idx_" + tgt.getTableName() + "_" + fkCol))
                        .tableName(tgt.getQuotedTableName())
                        .columnName(quoteIdentifierIfNeeded(fkCol))
                        .build());

            } else if (manySrc && !manyTgt) {
                // N to 1: Source has FK pointing to Target
                String fkCol = tgt.getTableName() + "_id";
                boolean isNullable = tgtCard.equals("0..1");
                ensureColumnExists(src, fkCol, getFkColumnType(tgt.getPrimaryKeyColumn()), isNullable, false, "Clave foránea hacia " + tgt.getOriginalClassName());

                String fkName = safeConstraintName("fk_" + src.getTableName() + "_" + tgt.getTableName());
                foreignKeys.add(ForeignKeyMeta.builder()
                        .constraintName(fkName)
                        .fromTable(src.getQuotedTableName())
                        .fromColumn(quoteIdentifierIfNeeded(fkCol))
                        .toTable(tgt.getQuotedTableName())
                        .toColumn(quoteIdentifierIfNeeded(tgt.getPrimaryKeyColumn().getColumnName()))
                        .onDelete("CASCADE")
                        .onUpdate("CASCADE")
                        .build());

                indexes.add(IndexMeta.builder()
                        .indexName(safeConstraintName("idx_" + src.getTableName() + "_" + fkCol))
                        .tableName(src.getQuotedTableName())
                        .columnName(quoteIdentifierIfNeeded(fkCol))
                        .build());

            } else if (manySrc && manyTgt) {
                // N to N: Many-to-Many associative junction table
                String jName = src.getTableName() + "_" + tgt.getTableName();
                String revJName = tgt.getTableName() + "_" + src.getTableName();

                if (!processedJunctions.contains(jName) && !processedJunctions.contains(revJName)) {
                    processedJunctions.add(jName);

                    String srcCol = src.getTableName() + "_id";
                    String tgtCol = tgt.getTableName() + "_id";

                    String fkSrc = safeConstraintName("fk_" + jName + "_" + src.getTableName());
                    String fkTgt = safeConstraintName("fk_" + jName + "_" + tgt.getTableName());

                    junctionTables.add(JunctionTableMeta.builder()
                            .tableName(jName)
                            .quotedTableName(quoteIdentifierIfNeeded(jName))
                            .sourceTable(src.getQuotedTableName())
                            .sourceColumn(srcCol)
                            .targetTable(tgt.getQuotedTableName())
                            .targetColumn(tgtCol)
                            .sourceFkConstraint(fkSrc)
                            .targetFkConstraint(fkTgt)
                            .comment("Tabla asociativa para relación N:N entre " + src.getOriginalClassName() + " y " + tgt.getOriginalClassName())
                            .build());

                    indexes.add(IndexMeta.builder()
                            .indexName(safeConstraintName("idx_" + jName + "_" + srcCol))
                            .tableName(quoteIdentifierIfNeeded(jName))
                            .columnName(quoteIdentifierIfNeeded(srcCol))
                            .build());

                    indexes.add(IndexMeta.builder()
                            .indexName(safeConstraintName("idx_" + jName + "_" + tgtCol))
                            .tableName(quoteIdentifierIfNeeded(jName))
                            .columnName(quoteIdentifierIfNeeded(tgtCol))
                            .build());
                }
            } else {
                // 1 to 1: Target has FK pointing to Source with UNIQUE constraint
                String fkCol = src.getTableName() + "_id";
                boolean isNullable = srcCard.equals("0..1") || tgtCard.equals("0..1");
                ensureColumnExists(tgt, fkCol, getFkColumnType(src.getPrimaryKeyColumn()), isNullable, true, "Clave foránea 1:1 hacia " + src.getOriginalClassName());

                String fkName = safeConstraintName("fk_" + tgt.getTableName() + "_" + src.getTableName());
                foreignKeys.add(ForeignKeyMeta.builder()
                        .constraintName(fkName)
                        .fromTable(tgt.getQuotedTableName())
                        .fromColumn(quoteIdentifierIfNeeded(fkCol))
                        .toTable(src.getQuotedTableName())
                        .toColumn(quoteIdentifierIfNeeded(src.getPrimaryKeyColumn().getColumnName()))
                        .onDelete("CASCADE")
                        .onUpdate("CASCADE")
                        .build());

                indexes.add(IndexMeta.builder()
                        .indexName(safeConstraintName("idx_" + tgt.getTableName() + "_" + fkCol))
                        .tableName(tgt.getQuotedTableName())
                        .columnName(quoteIdentifierIfNeeded(fkCol))
                        .build());
            }
        }
    }

    private void ensureColumnExists(TableMeta table, String colName, String type, boolean nullable, boolean unique, String comment) {
        boolean exists = table.getColumns().stream()
                .anyMatch(c -> c.getColumnName().equalsIgnoreCase(colName));

        if (!exists) {
            table.getColumns().add(ColumnMeta.builder()
                    .columnName(colName)
                    .originalFieldName(colName)
                    .dataType(type)
                    .primaryKey(false)
                    .identity(false)
                    .nullable(nullable)
                    .unique(unique)
                    .comment(comment)
                    .build());
        }
    }

    private String getFkColumnType(ColumnMeta pkCol) {
        if (pkCol == null) return "BIGINT";
        String dt = pkCol.getDataType().toUpperCase(Locale.ROOT);
        if (dt.contains("UUID")) return "UUID";
        if (dt.contains("VARCHAR")) return "VARCHAR(255)";
        if (dt.contains("INTEGER")) return "INTEGER";
        return "BIGINT";
    }

    private String renderPostgresDdl(
            DiagramProject project,
            Collection<TableMeta> tables,
            List<JunctionTableMeta> junctionTables,
            List<ForeignKeyMeta> foreignKeys,
            List<IndexMeta> indexes,
            GenerateSqlDdlRequest request
    ) {
        StringBuilder sb = new StringBuilder();
        String timestamp = DateTimeFormatter.ISO_INSTANT.format(Instant.now());

        // Header
        sb.append("-- ============================================================================\n");
        sb.append("-- SCRIPT DDL SQL RELACIONAL — POSTGRESQL 17\n");
        sb.append("-- Generado por: CASE Tool UML (CU14)\n");
        sb.append("-- Proyecto: ").append(project.getName()).append(" (").append(project.getVersion() != null ? project.getVersion() : "v1.0.0").append(")\n");
        sb.append("-- Fecha de Generación: ").append(timestamp).append("\n");
        sb.append("-- Motor de Base de Datos: PostgreSQL 17 (Nativo y compatible con Supabase)\n");
        sb.append("-- Estándar: SQL:2008+ / Core PostgreSQL Specifications\n");
        sb.append("-- ============================================================================\n\n");

        // Phase 0: Session and Environment Parameters
        sb.append("-- ----------------------------------------------------------------------------\n");
        sb.append("-- FASE 0: CONFIGURACIÓN DE SESIÓN Y CODIFICACIÓN\n");
        sb.append("-- ----------------------------------------------------------------------------\n");
        sb.append("SET client_encoding = 'UTF8';\n");
        sb.append("SET standard_conforming_strings = on;\n");
        sb.append("SET check_function_bodies = false;\n");
        sb.append("SET client_min_messages = warning;\n");

        String schema = (request.getSchema() != null && !request.getSchema().isBlank()) ? request.getSchema().trim() : "public";
        if (!schema.equalsIgnoreCase("public")) {
            sb.append("CREATE SCHEMA IF NOT EXISTS ").append(quoteIdentifierIfNeeded(schema)).append(";\n");
        }
        sb.append("SET search_path TO ").append(quoteIdentifierIfNeeded(schema)).append(", public;\n\n");

        // Phase 1: Clean-up (DROP TABLES) if requested
        if (request.isDropTables()) {
            sb.append("-- ----------------------------------------------------------------------------\n");
            sb.append("-- FASE 1: LIMPIEZA PREVENTIVA DE OBJETOS PREVIOS (DROP TABLES)\n");
            sb.append("-- ----------------------------------------------------------------------------\n");
            for (JunctionTableMeta jm : junctionTables) {
                sb.append("DROP TABLE IF EXISTS ").append(jm.getQuotedTableName()).append(" CASCADE;\n");
            }
            List<TableMeta> revList = new ArrayList<>(tables);
            Collections.reverse(revList);
            for (TableMeta tm : revList) {
                sb.append("DROP TABLE IF EXISTS ").append(tm.getQuotedTableName()).append(" CASCADE;\n");
            }
            sb.append("\n");
        }

        // Phase 2: Create Tables & Primary Keys
        sb.append("-- ----------------------------------------------------------------------------\n");
        sb.append("-- FASE 2: DEFINICIÓN DE TABLAS Y CLAVES PRIMARIAS\n");
        sb.append("-- ----------------------------------------------------------------------------\n");
        for (TableMeta tm : tables) {
            sb.append("CREATE TABLE IF NOT EXISTS ").append(tm.getQuotedTableName()).append(" (\n");

            List<String> colDefs = new ArrayList<>();
            for (ColumnMeta cm : tm.getColumns()) {
                StringBuilder colStr = new StringBuilder();
                colStr.append("    ").append(quoteIdentifierIfNeeded(cm.getColumnName())).append(" ").append(cm.getDataType());

                if (!cm.isNullable() && !cm.getDataType().contains("GENERATED ALWAYS AS IDENTITY")) {
                    colStr.append(" NOT NULL");
                }
                if (cm.isUnique() && !cm.isPrimaryKey()) {
                    colStr.append(" UNIQUE");
                }
                if (cm.getDefaultValue() != null && !cm.getDefaultValue().isBlank()) {
                    colStr.append(" DEFAULT ").append(cm.getDefaultValue());
                }

                colDefs.add(colStr.toString());
            }

            // Primary Key constraint
            if (tm.getPrimaryKeyColumn() != null) {
                String pkName = safeConstraintName("pk_" + tm.getTableName());
                colDefs.add("    CONSTRAINT " + pkName + " PRIMARY KEY (" + quoteIdentifierIfNeeded(tm.getPrimaryKeyColumn().getColumnName()) + ")");
            }

            sb.append(String.join(",\n", colDefs)).append("\n);\n\n");
        }

        // Phase 3: Junction Tables for N:N Relationships
        if (!junctionTables.isEmpty()) {
            sb.append("-- ----------------------------------------------------------------------------\n");
            sb.append("-- FASE 3: TABLAS ASOCIATIVAS (RELACIONES MUCHOS A MUCHOS)\n");
            sb.append("-- ----------------------------------------------------------------------------\n");
            for (JunctionTableMeta jm : junctionTables) {
                String pkName = safeConstraintName("pk_" + jm.getTableName());
                sb.append("CREATE TABLE IF NOT EXISTS ").append(jm.getQuotedTableName()).append(" (\n");
                sb.append("    ").append(quoteIdentifierIfNeeded(jm.getSourceColumn())).append(" BIGINT NOT NULL,\n");
                sb.append("    ").append(quoteIdentifierIfNeeded(jm.getTargetColumn())).append(" BIGINT NOT NULL,\n");
                sb.append("    CONSTRAINT ").append(pkName).append(" PRIMARY KEY (")
                        .append(quoteIdentifierIfNeeded(jm.getSourceColumn())).append(", ")
                        .append(quoteIdentifierIfNeeded(jm.getTargetColumn())).append(")\n");
                sb.append(");\n\n");
            }
        }

        // Phase 4: Foreign Keys
        if (request.isIncludeForeignKeys() && (!foreignKeys.isEmpty() || !junctionTables.isEmpty())) {
            sb.append("-- ----------------------------------------------------------------------------\n");
            sb.append("-- FASE 4: INTEGRIDAD REFERENCIAL (CLAVES FORÁNEAS)\n");
            sb.append("-- ----------------------------------------------------------------------------\n");

            for (ForeignKeyMeta fk : foreignKeys) {
                sb.append("ALTER TABLE ").append(fk.getFromTable()).append("\n");
                sb.append("    ADD CONSTRAINT ").append(fk.getConstraintName()).append("\n");
                sb.append("    FOREIGN KEY (").append(fk.getFromColumn()).append(")\n");
                sb.append("    REFERENCES ").append(fk.getToTable()).append(" (").append(fk.getToColumn()).append(")\n");
                sb.append("    ON DELETE ").append(fk.getOnDelete()).append("\n");
                sb.append("    ON UPDATE ").append(fk.getOnUpdate()).append(";\n\n");
            }

            for (JunctionTableMeta jm : junctionTables) {
                sb.append("ALTER TABLE ").append(jm.getQuotedTableName()).append("\n");
                sb.append("    ADD CONSTRAINT ").append(jm.getSourceFkConstraint()).append("\n");
                sb.append("    FOREIGN KEY (").append(quoteIdentifierIfNeeded(jm.getSourceColumn())).append(")\n");
                sb.append("    REFERENCES ").append(jm.getSourceTable()).append(" (id)\n");
                sb.append("    ON DELETE CASCADE\n");
                sb.append("    ON UPDATE CASCADE;\n\n");

                sb.append("ALTER TABLE ").append(jm.getQuotedTableName()).append("\n");
                sb.append("    ADD CONSTRAINT ").append(jm.getTargetFkConstraint()).append("\n");
                sb.append("    FOREIGN KEY (").append(quoteIdentifierIfNeeded(jm.getTargetColumn())).append(")\n");
                sb.append("    REFERENCES ").append(jm.getTargetTable()).append(" (id)\n");
                sb.append("    ON DELETE CASCADE\n");
                sb.append("    ON UPDATE CASCADE;\n\n");
            }
        }

        // Phase 5: B-Tree Indexes on Foreign Keys
        if (request.isCreateIndexes() && !indexes.isEmpty()) {
            sb.append("-- ----------------------------------------------------------------------------\n");
            sb.append("-- FASE 5: OPTIMIZACIÓN DE ÍNDICES B-TREE EN CLAVES FORÁNEAS\n");
            sb.append("-- ----------------------------------------------------------------------------\n");
            for (IndexMeta idx : indexes) {
                sb.append("CREATE INDEX IF NOT EXISTS ").append(idx.getIndexName())
                        .append(" ON ").append(idx.getTableName())
                        .append(" (").append(idx.getColumnName()).append(");\n");
            }
            sb.append("\n");
        }

        // Phase 6: Comments and Documentation
        if (request.isIncludeComments()) {
            sb.append("-- ----------------------------------------------------------------------------\n");
            sb.append("-- FASE 6: DOCUMENTACIÓN Y METADATOS DEL DICCIONARIO DE DATOS\n");
            sb.append("-- ----------------------------------------------------------------------------\n");
            for (TableMeta tm : tables) {
                sb.append("COMMENT ON TABLE ").append(tm.getQuotedTableName())
                        .append(" IS 'Entidad de dominio: ").append(escapeSqlString(tm.getOriginalClassName())).append("';\n");
                for (ColumnMeta cm : tm.getColumns()) {
                    if (cm.getComment() != null) {
                        sb.append("COMMENT ON COLUMN ").append(tm.getQuotedTableName()).append(".")
                                .append(quoteIdentifierIfNeeded(cm.getColumnName()))
                                .append(" IS '").append(escapeSqlString(cm.getComment())).append("';\n");
                    }
                }
            }
            for (JunctionTableMeta jm : junctionTables) {
                sb.append("COMMENT ON TABLE ").append(jm.getQuotedTableName())
                        .append(" IS '").append(escapeSqlString(jm.getComment())).append("';\n");
            }
            sb.append("\n");
        }

        // Footer Summary
        sb.append("-- ============================================================================\n");
        sb.append("-- RESUMEN DE GENERACIÓN DDL (POSTGRESQL 17):\n");
        sb.append("-- Total de Tablas: ").append(tables.size() + junctionTables.size()).append("\n");
        sb.append("-- Total de Claves Foráneas: ").append(foreignKeys.size() + (junctionTables.size() * 2)).append("\n");
        sb.append("-- Total de Índices Creados: ").append(indexes.size()).append("\n");
        sb.append("-- ============================================================================\n");

        return sb.toString();
    }

    private void recordAudit(
            DiagramProject project,
            UUID userId,
            String ip,
            String userAgent,
            int totalTables,
            int totalColumns,
            int totalFks,
            int totalIndexes,
            GenerateSqlDdlRequest request
    ) {
        Map<String, Object> details = new HashMap<>();
        details.put("projectName", project.getName());
        details.put("totalTables", totalTables);
        details.put("totalColumns", totalColumns);
        details.put("totalForeignKeys", totalFks);
        details.put("totalIndexes", totalIndexes);
        details.put("dropTables", request.isDropTables());
        details.put("createIndexes", request.isCreateIndexes());
        details.put("includeComments", request.isIncludeComments());
        details.put("version", project.getVersion());
        details.put("generator", "PostgreSQL17DdlGenerator");

        auditLogService.recordAction(
                userId,
                "SQL_DDL_GENERATED",
                "diagram_projects",
                project.getId(),
                ip != null ? ip : "127.0.0.1",
                userAgent != null ? userAgent : "CASE-Tool-SqlGenerator",
                details
        );
    }

    public static String mapToPostgreSqlType(String rawType, String columnName, boolean isPk) {
        if (isPk) {
            if (rawType != null && rawType.equalsIgnoreCase("UUID")) {
                return "UUID DEFAULT gen_random_uuid()";
            }
            if (rawType != null && (rawType.equalsIgnoreCase("String") || rawType.equalsIgnoreCase("VARCHAR"))) {
                return "VARCHAR(100)";
            }
            // Standard SQL:2008 / PG17 identity for PK
            return "BIGINT GENERATED ALWAYS AS IDENTITY";
        }

        if (rawType == null || rawType.isBlank()) {
            return "VARCHAR(255)";
        }

        String clean = rawType.trim().toLowerCase(Locale.ROOT);

        if (clean.equals("int") || clean.equals("integer")) return "INTEGER";
        if (clean.equals("long") || clean.equals("bigint")) return "BIGINT";
        if (clean.equals("short") || clean.equals("smallint")) return "SMALLINT";
        if (clean.equals("double") || clean.equals("float") || clean.equals("double precision")) return "DOUBLE PRECISION";
        if (clean.equals("bigdecimal") || clean.equals("decimal") || clean.equals("numeric") || clean.equals("moneda") || clean.equals("precio")) return "NUMERIC(12, 2)";
        if (clean.equals("boolean") || clean.equals("bool")) return "BOOLEAN";
        if (clean.equals("localdate") || clean.equals("date") || clean.equals("fecha")) return "DATE";
        if (clean.equals("localdatetime") || clean.equals("timestamp") || clean.equals("datetime") || clean.equals("timestamptz")) return "TIMESTAMPTZ";
        if (clean.equals("localtime") || clean.equals("time") || clean.equals("hora")) return "TIME";
        if (clean.equals("uuid")) return "UUID";
        if (clean.equals("byte[]") || clean.equals("bytearray") || clean.equals("blob") || clean.equals("binary") || clean.equals("bytea")) return "BYTEA";
        if (clean.equals("json") || clean.equals("jsonb") || clean.equals("jsonnode")) return "JSONB";

        // Textual attributes
        if (clean.equals("text") || clean.equals("clob") || clean.equals("memo")
                || columnName.contains("descripcion") || columnName.contains("detalle") || columnName.contains("contenido")) {
            return "TEXT";
        }

        return "VARCHAR(255)";
    }

    private static boolean isAutoIncrementCandidate(String rawType) {
        if (rawType == null) return true;
        String t = rawType.toLowerCase(Locale.ROOT);
        return t.equals("long") || t.equals("int") || t.equals("integer") || t.equals("id") || t.isBlank();
    }

    public static boolean isMany(String cardinality) {
        if (cardinality == null || cardinality.isBlank()) return false;
        String c = cardinality.trim().toLowerCase(Locale.ROOT);
        return c.contains("*") || c.contains("n") || c.contains("m");
    }

    public static String toSnakeCase(String str) {
        if (str == null || str.isBlank()) return "tabla";
        return str.replaceAll("([a-z])([A-Z]+)", "$1_$2")
                .replaceAll("[^a-zA-Z0-9_]", "_")
                .replaceAll("_+", "_")
                .replaceAll("^_|_$", "")
                .toLowerCase(Locale.ROOT);
    }

    public static String toKebabCase(String str) {
        if (str == null || str.isBlank()) return "esquema";
        return str.replaceAll("([a-z])([A-Z]+)", "$1-$2")
                .replaceAll("[^a-zA-Z0-9-]", "-")
                .replaceAll("-+", "-")
                .toLowerCase(Locale.ROOT);
    }

    public static String quoteIdentifierIfNeeded(String identifier) {
        if (identifier == null) return "objeto";
        String lower = identifier.toLowerCase(Locale.ROOT);
        if (RESERVED_KEYWORDS.contains(lower)) {
            return "\"" + lower + "\"";
        }
        return lower;
    }

    public static String safeConstraintName(String raw) {
        if (raw == null) return "c_gen";
        String clean = raw.replaceAll("[^a-zA-Z0-9_]", "_");
        // PostgreSQL NAMEDATALEN limit is 63 bytes
        if (clean.length() > 63) {
            return clean.substring(0, 63);
        }
        return clean;
    }

    private static String escapeSqlString(String str) {
        if (str == null) return "";
        return str.replace("'", "''");
    }
}
