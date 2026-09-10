package com.sw1.casetool.service.export;

import com.lowagie.text.*;
import com.lowagie.text.Font;
import com.lowagie.text.Image;
import com.lowagie.text.pdf.*;
import com.sw1.casetool.dto.export.ExportPdfRequest;
import com.sw1.casetool.model.ClassNode;
import com.sw1.casetool.model.DiagramProject;
import com.sw1.casetool.model.Relationship;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.List;
import java.util.Map;

@Service
public class PdfExportService {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss")
            .withZone(ZoneId.systemDefault());

    // Color Palette Constants (Titanium & Obsidian High-Contrast)
    private static final Color COLOR_PRIMARY = new Color(30, 41, 59); // Slate Dark
    private static final Color COLOR_ACCENT = new Color(245, 158, 11); // Amber
    private static final Color COLOR_BG_LIGHT = new Color(248, 250, 252);
    private static final Color COLOR_BORDER = new Color(203, 213, 225);
    private static final Color COLOR_TEXT_MUTED = new Color(100, 116, 139);

    public byte[] exportToPdf(DiagramProject project, List<ClassNode> classes, List<Relationship> relationships, ExportPdfRequest request) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 36, 36, 48, 48);
            PdfWriter writer = PdfWriter.getInstance(document, out);

            // Add Header / Footer Event Helper
            writer.setPageEvent(new PdfPageEvents(project.getName(), project.getVersion()));

            document.open();

            // Fonts
            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, Color.WHITE);
            Font subtitleFont = FontFactory.getFont(FontFactory.HELVETICA, 10, new Color(226, 232, 240));
            Font sectionTitleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 13, COLOR_PRIMARY);
            Font subSectionTitleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, COLOR_PRIMARY);
            Font tableHeaderFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, Color.WHITE);
            Font tableBodyFont = FontFactory.getFont(FontFactory.HELVETICA, 8, Color.BLACK);
            Font tableBodyBold = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, Color.BLACK);
            Font pkFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, new Color(180, 83, 9));
            Font smallMuted = FontFactory.getFont(FontFactory.HELVETICA, 7, COLOR_TEXT_MUTED);

            // ==========================================
            // 1. HEADER / COVER BANNER
            // ==========================================
            PdfPTable banner = new PdfPTable(1);
            banner.setWidthPercentage(100);
            banner.setSpacingAfter(16);

            PdfPCell bannerCell = new PdfPCell();
            bannerCell.setBackgroundColor(COLOR_PRIMARY);
            bannerCell.setPadding(14);
            bannerCell.setBorder(Rectangle.NO_BORDER);

            Paragraph pTitle = new Paragraph("ESPECIFICACIÓN TÉCNICA DE ARQUITECTURA UML", titleFont);
            pTitle.setSpacingAfter(4);
            bannerCell.addElement(pTitle);

            String projName = project.getName() != null ? project.getName() : "Modelo de Arquitectura UML";
            String version = project.getVersion() != null ? project.getVersion() : "1.0.0";
            Paragraph pSub = new Paragraph("Proyecto: " + projName + "  |  Versión: v" + version, subtitleFont);
            pSub.setSpacingAfter(2);
            bannerCell.addElement(pSub);

            String dateStr = DATE_FORMATTER.format(project.getUpdatedAt() != null ? project.getUpdatedAt() : java.time.Instant.now());
            Paragraph pDate = new Paragraph("Generado el: " + dateStr + "  |  CASE Tool Community Edition", smallMuted);
            bannerCell.addElement(pDate);

            banner.addCell(bannerCell);
            document.add(banner);

            // ==========================================
            // 2. RESUMEN EJECUTIVO Y MÉTRICAS
            // ==========================================
            Paragraph sec1 = new Paragraph("1. Resumen Ejecutivo del Modelo", sectionTitleFont);
            sec1.setSpacingAfter(8);
            document.add(sec1);

            int totalAttrs = 0;
            int totalMethods = 0;
            int totalAbstract = 0;
            if (classes != null) {
                for (ClassNode c : classes) {
                    if (c.isAbstractClass()) totalAbstract++;
                    if (c.getAttributes() != null) totalAttrs += c.getAttributes().size();
                    if (c.getMethods() != null) totalMethods += c.getMethods().size();
                }
            }

            PdfPTable metricsTable = new PdfPTable(4);
            metricsTable.setWidthPercentage(100);
            metricsTable.setSpacingAfter(16);
            metricsTable.setWidths(new float[]{25, 25, 25, 25});

            addMetricCell(metricsTable, "Clases Totales", String.valueOf(classes != null ? classes.size() : 0));
            addMetricCell(metricsTable, "Clases Abstractas", String.valueOf(totalAbstract));
            addMetricCell(metricsTable, "Total Atributos", String.valueOf(totalAttrs));
            addMetricCell(metricsTable, "Relaciones / FKs", String.valueOf(relationships != null ? relationships.size() : 0));

            document.add(metricsTable);

            // ==========================================
            // 3. CAPTURA DEL DIAGRAMA
            // ==========================================
            Paragraph sec2 = new Paragraph("2. Representación Gráfica del Diagrama de Clases", sectionTitleFont);
            sec2.setSpacingAfter(8);
            document.add(sec2);

            boolean hasImage = false;
            if (request != null && request.getImageBase64() != null && !request.getImageBase64().trim().isEmpty()) {
                try {
                    String raw = request.getImageBase64().trim();
                    if (raw.contains(",")) {
                        raw = raw.substring(raw.indexOf(",") + 1);
                    }
                    byte[] imageBytes = Base64.getDecoder().decode(raw);
                    Image diagramImg = Image.getInstance(imageBytes);
                    diagramImg.setAlignment(Image.ALIGN_CENTER);
                    diagramImg.scaleToFit(500, 300);
                    diagramImg.setBorder(Rectangle.BOX);
                    diagramImg.setBorderColor(COLOR_BORDER);
                    diagramImg.setBorderWidth(1f);
                    diagramImg.setSpacingAfter(14);
                    document.add(diagramImg);
                    hasImage = true;
                } catch (Exception e) {
                    hasImage = false;
                }
            }

            if (!hasImage) {
                PdfPTable noImgTable = new PdfPTable(1);
                noImgTable.setWidthPercentage(100);
                noImgTable.setSpacingAfter(14);
                PdfPCell noImgCell = new PdfPCell(new Phrase("La representación visual del lienzo interactivo se gestiona directamente en el espacio de trabajo activo de la herramienta CASE.", smallMuted));
                noImgCell.setPadding(10);
                noImgCell.setBackgroundColor(COLOR_BG_LIGHT);
                noImgCell.setBorderColor(COLOR_BORDER);
                noImgTable.addCell(noImgCell);
                document.add(noImgTable);
            }

            // ==========================================
            // 4. CATÁLOGO DE CLASES Y DICCIONARIO
            // ==========================================
            boolean includeDict = request == null || request.getIncludeDictionary() == null || request.getIncludeDictionary();
            if (includeDict && classes != null && !classes.isEmpty()) {
                Paragraph sec3 = new Paragraph("3. Catálogo de Clases y Diccionario de Datos", sectionTitleFont);
                sec3.setSpacingAfter(8);
                document.add(sec3);

                for (ClassNode node : classes) {
                    // Sub-heading for class
                    String stereotypeStr = node.getStereotype() != null ? " «" + node.getStereotype() + "»" : "";
                    String abstractStr = node.isAbstractClass() ? " {abstract}" : "";
                    Paragraph classHeader = new Paragraph(node.getName() + stereotypeStr + abstractStr, subSectionTitleFont);
                    classHeader.setSpacingBefore(6);
                    classHeader.setSpacingAfter(4);
                    document.add(classHeader);

                    // Attributes table
                    if (node.getAttributes() != null && !node.getAttributes().isEmpty()) {
                        PdfPTable attrTable = new PdfPTable(7);
                        attrTable.setWidthPercentage(100);
                        attrTable.setWidths(new float[]{20, 8, 16, 18, 18, 10, 10});
                        attrTable.setSpacingAfter(8);

                        addHeaderCell(attrTable, "Atributo", tableHeaderFont);
                        addHeaderCell(attrTable, "Vis.", tableHeaderFont);
                        addHeaderCell(attrTable, "Tipo UML", tableHeaderFont);
                        addHeaderCell(attrTable, "PostgreSQL 17", tableHeaderFont);
                        addHeaderCell(attrTable, "Java 21 (JPA)", tableHeaderFont);
                        addHeaderCell(attrTable, "Clave", tableHeaderFont);
                        addHeaderCell(attrTable, "Nulabilidad", tableHeaderFont);

                        for (int i = 0; i < node.getAttributes().size(); i++) {
                            Map<String, Object> attr = node.getAttributes().get(i);
                            Color rowBg = (i % 2 == 0) ? Color.WHITE : COLOR_BG_LIGHT;

                            String name = (String) attr.getOrDefault("name", "attr");
                            String vis = TypeMappingUtil.toVisibilitySymbol((String) attr.get("visibility"));
                            String type = (String) attr.getOrDefault("type", "String");
                            boolean isPk = TypeMappingUtil.isPrimaryKey(attr);
                            boolean isNotNull = TypeMappingUtil.isNotNull(attr);

                            addCell(attrTable, name, isPk ? tableBodyBold : tableBodyFont, rowBg, Element.ALIGN_LEFT);
                            addCell(attrTable, vis, tableBodyFont, rowBg, Element.ALIGN_CENTER);
                            addCell(attrTable, type, tableBodyFont, rowBg, Element.ALIGN_CENTER);
                            addCell(attrTable, TypeMappingUtil.toPostgresType(type), tableBodyFont, rowBg, Element.ALIGN_CENTER);
                            addCell(attrTable, TypeMappingUtil.toJavaType(type), tableBodyFont, rowBg, Element.ALIGN_CENTER);
                            addCell(attrTable, isPk ? "{PK}" : "-", isPk ? pkFont : tableBodyFont, isPk ? new Color(254, 243, 199) : rowBg, Element.ALIGN_CENTER);
                            addCell(attrTable, isNotNull ? "NOT NULL" : "NULLABLE", isNotNull ? tableBodyBold : smallMuted, isNotNull ? new Color(239, 246, 255) : rowBg, Element.ALIGN_CENTER);
                        }
                        document.add(attrTable);
                    } else {
                        Paragraph noAttr = new Paragraph("(Sin atributos definidos)", smallMuted);
                        noAttr.setSpacingAfter(6);
                        document.add(noAttr);
                    }

                    // Methods if present
                    if (node.getMethods() != null && !node.getMethods().isEmpty()) {
                        PdfPTable mTable = new PdfPTable(4);
                        mTable.setWidthPercentage(100);
                        mTable.setWidths(new float[]{40, 10, 25, 25});
                        mTable.setSpacingAfter(10);

                        addHeaderCell(mTable, "Operación / Método", tableHeaderFont);
                        addHeaderCell(mTable, "Vis.", tableHeaderFont);
                        addHeaderCell(mTable, "Retorno", tableHeaderFont);
                        addHeaderCell(mTable, "Modificadores", tableHeaderFont);

                        for (int i = 0; i < node.getMethods().size(); i++) {
                            Map<String, Object> m = node.getMethods().get(i);
                            Color rowBg = (i % 2 == 0) ? Color.WHITE : COLOR_BG_LIGHT;

                            String mName = (String) m.getOrDefault("name", "metodo");
                            String vis = (String) m.getOrDefault("visibility", "+");
                            String ret = (String) m.getOrDefault("returnType", "void");
                            boolean isAbs = Boolean.TRUE.equals(m.get("isAbstract"));
                            boolean isSt = Boolean.TRUE.equals(m.get("isStatic"));
                            String mods = (isAbs ? "abstract " : "") + (isSt ? "static" : "");

                            addCell(mTable, mName + "()", tableBodyFont, rowBg, Element.ALIGN_LEFT);
                            addCell(mTable, vis, tableBodyFont, rowBg, Element.ALIGN_CENTER);
                            addCell(mTable, ret, tableBodyFont, rowBg, Element.ALIGN_CENTER);
                            addCell(mTable, mods.isEmpty() ? "-" : mods.trim(), smallMuted, rowBg, Element.ALIGN_CENTER);
                        }
                        document.add(mTable);
                    }
                }
            }

            // ==========================================
            // 5. MATRIZ DE RELACIONES
            // ==========================================
            boolean includeRel = request == null || request.getIncludeRelationships() == null || request.getIncludeRelationships();
            if (includeRel && relationships != null && !relationships.isEmpty()) {
                Paragraph sec4 = new Paragraph("4. Matriz de Relaciones y Cardinalidades", sectionTitleFont);
                sec4.setSpacingBefore(10);
                sec4.setSpacingAfter(8);
                document.add(sec4);

                PdfPTable relTable = new PdfPTable(5);
                relTable.setWidthPercentage(100);
                relTable.setWidths(new float[]{25, 25, 20, 15, 15});
                relTable.setSpacingAfter(14);

                addHeaderCell(relTable, "Clase Origen", tableHeaderFont);
                addHeaderCell(relTable, "Clase Destino", tableHeaderFont);
                addHeaderCell(relTable, "Tipo Relación", tableHeaderFont);
                addHeaderCell(relTable, "Card. Origen", tableHeaderFont);
                addHeaderCell(relTable, "Card. Destino", tableHeaderFont);

                for (int i = 0; i < relationships.size(); i++) {
                    Relationship r = relationships.get(i);
                    if (r.getSourceClass() == null || r.getTargetClass() == null) continue;
                    Color rowBg = (i % 2 == 0) ? Color.WHITE : COLOR_BG_LIGHT;

                    String src = r.getSourceClass().getName();
                    String tgt = r.getTargetClass().getName();
                    String type = r.getType() != null ? r.getType() : "Asociación";
                    String cSrc = r.getSourceCardinality() != null ? r.getSourceCardinality() : "-";
                    String cTgt = r.getTargetCardinality() != null ? r.getTargetCardinality() : "-";

                    addCell(relTable, src, tableBodyFont, rowBg, Element.ALIGN_LEFT);
                    addCell(relTable, tgt, tableBodyFont, rowBg, Element.ALIGN_LEFT);
                    addCell(relTable, type, tableBodyFont, rowBg, Element.ALIGN_CENTER);
                    addCell(relTable, cSrc, tableBodyFont, rowBg, Element.ALIGN_CENTER);
                    addCell(relTable, cTgt, tableBodyFont, rowBg, Element.ALIGN_CENTER);
                }
                document.add(relTable);
            }

            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Error al generar memoria técnica en PDF: " + e.getMessage(), e);
        }
    }

    private void addMetricCell(PdfPTable table, String label, String value) {
        PdfPCell cell = new PdfPCell();
        cell.setPadding(8);
        cell.setBackgroundColor(COLOR_BG_LIGHT);
        cell.setBorderColor(COLOR_BORDER);

        Paragraph pVal = new Paragraph(value, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14, COLOR_PRIMARY));
        pVal.setAlignment(Element.ALIGN_CENTER);
        cell.addElement(pVal);

        Paragraph pLbl = new Paragraph(label, FontFactory.getFont(FontFactory.HELVETICA, 7, COLOR_TEXT_MUTED));
        pLbl.setAlignment(Element.ALIGN_CENTER);
        cell.addElement(pLbl);

        table.addCell(cell);
    }

    private void addHeaderCell(PdfPTable table, String text, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setBackgroundColor(COLOR_PRIMARY);
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cell.setPadding(5);
        cell.setBorderColor(COLOR_BORDER);
        table.addCell(cell);
    }

    private void addCell(PdfPTable table, String text, Font font, Color bg, int align) {
        PdfPCell cell = new PdfPCell(new Phrase(text != null ? text : "-", font));
        cell.setBackgroundColor(bg);
        cell.setHorizontalAlignment(align);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cell.setPadding(4);
        cell.setBorderColor(COLOR_BORDER);
        table.addCell(cell);
    }

    // Page Event Helper for Headers and Footers
    private static class PdfPageEvents extends PdfPageEventHelper {
        private final String projectName;
        private final String version;

        public PdfPageEvents(String projectName, String version) {
            this.projectName = projectName != null ? projectName : "Proyecto UML";
            this.version = version != null ? version : "1.0.0";
        }

        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            PdfContentByte cb = writer.getDirectContent();

            // Footer
            String footerText = "CASE Tool UML — " + projectName + " v" + version + "  |  Página " + writer.getPageNumber();
            ColumnText.showTextAligned(
                    cb,
                    Element.ALIGN_RIGHT,
                    new Phrase(footerText, FontFactory.getFont(FontFactory.HELVETICA, 8, COLOR_TEXT_MUTED)),
                    document.right(),
                    document.bottom() - 18,
                    0
            );

            // Thin line above footer
            cb.setColorStroke(COLOR_BORDER);
            cb.setLineWidth(0.5f);
            cb.moveTo(document.left(), document.bottom() - 6);
            cb.lineTo(document.right(), document.bottom() - 6);
            cb.stroke();
        }
    }
}
