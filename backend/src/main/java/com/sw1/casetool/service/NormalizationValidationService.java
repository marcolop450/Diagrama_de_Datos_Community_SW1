package com.sw1.casetool.service;

import com.sw1.casetool.dto.SyncDiagramRequest;
import com.sw1.casetool.dto.normalization.*;
import com.sw1.casetool.exception.ResourceNotFoundException;
import com.sw1.casetool.model.ClassNode;
import com.sw1.casetool.model.DiagramProject;
import com.sw1.casetool.model.Relationship;
import com.sw1.casetool.repository.ClassNodeRepository;
import com.sw1.casetool.repository.DiagramProjectRepository;
import com.sw1.casetool.repository.RelationshipRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class NormalizationValidationService {

    private final DiagramProjectRepository projectRepository;
    private final ClassNodeRepository classNodeRepository;
    private final RelationshipRepository relationshipRepository;
    private final AuditLogService auditLogService;

    private static final Set<String> NON_ATOMIC_TYPES = Set.of(
            "list", "set", "collection", "array", "map", "queue", "vector"
    );

    private static final Set<String> MULTIVALUED_NAMES = Set.of(
            "telefonos", "phones", "emails", "correos", "direcciones", "addresses",
            "items", "detalles", "hobbies", "tags", "etiquetas", "hijos", "children", "numeros"
    );

    private static final Pattern NUMBERED_ATTRIBUTE_PATTERN = Pattern.compile("^(.*?)([0-9]+)$");

    private boolean isNonAtomicType(String rawType) {
        if (rawType == null || rawType.isBlank()) return false;
        String t = rawType.trim().toLowerCase();
        if (t.equals("byte[]") || t.equals("byte []") || t.contains("bytea") || t.contains("blob") || t.contains("binary")) {
            return false;
        }
        if (t.endsWith("[]")) return true;
        return NON_ATOMIC_TYPES.stream().anyMatch(t::contains);
    }

    @Transactional(readOnly = true)
    public NormalizationReportDto validateProject(UUID projectId, UUID actorUserId, HttpServletRequest request) {
        DiagramProject project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Proyecto no encontrado con ID: " + projectId));

        List<ClassNode> nodes = classNodeRepository.findByProjectId(projectId);
        List<Relationship> relationships = relationshipRepository.findByProjectId(projectId);

        NormalizationReportDto report = analyze(nodes, relationships);

        // Audit log immutable record
        try {
            Map<String, Object> details = new HashMap<>();
            details.put("projectName", project.getName());
            details.put("score", report.getScore());
            details.put("status", report.getStatus());
            details.put("criticalIssues", report.getCriticalIssuesCount());
            details.put("warningIssues", report.getWarningIssuesCount());
            details.put("infoIssues", report.getInfoIssuesCount());

            String ipAddress = request != null ? request.getRemoteAddr() : "127.0.0.1";
            String userAgent = request != null ? request.getHeader("User-Agent") : "CASE-Tool-Client";

            auditLogService.recordAction(
                    actorUserId,
                    "NORMALIZATION_AUDITED",
                    "diagram_projects",
                    projectId,
                    ipAddress,
                    userAgent,
                    details
            );
        } catch (Exception e) {
            log.warn("No se pudo registrar en audit_logs la auditoría de normalización: {}", e.getMessage());
        }

        return report;
    }

    public NormalizationReportDto validateLiveDiagram(SyncDiagramRequest diagramData) {
        List<ClassNode> virtualNodes = new ArrayList<>();
        Map<String, ClassNode> nodeMap = new HashMap<>();

        if (diagramData.getNodes() != null) {
            for (SyncDiagramRequest.SyncNodeItem item : diagramData.getNodes()) {
                UUID nid;
                try {
                    nid = item.getId() != null ? UUID.fromString(item.getId()) : UUID.randomUUID();
                } catch (Exception e) {
                    nid = UUID.randomUUID();
                }

                ClassNode node = ClassNode.builder()
                        .id(nid)
                        .name(item.getName() != null ? item.getName() : "ClaseSinNombre")
                        .stereotype(item.getStereotype())
                        .abstractClass(item.isAbstract())
                        .attributes(item.getAttributes() != null ? item.getAttributes() : Collections.emptyList())
                        .methods(item.getMethods() != null ? item.getMethods() : Collections.emptyList())
                        .build();

                virtualNodes.add(node);
                if (item.getId() != null) {
                    nodeMap.put(item.getId(), node);
                }
            }
        }

        List<Relationship> virtualRelationships = new ArrayList<>();
        if (diagramData.getEdges() != null) {
            for (SyncDiagramRequest.SyncEdgeItem item : diagramData.getEdges()) {
                ClassNode src = nodeMap.get(item.getSource());
                ClassNode tgt = nodeMap.get(item.getTarget());

                if (src != null && tgt != null) {
                    UUID rid;
                    try {
                        rid = item.getId() != null ? UUID.fromString(item.getId()) : UUID.randomUUID();
                    } catch (Exception e) {
                        rid = UUID.randomUUID();
                    }

                    Relationship rel = Relationship.builder()
                            .id(rid)
                            .sourceClass(src)
                            .targetClass(tgt)
                            .type(item.getType() != null ? item.getType() : "association")
                            .sourceCardinality(item.getSourceCardinality())
                            .targetCardinality(item.getTargetCardinality())
                            .label(item.getLabel())
                            .sourceRole(item.getSourceRole())
                            .targetRole(item.getTargetRole())
                            .build();

                    virtualRelationships.add(rel);
                }
            }
        }

        return analyze(virtualNodes, virtualRelationships);
    }

    public NormalizationReportDto analyze(List<ClassNode> nodes, List<Relationship> relationships) {
        List<NormalizationIssueDto> issues = new ArrayList<>();

        // Group relationships per class for fast lookup
        Map<UUID, List<Relationship>> relsByClassId = new HashMap<>();
        if (nodes != null) {
            for (ClassNode n : nodes) {
                if (n.getId() != null) {
                    relsByClassId.put(n.getId(), new ArrayList<>());
                }
            }
        }
        if (relationships != null) {
            for (Relationship r : relationships) {
                if (r.getSourceClass() != null && r.getSourceClass().getId() != null) {
                    relsByClassId.computeIfAbsent(r.getSourceClass().getId(), k -> new ArrayList<>()).add(r);
                }
                if (r.getTargetClass() != null && r.getTargetClass().getId() != null) {
                    relsByClassId.computeIfAbsent(r.getTargetClass().getId(), k -> new ArrayList<>()).add(r);
                }
            }
        }

        // 1. Evaluate 1NF for all classes
        if (nodes != null) {
            for (ClassNode node : nodes) {
                evaluate1NF(node, issues);
            }
        }

        // 2. Evaluate 2NF for all classes and relationships
        if (nodes != null) {
            for (ClassNode node : nodes) {
                List<Relationship> classRels = node.getId() != null
                        ? relsByClassId.getOrDefault(node.getId(), Collections.emptyList())
                        : Collections.emptyList();
                evaluate2NF(node, classRels, nodes != null ? nodes : Collections.emptyList(), issues);
            }
        }

        // 3. Evaluate 3NF for entire model
        evaluate3NF(nodes != null ? nodes : Collections.emptyList(),
                    relationships != null ? relationships : Collections.emptyList(),
                    issues);

        // Count metrics
        int criticalCount = 0;
        int warningCount = 0;
        int infoCount = 0;
        int nf1Count = 0;
        int nf2Count = 0;
        int nf3Count = 0;

        for (NormalizationIssueDto issue : issues) {
            if (issue.getSeverity() == NormalizationSeverity.CRITICAL) criticalCount++;
            else if (issue.getSeverity() == NormalizationSeverity.WARNING) warningCount++;
            else if (issue.getSeverity() == NormalizationSeverity.INFO) infoCount++;

            if (issue.getNormalForm() == NormalForm.NF1) nf1Count++;
            else if (issue.getNormalForm() == NormalForm.NF2) nf2Count++;
            else if (issue.getNormalForm() == NormalForm.NF3) nf3Count++;
        }

        int deduction = (criticalCount * 15) + (warningCount * 5) + (infoCount * 2);
        int score = Math.max(0, 100 - deduction);

        String status;
        if (criticalCount == 0 && warningCount == 0 && infoCount == 0) {
            status = "COMPLIANT";
        } else if (criticalCount == 0) {
            status = "WARNINGS";
        } else {
            status = "NON_COMPLIANT";
        }

        return NormalizationReportDto.builder()
                .score(score)
                .status(status)
                .totalEntities(nodes != null ? nodes.size() : 0)
                .totalRelationships(relationships != null ? relationships.size() : 0)
                .criticalIssuesCount(criticalCount)
                .warningIssuesCount(warningCount)
                .infoIssuesCount(infoCount)
                .nf1IssuesCount(nf1Count)
                .nf2IssuesCount(nf2Count)
                .nf3IssuesCount(nf3Count)
                .issues(issues)
                .build();
    }

    // =========================================================================
    // 1NF: PRIMERA FORMA NORMAL
    // =========================================================================
    private void evaluate1NF(ClassNode node, List<NormalizationIssueDto> issues) {
        String stereotype = node.getStereotype() != null ? node.getStereotype().toLowerCase() : "";
        boolean isInterface = stereotype.contains("interface");

        List<Map<String, Object>> attrs = node.getAttributes() != null ? node.getAttributes() : Collections.emptyList();

        // 1NF.1: Primary Key Check (Except for pure interfaces)
        if (!isInterface) {
            boolean hasPk = false;
            for (Map<String, Object> attr : attrs) {
                if (isPrimaryKeyAttribute(attr)) {
                    hasPk = true;
                    break;
                }
            }

            if (!hasPk) {
                issues.add(NormalizationIssueDto.builder()
                        .id(UUID.randomUUID().toString())
                        .normalForm(NormalForm.NF1)
                        .severity(NormalizationSeverity.CRITICAL)
                        .ruleId("1NF_NO_PK")
                        .targetType("CLASS")
                        .targetId(node.getId() != null ? node.getId().toString() : null)
                        .targetName(node.getName())
                        .message("La entidad '" + node.getName() + "' no posee clave primaria (PK) definida.")
                        .recommendation("Toda entidad en 1NF debe tener una clave primaria atómica que identifique de forma unívoca cada tupla. Agregue '+ id : Long {PK}'.")
                        .quickFixAvailable(true)
                        .quickFixAction("ADD_PRIMARY_KEY")
                        .build());
            }
        }

        // 1NF.2: Multivalued or Non-Atomic Attributes
        Map<String, List<String>> prefixGroups = new HashMap<>();

        for (Map<String, Object> attr : attrs) {
            String name = attr.get("name") != null ? attr.get("name").toString() : "";
            String type = attr.get("type") != null ? attr.get("type").toString().toLowerCase() : "";

            if (name.isBlank()) continue;

            // Check non-atomic types
            boolean isNonAtomic = isNonAtomicType(type);
            boolean isMultivaluedName = MULTIVALUED_NAMES.contains(name.toLowerCase());

            if (isNonAtomic || isMultivaluedName) {
                issues.add(NormalizationIssueDto.builder()
                        .id(UUID.randomUUID().toString())
                        .normalForm(NormalForm.NF1)
                        .severity(NormalizationSeverity.WARNING)
                        .ruleId("1NF_MULTIVALUED_ATTRIBUTE")
                        .targetType("CLASS")
                        .targetId(node.getId() != null ? node.getId().toString() : null)
                        .targetName(node.getName())
                        .attributeName(name)
                        .message("El atributo '" + name + "' (" + (type.isBlank() ? "tipo no especificado" : type) + ") en '" + node.getName() + "' sugiere valores múltiples no atómicos.")
                        .recommendation("En 1NF cada columna debe albergar únicamente valores atómicos indivisibles. Traslade los valores multivaluados a una entidad secundaria relacionada con cardinalidad 1..*.")
                        .quickFixAvailable(false)
                        .build());
            }

            // Check numbered repeating group prefixes (e.g. tel1, tel2)
            Matcher matcher = NUMBERED_ATTRIBUTE_PATTERN.matcher(name.toLowerCase());
            if (matcher.matches()) {
                String basePrefix = matcher.group(1);
                prefixGroups.computeIfAbsent(basePrefix, k -> new ArrayList<>()).add(name);
            }
        }

        // 1NF.3: Repeating Groups
        for (Map.Entry<String, List<String>> entry : prefixGroups.entrySet()) {
            if (entry.getValue().size() >= 2) {
                issues.add(NormalizationIssueDto.builder()
                        .id(UUID.randomUUID().toString())
                        .normalForm(NormalForm.NF1)
                        .severity(NormalizationSeverity.WARNING)
                        .ruleId("1NF_REPEATING_GROUP")
                        .targetType("CLASS")
                        .targetId(node.getId() != null ? node.getId().toString() : null)
                        .targetName(node.getName())
                        .attributeName(String.join(", ", entry.getValue()))
                        .message("Se detectaron atributos repetitivos numerados (" + String.join(", ", entry.getValue()) + ") en '" + node.getName() + "'.")
                        .recommendation("Los grupos repetitivos violan la 1NF. Reemplace los campos numerados por una entidad relacionada con cardinalidad 1..*.")
                        .quickFixAvailable(false)
                        .build());
            }
        }
    }

    // =========================================================================
    // 2NF: SEGUNDA FORMA NORMAL
    // =========================================================================
    private void evaluate2NF(ClassNode node, List<Relationship> relationships, List<ClassNode> allNodes, List<NormalizationIssueDto> issues) {
        List<Map<String, Object>> attrs = node.getAttributes() != null ? node.getAttributes() : Collections.emptyList();

        List<Map<String, Object>> pkAttrs = new ArrayList<>();
        for (Map<String, Object> attr : attrs) {
            if (isPrimaryKeyAttribute(attr)) {
                pkAttrs.add(attr);
            }
        }
        int pkCount = pkAttrs.size();

        // 2NF.1: Partial dependency on composite primary key
        if (pkCount >= 2) {
            List<String> pkPrefixes = new ArrayList<>();
            for (Map<String, Object> pk : pkAttrs) {
                String pkName = pk.get("name") != null ? pk.get("name").toString().toLowerCase() : "";
                String prefix = pkName.replaceAll("(_id|id|_cod|cod|_codigo|codigo)$", "");
                if (prefix.length() > 1) {
                    pkPrefixes.add(prefix);
                }
            }

            for (Map<String, Object> attr : attrs) {
                if (!isPrimaryKeyAttribute(attr)) {
                    String anLower = attr.get("name") != null ? attr.get("name").toString().toLowerCase() : "";
                    for (String prefix : pkPrefixes) {
                        if ((anLower.startsWith(prefix + "_") || anLower.startsWith(prefix))
                                && !anLower.endsWith("_id") && !anLower.endsWith("id")) {
                            issues.add(NormalizationIssueDto.builder()
                                    .id(UUID.randomUUID().toString())
                                    .normalForm(NormalForm.NF2)
                                    .severity(NormalizationSeverity.WARNING)
                                    .ruleId("2NF_PARTIAL_DEPENDENCY")
                                    .targetType("CLASS")
                                    .targetId(node.getId() != null ? node.getId().toString() : null)
                                    .targetName(node.getName())
                                    .attributeName(attr.get("name") != null ? attr.get("name").toString() : "")
                                    .message("El atributo '" + attr.get("name") + "' en '" + node.getName() + "' depende parcialmente de la clave '" + prefix + "', violando la 2NF.")
                                    .recommendation("En 2NF con clave primaria compuesta, ningún atributo no clave debe depender de un subconjunto de la PK. Mueva '" + attr.get("name") + "' a la entidad correspondiente.")
                                    .quickFixAvailable(false)
                                    .build());
                            break;
                        }
                    }
                }
            }

            if (relationships.size() <= 1) {
                issues.add(NormalizationIssueDto.builder()
                        .id(UUID.randomUUID().toString())
                        .normalForm(NormalForm.NF2)
                        .severity(NormalizationSeverity.INFO)
                        .ruleId("2NF_COMPOSITE_KEY_USAGE")
                        .targetType("CLASS")
                        .targetId(node.getId() != null ? node.getId().toString() : null)
                        .targetName(node.getName())
                        .message("La clase '" + node.getName() + "' posee clave primaria compuesta (" + pkCount + " atributos PK) pero pocas relaciones asociativas.")
                        .recommendation("Verifique que todos los atributos no clave dependan funcionalmente de la totalidad de la clave compuesta y no de un subconjunto parcial.")
                        .quickFixAvailable(false)
                        .build());
            }
        }

        // 2NF.2: Check inverted FK in 1..* relationships (TOM Rule)
        List<Relationship> oneSideRels = new ArrayList<>();
        for (Relationship rel : relationships) {
            String relType = rel.getType() != null ? rel.getType().toLowerCase() : "";
            if (isStructuralRel(relType)) continue;

            boolean isSource = rel.getSourceClass() != null && node.getId() != null && node.getId().equals(rel.getSourceClass().getId());
            String thisCard = isSource ? rel.getSourceCardinality() : rel.getTargetCardinality();
            String otherCard = isSource ? rel.getTargetCardinality() : rel.getSourceCardinality();

            if (isOne(thisCard) && isMany(otherCard)) {
                oneSideRels.add(rel);
            }
        }

        if (!oneSideRels.isEmpty()) {
            Set<UUID> parentNodeIds = new HashSet<>();
            for (Relationship rel : relationships) {
                String relType = rel.getType() != null ? rel.getType().toLowerCase() : "";
                if (isStructuralRel(relType)) continue;

                boolean isSource = rel.getSourceClass() != null && node.getId() != null && node.getId().equals(rel.getSourceClass().getId());
                String thisCard = isSource ? rel.getSourceCardinality() : rel.getTargetCardinality();
                String otherCard = isSource ? rel.getTargetCardinality() : rel.getSourceCardinality();

                if (isMany(thisCard) && isOne(otherCard)) {
                    ClassNode parentNode = isSource ? rel.getTargetClass() : rel.getSourceClass();
                    if (parentNode != null && parentNode.getId() != null) {
                        parentNodeIds.add(parentNode.getId());
                    }
                }
            }

            List<String> parentNames = new ArrayList<>();
            for (ClassNode n : allNodes) {
                if (n.getId() != null && parentNodeIds.contains(n.getId()) && n.getName() != null) {
                    parentNames.add(n.getName().toLowerCase());
                }
            }

            for (Map<String, Object> attr : attrs) {
                if (isPrimaryKeyAttribute(attr)) continue;
                String an = attr.get("name") != null ? attr.get("name").toString() : "";
                String anLower = an.toLowerCase();

                boolean isFkCandidate = anLower.endsWith("_id") || anLower.endsWith("id") ||
                        anLower.endsWith("_cod") || anLower.endsWith("_codigo") ||
                        anLower.startsWith("id_") || anLower.startsWith("cod_");

                if (!isFkCandidate) continue;

                for (Relationship rel : oneSideRels) {
                    boolean isSource = rel.getSourceClass() != null && node.getId() != null && node.getId().equals(rel.getSourceClass().getId());
                    ClassNode otherNode = isSource ? rel.getTargetClass() : rel.getSourceClass();
                    if (otherNode == null || otherNode.getName() == null) continue;

                    String otherName = otherNode.getName().toLowerCase();
                    String otherNameSnake = otherName.replaceAll("\\s+", "_");
                    boolean isGenericChildName = otherName.startsWith("nueva") ||
                            otherName.startsWith("clase") ||
                            otherName.startsWith("entity") ||
                            otherName.equals("nuevaentidad") ||
                            otherName.equals("nuevaclase");

                    boolean matchesChildName = anLower.equals(otherName + "_id") ||
                            anLower.equals("id_" + otherName) ||
                            anLower.equals(otherName + "id") ||
                            anLower.equals(otherNameSnake + "_id") ||
                            anLower.equals("id_" + otherNameSnake) ||
                            anLower.equals(otherNameSnake + "id");

                    boolean matchesAnyParent = false;
                    for (String pn : parentNames) {
                        if (anLower.contains(pn) || anLower.equals(pn + "_id") || anLower.equals("id_" + pn)) {
                            matchesAnyParent = true;
                            break;
                        }
                    }

                    if (matchesChildName || (!matchesAnyParent && isGenericChildName) || (!matchesAnyParent && parentNames.isEmpty())) {
                        issues.add(NormalizationIssueDto.builder()
                                .id(UUID.randomUUID().toString())
                                .normalForm(NormalForm.NF2)
                                .severity(NormalizationSeverity.WARNING)
                                .ruleId("2NF_INVERTED_FK")
                                .targetType("CLASS")
                                .targetId(node.getId() != null ? node.getId().toString() : null)
                                .targetName(node.getName())
                                .attributeName(an)
                                .message("El atributo '" + an + "' en '" + node.getName() + "' ubica una clave foránea en el lado '1' de la relación con '" + otherNode.getName() + "'.")
                                .recommendation("Según las reglas de TOM, en relaciones 1..* la clave foránea debe residir en la entidad subordinada del lado '*' ('" + otherNode.getName() + "') apuntando hacia '" + node.getName() + "'.")
                                .quickFixAvailable(false)
                                .build());
                        break;
                    }
                }
            }
        }
    }

    // =========================================================================
    // 3NF: TERCERA FORMA NORMAL
    // =========================================================================
    private void evaluate3NF(List<ClassNode> nodes, List<Relationship> relationships, List<NormalizationIssueDto> issues) {
        // 3NF.1: Direct Many-to-Many (*..*) Relationships without associative table
        for (Relationship rel : relationships) {
            String relType = rel.getType() != null ? rel.getType().toLowerCase() : "";
            if (isStructuralRel(relType)) continue;

            String srcCard = rel.getSourceCardinality();
            String tgtCard = rel.getTargetCardinality();

            if (isMany(srcCard) && isMany(tgtCard)) {
                String srcName = rel.getSourceClass() != null ? rel.getSourceClass().getName() : "Origen";
                String tgtName = rel.getTargetClass() != null ? rel.getTargetClass().getName() : "Destino";

                issues.add(NormalizationIssueDto.builder()
                        .id(UUID.randomUUID().toString())
                        .normalForm(NormalForm.NF3)
                        .severity(NormalizationSeverity.CRITICAL)
                        .ruleId("3NF_MANY_TO_MANY")
                        .targetType("RELATIONSHIP")
                        .targetId(rel.getId() != null ? rel.getId().toString() : null)
                        .targetName(srcName + " ↔ " + tgtName)
                        .message("Relación directa muchos a muchos (*..*) entre '" + srcName + "' y '" + tgtName + "' sin clase asociativa intermedia.")
                        .recommendation("En 3NF y según las reglas de TOM, las relaciones *..* deben descomponerse mediante una tabla/clase asociativa intermedia (ej. '" + srcName + tgtName + "') con dos relaciones 1..* portadoras de claves compuestas.")
                        .quickFixAvailable(true)
                        .quickFixAction("DECOMPOSE_MANY_TO_MANY")
                        .build());
            }
        }

        // 3NF.2 & 3NF.3: Transitive dependencies and derived attributes
        for (ClassNode node : nodes) {
            List<Map<String, Object>> attrs = node.getAttributes() != null ? node.getAttributes() : Collections.emptyList();
            boolean hasBirthDate = attrs.stream().anyMatch(a -> {
                String an = a.get("name") != null ? a.get("name").toString().toLowerCase() : "";
                return an.contains("nacimiento") || an.contains("birthdate") ||
                        an.equals("fecha_nac") || an.equals("fechanac") ||
                        an.equals("f_nac") || an.contains("nac");
            });

            for (Map<String, Object> attr : attrs) {
                String attrName = attr.get("name") != null ? attr.get("name").toString() : "";
                String anLower = attrName.toLowerCase();

                // Derived Attributes (3NF.3)
                if (("edad".equals(anLower) || "age".equals(anLower)) && hasBirthDate) {
                    issues.add(NormalizationIssueDto.builder()
                            .id(UUID.randomUUID().toString())
                            .normalForm(NormalForm.NF3)
                            .severity(NormalizationSeverity.INFO)
                            .ruleId("3NF_DERIVED_ATTRIBUTE")
                            .targetType("CLASS")
                            .targetId(node.getId() != null ? node.getId().toString() : null)
                            .targetName(node.getName())
                            .attributeName(attrName)
                            .message("El atributo '" + attrName + "' en '" + node.getName() + "' es redundante al coexistir con la fecha de nacimiento.")
                            .recommendation("Para mantener 3NF pura, compute la edad dinámicamente mediante una operación UML o getter en vez de persistirla físicamente.")
                            .quickFixAvailable(false)
                            .build());
                } else if (("total".equals(anLower) || "preciototal".equals(anLower) || "precio_total".equals(anLower)
                        || "monto_total".equals(anLower) || "montototal".equals(anLower))
                        && attrs.stream().anyMatch(a -> {
                            String otherAn = a.get("name") != null ? a.get("name").toString().toLowerCase() : "";
                            return otherAn.contains("subtotal") || otherAn.contains("precio") || otherAn.contains("cantidad");
                        })) {
                    issues.add(NormalizationIssueDto.builder()
                            .id(UUID.randomUUID().toString())
                            .normalForm(NormalForm.NF3)
                            .severity(NormalizationSeverity.INFO)
                            .ruleId("3NF_DERIVED_ATTRIBUTE")
                            .targetType("CLASS")
                            .targetId(node.getId() != null ? node.getId().toString() : null)
                            .targetName(node.getName())
                            .attributeName(attrName)
                            .message("El atributo '" + attrName + "' en '" + node.getName() + "' es un campo calculado derivado.")
                            .recommendation("No almacene campos calculados derivados para evitar anomalías por desactualización en base de datos.")
                            .quickFixAvailable(false)
                            .build());
                }

                // Transitive Dependencies (3NF.2): snake_case, camelCase or dot notation
                for (ClassNode otherNode : nodes) {
                    if (otherNode.getId() != null && !otherNode.getId().equals(node.getId()) && otherNode.getName() != null) {
                        String otherName = otherNode.getName().toLowerCase();
                        if (anLower.startsWith(otherName) && anLower.length() > otherName.length()) {
                            String suffix = anLower.substring(otherName.length()).replaceFirst("^[_.]", "");
                            if (!suffix.isEmpty()
                                    && !suffix.equals("id")
                                    && !suffix.equals("codigo")
                                    && !suffix.equals("cod")
                                    && !suffix.equals("pk")) {
                                issues.add(NormalizationIssueDto.builder()
                                        .id(UUID.randomUUID().toString())
                                        .normalForm(NormalForm.NF3)
                                        .severity(NormalizationSeverity.WARNING)
                                        .ruleId("3NF_TRANSITIVE_DEPENDENCY")
                                        .targetType("CLASS")
                                        .targetId(node.getId() != null ? node.getId().toString() : null)
                                        .targetName(node.getName())
                                        .attributeName(attrName)
                                        .message("El atributo '" + attrName + "' en '" + node.getName() + "' sugiere una dependencia transitiva de la entidad '" + otherNode.getName() + "'.")
                                        .recommendation("En 3NF ningún atributo no clave debe depender de otro atributo no clave. Traslade '" + attrName + "' a la entidad '" + otherNode.getName() + "' y vincúlela mediante relación.")
                                        .quickFixAvailable(false)
                                        .build());
                            }
                        }
                    }
                }
            }
        }
    }

    // =========================================================================
    // HELPER FUNCTIONS
    // =========================================================================
    private boolean isPrimaryKeyAttribute(Map<String, Object> attr) {
        if (attr == null) return false;
        Object isId = attr.get("isId");
        Object isPk = attr.get("isPrimaryKey");

        if (Boolean.TRUE.equals(isId) || Boolean.TRUE.equals(isPk)) {
            return true;
        }
        if (isId instanceof String && ("true".equalsIgnoreCase((String) isId) || "1".equals(isId))) {
            return true;
        }
        if (isPk instanceof String && ("true".equalsIgnoreCase((String) isPk) || "1".equals(isPk))) {
            return true;
        }
        return false;
    }

    private boolean isStructuralRel(String type) {
        return "inheritance".equals(type) ||
               "generalization".equals(type) ||
               "realization".equals(type) ||
               "implementation".equals(type) ||
               "dependency".equals(type);
    }

    private boolean isMany(String card) {
        if (card == null) return false;
        String c = card.trim().toLowerCase();
        return c.contains("*") || c.contains("n") || c.contains("m");
    }

    private boolean isOne(String card) {
        if (card == null) return false;
        String c = card.trim().toLowerCase();
        return c.equals("1") || c.equals("1..1") || c.equals("0..1");
    }
}
