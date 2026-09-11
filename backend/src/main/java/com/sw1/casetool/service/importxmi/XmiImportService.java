package com.sw1.casetool.service.importxmi;

import com.sw1.casetool.dto.importxmi.ImportXmiResponse;
import com.sw1.casetool.model.ClassNode;
import com.sw1.casetool.model.DiagramProject;
import com.sw1.casetool.model.Relationship;
import com.sw1.casetool.model.UserProfile;
import com.sw1.casetool.repository.ClassNodeRepository;
import com.sw1.casetool.repository.DiagramProjectRepository;
import com.sw1.casetool.repository.RelationshipRepository;
import com.sw1.casetool.repository.UserProfileRepository;
import com.sw1.casetool.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.w3c.dom.*;
import org.xml.sax.InputSource;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.InputStream;
import java.io.StringReader;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class XmiImportService {

    private final DiagramProjectRepository projectRepository;
    private final ClassNodeRepository classNodeRepository;
    private final RelationshipRepository relationshipRepository;
    private final UserProfileRepository userProfileRepository;
    private final AuditLogService auditLogService;

    // Internal representations for parsed elements
    public static class RawClass {
        public String xmiId;
        public String name;
        public String stereotype;
        public boolean isAbstract;
        public double posX;
        public double posY;
        public List<Map<String, Object>> attributes = new ArrayList<>();
        public List<Map<String, Object>> methods = new ArrayList<>();
    }

    public static class RawRelationship {
        public String xmiId;
        public String type = "association"; // association, generalization, realization, dependency, aggregation, composition
        public String sourceXmiId;
        public String targetXmiId;
        public String sourceCardinality = "1";
        public String targetCardinality = "1";
        public String label;
        public String sourceRole;
        public String targetRole;
    }

    public static class ParsedXmiModel {
        public String modelName = "Modelo_Importado";
        public List<RawClass> classes = new ArrayList<>();
        public List<RawRelationship> relationships = new ArrayList<>();
        public List<String> warnings = new ArrayList<>();
    }

    /**
     * Imports XMI content and creates a brand new project.
     */
    @Transactional
    public ImportXmiResponse importAsNewProject(
            InputStream xmiStream,
            String suggestedProjectName,
            String userEmail,
            String ip,
            String userAgent
    ) {
        UserProfile user = resolveUser(userEmail);
        ParsedXmiModel model = parseXmi(xmiStream);

        String finalName = (suggestedProjectName != null && !suggestedProjectName.trim().isEmpty())
                ? suggestedProjectName.trim()
                : (model.modelName != null && !model.modelName.trim().isEmpty() ? model.modelName.trim() : "Modelo Importado");

        // 1. Create DiagramProject
        DiagramProject project = DiagramProject.builder()
                .name(finalName)
                .description("Modelo importado desde especificación OMG XMI 2.1 (ArchiTec / StarUML / EA)")
                .ownerId(user != null ? user.getId() : UUID.randomUUID())
                .version("v1.0.0")
                .tags(new ArrayList<>(Arrays.asList("importado", "xmi")))
                .isDeleted(false)
                .build();

        DiagramProject savedProject = projectRepository.save(project);

        // 2. Persist Nodes and Relationships
        persistModel(savedProject, model);

        // 3. Inmutable Audit Log
        recordAudit(savedProject, user != null ? user.getId() : null, ip, userAgent, model);

        return buildResponse(savedProject, model, "Modelo XMI importado exitosamente como nuevo proyecto.");
    }

    /**
     * Imports XMI content into an existing project.
     */
    @Transactional
    public ImportXmiResponse importIntoExistingProject(
            UUID projectId,
            InputStream xmiStream,
            String userEmail,
            String ip,
            String userAgent,
            boolean replaceCurrent
    ) {
        UserProfile user = resolveUser(userEmail);
        DiagramProject project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("El proyecto con ID " + projectId + " no existe."));

        if (user != null && project.getOwnerId() != null) {
            checkProjectOwnership(project, user);
        }

        ParsedXmiModel model = parseXmi(xmiStream);

        if (replaceCurrent) {
            relationshipRepository.deleteByProjectId(projectId);
            classNodeRepository.deleteByProjectId(projectId);
        }

        persistModel(project, model);
        recordAudit(project, user != null ? user.getId() : null, ip, userAgent, model);

        return buildResponse(project, model, "Modelo XMI incorporado exitosamente en el proyecto actual.");
    }

    /**
     * Parses XMI InputStream securely with XXE prevention and multi-dialect tolerance.
     */
    public ParsedXmiModel parseXmi(InputStream is) {
        if (is == null) {
            throw new IllegalArgumentException("El archivo XMI proporcionado está vacío.");
        }

        try {
            byte[] bytes = is.readAllBytes();
            if (bytes.length == 0) {
                throw new IllegalArgumentException("El archivo XMI está vacío.");
            }

            String content = new String(bytes, StandardCharsets.UTF_8);

            DocumentBuilderFactory dbf = DocumentBuilderFactory.newInstance();
            // XXE Defenses
            dbf.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
            dbf.setFeature("http://xml.org/sax/features/external-general-entities", false);
            dbf.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
            dbf.setNamespaceAware(true);

            DocumentBuilder db = dbf.newDocumentBuilder();
            Document doc = db.parse(new InputSource(new StringReader(content)));
            doc.getDocumentElement().normalize();

            ParsedXmiModel model = new ParsedXmiModel();
            Map<String, RawClass> classMap = new LinkedHashMap<>();

            // 1. Detect Model Name
            extractModelName(doc, model);

            // 2. Extract Classes
            extractClasses(doc, classMap, model);

            if (classMap.isEmpty()) {
                throw new IllegalArgumentException("El archivo XMI no contiene clases o entidades reconocibles bajo el estándar OMG UML.");
            }

            model.classes = new ArrayList<>(classMap.values());

            // 3. Extract Relationships
            extractRelationships(doc, classMap, model);

            // 4. Compute Auto-Layout (Topological Layering)
            applyAutoLayout(model);

            return model;
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            log.error("Error al parsear documento XMI: {}", e.getMessage(), e);
            throw new IllegalArgumentException("El archivo no tiene un formato XML/XMI válido o está corrupto: " + e.getMessage());
        }
    }

    private void extractModelName(Document doc, ParsedXmiModel model) {
        NodeList models = doc.getElementsByTagNameNS("*", "Model");
        if (models.getLength() == 0) {
            models = doc.getElementsByTagName("uml:Model");
        }
        if (models.getLength() == 0) {
            models = doc.getElementsByTagName("Model");
        }
        if (models.getLength() > 0) {
            Element m = (Element) models.item(0);
            String name = getAttr(m, "name");
            if (name != null && !name.trim().isEmpty()) {
                model.modelName = name.trim();
            }
        }
    }

    private void extractClasses(Document doc, Map<String, RawClass> classMap, ParsedXmiModel model) {
        NodeList allElements = doc.getElementsByTagName("*");
        for (int i = 0; i < allElements.getLength(); i++) {
            Node node = allElements.item(i);
            if (!(node instanceof Element el)) continue;

            String localName = el.getLocalName() != null ? el.getLocalName() : el.getNodeName();
            String xmiType = getAttr(el, "xmi:type");
            if (xmiType == null) xmiType = getAttr(el, "type");

            boolean isClass = "Class".equalsIgnoreCase(localName) ||
                    ("packagedElement".equalsIgnoreCase(localName) && xmiType != null && xmiType.toLowerCase().endsWith("class")) ||
                    "UML:Class".equalsIgnoreCase(el.getNodeName());

            if (isClass) {
                String id = getXmiId(el);
                String name = getAttr(el, "name");
                if (id == null || id.trim().isEmpty()) {
                    id = "class_" + UUID.randomUUID().toString().substring(0, 8);
                }
                if (name == null || name.trim().isEmpty()) {
                    name = "Clase" + (classMap.size() + 1);
                }

                RawClass rawClass = new RawClass();
                rawClass.xmiId = id;
                rawClass.name = name.trim();
                rawClass.isAbstract = Boolean.parseBoolean(getAttr(el, "isAbstract"));

                // Check stereotype
                String stereotype = getAttr(el, "stereotype");
                if (stereotype == null || stereotype.trim().isEmpty()) {
                    stereotype = detectStereotypeFromComments(el);
                }
                rawClass.stereotype = stereotype;

                // Extract attributes and methods
                extractClassMembers(el, rawClass);

                classMap.put(id, rawClass);
            }
        }
    }

    private void extractClassMembers(Element classEl, RawClass rawClass) {
        NodeList children = classEl.getChildNodes();
        for (int j = 0; j < children.getLength(); j++) {
            Node child = children.item(j);
            if (!(child instanceof Element el)) continue;

            String localName = el.getLocalName() != null ? el.getLocalName() : el.getNodeName();
            String xmiType = getAttr(el, "xmi:type");
            if (xmiType == null) xmiType = getAttr(el, "type");

            // 1. Property / Attribute
            boolean isAttr = "ownedAttribute".equalsIgnoreCase(localName) ||
                    "Property".equalsIgnoreCase(localName) ||
                    "UML:Attribute".equalsIgnoreCase(el.getNodeName()) ||
                    (xmiType != null && xmiType.toLowerCase().endsWith("property"));

            if (isAttr) {
                // Ignore association ends here (they are handled in relationships)
                if (getAttr(el, "association") != null) {
                    continue;
                }

                String attrName = getAttr(el, "name");
                if (attrName == null || attrName.trim().isEmpty()) {
                    continue;
                }

                String vis = normalizeVisibility(getAttr(el, "visibility"));
                boolean isStatic = Boolean.parseBoolean(getAttr(el, "isStatic"));
                String type = extractType(el);

                boolean isPk = detectPrimaryKey(el, attrName);
                boolean isNotNull = isPk || detectNotNull(el);

                Map<String, Object> attrMap = new LinkedHashMap<>();
                attrMap.put("id", "a-" + UUID.randomUUID().toString().substring(0, 8));
                attrMap.put("name", attrName.trim());
                attrMap.put("type", type);
                attrMap.put("visibility", vis);
                attrMap.put("isStatic", isStatic);
                attrMap.put("isId", isPk);
                attrMap.put("isPrimaryKey", isPk);
                attrMap.put("isNotNull", isNotNull);
                attrMap.put("isNullable", !isNotNull);

                rawClass.attributes.add(attrMap);
            }

            // 2. Operation / Method
            boolean isMethod = "ownedOperation".equalsIgnoreCase(localName) ||
                    "Operation".equalsIgnoreCase(localName) ||
                    "UML:Operation".equalsIgnoreCase(el.getNodeName()) ||
                    (xmiType != null && xmiType.toLowerCase().endsWith("operation"));

            if (isMethod) {
                String methodName = getAttr(el, "name");
                if (methodName == null || methodName.trim().isEmpty()) {
                    continue;
                }

                String vis = normalizeVisibility(getAttr(el, "visibility"));
                boolean isStatic = Boolean.parseBoolean(getAttr(el, "isStatic"));
                boolean isAbstract = Boolean.parseBoolean(getAttr(el, "isAbstract"));

                String returnType = "void";
                List<Map<String, Object>> params = new ArrayList<>();

                NodeList opChildren = el.getChildNodes();
                for (int k = 0; k < opChildren.getLength(); k++) {
                    Node opChild = opChildren.item(k);
                    if (!(opChild instanceof Element paramEl)) continue;

                    String pName = paramEl.getLocalName() != null ? paramEl.getLocalName() : paramEl.getNodeName();
                    if ("ownedParameter".equalsIgnoreCase(pName) || "Parameter".equalsIgnoreCase(pName)) {
                        String dir = getAttr(paramEl, "direction");
                        String pType = extractType(paramEl);

                        if ("return".equalsIgnoreCase(dir)) {
                            returnType = pType;
                        } else {
                            String paramName = getAttr(paramEl, "name");
                            if (paramName != null && !paramName.trim().isEmpty()) {
                                Map<String, Object> paramMap = new HashMap<>();
                                paramMap.put("name", paramName.trim());
                                paramMap.put("type", pType);
                                params.add(paramMap);
                            }
                        }
                    }
                }

                Map<String, Object> methodMap = new LinkedHashMap<>();
                methodMap.put("id", "m-" + UUID.randomUUID().toString().substring(0, 8));
                methodMap.put("name", methodName.trim());
                methodMap.put("returnType", returnType);
                methodMap.put("visibility", vis);
                methodMap.put("isStatic", isStatic);
                methodMap.put("isAbstract", isAbstract);
                methodMap.put("parameters", params);

                rawClass.methods.add(methodMap);
            }
        }
    }

    private void extractRelationships(Document doc, Map<String, RawClass> classMap, ParsedXmiModel model) {
        NodeList allElements = doc.getElementsByTagName("*");

        for (int i = 0; i < allElements.getLength(); i++) {
            Node node = allElements.item(i);
            if (!(node instanceof Element el)) continue;

            String localName = el.getLocalName() != null ? el.getLocalName() : el.getNodeName();
            String xmiType = getAttr(el, "xmi:type");
            if (xmiType == null) xmiType = getAttr(el, "type");

            // A. Associations
            boolean isAssoc = "Association".equalsIgnoreCase(localName) ||
                    ("packagedElement".equalsIgnoreCase(localName) && xmiType != null && xmiType.toLowerCase().endsWith("association")) ||
                    "UML:Association".equalsIgnoreCase(el.getNodeName());

            if (isAssoc) {
                parseAssociation(el, classMap, model);
            }

            // B. Generalization inside Class or standalone
            boolean isGen = "Generalization".equalsIgnoreCase(localName) ||
                    (xmiType != null && xmiType.toLowerCase().endsWith("generalization"));

            if (isGen) {
                String targetId = getAttr(el, "general");
                String sourceId = getAttr(el, "specific");

                // If inside a class element, the class is the specific (subclass)
                if (sourceId == null && el.getParentNode() instanceof Element parentEl) {
                    sourceId = getXmiId(parentEl);
                }

                if (sourceId != null && targetId != null && classMap.containsKey(sourceId) && classMap.containsKey(targetId)) {
                    RawRelationship rel = new RawRelationship();
                    rel.xmiId = getXmiId(el);
                    rel.type = "generalization";
                    rel.sourceXmiId = sourceId;
                    rel.targetXmiId = targetId;
                    rel.sourceCardinality = "";
                    rel.targetCardinality = "";
                    model.relationships.add(rel);
                }
            }

            // C. Realization / InterfaceRealization
            boolean isReal = "Realization".equalsIgnoreCase(localName) ||
                    "interfaceRealization".equalsIgnoreCase(localName) ||
                    (xmiType != null && xmiType.toLowerCase().contains("realization"));

            if (isReal) {
                String sourceId = getAttr(el, "client");
                String targetId = getAttr(el, "supplier");
                if (sourceId == null && el.getParentNode() instanceof Element parentEl) {
                    sourceId = getXmiId(parentEl);
                }
                if (targetId == null) {
                    targetId = getAttr(el, "contract");
                }

                if (sourceId != null && targetId != null && classMap.containsKey(sourceId) && classMap.containsKey(targetId)) {
                    RawRelationship rel = new RawRelationship();
                    rel.xmiId = getXmiId(el);
                    rel.type = "realization";
                    rel.sourceXmiId = sourceId;
                    rel.targetXmiId = targetId;
                    rel.sourceCardinality = "";
                    rel.targetCardinality = "";
                    model.relationships.add(rel);
                }
            }

            // D. Dependency
            boolean isDep = "Dependency".equalsIgnoreCase(localName) ||
                    ("packagedElement".equalsIgnoreCase(localName) && xmiType != null && xmiType.toLowerCase().endsWith("dependency"));

            if (isDep) {
                String sourceId = getAttr(el, "client");
                String targetId = getAttr(el, "supplier");

                if (sourceId != null && targetId != null && classMap.containsKey(sourceId) && classMap.containsKey(targetId)) {
                    RawRelationship rel = new RawRelationship();
                    rel.xmiId = getXmiId(el);
                    rel.type = "dependency";
                    rel.sourceXmiId = sourceId;
                    rel.targetXmiId = targetId;
                    rel.sourceCardinality = "";
                    rel.targetCardinality = "";
                    model.relationships.add(rel);
                }
            }
        }
    }

    private void parseAssociation(Element assocEl, Map<String, RawClass> classMap, ParsedXmiModel model) {
        List<Element> ends = new ArrayList<>();
        NodeList children = assocEl.getChildNodes();

        for (int j = 0; j < children.getLength(); j++) {
            Node child = children.item(j);
            if (child instanceof Element el) {
                String name = el.getLocalName() != null ? el.getLocalName() : el.getNodeName();
                if ("ownedEnd".equalsIgnoreCase(name) || "memberEnd".equalsIgnoreCase(name)) {
                    ends.add(el);
                }
            }
        }

        if (ends.size() >= 2) {
            Element end1 = ends.get(0);
            Element end2 = ends.get(1);

            String srcClassId = resolveEndClassId(end1, assocEl.getOwnerDocument());
            String tgtClassId = resolveEndClassId(end2, assocEl.getOwnerDocument());

            if (srcClassId != null && tgtClassId != null && classMap.containsKey(srcClassId) && classMap.containsKey(tgtClassId)) {
                RawRelationship rel = new RawRelationship();
                rel.xmiId = getXmiId(assocEl);
                rel.label = getAttr(assocEl, "name");
                rel.sourceXmiId = srcClassId;
                rel.targetXmiId = tgtClassId;

                rel.sourceRole = getAttr(end1, "name");
                rel.targetRole = getAttr(end2, "name");

                rel.sourceCardinality = parseMultiplicity(end1);
                rel.targetCardinality = parseMultiplicity(end2);

                // Detect aggregation or composition
                String agg1 = getAttr(end1, "aggregation");
                String agg2 = getAttr(end2, "aggregation");

                if ("composite".equalsIgnoreCase(agg1) || "composite".equalsIgnoreCase(agg2)) {
                    rel.type = "composition";
                } else if ("shared".equalsIgnoreCase(agg1) || "shared".equalsIgnoreCase(agg2)) {
                    rel.type = "aggregation";
                } else {
                    rel.type = "association";
                }

                model.relationships.add(rel);
            }
        }
    }

    private String resolveEndClassId(Element endEl, Document doc) {
        String type = getAttr(endEl, "type");
        if (type != null && !type.trim().isEmpty()) {
            return type.trim();
        }

        // Check if memberEnd references an ownedAttribute
        String idref = getAttr(endEl, "xmi:idref");
        if (idref == null) idref = getAttr(endEl, "idref");

        if (idref != null) {
            // Find element by id
            Element refEl = findElementById(doc, idref);
            if (refEl != null) {
                String refType = getAttr(refEl, "type");
                if (refType != null) return refType;
                if (refEl.getParentNode() instanceof Element parentEl) {
                    return getXmiId(parentEl);
                }
            }
        }

        return null;
    }

    private Element findElementById(Document doc, String id) {
        NodeList list = doc.getElementsByTagName("*");
        for (int i = 0; i < list.getLength(); i++) {
            if (list.item(i) instanceof Element el && id.equals(getXmiId(el))) {
                return el;
            }
        }
        return null;
    }

    private String parseMultiplicity(Element endEl) {
        String lower = "1";
        String upper = "1";

        NodeList children = endEl.getChildNodes();
        for (int i = 0; i < children.getLength(); i++) {
            if (children.item(i) instanceof Element el) {
                String localName = el.getLocalName() != null ? el.getLocalName() : el.getNodeName();
                String val = getAttr(el, "value");

                if ("lowerValue".equalsIgnoreCase(localName) && val != null) {
                    lower = val.trim();
                } else if ("upperValue".equalsIgnoreCase(localName) && val != null) {
                    upper = val.trim();
                }
            }
        }

        if ("*".equals(upper) || "-1".equals(upper)) {
            return "0".equals(lower) ? "*" : lower + "..*";
        }
        if (lower.equals(upper)) {
            return lower;
        }
        return lower + ".." + upper;
    }

    private void applyAutoLayout(ParsedXmiModel model) {
        List<String> classIds = new ArrayList<>();
        Map<String, LayoutEngineUtil.NodePosition> existingPositions = new HashMap<>();

        for (RawClass c : model.classes) {
            classIds.add(c.xmiId);
            if (Math.abs(c.posX) > 0.1 || Math.abs(c.posY) > 0.1) {
                existingPositions.put(c.xmiId, new LayoutEngineUtil.NodePosition(c.posX, c.posY));
            }
        }

        List<LayoutEngineUtil.EdgeDefinition> edgeDefs = new ArrayList<>();
        for (RawRelationship r : model.relationships) {
            edgeDefs.add(new LayoutEngineUtil.EdgeDefinition(r.sourceXmiId, r.targetXmiId));
        }

        Map<String, LayoutEngineUtil.NodePosition> positions = LayoutEngineUtil.computeLayout(classIds, edgeDefs, existingPositions);

        for (RawClass c : model.classes) {
            LayoutEngineUtil.NodePosition pos = positions.get(c.xmiId);
            if (pos != null) {
                c.posX = pos.x;
                c.posY = pos.y;
            }
        }
    }

    private void persistModel(DiagramProject project, ParsedXmiModel model) {
        Map<String, ClassNode> xmiIdToEntityMap = new HashMap<>();

        // 1. Save Classes
        for (RawClass raw : model.classes) {
            ClassNode entity = ClassNode.builder()
                    .project(project)
                    .name(raw.name)
                    .stereotype(raw.stereotype)
                    .abstractClass(raw.isAbstract)
                    .positionX(raw.posX)
                    .positionY(raw.posY)
                    .width(260.0)
                    .height(180.0)
                    .attributes(raw.attributes)
                    .methods(raw.methods)
                    .build();

            ClassNode saved = classNodeRepository.save(entity);
            xmiIdToEntityMap.put(raw.xmiId, saved);
        }

        // 2. Save Relationships
        for (RawRelationship rawRel : model.relationships) {
            ClassNode src = xmiIdToEntityMap.get(rawRel.sourceXmiId);
            ClassNode tgt = xmiIdToEntityMap.get(rawRel.targetXmiId);

            if (src != null && tgt != null) {
                Relationship rel = Relationship.builder()
                        .project(project)
                        .sourceClass(src)
                        .targetClass(tgt)
                        .type(rawRel.type)
                        .sourceCardinality(rawRel.sourceCardinality)
                        .targetCardinality(rawRel.targetCardinality)
                        .sourceRole(rawRel.sourceRole)
                        .targetRole(rawRel.targetRole)
                        .sourceHandle("bottom")
                        .targetHandle("top")
                        .label(rawRel.label)
                        .routing("smoothstep")
                        .build();

                relationshipRepository.save(rel);
            }
        }
    }

    private void recordAudit(DiagramProject project, UUID userId, String ip, String userAgent, ParsedXmiModel model) {
        Map<String, Object> details = new HashMap<>();
        details.put("projectName", project.getName());
        details.put("classesCount", model.classes.size());
        details.put("relationshipsCount", model.relationships.size());
        details.put("version", project.getVersion());

        auditLogService.recordAction(
                userId,
                "PROJECT_IMPORTED",
                "diagram_projects",
                project.getId(),
                ip != null ? ip : "127.0.0.1",
                userAgent != null ? userAgent : "XmiImportEngine",
                details
        );
    }

    private ImportXmiResponse buildResponse(DiagramProject project, ParsedXmiModel model, String message) {
        int totalAttrs = model.classes.stream().mapToInt(c -> c.attributes.size()).sum();
        int totalMethods = model.classes.stream().mapToInt(c -> c.methods.size()).sum();

        return ImportXmiResponse.builder()
                .projectId(project.getId())
                .projectName(project.getName())
                .version(project.getVersion())
                .classesCount(model.classes.size())
                .attributesCount(totalAttrs)
                .methodsCount(totalMethods)
                .relationshipsCount(model.relationships.size())
                .warnings(model.warnings)
                .message(message)
                .build();
    }

    private UserProfile resolveUser(String email) {
        if (email == null || email.trim().isEmpty()) return null;
        return userProfileRepository.findByEmail(email).orElse(null);
    }

    private String getXmiId(Element el) {
        String id = getAttr(el, "xmi:id");
        if (id == null) id = getAttr(el, "id");
        return id;
    }

    private String getAttr(Element el, String attrName) {
        if (el == null) return null;
        if (el.hasAttribute(attrName)) {
            return el.getAttribute(attrName);
        }
        // Case-insensitive fallback
        NamedNodeMap attrs = el.getAttributes();
        for (int i = 0; i < attrs.getLength(); i++) {
            Node n = attrs.item(i);
            if (n.getNodeName().equalsIgnoreCase(attrName)) {
                return n.getNodeValue();
            }
        }
        return null;
    }

    private String detectStereotypeFromComments(Element el) {
        NodeList comments = el.getElementsByTagName("ownedComment");
        for (int i = 0; i < comments.getLength(); i++) {
            String text = comments.item(i).getTextContent();
            if (text != null && text.contains("stereotype:")) {
                return text.replace("stereotype:", "").trim();
            }
        }
        return null;
    }

    private boolean detectPrimaryKey(Element el, String attrName) {
        if ("true".equalsIgnoreCase(getAttr(el, "isID")) || "true".equalsIgnoreCase(getAttr(el, "isPrimaryKey"))) {
            return true;
        }
        if (attrName != null && (attrName.equalsIgnoreCase("id") || attrName.contains("{PK}"))) {
            return true;
        }
        NodeList comments = el.getElementsByTagName("ownedComment");
        for (int i = 0; i < comments.getLength(); i++) {
            String body = comments.item(i).getTextContent();
            if (body != null && (body.toUpperCase().contains("PK") || body.toUpperCase().contains("PRIMARY KEY"))) {
                return true;
            }
        }
        return false;
    }

    private boolean detectNotNull(Element el) {
        String isNullable = getAttr(el, "isNullable");
        if ("false".equalsIgnoreCase(isNullable)) return true;

        NodeList children = el.getChildNodes();
        for (int i = 0; i < children.getLength(); i++) {
            if (children.item(i) instanceof Element child) {
                if ("lowerValue".equalsIgnoreCase(child.getLocalName() != null ? child.getLocalName() : child.getNodeName())) {
                    String val = getAttr(child, "value");
                    if (val != null) {
                        try {
                            if (Integer.parseInt(val.trim()) >= 1) {
                                return true;
                            }
                        } catch (NumberFormatException ignored) {
                        }
                    }
                }
            }
        }
        return false;
    }

    private String extractType(Element el) {
        String typeAttr = getAttr(el, "type");
        if (typeAttr != null && !typeAttr.trim().isEmpty() && !typeAttr.startsWith("attr_") && !typeAttr.startsWith("class_")) {
            return normalizeType(typeAttr);
        }

        NodeList children = el.getChildNodes();
        for (int i = 0; i < children.getLength(); i++) {
            if (children.item(i) instanceof Element child) {
                String name = child.getLocalName() != null ? child.getLocalName() : child.getNodeName();
                if ("type".equalsIgnoreCase(name)) {
                    String tName = getAttr(child, "name");
                    if (tName != null) return normalizeType(tName);

                    String href = getAttr(child, "href");
                    if (href != null && href.contains("#")) {
                        return normalizeType(href.substring(href.indexOf('#') + 1));
                    }
                }
            }
        }
        return "String";
    }

    private String normalizeType(String raw) {
        if (raw == null) return "String";
        String clean = raw.trim();
        if (clean.equalsIgnoreCase("Integer") || clean.equalsIgnoreCase("int")) return "Integer";
        if (clean.equalsIgnoreCase("Long")) return "Long";
        if (clean.equalsIgnoreCase("Boolean") || clean.equalsIgnoreCase("bool")) return "Boolean";
        if (clean.equalsIgnoreCase("Double")) return "Double";
        if (clean.equalsIgnoreCase("Float")) return "Float";
        if (clean.equalsIgnoreCase("Date") || clean.equalsIgnoreCase("LocalDate")) return "LocalDate";
        if (clean.equalsIgnoreCase("Timestamp") || clean.equalsIgnoreCase("DateTime")) return "LocalDateTime";
        if (clean.equalsIgnoreCase("UUID")) return "UUID";
        if (clean.equalsIgnoreCase("byte[]") || clean.equalsIgnoreCase("bytearray")) return "byte[]";
        return clean;
    }

    private String normalizeVisibility(String vis) {
        if (vis == null) return "private";
        String v = vis.trim().toLowerCase();
        if (v.startsWith("pub") || "+".equals(v)) return "public";
        if (v.startsWith("priv") || "-".equals(v)) return "private";
        if (v.startsWith("prot") || "#".equals(v)) return "protected";
        if (v.startsWith("pack") || "~".equals(v)) return "package";
        return "private";
    }

    private void checkProjectOwnership(DiagramProject project, UserProfile user) {
        if (project.getOwnerId() == null) return;
        boolean isOwner = project.getOwnerId().equals(user.getId());
        boolean isSuperAdmin = "SUPER_ADMIN".equalsIgnoreCase(user.getRole());

        if (!isOwner && !isSuperAdmin) {
            throw new IllegalArgumentException("Operación denegada: No tienes privilegios para modificar este proyecto.");
        }
    }
}
