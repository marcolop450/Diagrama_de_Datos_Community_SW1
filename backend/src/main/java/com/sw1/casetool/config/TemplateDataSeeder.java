package com.sw1.casetool.config;

import com.sw1.casetool.model.DomainTemplate;
import com.sw1.casetool.repository.DomainTemplateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Slf4j
@Component
@RequiredArgsConstructor
public class TemplateDataSeeder implements CommandLineRunner {

    private final DomainTemplateRepository templateRepository;

    @Override
    @Transactional
    public void run(String... args) {
        log.info("Iniciando verificación y sincronización de plantillas base de dominio (CU07)...");
        List<DomainTemplate> canonicalTemplates = buildCanonicalTemplates();

        for (DomainTemplate canonical : canonicalTemplates) {
            Optional<DomainTemplate> existingOpt = templateRepository.findById(canonical.getId());
            if (existingOpt.isEmpty()) {
                templateRepository.save(canonical);
                log.info("Plantilla base creada exitosamente: [{}] {}", canonical.getId(), canonical.getName());
            } else {
                DomainTemplate existing = existingOpt.get();
                existing.setName(canonical.getName());
                existing.setCategory(canonical.getCategory());
                existing.setDescription(canonical.getDescription());
                existing.setInitialSchema(canonical.getInitialSchema());
                templateRepository.save(existing);
                log.info("Plantilla base actualizada y sincronizada: [{}] {}", canonical.getId(), canonical.getName());
            }
        }
        log.info("Sincronización de plantillas base de dominio finalizada (Total: {})", canonicalTemplates.size());
    }

    public List<DomainTemplate> buildCanonicalTemplates() {
        return List.of(
                buildBlankTemplate(),
                buildColegioTemplate(),
                buildClinicaTemplate(),
                buildContabilidadTemplate()
        );
    }

    private DomainTemplate buildBlankTemplate() {
        Map<String, Object> schema = new LinkedHashMap<>();
        schema.put("nodes", List.of());
        schema.put("edges", List.of());

        return DomainTemplate.builder()
                .id("TEMPLATE_BLANK")
                .name("Lienzo en Blanco")
                .category("General")
                .description("Espacio limpio para modelado arquitectónico de clases y relaciones desde cero.")
                .initialSchema(schema)
                .build();
    }

    private DomainTemplate buildColegioTemplate() {
        // Nodes
        List<Map<String, Object>> nodes = new ArrayList<>();

        // c1: Carrera
        nodes.add(createNode("c1", "Carrera", "entity", false, 60.0, 60.0, 260.0, 200.0,
                List.of(
                        createAttribute("a101", "id", "Long", "private", true, true),
                        createAttribute("a102", "codigo", "String", "private", false, true),
                        createAttribute("a103", "nombre", "String", "private", false, true),
                        createAttribute("a104", "semestres", "Integer", "private", false, true),
                        createAttribute("a105", "tituloOtorgado", "String", "private", false, false)
                ),
                List.of(
                        createMethod("m101", "calcularTotalCreditos", "public", "Integer", List.of())
                )
        ));

        // c2: Estudiante
        nodes.add(createNode("c2", "Estudiante", "entity", false, 480.0, 60.0, 280.0, 240.0,
                List.of(
                        createAttribute("a201", "id", "Long", "private", true, true),
                        createAttribute("a202", "codigoMatricula", "String", "private", false, true),
                        createAttribute("a203", "nombres", "String", "private", false, true),
                        createAttribute("a204", "apellidos", "String", "private", false, true),
                        createAttribute("a205", "email", "String", "private", false, false),
                        createAttribute("a206", "fechaIngreso", "LocalDate", "private", false, false),
                        createAttribute("a207", "estado", "String", "private", false, false)
                ),
                List.of(
                        createMethod("m201", "inscribirMateria", "public", "boolean", List.of(Map.of("name", "materiaId", "type", "Long"))),
                        createMethod("m202", "calcularPromedio", "public", "Double", List.of())
                )
        ));

        // c3: Docente
        nodes.add(createNode("c3", "Docente", "entity", false, 920.0, 60.0, 280.0, 230.0,
                List.of(
                        createAttribute("a301", "id", "Long", "private", true, true),
                        createAttribute("a302", "registroDocente", "String", "private", false, true),
                        createAttribute("a303", "nombres", "String", "private", false, true),
                        createAttribute("a304", "apellidos", "String", "private", false, true),
                        createAttribute("a305", "especialidad", "String", "private", false, false),
                        createAttribute("a306", "email", "String", "private", false, false)
                ),
                List.of(
                        createMethod("m301", "asignarNota", "public", "void", List.of(
                                Map.of("name", "estudianteId", "type", "Long"),
                                Map.of("name", "nota", "type", "Double")
                        ))
                )
        ));

        // c4: Inscripcion
        nodes.add(createNode("c4", "Inscripcion", "entity", false, 480.0, 420.0, 280.0, 210.0,
                List.of(
                        createAttribute("a401", "id", "Long", "private", true, true),
                        createAttribute("a402", "fechaInscripcion", "LocalDate", "private", false, true),
                        createAttribute("a403", "periodoAcademico", "String", "private", false, true),
                        createAttribute("a404", "notaFinal", "Double", "private", false, false),
                        createAttribute("a405", "estado", "String", "private", false, false)
                ),
                List.of(
                        createMethod("m401", "cerrarInscripcion", "public", "void", List.of())
                )
        ));

        // c5: Materia
        nodes.add(createNode("c5", "Materia", "entity", false, 920.0, 420.0, 280.0, 210.0,
                List.of(
                        createAttribute("a501", "id", "Long", "private", true, true),
                        createAttribute("a502", "sigla", "String", "private", false, true),
                        createAttribute("a503", "nombre", "String", "private", false, true),
                        createAttribute("a504", "creditos", "Integer", "private", false, true),
                        createAttribute("a505", "cuposMaximos", "Integer", "private", false, false)
                ),
                List.of(
                        createMethod("m501", "verificarCupo", "public", "boolean", List.of())
                )
        ));

        // Edges
        List<Map<String, Object>> edges = new ArrayList<>();
        edges.add(createEdge("e101", "c1", "c2", "association", "1", "0..*", "inscribeA", "carrera", "estudiantes", "right", "left"));
        edges.add(createEdge("e102", "c2", "c4", "composition", "1", "0..*", "realiza", "estudiante", "inscripciones", "bottom", "top"));
        edges.add(createEdge("e103", "c5", "c4", "association", "1", "1..*", "contiene", "materia", "inscripciones", "left", "right"));
        edges.add(createEdge("e104", "c3", "c5", "aggregation", "1", "1..*", "imparte", "docente", "materias", "bottom", "top"));
        edges.add(createEdge("e105", "c1", "c5", "composition", "1", "1..*", "mallaCurricular", "carrera", "materias", "bottom", "left"));

        Map<String, Object> schema = new LinkedHashMap<>();
        schema.put("nodes", nodes);
        schema.put("edges", edges);

        return DomainTemplate.builder()
                .id("TEMPLATE_COLEGIO")
                .name("Sistema Académico Universitario")
                .category("Educación")
                .description("Modelo con Carrera, Estudiantes, Docentes, Materias e Inscripciones bajo OMG UML 2.5.")
                .initialSchema(schema)
                .build();
    }

    private DomainTemplate buildClinicaTemplate() {
        List<Map<String, Object>> nodes = new ArrayList<>();

        // c1: Paciente
        nodes.add(createNode("c1", "Paciente", "entity", false, 60.0, 60.0, 280.0, 240.0,
                List.of(
                        createAttribute("a1", "id", "Long", "private", true, true),
                        createAttribute("a2", "dni", "String", "private", false, true),
                        createAttribute("a3", "nombres", "String", "private", false, true),
                        createAttribute("a4", "apellidos", "String", "private", false, true),
                        createAttribute("a5", "fechaNacimiento", "LocalDate", "private", false, false),
                        createAttribute("a6", "telefono", "String", "private", false, false),
                        createAttribute("a7", "tipoSangre", "String", "private", false, false)
                ),
                List.of(
                        createMethod("m1", "solicitarCita", "public", "ConsultaMedica", List.of(Map.of("name", "especialidadId", "type", "Long")))
                )
        ));

        // c2: Especialidad
        nodes.add(createNode("c2", "Especialidad", "entity", false, 480.0, 60.0, 260.0, 200.0,
                List.of(
                        createAttribute("a8", "id", "Long", "private", true, true),
                        createAttribute("a9", "codigo", "String", "private", false, true),
                        createAttribute("a10", "nombre", "String", "private", false, true),
                        createAttribute("a11", "descripcion", "String", "private", false, false)
                ),
                List.of(
                        createMethod("m2", "listarMedicos", "public", "List<Medico>", List.of())
                )
        ));

        // c3: Medico
        nodes.add(createNode("c3", "Medico", "entity", false, 880.0, 60.0, 280.0, 230.0,
                List.of(
                        createAttribute("a12", "id", "Long", "private", true, true),
                        createAttribute("a13", "colegiatura", "String", "private", false, true),
                        createAttribute("a14", "nombres", "String", "private", false, true),
                        createAttribute("a15", "apellidos", "String", "private", false, true),
                        createAttribute("a16", "telefono", "String", "private", false, false),
                        createAttribute("a17", "email", "String", "private", false, false)
                ),
                List.of(
                        createMethod("m3", "emitirDiagnostico", "public", "void", List.of(
                                Map.of("name", "consultaId", "type", "Long"),
                                Map.of("name", "diagnostico", "type", "String")
                        ))
                )
        ));

        // c4: HistorialClinico
        nodes.add(createNode("c4", "HistorialClinico", "entity", false, 60.0, 420.0, 280.0, 210.0,
                List.of(
                        createAttribute("a18", "id", "Long", "private", true, true),
                        createAttribute("a19", "numeroExpediente", "String", "private", false, true),
                        createAttribute("a20", "alergias", "String", "private", false, false),
                        createAttribute("a21", "antecedentes", "String", "private", false, false),
                        createAttribute("a22", "fechaApertura", "LocalDate", "private", false, false)
                ),
                List.of(
                        createMethod("m4", "anexarEntrada", "public", "void", List.of(Map.of("name", "consultaId", "type", "Long")))
                )
        ));

        // c5: ConsultaMedica
        nodes.add(createNode("c5", "ConsultaMedica", "entity", false, 680.0, 420.0, 290.0, 240.0,
                List.of(
                        createAttribute("a23", "id", "Long", "private", true, true),
                        createAttribute("a24", "fechaHora", "LocalDateTime", "private", false, true),
                        createAttribute("a25", "motivo", "String", "private", false, true),
                        createAttribute("a26", "diagnostico", "String", "private", false, false),
                        createAttribute("a27", "costo", "BigDecimal", "private", false, false),
                        createAttribute("a28", "estado", "String", "private", false, false)
                ),
                List.of(
                        createMethod("m5", "finalizarAtencion", "public", "void", List.of())
                )
        ));

        // Edges
        List<Map<String, Object>> edges = new ArrayList<>();
        edges.add(createEdge("e1", "c2", "c3", "aggregation", "1", "1..*", "clasifica", "especialidad", "medicos", "right", "left"));
        edges.add(createEdge("e2", "c1", "c4", "composition", "1", "1", "posee", "paciente", "historial", "bottom", "top"));
        edges.add(createEdge("e3", "c1", "c5", "association", "1", "0..*", "solicita", "paciente", "consultas", "right", "left"));
        edges.add(createEdge("e4", "c3", "c5", "association", "1", "0..*", "atiende", "medico", "consultasAtendidas", "bottom", "top"));

        Map<String, Object> schema = new LinkedHashMap<>();
        schema.put("nodes", nodes);
        schema.put("edges", edges);

        return DomainTemplate.builder()
                .id("TEMPLATE_CLINICA")
                .name("Sistema Hospitalario y Clínico")
                .category("Salud")
                .description("Modelo clínico con Pacientes, Médicos, Especialidades, Consultas Médicas e Historiales bajo OMG UML 2.5.")
                .initialSchema(schema)
                .build();
    }

    private DomainTemplate buildContabilidadTemplate() {
        List<Map<String, Object>> nodes = new ArrayList<>();

        // c1: Cliente
        nodes.add(createNode("c1", "Cliente", "entity", false, 60.0, 60.0, 280.0, 230.0,
                List.of(
                        createAttribute("a1", "id", "Long", "private", true, true),
                        createAttribute("a2", "nitCi", "String", "private", false, true),
                        createAttribute("a3", "razonSocial", "String", "private", false, true),
                        createAttribute("a4", "email", "String", "private", false, false),
                        createAttribute("a5", "telefono", "String", "private", false, false),
                        createAttribute("a6", "direccion", "String", "private", false, false)
                ),
                List.of(
                        createMethod("m1", "solicitarFactura", "public", "Factura", List.of())
                )
        ));

        // c2: Factura
        nodes.add(createNode("c2", "Factura", "entity", false, 480.0, 60.0, 280.0, 250.0,
                List.of(
                        createAttribute("a7", "id", "Long", "private", true, true),
                        createAttribute("a8", "numeroFactura", "String", "private", false, true),
                        createAttribute("a9", "fechaEmision", "LocalDateTime", "private", false, true),
                        createAttribute("a10", "subtotal", "BigDecimal", "private", false, false),
                        createAttribute("a11", "impuestos", "BigDecimal", "private", false, false),
                        createAttribute("a12", "total", "BigDecimal", "private", false, true),
                        createAttribute("a13", "estado", "String", "private", false, false)
                ),
                List.of(
                        createMethod("m2", "calcularTotales", "public", "void", List.of()),
                        createMethod("m3", "anularFactura", "public", "boolean", List.of(Map.of("name", "motivo", "type", "String")))
                )
        ));

        // c3: Pago
        nodes.add(createNode("c3", "Pago", "entity", false, 900.0, 60.0, 280.0, 230.0,
                List.of(
                        createAttribute("a14", "id", "Long", "private", true, true),
                        createAttribute("a15", "metodoPago", "String", "private", false, true),
                        createAttribute("a16", "monto", "BigDecimal", "private", false, true),
                        createAttribute("a17", "fechaPago", "LocalDateTime", "private", false, true),
                        createAttribute("a18", "transaccionId", "String", "private", false, false),
                        createAttribute("a19", "estado", "String", "private", false, false)
                ),
                List.of(
                        createMethod("m4", "confirmarPago", "public", "boolean", List.of())
                )
        ));

        // c4: DetalleFactura
        nodes.add(createNode("c4", "DetalleFactura", "entity", false, 480.0, 420.0, 280.0, 220.0,
                List.of(
                        createAttribute("a20", "id", "Long", "private", true, true),
                        createAttribute("a21", "cantidad", "Integer", "private", false, true),
                        createAttribute("a22", "precioUnitario", "BigDecimal", "private", false, true),
                        createAttribute("a23", "descuento", "BigDecimal", "private", false, false),
                        createAttribute("a24", "subtotalLinea", "BigDecimal", "private", false, true)
                ),
                List.of(
                        createMethod("m5", "calcularSubtotal", "public", "BigDecimal", List.of())
                )
        ));

        // c5: Producto
        nodes.add(createNode("c5", "Producto", "entity", false, 900.0, 420.0, 280.0, 230.0,
                List.of(
                        createAttribute("a25", "id", "Long", "private", true, true),
                        createAttribute("a26", "codigoSku", "String", "private", false, true),
                        createAttribute("a27", "nombre", "String", "private", false, true),
                        createAttribute("a28", "descripcion", "String", "private", false, false),
                        createAttribute("a29", "precioVenta", "BigDecimal", "private", false, true),
                        createAttribute("a30", "stockDisponible", "Integer", "private", false, true)
                ),
                List.of(
                        createMethod("m6", "descontarStock", "public", "boolean", List.of(Map.of("name", "cant", "type", "int")))
                )
        ));

        // Edges
        List<Map<String, Object>> edges = new ArrayList<>();
        edges.add(createEdge("e1", "c1", "c2", "association", "1", "0..*", "emiteA", "cliente", "facturas", "right", "left"));
        edges.add(createEdge("e2", "c2", "c4", "composition", "1", "1..*", "contiene", "factura", "detalles", "bottom", "top"));
        edges.add(createEdge("e3", "c5", "c4", "association", "1", "0..*", "referencia", "producto", "lineasDetalle", "left", "right"));
        edges.add(createEdge("e4", "c2", "c3", "composition", "1", "1..*", "liquida", "factura", "pagos", "right", "left"));

        Map<String, Object> schema = new LinkedHashMap<>();
        schema.put("nodes", nodes);
        schema.put("edges", edges);

        return DomainTemplate.builder()
                .id("TEMPLATE_CONTABILIDAD")
                .name("Sistema Contable y Facturación E-Commerce")
                .category("Finanzas")
                .description("Modelo comercial transaccional con Clientes, Facturas, Detalles, Productos y Pagos bajo OMG UML 2.5.")
                .initialSchema(schema)
                .build();
    }

    private Map<String, Object> createNode(String id, String name, String stereotype, boolean isAbstract,
                                           double x, double y, double width, double height,
                                           List<Map<String, Object>> attributes,
                                           List<Map<String, Object>> methods) {
        Map<String, Object> node = new LinkedHashMap<>();
        node.put("id", id);
        node.put("name", name);
        node.put("stereotype", stereotype);
        node.put("isAbstract", isAbstract);
        node.put("position", Map.of("x", x, "y", y));
        node.put("width", width);
        node.put("height", height);
        node.put("attributes", attributes);
        node.put("methods", methods);
        return node;
    }

    private Map<String, Object> createAttribute(String id, String name, String type, String visibility,
                                                boolean isPrimaryKey, boolean isNotNull) {
        Map<String, Object> attr = new LinkedHashMap<>();
        attr.put("id", id);
        attr.put("name", name);
        attr.put("type", type);
        attr.put("visibility", visibility);
        attr.put("isPrimaryKey", isPrimaryKey);
        attr.put("isId", isPrimaryKey);
        attr.put("isNotNull", isNotNull);
        attr.put("isStatic", false);
        return attr;
    }

    private Map<String, Object> createMethod(String id, String name, String visibility, String returnType,
                                             List<Map<String, String>> parameters) {
        Map<String, Object> meth = new LinkedHashMap<>();
        meth.put("id", id);
        meth.put("name", name);
        meth.put("visibility", visibility);
        meth.put("returnType", returnType);
        meth.put("parameters", parameters);
        meth.put("isStatic", false);
        meth.put("isAbstract", false);
        return meth;
    }

    private Map<String, Object> createEdge(String id, String source, String target, String type,
                                           String sourceCard, String targetCard, String label,
                                           String sourceRole, String targetRole,
                                           String sourceHandle, String targetHandle) {
        Map<String, Object> edge = new LinkedHashMap<>();
        edge.put("id", id);
        edge.put("source", source);
        edge.put("target", target);
        edge.put("type", type);
        edge.put("sourceCardinality", sourceCard);
        edge.put("targetCardinality", targetCard);
        edge.put("label", label);
        edge.put("sourceRole", sourceRole);
        edge.put("targetRole", targetRole);
        edge.put("sourceHandle", sourceHandle);
        edge.put("targetHandle", targetHandle);
        return edge;
    }
}
