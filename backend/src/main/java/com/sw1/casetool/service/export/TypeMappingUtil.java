package com.sw1.casetool.service.export;

import java.util.Locale;
import java.util.Map;

public final class TypeMappingUtil {

    private TypeMappingUtil() {}

    /**
     * Determines whether an attribute is a Primary Key ({PK}) checking
     * all standard persistence keys: isId, isPrimaryKey, isPk (boolean or truthy string).
     */
    public static boolean isPrimaryKey(Map<String, Object> attr) {
        if (attr == null) return false;
        Object isId = attr.get("isId");
        Object isPrimaryKey = attr.get("isPrimaryKey");
        Object isPk = attr.get("isPk");

        if (Boolean.TRUE.equals(isId) || Boolean.TRUE.equals(isPrimaryKey) || Boolean.TRUE.equals(isPk)) {
            return true;
        }
        if (isTruthy(isId) || isTruthy(isPrimaryKey) || isTruthy(isPk)) {
            return true;
        }
        return false;
    }

    /**
     * Determines whether an attribute is NOT NULL (mandatory).
     * Primary Keys are always NOT NULL. Other attributes are checked for isNotNull or isNullable.
     */
    public static boolean isNotNull(Map<String, Object> attr) {
        if (attr == null) return false;
        if (isPrimaryKey(attr)) return true;

        Object isNotNull = attr.get("isNotNull");
        if (Boolean.TRUE.equals(isNotNull) || isTruthy(isNotNull)) return true;

        Object isNullable = attr.get("isNullable");
        if (Boolean.FALSE.equals(isNullable) || (isNullable instanceof String && "false".equalsIgnoreCase((String) isNullable))) {
            return true;
        }

        return false;
    }

    private static boolean isTruthy(Object val) {
        if (val instanceof String s) {
            return "true".equalsIgnoreCase(s) || "1".equals(s);
        }
        if (val instanceof Number n) {
            return n.intValue() == 1;
        }
        return false;
    }

    /**
     * Maps visibility to canonical UML symbol: +, -, #, ~
     */
    public static String toVisibilitySymbol(String vis) {
        if (vis == null || vis.trim().isEmpty()) return "+";
        String v = vis.trim().toLowerCase(Locale.ROOT);
        if (v.equals("+") || v.equals("public")) return "+";
        if (v.equals("-") || v.equals("private")) return "-";
        if (v.equals("#") || v.equals("protected")) return "#";
        if (v.equals("~") || v.equals("package") || v.equals("package-private")) return "~";
        return "+";
    }

    public static String toPostgresType(String umlType) {
        if (umlType == null || umlType.trim().isEmpty()) {
            return "VARCHAR(255)";
        }
        String clean = umlType.trim();
        String lower = clean.toLowerCase(Locale.ROOT);

        if (lower.equals("long") || lower.equals("bigint")) return "BIGINT";
        if (lower.equals("int") || lower.equals("integer")) return "INTEGER";
        if (lower.equals("double") || lower.equals("float") || lower.equals("double precision")) return "DOUBLE PRECISION";
        if (lower.equals("bigdecimal") || lower.startsWith("decimal") || lower.startsWith("numeric")) return "NUMERIC(15,2)";
        if (lower.equals("string") || lower.equals("varchar")) return "VARCHAR(255)";
        if (lower.equals("text")) return "TEXT";
        if (lower.equals("boolean") || lower.equals("bool")) return "BOOLEAN";
        if (lower.equals("localdate") || lower.equals("date")) return "DATE";
        if (lower.equals("localdatetime") || lower.equals("instant") || lower.equals("timestamp") || lower.equals("timestamptz")) return "TIMESTAMPTZ";
        if (lower.equals("uuid")) return "UUID";
        if (lower.equals("byte[]") || lower.equals("blob")) return "BYTEA";
        if (lower.contains("[]") || lower.startsWith("list<") || lower.startsWith("set<")) return "TEXT[]";
        
        return "VARCHAR(255)";
    }

    public static String toJavaType(String umlType) {
        if (umlType == null || umlType.trim().isEmpty()) {
            return "String";
        }
        String clean = umlType.trim();
        String lower = clean.toLowerCase(Locale.ROOT);

        if (lower.equals("long") || lower.equals("bigint")) return "Long";
        if (lower.equals("int") || lower.equals("integer")) return "Integer";
        if (lower.equals("double") || lower.equals("float")) return "Double";
        if (lower.equals("bigdecimal") || lower.startsWith("decimal") || lower.startsWith("numeric")) return "BigDecimal";
        if (lower.equals("string") || lower.equals("text") || lower.equals("varchar")) return "String";
        if (lower.equals("boolean") || lower.equals("bool")) return "Boolean";
        if (lower.equals("localdate") || lower.equals("date")) return "LocalDate";
        if (lower.equals("localdatetime") || lower.equals("timestamp")) return "LocalDateTime";
        if (lower.equals("instant")) return "Instant";
        if (lower.equals("uuid")) return "UUID";
        if (lower.equals("byte[]") || lower.equals("blob")) return "byte[]";
        if (lower.contains("[]")) return "String[]";
        if (lower.startsWith("list<")) return clean;

        return clean;
    }
}
