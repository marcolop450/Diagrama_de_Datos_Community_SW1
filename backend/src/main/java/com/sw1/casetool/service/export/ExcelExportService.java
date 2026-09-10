package com.sw1.casetool.service.export;

import com.sw1.casetool.model.ClassNode;
import com.sw1.casetool.model.DiagramProject;
import com.sw1.casetool.model.Relationship;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.*;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class ExcelExportService {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss")
            .withZone(ZoneId.systemDefault());

    public byte[] exportToExcel(DiagramProject project, List<ClassNode> classes, List<Relationship> relationships) {
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {

            // ==========================================
            // FONTS & TYPOGRAPHY
            // ==========================================
            XSSFFont titleFont = workbook.createFont();
            titleFont.setBold(true);
            titleFont.setFontHeightInPoints((short) 13);
            titleFont.setColor(IndexedColors.WHITE.getIndex());

            XSSFFont bannerFont = workbook.createFont();
            bannerFont.setBold(true);
            bannerFont.setFontHeightInPoints((short) 10);
            bannerFont.setColor(IndexedColors.WHITE.getIndex());

            XSSFFont headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setFontHeightInPoints((short) 9);
            headerFont.setColor(IndexedColors.WHITE.getIndex());

            XSSFFont boldFont = workbook.createFont();
            boldFont.setBold(true);
            boldFont.setFontHeightInPoints((short) 9);

            XSSFFont regularFont = workbook.createFont();
            regularFont.setFontHeightInPoints((short) 9);

            XSSFFont pkFont = workbook.createFont();
            pkFont.setBold(true);
            pkFont.setFontHeightInPoints((short) 9);
            pkFont.setColor(new XSSFColor(new byte[]{(byte) 180, (byte) 83, (byte) 9}, null)); // Amber #B45309

            XSSFFont notNullFont = workbook.createFont();
            notNullFont.setBold(true);
            notNullFont.setFontHeightInPoints((short) 9);
            notNullFont.setColor(new XSSFColor(new byte[]{(byte) 29, (byte) 78, (byte) 216}, null)); // Blue #1D4ED8

            // Palette Colors (Slate Obsidian & Titanium)
            byte[] darkHeaderColor = new byte[]{(byte) 30, (byte) 41, (byte) 59}; // #1E293B
            byte[] subHeaderColor = new byte[]{(byte) 51, (byte) 65, (byte) 85};   // #334155
            byte[] keyBg = new byte[]{(byte) 241, (byte) 245, (byte) 249};         // #F1F5F9
            byte[] zebraBg = new byte[]{(byte) 248, (byte) 250, (byte) 252};       // #F8FAFC
            byte[] pkBg = new byte[]{(byte) 254, (byte) 243, (byte) 199};          // #FEF3C7
            byte[] notNullBg = new byte[]{(byte) 239, (byte) 246, (byte) 255};     // #EFF6FF

            // ==========================================
            // CELL STYLES
            // ==========================================
            XSSFCellStyle titleStyle = workbook.createCellStyle();
            titleStyle.setFillForegroundColor(new XSSFColor(darkHeaderColor, null));
            titleStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            titleStyle.setFont(titleFont);
            titleStyle.setAlignment(HorizontalAlignment.LEFT);
            titleStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            setBorder(titleStyle);

            XSSFCellStyle entityBannerStyle = workbook.createCellStyle();
            entityBannerStyle.setFillForegroundColor(new XSSFColor(darkHeaderColor, null));
            entityBannerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            entityBannerStyle.setFont(bannerFont);
            entityBannerStyle.setAlignment(HorizontalAlignment.LEFT);
            entityBannerStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            setBorder(entityBannerStyle);

            XSSFCellStyle subHeaderStyle = workbook.createCellStyle();
            subHeaderStyle.setFillForegroundColor(new XSSFColor(subHeaderColor, null));
            subHeaderStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            subHeaderStyle.setFont(headerFont);
            subHeaderStyle.setAlignment(HorizontalAlignment.CENTER);
            subHeaderStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            setBorder(subHeaderStyle);

            XSSFCellStyle summaryKeyStyle = workbook.createCellStyle();
            summaryKeyStyle.setFillForegroundColor(new XSSFColor(keyBg, null));
            summaryKeyStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            summaryKeyStyle.setFont(boldFont);
            summaryKeyStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            setBorder(summaryKeyStyle);

            XSSFCellStyle summaryValStyle = workbook.createCellStyle();
            summaryValStyle.setFont(regularFont);
            summaryValStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            setBorder(summaryValStyle);

            XSSFCellStyle normalStyle = workbook.createCellStyle();
            normalStyle.setFont(regularFont);
            normalStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            setBorder(normalStyle);

            XSSFCellStyle boldStyle = workbook.createCellStyle();
            boldStyle.setFont(boldFont);
            boldStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            setBorder(boldStyle);

            XSSFCellStyle normalZebraStyle = workbook.createCellStyle();
            normalZebraStyle.setFont(regularFont);
            normalZebraStyle.setFillForegroundColor(new XSSFColor(zebraBg, null));
            normalZebraStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            normalZebraStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            setBorder(normalZebraStyle);

            XSSFCellStyle centerStyle = workbook.createCellStyle();
            centerStyle.setFont(regularFont);
            centerStyle.setAlignment(HorizontalAlignment.CENTER);
            centerStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            setBorder(centerStyle);

            XSSFCellStyle centerZebraStyle = workbook.createCellStyle();
            centerZebraStyle.setFont(regularFont);
            centerZebraStyle.setFillForegroundColor(new XSSFColor(zebraBg, null));
            centerZebraStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            centerZebraStyle.setAlignment(HorizontalAlignment.CENTER);
            centerZebraStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            setBorder(centerZebraStyle);

            XSSFCellStyle pkStyle = workbook.createCellStyle();
            pkStyle.setFont(pkFont);
            pkStyle.setFillForegroundColor(new XSSFColor(pkBg, null));
            pkStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            pkStyle.setAlignment(HorizontalAlignment.CENTER);
            pkStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            setBorder(pkStyle);

            XSSFCellStyle notNullStyle = workbook.createCellStyle();
            notNullStyle.setFont(notNullFont);
            notNullStyle.setFillForegroundColor(new XSSFColor(notNullBg, null));
            notNullStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            notNullStyle.setAlignment(HorizontalAlignment.CENTER);
            notNullStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            setBorder(notNullStyle);

            // ==========================================
            // SHEET 1: RESUMEN DEL PROYECTO
            // ==========================================
            XSSFSheet sheetSummary = workbook.createSheet("Resumen Ejecutivo");
            sheetSummary.setDisplayGridlines(true);

            int rowIdx = 0;

            // Title Row
            Row titleRow = sheetSummary.createRow(rowIdx++);
            titleRow.setHeightInPoints(34);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue("CASE TOOL UML — RESUMEN EJECUTIVO DE ARQUITECTURA");
            titleCell.setCellStyle(titleStyle);
            for (int c = 1; c <= 3; c++) {
                Cell emptyC = titleRow.createCell(c);
                emptyC.setCellStyle(titleStyle);
            }
            sheetSummary.addMergedRegion(new CellRangeAddress(0, 0, 0, 3));

            // Spacer
            Row sp0 = sheetSummary.createRow(rowIdx++);
            sp0.setHeightInPoints(10);

            int totalAttributes = 0;
            int totalMethods = 0;
            long abstractCount = 0;
            if (classes != null) {
                for (ClassNode c : classes) {
                    if (c.isAbstractClass()) abstractCount++;
                    if (c.getAttributes() != null) totalAttributes += c.getAttributes().size();
                    if (c.getMethods() != null) totalMethods += c.getMethods().size();
                }
            }

            Object[][] summaryData = {
                    {"Nombre del Proyecto", project.getName() != null ? project.getName() : "Sin título"},
                    {"Versión Arquitectónica", "v" + (project.getVersion() != null ? project.getVersion() : "1.0.0")},
                    {"Descripción", project.getDescription() != null ? project.getDescription() : "Espacio de trabajo arquitectónico"},
                    {"Fecha de Exportación", DATE_FORMATTER.format(project.getUpdatedAt() != null ? project.getUpdatedAt() : java.time.Instant.now())},
                    {"Total de Clases / Entidades", classes != null ? classes.size() : 0},
                    {"Clases Abstractas", abstractCount},
                    {"Total de Atributos / Columnas", totalAttributes},
                    {"Total de Métodos / Operaciones", totalMethods},
                    {"Total de Relaciones y Asociaciones", relationships != null ? relationships.size() : 0},
                    {"Base de Datos de Destino", "PostgreSQL 17 (Supabase Relational Engine)"},
                    {"Lenguaje / Framework de Destino", "Java 21 LTS / Spring Boot 4.1.0"}
            };

            for (Object[] item : summaryData) {
                Row r = sheetSummary.createRow(rowIdx++);
                r.setHeightInPoints(21);
                Cell cKey = r.createCell(0);
                cKey.setCellValue(String.valueOf(item[0]));
                cKey.setCellStyle(summaryKeyStyle);

                Cell cVal = r.createCell(1);
                cVal.setCellValue(String.valueOf(item[1]));
                cVal.setCellStyle(summaryValStyle);

                for (int c = 2; c <= 3; c++) {
                    Cell cEmpty = r.createCell(c);
                    cEmpty.setCellStyle(summaryValStyle);
                }
                sheetSummary.addMergedRegion(new CellRangeAddress(r.getRowNum(), r.getRowNum(), 1, 3));
            }

            sheetSummary.setColumnWidth(0, 32 * 256);
            sheetSummary.setColumnWidth(1, 35 * 256);
            sheetSummary.setColumnWidth(2, 20 * 256);
            sheetSummary.setColumnWidth(3, 20 * 256);

            // ==========================================
            // SHEET 2: DICCIONARIO DE DATOS (SEPARADO POR TABLAS)
            // ==========================================
            XSSFSheet sheetDict = workbook.createSheet("Diccionario de Datos");
            sheetDict.setDisplayGridlines(true);

            String[] tableColHeaders = {
                    "#",
                    "Columna / Atributo",
                    "Tipo UML",
                    "PostgreSQL 17",
                    "Java 21 (JPA)",
                    "Visibilidad",
                    "Clave Primaria",
                    "Nulabilidad",
                    "Restricciones e Integridad",
                    "Modificadores"
            };

            int dictRowIdx = 0;

            if (classes != null && !classes.isEmpty()) {
                for (ClassNode node : classes) {
                    // 1. Entity Banner Header (Merged across the 10 columns)
                    Row entityBannerRow = sheetDict.createRow(dictRowIdx++);
                    entityBannerRow.setHeightInPoints(26);
                    Cell bannerCell = entityBannerRow.createCell(0);
                    String stereotypeStr = (node.getStereotype() != null && !node.getStereotype().isBlank())
                            ? "   «" + node.getStereotype().trim() + "»" : "";
                    String abstractStr = node.isAbstractClass() ? "   {abstract}" : "";
                    bannerCell.setCellValue("TABLA / ENTIDAD: " + node.getName().toUpperCase(Locale.ROOT) + stereotypeStr + abstractStr);
                    bannerCell.setCellStyle(entityBannerStyle);

                    for (int c = 1; c < tableColHeaders.length; c++) {
                        Cell emptyMerged = entityBannerRow.createCell(c);
                        emptyMerged.setCellStyle(entityBannerStyle);
                    }
                    sheetDict.addMergedRegion(new CellRangeAddress(entityBannerRow.getRowNum(), entityBannerRow.getRowNum(), 0, tableColHeaders.length - 1));

                    // 2. Table Column Headers
                    Row colHeaderRow = sheetDict.createRow(dictRowIdx++);
                    colHeaderRow.setHeightInPoints(22);
                    for (int i = 0; i < tableColHeaders.length; i++) {
                        Cell cell = colHeaderRow.createCell(i);
                        cell.setCellValue(tableColHeaders[i]);
                        cell.setCellStyle(subHeaderStyle);
                    }

                    // 3. Table Rows (Attributes)
                    if (node.getAttributes() == null || node.getAttributes().isEmpty()) {
                        Row r = sheetDict.createRow(dictRowIdx++);
                        r.setHeightInPoints(18);
                        Cell c0 = r.createCell(0); c0.setCellValue("-"); c0.setCellStyle(centerStyle);
                        Cell c1 = r.createCell(1); c1.setCellValue("(Sin atributos definidos)"); c1.setCellStyle(normalStyle);
                        for (int i = 2; i < tableColHeaders.length; i++) {
                            Cell ci = r.createCell(i); ci.setCellValue("-"); ci.setCellStyle(centerStyle);
                        }
                    } else {
                        int attrNum = 1;
                        for (Map<String, Object> attr : node.getAttributes()) {
                            Row r = sheetDict.createRow(dictRowIdx++);
                            r.setHeightInPoints(19);
                            boolean isZebra = (attrNum % 2 == 0);
                            XSSFCellStyle baseC = isZebra ? normalZebraStyle : normalStyle;
                            XSSFCellStyle centerC = isZebra ? centerZebraStyle : centerStyle;

                            String attrName = (String) attr.getOrDefault("name", "attr");
                            String attrType = (String) attr.getOrDefault("type", "String");
                            String visibility = TypeMappingUtil.toVisibilitySymbol((String) attr.get("visibility"));
                            boolean isPk = TypeMappingUtil.isPrimaryKey(attr);
                            boolean isNotNull = TypeMappingUtil.isNotNull(attr);
                            boolean isStatic = Boolean.TRUE.equals(attr.get("isStatic"));

                            // #
                            Cell c0 = r.createCell(0); c0.setCellValue(attrNum++); c0.setCellStyle(centerC);
                            // Columna / Atributo
                            Cell c1 = r.createCell(1); c1.setCellValue(attrName); c1.setCellStyle(isPk ? boldStyle : baseC);
                            // Tipo UML
                            Cell c2 = r.createCell(2); c2.setCellValue(attrType); c2.setCellStyle(centerC);
                            // PostgreSQL 17
                            Cell c3 = r.createCell(3); c3.setCellValue(TypeMappingUtil.toPostgresType(attrType)); c3.setCellStyle(centerC);
                            // Java 21 (JPA)
                            Cell c4 = r.createCell(4); c4.setCellValue(TypeMappingUtil.toJavaType(attrType)); c4.setCellStyle(centerC);
                            // Visibilidad
                            Cell c5 = r.createCell(5); c5.setCellValue(visibility); c5.setCellStyle(centerC);
                            // Clave Primaria
                            Cell c6 = r.createCell(6);
                            c6.setCellValue(isPk ? "SÍ {PK}" : "NO");
                            c6.setCellStyle(isPk ? pkStyle : centerC);
                            // Nulabilidad
                            Cell c7 = r.createCell(7);
                            c7.setCellValue(isNotNull ? "NOT NULL" : "NULLABLE");
                            c7.setCellStyle(isNotNull ? notNullStyle : centerC);
                            // Restricciones e Integridad
                            Cell c8 = r.createCell(8);
                            String constraints = isPk ? "PRIMARY KEY, NOT NULL" : (isNotNull ? "NOT NULL" : "NULLABLE");
                            c8.setCellValue(constraints);
                            c8.setCellStyle(isPk ? boldStyle : baseC);
                            // Modificadores
                            Cell c9 = r.createCell(9);
                            c9.setCellValue(isStatic ? "static" : "-");
                            c9.setCellStyle(centerC);
                        }
                    }

                    // 4. Spacer row between entity tables
                    Row spacerRow = sheetDict.createRow(dictRowIdx++);
                    spacerRow.setHeightInPoints(12);
                }
            }

            // Auto-size columns with sensible padding
            for (int i = 0; i < tableColHeaders.length; i++) {
                sheetDict.autoSizeColumn(i);
                sheetDict.setColumnWidth(i, Math.max(sheetDict.getColumnWidth(i) + 1200, 12 * 256));
            }

            // ==========================================
            // SHEET 3: MATRIZ DE RELACIONES
            // ==========================================
            XSSFSheet sheetRel = workbook.createSheet("Relaciones y Cardinalidades");
            sheetRel.setDisplayGridlines(true);

            String[] relHeaders = {
                    "Clase Origen",
                    "Rol Origen",
                    "Cardinalidad Origen",
                    "Tipo de Relación UML",
                    "Etiqueta / Rol",
                    "Cardinalidad Destino",
                    "Rol Destino",
                    "Clase Destino",
                    "Regla Relacional / Integridad"
            };

            Row relHeaderRow = sheetRel.createRow(0);
            relHeaderRow.setHeightInPoints(24);
            for (int i = 0; i < relHeaders.length; i++) {
                Cell cell = relHeaderRow.createCell(i);
                cell.setCellValue(relHeaders[i]);
                cell.setCellStyle(entityBannerStyle);
            }

            int relRowIdx = 1;
            if (relationships != null) {
                for (Relationship rel : relationships) {
                    if (rel.getSourceClass() == null || rel.getTargetClass() == null) continue;
                    Row r = sheetRel.createRow(relRowIdx++);
                    r.setHeightInPoints(19);
                    boolean isZebra = (relRowIdx % 2 == 0);
                    XSSFCellStyle baseC = isZebra ? normalZebraStyle : normalStyle;
                    XSSFCellStyle centerC = isZebra ? centerZebraStyle : centerStyle;

                    String srcName = rel.getSourceClass().getName();
                    String tgtName = rel.getTargetClass().getName();
                    String type = rel.getType() != null ? rel.getType().toUpperCase(Locale.ROOT) : "ASOCIACIÓN";
                    String srcCard = rel.getSourceCardinality() != null ? rel.getSourceCardinality() : "-";
                    String tgtCard = rel.getTargetCardinality() != null ? rel.getTargetCardinality() : "-";

                    Cell c0 = r.createCell(0); c0.setCellValue(srcName); c0.setCellStyle(baseC);
                    Cell c1 = r.createCell(1); c1.setCellValue(rel.getSourceRole() != null ? rel.getSourceRole() : "-"); c1.setCellStyle(baseC);
                    Cell c2 = r.createCell(2); c2.setCellValue(srcCard); c2.setCellStyle(centerC);
                    Cell c3 = r.createCell(3); c3.setCellValue(formatRelType(type)); c3.setCellStyle(centerC);
                    Cell c4 = r.createCell(4); c4.setCellValue(rel.getLabel() != null ? rel.getLabel() : "-"); c4.setCellStyle(baseC);
                    Cell c5 = r.createCell(5); c5.setCellValue(tgtCard); c5.setCellStyle(centerC);
                    Cell c6 = r.createCell(6); c6.setCellValue(rel.getTargetRole() != null ? rel.getTargetRole() : "-"); c6.setCellStyle(baseC);
                    Cell c7 = r.createCell(7); c7.setCellValue(tgtName); c7.setCellStyle(baseC);

                    String integrityRule = getIntegrityRule(type, srcCard, tgtCard);
                    Cell c8 = r.createCell(8); c8.setCellValue(integrityRule); c8.setCellStyle(baseC);
                }
            }

            if (relRowIdx > 1) {
                sheetRel.setAutoFilter(new CellRangeAddress(0, relRowIdx - 1, 0, relHeaders.length - 1));
            }
            for (int i = 0; i < relHeaders.length; i++) {
                sheetRel.autoSizeColumn(i);
                sheetRel.setColumnWidth(i, Math.max(sheetRel.getColumnWidth(i) + 1200, 14 * 256));
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Error al generar libro Excel (.xlsx): " + e.getMessage(), e);
        }
    }

    private void setBorder(CellStyle style) {
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        style.setTopBorderColor(IndexedColors.GREY_40_PERCENT.getIndex());
        style.setBottomBorderColor(IndexedColors.GREY_40_PERCENT.getIndex());
        style.setLeftBorderColor(IndexedColors.GREY_40_PERCENT.getIndex());
        style.setRightBorderColor(IndexedColors.GREY_40_PERCENT.getIndex());
    }

    private String formatRelType(String type) {
        return switch (type.toLowerCase(Locale.ROOT)) {
            case "association" -> "Asociación Dirigida";
            case "aggregation" -> "Agregación (Rombo hueco)";
            case "composition" -> "Composición (Rombo relleno)";
            case "generalization", "inheritance" -> "Generalización / Herencia";
            case "realization" -> "Realización (Interfaz)";
            case "dependency" -> "Dependencia";
            default -> type;
        };
    }

    private String getIntegrityRule(String type, String srcCard, String tgtCard) {
        String t = type.toLowerCase(Locale.ROOT);
        if (t.contains("composition")) {
            return "Eliminación en cascada obligatoria (ON DELETE CASCADE)";
        }
        if (t.contains("generalization") || t.contains("inheritance")) {
            return "Herencia de tablas (InheritanceType.JOINED / TABLE_PER_CLASS)";
        }
        if ("*".equals(tgtCard) || "1..*".equals(tgtCard)) {
            if ("*".equals(srcCard) || "1..*".equals(srcCard)) {
                return "Relación Muchos a Muchos (*..*) - Tabla asociativa intermedia requerida";
            }
            return "Clave Foránea (FK) en tabla destino";
        }
        return "Restricción de integridad referencial estándar (ON DELETE RESTRICT)";
    }
}
