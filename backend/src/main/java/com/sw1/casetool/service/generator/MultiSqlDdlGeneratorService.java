package com.sw1.casetool.service.generator;

import com.sw1.casetool.dto.generator.MultiSqlDdlRequest;
import com.sw1.casetool.dto.generator.MultiSqlDdlResponse;
import com.sw1.casetool.model.ClassNode;
import com.sw1.casetool.model.DiagramProject;
import com.sw1.casetool.model.Relationship;
import com.sw1.casetool.repository.ClassNodeRepository;
import com.sw1.casetool.repository.DiagramProjectRepository;
import com.sw1.casetool.repository.RelationshipRepository;
import com.sw1.casetool.service.AuditLogService;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * Servicio Compilador DDL Multi-Dialecto (CU16).
 * Soporta de forma nativa: PostgreSQL 17, MySQL 8.x, SQL Server (T-SQL) y Oracle Database.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MultiSqlDdlGeneratorService {

    private final DiagramProjectRepository projectRepository;
    private final ClassNodeRepository classNodeRepository;
    private final RelationshipRepository relationshipRepository;
    private final AuditLogService auditLogService;

    @Data
    @Builder
    public static class ColumnSpec {
        private String rawName;
        private String columnName;
        private String rawType;
        private boolean primaryKey;
        private boolean identity;
        private boolean nullable;
        private boolean unique;
        private String comment;
    }

    @Data
    @Builder
    public static class TableSpec {
        private UUID id;
        private String originalClassName;
        private String tableName;
        private List<ColumnSpec> columns;
        private ColumnSpec primaryKeyColumn;
        private boolean isAbstract;
    }

    @Data
    @Builder
    public static class ForeignKeySpec {
        private String constraintName;
        private String sourceTable;
        private String sourceColumn;
        private String targetTable;
        private String targetColumn;
        private String onDelete;
        private String onUpdate;
        private String comment;
    }

    @Data
    @Builder
    public static class IndexSpec {
        private String indexName;
        private String tableName;
        private String columnName;
        private boolean unique;
    }

    @Data
    @Builder
    public static class JunctionSpec {
        private String tableName;
        private String sourceTable;
        private String targetTable;
        private String sourceCol;
        private String targetCol;
    }

    @Transactional(readOnly = true)
    public MultiSqlDdlResponse generateMultiSqlDdl(UUID projectId, MultiSqlDdlRequest request, UUID requesterId) {
        DiagramProject project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Proyecto no encontrado"));

        List<ClassNode> classes = classNodeRepository.findByProjectId(projectId);
        List<Relationship> relationships = relationshipRepository.findByProjectId(projectId);

        MultiSqlDdlRequest.SqlDialect dialect = request.getDialect() != null
                ? request.getDialect()
                : MultiSqlDdlRequest.SqlDialect.POSTGRESQL;

        boolean dropTables = Boolean.TRUE.equals(request.getDropTables());
        boolean createIndexes = Boolean.TRUE.equals(request.getCreateIndexes());
        boolean includeComments = Boolean.TRUE.equals(request.getIncludeComments());
        boolean includeForeignKeys = Boolean.TRUE.equals(request.getIncludeForeignKeys());

        // 1. Extraer metadata de tablas y columnas
        Map<UUID, TableSpec> tableMap = extractTableSpecs(classes);

        // 2. Procesar relaciones (FKs y tablas intermedias N:M)
        List<ForeignKeySpec> foreignKeys = new ArrayList<>();
        List<JunctionSpec> junctionTables = new ArrayList<>();
        List<IndexSpec> indexes = new ArrayList<>();

        processRelationships(relationships, tableMap, foreignKeys, junctionTables, indexes);

        // 3. Ordenar tablas según dependencias (evitar errores de FK)
        List<TableSpec> orderedTables = sortTablesByDependencies(new ArrayList<>(tableMap.values()), foreignKeys);

        // 4. Compilar según el dialecto SQL solicitado
        List<String> warnings = new ArrayList<>();
        String ddlScript = renderDialectScript(
                dialect,
                project.getName(),
                orderedTables,
                junctionTables,
                foreignKeys,
                indexes,
                dropTables,
                createIndexes,
                includeComments,
                includeForeignKeys,
                warnings
        );

        int totalTables = orderedTables.size() + junctionTables.size();
        String dialectDisplayName = getDialectDisplayName(dialect);
        String fileName = "Esquema_" + sanitizeFileName(project.getName()) + "_" + dialect.name() + ".sql";

        if (requesterId != null) {
            auditLogService.recordAction(
                    requesterId,
                    "GENERATE_MULTI_SQL_DDL",
                    "PROJECT",
                    projectId,
                    "127.0.0.1",
                    "CASE-Tool-Generator",
                    Map.of(
                            "dialect", dialect.name(),
                            "tablesCount", totalTables
                    )
            );
        }

        int totalColumns = orderedTables.stream().mapToInt(t -> t.getColumns() != null ? t.getColumns().size() : 0).sum() + (junctionTables.size() * 2);

        return MultiSqlDdlResponse.builder()
                .dialect(dialect.name())
                .dialectDisplayName(dialectDisplayName)
                .ddlScript(ddlScript)
                .fileName(fileName)
                .tableCount(totalTables)
                .totalColumns(totalColumns)
                .relationshipCount(foreignKeys.size())
                .indexCount(indexes.size())
                .warnings(warnings)
                .build();
    }

    private String getDialectDisplayName(MultiSqlDdlRequest.SqlDialect dialect) {
        return switch (dialect) {
            case POSTGRESQL -> "PostgreSQL 17 (Estándar ANSI/ISO)";
            case MYSQL -> "MySQL 8.x / MariaDB (InnoDB)";
            case SQL_SERVER -> "Microsoft SQL Server (T-SQL)";
            case ORACLE -> "Oracle Database (19c / 21c)";
        };
    }

    private Map<UUID, TableSpec> extractTableSpecs(List<ClassNode> classes) {
        Map<UUID, TableSpec> map = new LinkedHashMap<>();

        for (ClassNode node : classes) {
            String origName = node.getName() != null && !node.getName().isBlank() ? node.getName().trim() : "Entidad";
            String tName = toSnakeCase(origName);

            List<ColumnSpec> columns = new ArrayList<>();
            ColumnSpec pkColumn = null;

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
                    boolean isIdentity = isPk && (rawType.equalsIgnoreCase("Long") || rawType.equalsIgnoreCase("Integer") || rawType.equalsIgnoreCase("BigInteger"));

                    ColumnSpec col = ColumnSpec.builder()
                            .rawName(rawName)
                            .columnName(colName)
                            .rawType(rawType)
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

            // Defensa 1NF: Clave primaria sintetizada si no existe
            if (pkColumn == null) {
                pkColumn = ColumnSpec.builder()
                        .rawName("id")
                        .columnName("id")
                        .rawType("Long")
                        .primaryKey(true)
                        .identity(true)
                        .nullable(false)
                        .unique(true)
                        .comment("Clave primaria sintetizada automáticamente (Defensa 1NF)")
                        .build();
                columns.add(0, pkColumn);
            }

            TableSpec tm = TableSpec.builder()
                    .id(node.getId())
                    .originalClassName(origName)
                    .tableName(tName)
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
            Map<UUID, TableSpec> tableMap,
            List<ForeignKeySpec> foreignKeys,
            List<JunctionSpec> junctionTables,
            List<IndexSpec> indexes
    ) {
        Set<String> processedJunctions = new HashSet<>();

        for (Relationship rel : relationships) {
            if (rel.getSourceClass() == null || rel.getTargetClass() == null) continue;

            TableSpec src = tableMap.get(rel.getSourceClass().getId());
            TableSpec tgt = tableMap.get(rel.getTargetClass().getId());
            if (src == null || tgt == null) continue;

            String srcCard = rel.getSourceCardinality() != null ? rel.getSourceCardinality().trim() : "1";
            String tgtCard = rel.getTargetCardinality() != null ? rel.getTargetCardinality().trim() : "1";

            boolean isSelf = src.getId().equals(tgt.getId());
            boolean manySrc = isMany(srcCard);
            boolean manyTgt = isMany(tgtCard);

            if (isSelf) {
                String fkCol = "id_padre";
                ensureColumnExists(src, fkCol, "Long", true, false, "Auto-relación recursiva");
                foreignKeys.add(ForeignKeySpec.builder()
                        .constraintName("fk_" + src.getTableName() + "_parent")
                        .sourceTable(src.getTableName())
                        .sourceColumn(fkCol)
                        .targetTable(src.getTableName())
                        .targetColumn(src.getPrimaryKeyColumn().getColumnName())
                        .onDelete("SET NULL")
                        .onUpdate("CASCADE")
                        .comment("Auto-relación jerárquica")
                        .build());
                indexes.add(IndexSpec.builder()
                        .indexName("idx_" + src.getTableName() + "_" + fkCol)
                        .tableName(src.getTableName())
                        .columnName(fkCol)
                        .build());
            } else if (manySrc && manyTgt) {
                // Relación N:M -> Tabla Intermedia
                String jName = src.getTableName().compareTo(tgt.getTableName()) < 0
                        ? src.getTableName() + "_" + tgt.getTableName()
                        : tgt.getTableName() + "_" + src.getTableName();

                if (processedJunctions.add(jName)) {
                    junctionTables.add(JunctionSpec.builder()
                            .tableName(jName)
                            .sourceTable(src.getTableName())
                            .targetTable(tgt.getTableName())
                            .sourceCol(src.getTableName() + "_id")
                            .targetCol(tgt.getTableName() + "_id")
                            .build());
                }
            } else {
                // Relación 1:N o 1:1
                TableSpec childTable = manyTgt ? tgt : src;
                TableSpec parentTable = manyTgt ? src : tgt;

                String fkCol = parentTable.getTableName() + "_id";
                boolean isNullable = srcCard.equals("0..1") || tgtCard.equals("0..1");
                boolean isOneToOne = (!manySrc && !manyTgt);

                ensureColumnExists(childTable, fkCol, parentTable.getPrimaryKeyColumn().getRawType(), isNullable, isOneToOne, "Clave foránea hacia " + parentTable.getTableName());

                foreignKeys.add(ForeignKeySpec.builder()
                        .constraintName("fk_" + childTable.getTableName() + "_" + parentTable.getTableName())
                        .sourceTable(childTable.getTableName())
                        .sourceColumn(fkCol)
                        .targetTable(parentTable.getTableName())
                        .targetColumn(parentTable.getPrimaryKeyColumn().getColumnName())
                        .onDelete("CASCADE")
                        .onUpdate("CASCADE")
                        .comment("Relación con " + parentTable.getOriginalClassName())
                        .build());

                indexes.add(IndexSpec.builder()
                        .indexName("idx_" + childTable.getTableName() + "_" + fkCol)
                        .tableName(childTable.getTableName())
                        .columnName(fkCol)
                        .unique(isOneToOne)
                        .build());
            }
        }
    }

    private void ensureColumnExists(TableSpec table, String colName, String rawType, boolean nullable, boolean unique, String comment) {
        boolean exists = table.getColumns().stream().anyMatch(c -> c.getColumnName().equalsIgnoreCase(colName));
        if (!exists) {
            table.getColumns().add(ColumnSpec.builder()
                    .rawName(colName)
                    .columnName(colName)
                    .rawType(rawType)
                    .primaryKey(false)
                    .identity(false)
                    .nullable(nullable)
                    .unique(unique)
                    .comment(comment)
                    .build());
        }
    }

    private List<TableSpec> sortTablesByDependencies(List<TableSpec> tables, List<ForeignKeySpec> foreignKeys) {
        Map<String, Set<String>> graph = new HashMap<>();
        Map<String, TableSpec> byName = new HashMap<>();

        for (TableSpec t : tables) {
            graph.put(t.getTableName(), new HashSet<>());
            byName.put(t.getTableName(), t);
        }

        for (ForeignKeySpec fk : foreignKeys) {
            if (!fk.getSourceTable().equals(fk.getTargetTable())) {
                if (graph.containsKey(fk.getSourceTable())) {
                    graph.get(fk.getSourceTable()).add(fk.getTargetTable());
                }
            }
        }

        List<TableSpec> result = new ArrayList<>();
        Set<String> visited = new HashSet<>();
        Set<String> visiting = new HashSet<>();

        for (TableSpec t : tables) {
            if (!visited.contains(t.getTableName())) {
                topologicalSort(t.getTableName(), graph, visited, visiting, result, byName);
            }
        }

        return result;
    }

    private void topologicalSort(
            String node,
            Map<String, Set<String>> graph,
            Set<String> visited,
            Set<String> visiting,
            List<TableSpec> result,
            Map<String, TableSpec> byName
    ) {
        visiting.add(node);
        for (String dep : graph.getOrDefault(node, Collections.emptySet())) {
            if (!visited.contains(dep) && !visiting.contains(dep)) {
                topologicalSort(dep, graph, visited, visiting, result, byName);
            }
        }
        visiting.remove(node);
        visited.add(node);
        if (byName.containsKey(node)) {
            result.add(byName.get(node));
        }
    }

    private String renderDialectScript(
            MultiSqlDdlRequest.SqlDialect dialect,
            String projectName,
            List<TableSpec> tables,
            List<JunctionSpec> junctions,
            List<ForeignKeySpec> foreignKeys,
            List<IndexSpec> indexes,
            boolean dropTables,
            boolean createIndexes,
            boolean includeComments,
            boolean includeForeignKeys,
            List<String> warnings
    ) {
        StringBuilder sb = new StringBuilder();
        String dateStr = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss").withZone(ZoneId.systemDefault()).format(Instant.now());

        // Cabecera común de ingeniería
        sb.append("-- ============================================================================\n");
        sb.append("-- PROYECTO: ").append(projectName).append("\n");
        sb.append("-- MOTOR OBJETIVO: ").append(getDialectDisplayName(dialect)).append("\n");
        sb.append("-- GENERADO POR: CASE Tool UML Colaborativa con IA (CU16 Multi-Motor)\n");
        sb.append("-- FECHA DE COMPILACIÓN: ").append(dateStr).append("\n");
        sb.append("-- ============================================================================\n\n");

        switch (dialect) {
            case POSTGRESQL -> renderPostgreSql(sb, tables, junctions, foreignKeys, indexes, dropTables, createIndexes, includeComments, includeForeignKeys);
            case MYSQL -> renderMySql(sb, tables, junctions, foreignKeys, indexes, dropTables, createIndexes, includeComments, includeForeignKeys);
            case SQL_SERVER -> renderSqlServer(sb, tables, junctions, foreignKeys, indexes, dropTables, createIndexes, includeComments, includeForeignKeys);
            case ORACLE -> renderOracle(sb, tables, junctions, foreignKeys, indexes, dropTables, createIndexes, includeComments, includeForeignKeys);
        }

        return sb.toString();
    }

    // 1. DIALECTO POSTGRESQL 17
    private void renderPostgreSql(
            StringBuilder sb, List<TableSpec> tables, List<JunctionSpec> junctions,
            List<ForeignKeySpec> foreignKeys, List<IndexSpec> indexes,
            boolean drop, boolean createIdx, boolean comments, boolean fks
    ) {
        if (drop) {
            sb.append("-- 1. ELIMINACIÓN DE TABLAS PREVIAS (CASCADE)\n");
            for (JunctionSpec j : junctions) {
                sb.append("DROP TABLE IF EXISTS \"").append(j.getTableName()).append("\" CASCADE;\n");
            }
            for (int i = tables.size() - 1; i >= 0; i--) {
                sb.append("DROP TABLE IF EXISTS \"").append(tables.get(i).getTableName()).append("\" CASCADE;\n");
            }
            sb.append("\n");
        }

        sb.append("-- 2. CREACIÓN DE TABLAS DE ENTIDADES\n");
        for (TableSpec t : tables) {
            sb.append("CREATE TABLE \"").append(t.getTableName()).append("\" (\n");
            List<String> colLines = new ArrayList<>();
            for (ColumnSpec c : t.getColumns()) {
                String type = mapTypePostgres(c);
                String line = "    \"" + c.getColumnName() + "\" " + type;
                if (c.isPrimaryKey()) {
                    line += " PRIMARY KEY";
                } else {
                    if (!c.isNullable()) line += " NOT NULL";
                    if (c.isUnique()) line += " UNIQUE";
                }
                colLines.add(line);
            }
            sb.append(String.join(",\n", colLines));
            sb.append("\n);\n\n");
        }

        // Tablas intermedias
        for (JunctionSpec j : junctions) {
            sb.append("CREATE TABLE \"").append(j.getTableName()).append("\" (\n");
            sb.append("    \"").append(j.getSourceCol()).append("\" BIGINT NOT NULL,\n");
            sb.append("    \"").append(j.getTargetCol()).append("\" BIGINT NOT NULL,\n");
            sb.append("    PRIMARY KEY (\"").append(j.getSourceCol()).append("\", \"").append(j.getTargetCol()).append("\")\n");
            sb.append(");\n\n");
        }

        if (fks) {
            sb.append("-- 3. RESTRICCIONES DE CLAVE FORÁNEA (CASCADE)\n");
            for (ForeignKeySpec fk : foreignKeys) {
                sb.append("ALTER TABLE \"").append(fk.getSourceTable()).append("\"\n")
                        .append("    ADD CONSTRAINT \"").append(fk.getConstraintName()).append("\"\n")
                        .append("    FOREIGN KEY (\"").append(fk.getSourceColumn()).append("\")\n")
                        .append("    REFERENCES \"").append(fk.getTargetTable()).append("\" (\"").append(fk.getTargetColumn()).append("\")\n")
                        .append("    ON DELETE ").append(fk.getOnDelete()).append(" ON UPDATE ").append(fk.getOnUpdate()).append(";\n\n");
            }
            for (JunctionSpec j : junctions) {
                sb.append("ALTER TABLE \"").append(j.getTableName()).append("\"\n")
                        .append("    ADD CONSTRAINT \"fk_").append(j.getTableName()).append("_src\"\n")
                        .append("    FOREIGN KEY (\"").append(j.getSourceCol()).append("\") REFERENCES \"").append(j.getSourceTable()).append("\" (id) ON DELETE CASCADE;\n\n");
                sb.append("ALTER TABLE \"").append(j.getTableName()).append("\"\n")
                        .append("    ADD CONSTRAINT \"fk_").append(j.getTableName()).append("_tgt\"\n")
                        .append("    FOREIGN KEY (\"").append(j.getTargetCol()).append("\") REFERENCES \"").append(j.getTargetTable()).append("\" (id) ON DELETE CASCADE;\n\n");
            }
        }

        if (createIdx) {
            sb.append("-- 4. ÍNDICES DE RENDIMIENTO (B-TREE)\n");
            for (IndexSpec idx : indexes) {
                sb.append("CREATE INDEX IF NOT EXISTS \"").append(idx.getIndexName()).append("\"\n")
                        .append("    ON \"").append(idx.getTableName()).append("\" (\"").append(idx.getColumnName()).append("\");\n");
            }
            sb.append("\n");
        }
    }

    // 2. DIALECTO MYSQL 8.X
    private void renderMySql(
            StringBuilder sb, List<TableSpec> tables, List<JunctionSpec> junctions,
            List<ForeignKeySpec> foreignKeys, List<IndexSpec> indexes,
            boolean drop, boolean createIdx, boolean comments, boolean fks
    ) {
        sb.append("SET FOREIGN_KEY_CHECKS = 0;\n\n");

        if (drop) {
            sb.append("-- 1. ELIMINACIÓN DE TABLAS PREVIAS\n");
            for (JunctionSpec j : junctions) {
                sb.append("DROP TABLE IF EXISTS `").append(j.getTableName()).append("`;\n");
            }
            for (int i = tables.size() - 1; i >= 0; i--) {
                sb.append("DROP TABLE IF EXISTS `").append(tables.get(i).getTableName()).append("`;\n");
            }
            sb.append("\n");
        }

        sb.append("-- 2. CREACIÓN DE TABLAS DE ENTIDADES (InnoDB UTF8MB4)\n");
        for (TableSpec t : tables) {
            sb.append("CREATE TABLE `").append(t.getTableName()).append("` (\n");
            List<String> colLines = new ArrayList<>();
            for (ColumnSpec c : t.getColumns()) {
                String type = mapTypeMySql(c);
                String line = "    `" + c.getColumnName() + "` " + type;
                if (c.isPrimaryKey()) {
                    line += " PRIMARY KEY";
                } else {
                    if (!c.isNullable()) line += " NOT NULL";
                    if (c.isUnique()) line += " UNIQUE";
                }
                if (comments && c.getComment() != null) {
                    line += " COMMENT '" + c.getComment().replace("'", "''") + "'";
                }
                colLines.add(line);
            }
            sb.append(String.join(",\n", colLines));
            sb.append("\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n");
        }

        for (JunctionSpec j : junctions) {
            sb.append("CREATE TABLE `").append(j.getTableName()).append("` (\n");
            sb.append("    `").append(j.getSourceCol()).append("` BIGINT NOT NULL,\n");
            sb.append("    `").append(j.getTargetCol()).append("` BIGINT NOT NULL,\n");
            sb.append("    PRIMARY KEY (`").append(j.getSourceCol()).append("`, `").append(j.getTargetCol()).append("`)\n");
            sb.append(") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n");
        }

        if (fks) {
            sb.append("-- 3. RESTRICCIONES DE CLAVE FORÁNEA\n");
            for (ForeignKeySpec fk : foreignKeys) {
                sb.append("ALTER TABLE `").append(fk.getSourceTable()).append("`\n")
                        .append("    ADD CONSTRAINT `").append(fk.getConstraintName()).append("`\n")
                        .append("    FOREIGN KEY (`").append(fk.getSourceColumn()).append("`)\n")
                        .append("    REFERENCES `").append(fk.getTargetTable()).append("` (`").append(fk.getTargetColumn()).append("`)\n")
                        .append("    ON DELETE ").append(fk.getOnDelete()).append(" ON UPDATE ").append(fk.getOnUpdate()).append(";\n\n");
            }
            for (JunctionSpec j : junctions) {
                sb.append("ALTER TABLE `").append(j.getTableName()).append("`\n")
                        .append("    ADD CONSTRAINT `fk_").append(j.getTableName()).append("_src`\n")
                        .append("    FOREIGN KEY (`").append(j.getSourceCol()).append("`) REFERENCES `").append(j.getSourceTable()).append("` (`id`) ON DELETE CASCADE;\n\n");
                sb.append("ALTER TABLE `").append(j.getTableName()).append("`\n")
                        .append("    ADD CONSTRAINT `fk_").append(j.getTableName()).append("_tgt`\n")
                        .append("    FOREIGN KEY (`").append(j.getTargetCol()).append("`) REFERENCES `").append(j.getTargetTable()).append("` (`id`) ON DELETE CASCADE;\n\n");
            }
        }

        if (createIdx) {
            sb.append("-- 4. ÍNDICES DE RENDIMIENTO\n");
            for (IndexSpec idx : indexes) {
                sb.append("CREATE INDEX `").append(idx.getIndexName()).append("`\n")
                        .append("    ON `").append(idx.getTableName()).append("` (`").append(idx.getColumnName()).append("`);\n");
            }
            sb.append("\n");
        }

        sb.append("SET FOREIGN_KEY_CHECKS = 1;\n");
    }

    // 3. DIALECTO SQL SERVER (T-SQL)
    private void renderSqlServer(
            StringBuilder sb, List<TableSpec> tables, List<JunctionSpec> junctions,
            List<ForeignKeySpec> foreignKeys, List<IndexSpec> indexes,
            boolean drop, boolean createIdx, boolean comments, boolean fks
    ) {
        if (drop) {
            sb.append("-- 1. ELIMINACIÓN DE TABLAS PREVIAS (T-SQL)\n");
            for (JunctionSpec j : junctions) {
                sb.append("IF OBJECT_ID('dbo.[").append(j.getTableName()).append("]', 'U') IS NOT NULL DROP TABLE dbo.[").append(j.getTableName()).append("];\n");
            }
            for (int i = tables.size() - 1; i >= 0; i--) {
                sb.append("IF OBJECT_ID('dbo.[").append(tables.get(i).getTableName()).append("]', 'U') IS NOT NULL DROP TABLE dbo.[").append(tables.get(i).getTableName()).append("];\n");
            }
            sb.append("GO\n\n");
        }

        sb.append("-- 2. CREACIÓN DE TABLAS DE ENTIDADES\n");
        for (TableSpec t : tables) {
            sb.append("CREATE TABLE [dbo].[").append(t.getTableName()).append("] (\n");
            List<String> colLines = new ArrayList<>();
            for (ColumnSpec c : t.getColumns()) {
                String type = mapTypeSqlServer(c);
                String line = "    [" + c.getColumnName() + "] " + type;
                if (c.isPrimaryKey()) {
                    line += " PRIMARY KEY";
                } else {
                    if (!c.isNullable()) line += " NOT NULL";
                    if (c.isUnique()) line += " UNIQUE";
                }
                colLines.add(line);
            }
            sb.append(String.join(",\n", colLines));
            sb.append("\n);\nGO\n\n");
        }

        for (JunctionSpec j : junctions) {
            sb.append("CREATE TABLE [dbo].[").append(j.getTableName()).append("] (\n");
            sb.append("    [").append(j.getSourceCol()).append("] BIGINT NOT NULL,\n");
            sb.append("    [").append(j.getTargetCol()).append("] BIGINT NOT NULL,\n");
            sb.append("    PRIMARY KEY ([").append(j.getSourceCol()).append("], [").append(j.getTargetCol()).append("])\n");
            sb.append(");\nGO\n\n");
        }

        if (fks) {
            sb.append("-- 3. RESTRICCIONES DE CLAVE FORÁNEA\n");
            for (ForeignKeySpec fk : foreignKeys) {
                sb.append("ALTER TABLE [dbo].[").append(fk.getSourceTable()).append("]\n")
                        .append("    ADD CONSTRAINT [").append(fk.getConstraintName()).append("]\n")
                        .append("    FOREIGN KEY ([").append(fk.getSourceColumn()).append("])\n")
                        .append("    REFERENCES [dbo].[").append(fk.getTargetTable()).append("] ([").append(fk.getTargetColumn()).append("])\n")
                        .append("    ON DELETE ").append(fk.getOnDelete()).append(";\nGO\n\n");
            }
            for (JunctionSpec j : junctions) {
                sb.append("ALTER TABLE [dbo].[").append(j.getTableName()).append("]\n")
                        .append("    ADD CONSTRAINT [fk_").append(j.getTableName()).append("_src]\n")
                        .append("    FOREIGN KEY ([").append(j.getSourceCol()).append("]) REFERENCES [dbo].[").append(j.getSourceTable()).append("] ([id]) ON DELETE CASCADE;\nGO\n\n");
                sb.append("ALTER TABLE [dbo].[").append(j.getTableName()).append("]\n")
                        .append("    ADD CONSTRAINT [fk_").append(j.getTableName()).append("_tgt]\n")
                        .append("    FOREIGN KEY ([").append(j.getTargetCol()).append("]) REFERENCES [dbo].[").append(j.getTargetTable()).append("] ([id]) ON DELETE CASCADE;\nGO\n\n");
            }
        }

        if (createIdx) {
            sb.append("-- 4. ÍNDICES DE RENDIMIENTO\n");
            for (IndexSpec idx : indexes) {
                sb.append("CREATE NONCLUSTERED INDEX [").append(idx.getIndexName()).append("]\n")
                        .append("    ON [dbo].[").append(idx.getTableName()).append("] ([").append(idx.getColumnName()).append("]);\nGO\n");
            }
            sb.append("\n");
        }
    }

    // 4. DIALECTO ORACLE DATABASE
    private void renderOracle(
            StringBuilder sb, List<TableSpec> tables, List<JunctionSpec> junctions,
            List<ForeignKeySpec> foreignKeys, List<IndexSpec> indexes,
            boolean drop, boolean createIdx, boolean comments, boolean fks
    ) {
        if (drop) {
            sb.append("-- 1. ELIMINACIÓN DE TABLAS PREVIAS (CASCADE CONSTRAINTS)\n");
            for (JunctionSpec j : junctions) {
                sb.append("BEGIN EXECUTE IMMEDIATE 'DROP TABLE \"").append(j.getTableName().toUpperCase()).append("\" CASCADE CONSTRAINTS'; EXCEPTION WHEN OTHERS THEN NULL; END;\n/\n");
            }
            for (int i = tables.size() - 1; i >= 0; i--) {
                sb.append("BEGIN EXECUTE IMMEDIATE 'DROP TABLE \"").append(tables.get(i).getTableName().toUpperCase()).append("\" CASCADE CONSTRAINTS'; EXCEPTION WHEN OTHERS THEN NULL; END;\n/\n");
            }
            sb.append("\n");
        }

        sb.append("-- 2. CREACIÓN DE TABLAS DE ENTIDADES\n");
        for (TableSpec t : tables) {
            sb.append("CREATE TABLE \"").append(t.getTableName().toUpperCase()).append("\" (\n");
            List<String> colLines = new ArrayList<>();
            for (ColumnSpec c : t.getColumns()) {
                String type = mapTypeOracle(c);
                String line = "    \"" + c.getColumnName().toUpperCase() + "\" " + type;
                if (c.isPrimaryKey()) {
                    line += " PRIMARY KEY";
                } else {
                    if (!c.isNullable()) line += " NOT NULL";
                    if (c.isUnique()) line += " UNIQUE";
                }
                colLines.add(line);
            }
            sb.append(String.join(",\n", colLines));
            sb.append("\n);\n\n");
        }

        for (JunctionSpec j : junctions) {
            sb.append("CREATE TABLE \"").append(j.getTableName().toUpperCase()).append("\" (\n");
            sb.append("    \"").append(j.getSourceCol().toUpperCase()).append("\" NUMBER(19) NOT NULL,\n");
            sb.append("    \"").append(j.getTargetCol().toUpperCase()).append("\" NUMBER(19) NOT NULL,\n");
            sb.append("    PRIMARY KEY (\"").append(j.getSourceCol().toUpperCase()).append("\", \"").append(j.getTargetCol().toUpperCase()).append("\")\n");
            sb.append(");\n\n");
        }

        if (fks) {
            sb.append("-- 3. RESTRICCIONES DE CLAVE FORÁNEA\n");
            for (ForeignKeySpec fk : foreignKeys) {
                sb.append("ALTER TABLE \"").append(fk.getSourceTable().toUpperCase()).append("\"\n")
                        .append("    ADD CONSTRAINT \"").append(fk.getConstraintName().toUpperCase()).append("\"\n")
                        .append("    FOREIGN KEY (\"").append(fk.getSourceColumn().toUpperCase()).append("\")\n")
                        .append("    REFERENCES \"").append(fk.getTargetTable().toUpperCase()).append("\" (\"").append(fk.getTargetColumn().toUpperCase()).append("\")\n")
                        .append("    ON DELETE ").append(fk.getOnDelete()).append(";\n\n");
            }
            for (JunctionSpec j : junctions) {
                sb.append("ALTER TABLE \"").append(j.getTableName().toUpperCase()).append("\"\n")
                        .append("    ADD CONSTRAINT \"FK_").append(j.getTableName().toUpperCase()).append("_SRC\"\n")
                        .append("    FOREIGN KEY (\"").append(j.getSourceCol().toUpperCase()).append("\") REFERENCES \"").append(j.getSourceTable().toUpperCase()).append("\" (\"ID\") ON DELETE CASCADE;\n\n");
                sb.append("ALTER TABLE \"").append(j.getTableName().toUpperCase()).append("\"\n")
                        .append("    ADD CONSTRAINT \"FK_").append(j.getTableName().toUpperCase()).append("_TGT\"\n")
                        .append("    FOREIGN KEY (\"").append(j.getTargetCol().toUpperCase()).append("\") REFERENCES \"").append(j.getTargetTable().toUpperCase()).append("\" (\"ID\") ON DELETE CASCADE;\n\n");
            }
        }

        if (createIdx) {
            sb.append("-- 4. ÍNDICES DE RENDIMIENTO\n");
            for (IndexSpec idx : indexes) {
                sb.append("CREATE INDEX \"").append(idx.getIndexName().toUpperCase()).append("\"\n")
                        .append("    ON \"").append(idx.getTableName().toUpperCase()).append("\" (\"").append(idx.getColumnName().toUpperCase()).append("\");\n");
            }
            sb.append("\n");
        }
    }

    // MAPEOS DE TIPOS ROBUSTOS (PREVALECE TIPO ESTRICTO JAVA/SQL)
    private String mapTypePostgres(ColumnSpec c) {
        if (c.isIdentity() && c.isPrimaryKey()) return "BIGINT GENERATED ALWAYS AS IDENTITY";
        String t = c.getRawType() != null ? c.getRawType().trim().toLowerCase() : "string";
        return switch (t) {
            case "long", "bigint" -> "BIGINT";
            case "integer", "int" -> "INTEGER";
            case "short" -> "SMALLINT";
            case "double", "float" -> "DOUBLE PRECISION";
            case "bigdecimal", "decimal", "numeric" -> "NUMERIC(19, 4)";
            case "boolean", "bool" -> "BOOLEAN";
            case "localdate", "date" -> "DATE";
            case "localdatetime", "timestamp", "instant" -> "TIMESTAMP WITH TIME ZONE";
            case "uuid" -> "UUID";
            case "text", "clob" -> "TEXT";
            default -> "VARCHAR(255)";
        };
    }

    private String mapTypeMySql(ColumnSpec c) {
        if (c.isIdentity() && c.isPrimaryKey()) return "BIGINT AUTO_INCREMENT";
        String t = c.getRawType() != null ? c.getRawType().trim().toLowerCase() : "string";
        return switch (t) {
            case "long", "bigint" -> "BIGINT";
            case "integer", "int" -> "INT";
            case "short" -> "SMALLINT";
            case "double", "float" -> "DOUBLE";
            case "bigdecimal", "decimal", "numeric" -> "DECIMAL(19, 4)";
            case "boolean", "bool" -> "TINYINT(1)";
            case "localdate", "date" -> "DATE";
            case "localdatetime", "timestamp", "instant" -> "DATETIME";
            case "uuid" -> "CHAR(36)";
            case "text", "clob" -> "TEXT";
            default -> "VARCHAR(255)";
        };
    }

    private String mapTypeSqlServer(ColumnSpec c) {
        if (c.isIdentity() && c.isPrimaryKey()) return "BIGINT IDENTITY(1,1)";
        String t = c.getRawType() != null ? c.getRawType().trim().toLowerCase() : "string";
        return switch (t) {
            case "long", "bigint" -> "BIGINT";
            case "integer", "int" -> "INT";
            case "short" -> "SMALLINT";
            case "double", "float" -> "FLOAT";
            case "bigdecimal", "decimal", "numeric" -> "DECIMAL(19, 4)";
            case "boolean", "bool" -> "BIT";
            case "localdate", "date" -> "DATE";
            case "localdatetime", "timestamp", "instant" -> "DATETIME2";
            case "uuid" -> "UNIQUEIDENTIFIER";
            case "text", "clob" -> "NVARCHAR(MAX)";
            default -> "NVARCHAR(255)";
        };
    }

    private String mapTypeOracle(ColumnSpec c) {
        if (c.isIdentity() && c.isPrimaryKey()) return "NUMBER(19) GENERATED BY DEFAULT AS IDENTITY";
        String t = c.getRawType() != null ? c.getRawType().trim().toLowerCase() : "string";
        return switch (t) {
            case "long", "bigint" -> "NUMBER(19)";
            case "integer", "int" -> "NUMBER(10)";
            case "short" -> "NUMBER(5)";
            case "double", "float" -> "BINARY_DOUBLE";
            case "bigdecimal", "decimal", "numeric" -> "NUMBER(19, 4)";
            case "boolean", "bool" -> "NUMBER(1)";
            case "localdate", "date" -> "DATE";
            case "localdatetime", "timestamp", "instant" -> "TIMESTAMP WITH TIME ZONE";
            case "uuid" -> "RAW(16)";
            case "text", "clob" -> "CLOB";
            default -> "VARCHAR2(255)";
        };
    }

    private static boolean isMany(String card) {
        if (card == null) return false;
        String c = card.trim();
        return c.equals("*") || c.endsWith("..*") || c.equals("0..*") || c.equals("1..*") || c.equals("m") || c.equals("n");
    }

    private static String toSnakeCase(String str) {
        if (str == null) return "";
        return str.replaceAll("([a-z])([A-Z]+)", "$1_$2")
                .replaceAll("[\\s\\-]+", "_")
                .toLowerCase()
                .trim();
    }

    private static String sanitizeFileName(String name) {
        if (name == null) return "proyecto";
        return name.replaceAll("[^a-zA-Z0-9_-]", "_");
    }
}
