package com.sw1.casetool.service.export;

import com.sw1.casetool.model.ClassNode;
import com.sw1.casetool.model.DiagramProject;
import com.sw1.casetool.model.Relationship;
import org.springframework.stereotype.Service;
import org.w3c.dom.Document;
import org.w3c.dom.Element;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.transform.OutputKeys;
import javax.xml.transform.Transformer;
import javax.xml.transform.TransformerFactory;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Service
public class XmiExportService {

    public byte[] exportToXmi(DiagramProject project, List<ClassNode> classes, List<Relationship> relationships) {
        try {
            DocumentBuilderFactory docFactory = DocumentBuilderFactory.newInstance();
            docFactory.setNamespaceAware(false);
            DocumentBuilder docBuilder = docFactory.newDocumentBuilder();
            Document doc = docBuilder.newDocument();

            // Root element: <xmi:XMI>
            Element xmiRoot = doc.createElement("xmi:XMI");
            xmiRoot.setAttribute("xmi:version", "2.1");
            xmiRoot.setAttribute("xmlns:xmi", "http://schema.omg.org/spec/XMI/2.1");
            xmiRoot.setAttribute("xmlns:uml", "http://schema.omg.org/spec/UML/2.1");
            doc.appendChild(xmiRoot);

            // <xmi:Documentation>
            Element docElement = doc.createElement("xmi:Documentation");
            docElement.setAttribute("exporter", "CASE Tool UML");
            docElement.setAttribute("exporterVersion", "1.0.0");
            xmiRoot.appendChild(docElement);

            // <uml:Model>
            Element modelElement = doc.createElement("uml:Model");
            String modelId = "model_" + (project.getId() != null ? project.getId().toString().replace("-", "_") : "default");
            modelElement.setAttribute("xmi:id", modelId);
            modelElement.setAttribute("xmi:type", "uml:Model");
            modelElement.setAttribute("name", project.getName() != null ? project.getName() : "ModeloUML");
            xmiRoot.appendChild(modelElement);

            // Map classes by UUID to their DOM element for relationships
            Map<UUID, Element> classElements = new HashMap<>();

            // 1. Export Classes
            for (ClassNode node : classes) {
                String classId = "class_" + node.getId().toString().replace("-", "_");
                Element classEl = doc.createElement("packagedElement");
                classEl.setAttribute("xmi:type", "uml:Class");
                classEl.setAttribute("xmi:id", classId);
                classEl.setAttribute("name", node.getName());
                classEl.setAttribute("isAbstract", String.valueOf(node.isAbstractClass()));

                if (node.getStereotype() != null && !node.getStereotype().trim().isEmpty()) {
                    classEl.setAttribute("visibility", "public");
                    Element comment = doc.createElement("ownedComment");
                    comment.setAttribute("xmi:id", "comment_" + classId);
                    Element body = doc.createElement("body");
                    body.setTextContent("«" + node.getStereotype().trim() + "»");
                    comment.appendChild(body);
                    classEl.appendChild(comment);
                }

                // Attributes
                if (node.getAttributes() != null) {
                    for (int i = 0; i < node.getAttributes().size(); i++) {
                        Map<String, Object> attr = node.getAttributes().get(i);
                        String attrName = (String) attr.getOrDefault("name", "attr" + i);
                        String attrType = (String) attr.getOrDefault("type", "String");
                        String visibility = mapVisibility((String) attr.get("visibility"));
                        boolean isStatic = Boolean.TRUE.equals(attr.get("isStatic"));
                        boolean isPk = TypeMappingUtil.isPrimaryKey(attr);

                        Element attrEl = doc.createElement("ownedAttribute");
                        attrEl.setAttribute("xmi:type", "uml:Property");
                        attrEl.setAttribute("xmi:id", "attr_" + classId + "_" + i);
                        attrEl.setAttribute("name", attrName);
                        attrEl.setAttribute("visibility", visibility);
                        attrEl.setAttribute("isStatic", String.valueOf(isStatic));

                        Element typeEl = doc.createElement("type");
                        typeEl.setAttribute("xmi:type", "uml:PrimitiveType");
                        typeEl.setAttribute("name", attrType);
                        attrEl.appendChild(typeEl);

                        if (isPk) {
                            Element pkComment = doc.createElement("ownedComment");
                            pkComment.setAttribute("xmi:id", "pk_note_" + classId + "_" + i);
                            Element body = doc.createElement("body");
                            body.setTextContent("{PK}");
                            pkComment.appendChild(body);
                            attrEl.appendChild(pkComment);
                        }

                        classEl.appendChild(attrEl);
                    }
                }

                // Methods
                if (node.getMethods() != null) {
                    for (int i = 0; i < node.getMethods().size(); i++) {
                        Map<String, Object> method = node.getMethods().get(i);
                        String methodName = (String) method.getOrDefault("name", "op" + i);
                        String returnType = (String) method.getOrDefault("returnType", "void");
                        String visibility = mapVisibility((String) method.get("visibility"));
                        boolean isAbstract = Boolean.TRUE.equals(method.get("isAbstract"));
                        boolean isStatic = Boolean.TRUE.equals(method.get("isStatic"));

                        Element opEl = doc.createElement("ownedOperation");
                        opEl.setAttribute("xmi:type", "uml:Operation");
                        opEl.setAttribute("xmi:id", "op_" + classId + "_" + i);
                        opEl.setAttribute("name", methodName);
                        opEl.setAttribute("visibility", visibility);
                        opEl.setAttribute("isAbstract", String.valueOf(isAbstract));
                        opEl.setAttribute("isStatic", String.valueOf(isStatic));

                        // Return Parameter
                        Element returnParam = doc.createElement("ownedParameter");
                        returnParam.setAttribute("xmi:type", "uml:Parameter");
                        returnParam.setAttribute("xmi:id", "param_" + classId + "_" + i + "_ret");
                        returnParam.setAttribute("name", "return");
                        returnParam.setAttribute("direction", "return");
                        Element retTypeEl = doc.createElement("type");
                        retTypeEl.setAttribute("xmi:type", "uml:PrimitiveType");
                        retTypeEl.setAttribute("name", returnType);
                        returnParam.appendChild(retTypeEl);
                        opEl.appendChild(returnParam);

                        // Parameters if present
                        Object paramsObj = method.get("parameters");
                        if (paramsObj instanceof List<?> paramList) {
                            for (int p = 0; p < paramList.size(); p++) {
                                Object pObj = paramList.get(p);
                                String pName = "param" + p;
                                String pType = "Object";
                                if (pObj instanceof Map<?, ?> pMap) {
                                    Object valName = pMap.get("name");
                                    if (valName != null) pName = valName.toString();
                                    Object valType = pMap.get("type");
                                    if (valType != null) pType = valType.toString();
                                } else if (pObj instanceof String pStr) {
                                    String[] parts = pStr.split(":");
                                    pName = parts[0].trim();
                                    if (parts.length > 1) pType = parts[1].trim();
                                }

                                Element inParam = doc.createElement("ownedParameter");
                                inParam.setAttribute("xmi:type", "uml:Parameter");
                                inParam.setAttribute("xmi:id", "param_" + classId + "_" + i + "_" + p);
                                inParam.setAttribute("name", pName);
                                inParam.setAttribute("direction", "in");
                                Element paramTypeEl = doc.createElement("type");
                                paramTypeEl.setAttribute("xmi:type", "uml:PrimitiveType");
                                paramTypeEl.setAttribute("name", pType);
                                inParam.appendChild(paramTypeEl);
                                opEl.appendChild(inParam);
                            }
                        }

                        classEl.appendChild(opEl);
                    }
                }

                modelElement.appendChild(classEl);
                classElements.put(node.getId(), classEl);
            }

            // 2. Export Relationships
            if (relationships != null) {
                for (Relationship rel : relationships) {
                    if (rel.getSourceClass() == null || rel.getTargetClass() == null) continue;
                    UUID srcId = rel.getSourceClass().getId();
                    UUID tgtId = rel.getTargetClass().getId();
                    String relType = rel.getType() != null ? rel.getType().toLowerCase(Locale.ROOT) : "association";
                    String relId = "rel_" + rel.getId().toString().replace("-", "_");
                    String srcClassId = "class_" + srcId.toString().replace("-", "_");
                    String tgtClassId = "class_" + tgtId.toString().replace("-", "_");

                    if ("generalization".equals(relType) || "inheritance".equals(relType)) {
                        // Generalization is owned by the subclass (source)
                        Element srcEl = classElements.get(srcId);
                        if (srcEl != null) {
                            Element genEl = doc.createElement("generalization");
                            genEl.setAttribute("xmi:type", "uml:Generalization");
                            genEl.setAttribute("xmi:id", "gen_" + relId);
                            genEl.setAttribute("general", tgtClassId);
                            srcEl.appendChild(genEl);
                        }
                    } else if ("realization".equals(relType)) {
                        Element srcEl = classElements.get(srcId);
                        if (srcEl != null) {
                            Element realEl = doc.createElement("interfaceRealization");
                            realEl.setAttribute("xmi:type", "uml:InterfaceRealization");
                            realEl.setAttribute("xmi:id", "real_" + relId);
                            realEl.setAttribute("supplier", tgtClassId);
                            realEl.setAttribute("client", srcClassId);
                            realEl.setAttribute("contract", tgtClassId);
                            srcEl.appendChild(realEl);
                        }
                    } else {
                        // Association, Aggregation, Composition, Directed Association
                        Element assocEl = doc.createElement("packagedElement");
                        assocEl.setAttribute("xmi:type", "uml:Association");
                        assocEl.setAttribute("xmi:id", "assoc_" + relId);
                        if (rel.getLabel() != null && !rel.getLabel().trim().isEmpty()) {
                            assocEl.setAttribute("name", rel.getLabel().trim());
                        }

                        String srcEndId = "end_" + relId + "_src";
                        String tgtEndId = "end_" + relId + "_tgt";

                        assocEl.setAttribute("memberEnd", srcEndId + " " + tgtEndId);

                        // Source End
                        Element srcEnd = doc.createElement("ownedEnd");
                        srcEnd.setAttribute("xmi:type", "uml:Property");
                        srcEnd.setAttribute("xmi:id", srcEndId);
                        srcEnd.setAttribute("type", srcClassId);
                        if (rel.getSourceRole() != null) srcEnd.setAttribute("name", rel.getSourceRole());

                        // Aggregation type
                        if ("aggregation".equals(relType)) {
                            srcEnd.setAttribute("aggregation", "shared");
                        } else if ("composition".equals(relType)) {
                            srcEnd.setAttribute("aggregation", "composite");
                        } else {
                            srcEnd.setAttribute("aggregation", "none");
                        }
                        appendMultiplicity(doc, srcEnd, rel.getSourceCardinality(), relId + "_src");
                        assocEl.appendChild(srcEnd);

                        // Target End
                        Element tgtEnd = doc.createElement("ownedEnd");
                        tgtEnd.setAttribute("xmi:type", "uml:Property");
                        tgtEnd.setAttribute("xmi:id", tgtEndId);
                        tgtEnd.setAttribute("type", tgtClassId);
                        if (rel.getTargetRole() != null) tgtEnd.setAttribute("name", rel.getTargetRole());
                        tgtEnd.setAttribute("aggregation", "none");
                        appendMultiplicity(doc, tgtEnd, rel.getTargetCardinality(), relId + "_tgt");
                        assocEl.appendChild(tgtEnd);

                        modelElement.appendChild(assocEl);
                    }
                }
            }

            // Transform to XML UTF-8 byte array with clean indentation
            TransformerFactory transformerFactory = TransformerFactory.newInstance();
            Transformer transformer = transformerFactory.newTransformer();
            transformer.setOutputProperty(OutputKeys.INDENT, "yes");
            transformer.setOutputProperty(OutputKeys.ENCODING, "UTF-8");
            transformer.setOutputProperty("{http://xml.apache.org/xslt}indent-amount", "2");

            DOMSource source = new DOMSource(doc);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            StreamResult result = new StreamResult(out);
            transformer.transform(source, result);

            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Error al generar archivo OMG XMI 2.1: " + e.getMessage(), e);
        }
    }

    private void appendMultiplicity(Document doc, Element endEl, String cardinality, String prefix) {
        if (cardinality == null || cardinality.trim().isEmpty()) {
            cardinality = "1";
        }
        cardinality = cardinality.trim();

        String lower = "1";
        String upper = "1";

        if ("*".equals(cardinality)) {
            lower = "0";
            upper = "*";
        } else if ("0..1".equals(cardinality)) {
            lower = "0";
            upper = "1";
        } else if ("1..*".equals(cardinality)) {
            lower = "1";
            upper = "*";
        } else if ("0..*".equals(cardinality)) {
            lower = "0";
            upper = "*";
        } else if (cardinality.contains("..")) {
            String[] parts = cardinality.split("\\.\\.");
            lower = parts[0].trim();
            if (parts.length > 1) upper = parts[1].trim();
        }

        Element lowEl = doc.createElement("lowerValue");
        lowEl.setAttribute("xmi:type", "uml:LiteralInteger");
        lowEl.setAttribute("xmi:id", "low_" + prefix);
        lowEl.setAttribute("value", lower.replaceAll("[^0-9]", "0"));
        endEl.appendChild(lowEl);

        Element uppEl = doc.createElement("upperValue");
        uppEl.setAttribute("xmi:type", "uml:LiteralUnlimitedNatural");
        uppEl.setAttribute("xmi:id", "upp_" + prefix);
        uppEl.setAttribute("value", "*".equals(upper) ? "-1" : upper.replaceAll("[^0-9]", "1"));
        endEl.appendChild(uppEl);
    }

    private String mapVisibility(String visibility) {
        if (visibility == null) return "public";
        return switch (visibility.trim()) {
            case "-", "private" -> "private";
            case "#", "protected" -> "protected";
            case "~", "package", "default" -> "package";
            default -> "public";
        };
    }
}
