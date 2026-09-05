package com.sw1.casetool.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sw1.casetool.dto.audit.AuditLogResponse;
import com.sw1.casetool.dto.audit.AuditMetricsResponse;
import com.sw1.casetool.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayOutputStream;
import java.io.PrintWriter;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneOffset;
import java.util.List;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFFont;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

@RestController
@RequestMapping("/api/admin/audit")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class AdminAuditController {

    private final AuditLogService auditLogService;
    private final ObjectMapper objectMapper;

    public AdminAuditController(AuditLogService auditLogService, @org.springframework.beans.factory.annotation.Autowired(required = false) ObjectMapper objectMapper) {
        this.auditLogService = auditLogService;
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper().findAndRegisterModules();
    }

    @GetMapping
    public ResponseEntity<Page<AuditLogResponse>> getAuditLogs(
            @RequestParam(required = false) String actionType,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Instant start = parseInstant(startDate, false);
        Instant end = parseInstant(endDate, true);
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "timestamp"));
        Page<AuditLogResponse> logs = auditLogService.getAuditLogs(actionType, search, start, end, pageable);
        return ResponseEntity.ok(logs);
    }

    @GetMapping("/metrics")
    public ResponseEntity<AuditMetricsResponse> getAuditMetrics() {
        return ResponseEntity.ok(auditLogService.getAuditMetrics());
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportAuditLogs(
            @RequestParam(defaultValue = "xlsx") String format,
            @RequestParam(required = false) String actionType,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate
    ) {
        Instant start = parseInstant(startDate, false);
        Instant end = parseInstant(endDate, true);
        List<AuditLogResponse> logs = auditLogService.getAllLogsForExport(actionType, search, start, end);
        long now = Instant.now().toEpochMilli();

        if ("json".equalsIgnoreCase(format)) {
            try {
                byte[] jsonBytes = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsBytes(logs);
                return ResponseEntity.ok()
                        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"audit_logs_" + now + ".json\"")
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(jsonBytes);
            } catch (Exception e) {
                return ResponseEntity.internalServerError().build();
            }
        }

        if ("excel".equalsIgnoreCase(format) || "xlsx".equalsIgnoreCase(format)) {
            try (XSSFWorkbook workbook = new XSSFWorkbook()) {
                XSSFSheet sheet = workbook.createSheet("Bitácora de Auditoría");
                sheet.setDisplayGridlines(true);

                // Header Style
                XSSFFont headerFont = workbook.createFont();
                headerFont.setBold(true);
                headerFont.setColor(IndexedColors.WHITE.getIndex());
                headerFont.setFontHeightInPoints((short) 10);
                headerFont.setFontName("Segoe UI");

                XSSFCellStyle headerStyle = workbook.createCellStyle();
                headerStyle.setFont(headerFont);
                headerStyle.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
                headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
                headerStyle.setAlignment(HorizontalAlignment.CENTER);
                headerStyle.setVerticalAlignment(VerticalAlignment.CENTER);
                headerStyle.setBorderTop(BorderStyle.THIN);
                headerStyle.setBorderBottom(BorderStyle.MEDIUM);
                headerStyle.setBorderLeft(BorderStyle.THIN);
                headerStyle.setBorderRight(BorderStyle.THIN);

                // Data Style
                XSSFFont dataFont = workbook.createFont();
                dataFont.setFontHeightInPoints((short) 9);
                dataFont.setFontName("Segoe UI");

                XSSFCellStyle dataStyle = workbook.createCellStyle();
                dataStyle.setFont(dataFont);
                dataStyle.setVerticalAlignment(VerticalAlignment.CENTER);
                dataStyle.setBorderTop(BorderStyle.THIN);
                dataStyle.setBorderBottom(BorderStyle.THIN);
                dataStyle.setBorderLeft(BorderStyle.THIN);
                dataStyle.setBorderRight(BorderStyle.THIN);

                // Zebra Row Style
                XSSFCellStyle zebraStyle = workbook.createCellStyle();
                zebraStyle.cloneStyleFrom(dataStyle);
                zebraStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
                zebraStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

                String[] headers = {
                    "ID", "Fecha / Hora (UTC)", "Correo del Actor", "Nombre Completo",
                    "Rol", "Acción Auditada", "Entidad", "ID de Entidad", "Dirección IP", "Detalles Técnicos (JSON)"
                };

                Row headerRow = sheet.createRow(0);
                headerRow.setHeightInPoints(24);
                for (int i = 0; i < headers.length; i++) {
                    Cell cell = headerRow.createCell(i);
                    cell.setCellValue(headers[i]);
                    cell.setCellStyle(headerStyle);
                }

                int rowIdx = 1;
                for (AuditLogResponse log : logs) {
                    Row row = sheet.createRow(rowIdx);
                    row.setHeightInPoints(19);
                    CellStyle rowStyle = (rowIdx % 2 == 0) ? zebraStyle : dataStyle;

                    String detailsJson = "";
                    if (log.getDetails() != null) {
                        try {
                            detailsJson = objectMapper.writeValueAsString(log.getDetails());
                        } catch (Exception ignored) {}
                    }

                    createStyledCell(row, 0, log.getId() != null ? log.getId().toString() : "", rowStyle);
                    createStyledCell(row, 1, log.getTimestamp() != null ? log.getTimestamp().toString() : "", rowStyle);
                    createStyledCell(row, 2, log.getUserEmail() != null ? log.getUserEmail() : "", rowStyle);
                    createStyledCell(row, 3, log.getUserFullName() != null ? log.getUserFullName() : "", rowStyle);
                    createStyledCell(row, 4, log.getUserRole() != null ? log.getUserRole() : "", rowStyle);
                    createStyledCell(row, 5, formatActionSpanish(log.getActionType()), rowStyle);
                    createStyledCell(row, 6, log.getEntityName() != null ? log.getEntityName() : "", rowStyle);
                    createStyledCell(row, 7, log.getEntityId() != null ? log.getEntityId().toString() : "", rowStyle);
                    createStyledCell(row, 8, log.getIpAddress() != null ? log.getIpAddress() : "", rowStyle);
                    createStyledCell(row, 9, detailsJson, rowStyle);

                    rowIdx++;
                }

                for (int i = 0; i < headers.length; i++) {
                    sheet.autoSizeColumn(i);
                    sheet.setColumnWidth(i, Math.min(sheet.getColumnWidth(i) + 1200, 20000));
                }

                ByteArrayOutputStream bos = new ByteArrayOutputStream();
                workbook.write(bos);

                return ResponseEntity.ok()
                        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"audit_logs_" + now + ".xlsx\"")
                        .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                        .body(bos.toByteArray());
            } catch (Exception e) {
                return ResponseEntity.internalServerError().build();
            }
        }

        // CSV export with UTF-8 BOM and sep=; for Spanish Windows Excel compatibility
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        // UTF-8 BOM
        out.write(0xEF);
        out.write(0xBB);
        out.write(0xBF);

        PrintWriter writer = new PrintWriter(out, true, StandardCharsets.UTF_8);
        writer.println("sep=;");
        writer.println("ID;Timestamp;Actor Email;Actor Name;Role;Action Type;Entity;Entity ID;IP Address;Details");

        for (AuditLogResponse log : logs) {
            String detailsJson = "";
            if (log.getDetails() != null) {
                try {
                    detailsJson = objectMapper.writeValueAsString(log.getDetails()).replace("\"", "\"\"");
                } catch (Exception ignored) {}
            }

            writer.printf("\"%s\";\"%s\";\"%s\";\"%s\";\"%s\";\"%s\";\"%s\";\"%s\";\"%s\";\"%s\"%n",
                    log.getId(),
                    log.getTimestamp() != null ? log.getTimestamp().toString() : "",
                    escapeCsv(log.getUserEmail()),
                    escapeCsv(log.getUserFullName()),
                    escapeCsv(log.getUserRole()),
                    escapeCsv(formatActionSpanish(log.getActionType())),
                    escapeCsv(log.getEntityName()),
                    log.getEntityId() != null ? log.getEntityId().toString() : "",
                    escapeCsv(log.getIpAddress()),
                    detailsJson
            );
        }
        writer.flush();

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"audit_logs_" + now + ".csv\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(out.toByteArray());
    }

    private void createStyledCell(Row row, int column, String value, CellStyle style) {
        Cell cell = row.createCell(column);
        cell.setCellValue(value != null ? value : "");
        cell.setCellStyle(style);
    }

    private String escapeCsv(String value) {
        if (value == null) return "";
        return value.replace("\"", "\"\"");
    }

    private Instant parseInstant(String dateStr, boolean isEndOfDay) {
        if (dateStr == null || dateStr.isBlank()) {
            return null;
        }
        String trimmed = dateStr.trim();
        try {
            if (trimmed.endsWith("Z") || trimmed.contains("+")) {
                return Instant.parse(trimmed);
            }
            if (trimmed.contains("T")) {
                return LocalDateTime.parse(trimmed).toInstant(ZoneOffset.UTC);
            }
            LocalDate ld = LocalDate.parse(trimmed);
            return isEndOfDay 
                ? ld.atTime(LocalTime.MAX).toInstant(ZoneOffset.UTC)
                : ld.atStartOfDay().toInstant(ZoneOffset.UTC);
        } catch (Exception e) {
            return null;
        }
    }

    private String formatActionSpanish(String action) {
        if (action == null) return "";
        return switch (action) {
            case "AUTH_LOGIN_FAILED" -> "Fallo de Autenticación";
            case "USER_REGISTERED" -> "Usuario Registrado";
            case "USER_ROLE_CHANGED" -> "Rol Modificado";
            case "USER_ACTIVATED" -> "Usuario Activado";
            case "USER_SUSPENDED" -> "Usuario Suspendido";
            case "USER_SELF_DELETED" -> "Cuenta Desactivada";
            case "PROJECT_CREATED" -> "Proyecto Creado";
            case "PROJECT_UPDATED" -> "Proyecto Actualizado";
            case "PROJECT_DELETED" -> "Proyecto Eliminado";
            case "PROJECT_CLONED" -> "Proyecto Clonado";
            default -> action;
        };
    }
}
