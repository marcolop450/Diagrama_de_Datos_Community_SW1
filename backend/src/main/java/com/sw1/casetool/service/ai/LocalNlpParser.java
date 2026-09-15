package com.sw1.casetool.service.ai;

import com.sw1.casetool.dto.ai.UmlMutationDto;
import com.sw1.casetool.dto.ai.VoiceModelingResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Motor heurístico y gramatical de Procesamiento de Lenguaje Natural (PLN) Local Offline (Nivel 4).
 * Procesa instrucciones en lenguaje natural en español sin requerir conexión a internet ni cuota de APIs externas.
 */
@Slf4j
@Component
public class LocalNlpParser {

    private static final Set<String> STOP_WORDS = Set.of(
            "que", "de", "con", "y", "e", "o", "u", "la", "el", "los", "las", "un", "una", "unos", "unas",
            "para", "por", "en", "al", "del", "a", "hacia", "desde",
            "tabla", "clase", "entidad", "modelo",
            "atributo", "atributos", "campo", "campos",
            "llamado", "llamada", "llamados", "llamadas",
            "tipo", "tipos", "tenga", "tiene", "tienen", "posea", "posee",
            "agregando", "agregar", "anadiendo", "añadiendo", "incluyendo", "incluir"
    );

    public VoiceModelingResponse parse(String rawText, List<String> currentClasses) {
        if (rawText == null || rawText.trim().isEmpty()) {
            return VoiceModelingResponse.builder()
                    .success(false)
                    .intent("UNKNOWN")
                    .providerUsed("local-heuristic-nlp")
                    .latencyMs(2)
                    .message("No se detectó audio o el comando de voz está vacío (Regla E1).")
                    .mutations(Collections.emptyList())
                    .build();
        }

        String text = rawText.trim();
        String lower = text.toLowerCase(Locale.ROOT);

        // 1. Crear y Conectar Compuesto ("generame una tabla llamado gatos conectado con la tabla estudiante")
        VoiceModelingResponse compoundResp = tryParseCompoundCreateAndConnect(lower, text, currentClasses);
        if (compoundResp != null) return compoundResp;

        // 2. Modificar / Agregar atributos a tabla existente ("modificar la tabla estudiante agregando los campos telefono String...")
        VoiceModelingResponse modifyResp = tryParseModifyOrAddAttributes(lower, text, currentClasses);
        if (modifyResp != null) return modifyResp;

        // 3. Herencia / Generalización ("X hereda de Y", "crear tabla X que hereda de Y")
        VoiceModelingResponse inheritanceResp = tryParseInheritance(lower, text, currentClasses);
        if (inheritanceResp != null) return inheritanceResp;

        // 4. Conectar / Relacionar ("conectar X con Y de uno a muchos", "relacionar tabla X con tabla Y")
        VoiceModelingResponse relResp = tryParseRelationship(lower, text, currentClasses);
        if (relResp != null) return relResp;

        // 5. Modificar clase / tabla abstracta o interfaz ("hacer clase X abstracta", "convertir X a interfaz")
        VoiceModelingResponse updateResp = tryParseUpdateClass(lower, text, currentClasses);
        if (updateResp != null) return updateResp;

        // 6. Eliminar clase / tabla ("eliminar tabla X", "borrar X")
        VoiceModelingResponse deleteResp = tryParseDelete(lower, text, currentClasses);
        if (deleteResp != null) return deleteResp;

        // 7. Agregar atributo simple a clase / tabla existente ("agregar atributo X de tipo Y a Z")
        VoiceModelingResponse addAttrResp = tryParseAddAttribute(lower, text, currentClasses);
        if (addAttrResp != null) return addAttrResp;

        // 8. Agregar método ("agregar metodo calcularX(): Double a Clase")
        VoiceModelingResponse addMethodResp = tryParseAddMethod(lower, text, currentClasses);
        if (addMethodResp != null) return addMethodResp;

        // 9. Crear dominio / Batch ("crear sistema de biblioteca con Libro, Autor y Prestamo")
        VoiceModelingResponse batchResp = tryParseBatchDomain(lower, text);
        if (batchResp != null) return batchResp;

        // 10. Crear clase / tabla con o sin atributos ("crear tabla Factura con atributos id Long, total BigDecimal...")
        VoiceModelingResponse createClassResp = tryParseCreateClass(lower, text);
        if (createClassResp != null) return createClassResp;

        // Si no coincide con un comando estructurado
        return VoiceModelingResponse.builder()
                .success(false)
                .intent("UNKNOWN")
                .providerUsed("local-heuristic-nlp")
                .latencyMs(3)
                .message("No se pudo interpretar una intención UML clara para: \"" + text + "\". Intenta: \"Crear tabla Factura con total Double y fecha LocalDate\" o \"Conectar Factura con Cliente\".")
                .mutations(Collections.emptyList())
                .build();
    }

    private VoiceModelingResponse tryParseCompoundCreateAndConnect(String lower, String text, List<String> currentClasses) {
        // "generame una tabla llamado gatos conectado con la tabla estudiante"
        // "la clase gato y conecta con la clase estudiante clase gato tendrá nombre y apellido"
        // "crear tabla pedidos con total Double conectada a cliente de uno a muchos"
        // "crea una tabla gatos con id, nombre y fecha conectado a estudiante"
        Pattern p = Pattern.compile(
                "(?:(?:generar|genera(?:me)?|crear|crea(?:me)?|haz(?:me)?|hacer|nueva|nuevo|insertar|agregar|agrega(?:me)?)\\s+)?(?:(?:la|el|una?)\\s+)?(?:clase|tabla|entidad|modelo)\\s+(?:(?:llamad[ao]s?|de\\s+nombre|con\\s+nombre)\\s+)?([a-zA-Z0-9_áéíóúÁÉÍÓÚñÑ]+)(?:\\s+(?:con|de)?\\s*(?:atributos?|campos?)?\\s*[:]?\\s*(.*?))?\\s*(?:y\\s+)?(?:conecta(?:r|la|lo|me)?|conectad[ao]|relaciona(?:r|la|lo|me)?|relacionad[ao]|asocia(?:r|la|lo|me)?|asociad[ao]|vincula(?:r|la|lo|me)?|vinculad[ao])\\s+(?:con|a|hacia)\\s+(?:la\\s+|el\\s+)?(?:clase|tabla|entidad)?\\s*([a-zA-Z0-9_áéíóúÁÉÍÓÚñÑ]+)(?:\\s+(?:de\\s+)?(.*))?",
                Pattern.CASE_INSENSITIVE
        );
        Matcher m = p.matcher(lower);
        if (!m.find()) {
            return null;
        }

        String rawClassName = m.group(1).trim();
        String rawAttributes = m.group(2) != null ? m.group(2).trim() : "";
        String rawTargetClass = m.group(3).trim();
        String rawCardinality = m.group(4) != null ? m.group(4).trim() : "";

        String className = capitalize(cleanIdentifier(rawClassName));
        String targetClass = capitalize(cleanIdentifier(rawTargetClass));

        if (currentClasses != null) {
            for (String c : currentClasses) {
                if (c.equalsIgnoreCase(targetClass) || c.equalsIgnoreCase(rawTargetClass)
                        || stripPlural(c).equalsIgnoreCase(stripPlural(targetClass))
                        || stripAccents(c).equalsIgnoreCase(stripAccents(targetClass))) {
                    targetClass = c;
                    break;
                }
            }
        }

        List<Map<String, Object>> attributes = new ArrayList<>();
        boolean hasPk = false;

        // Atributos definidos antes de la conexión
        if (!rawAttributes.isEmpty() && !rawAttributes.equalsIgnoreCase("con") && !rawAttributes.equalsIgnoreCase("de")) {
            String[] tokens = rawAttributes.split("(?:,\\s*|\\s+y\\s+)");
            for (String token : tokens) {
                token = token.trim();
                if (token.isEmpty()) continue;
                Map<String, Object> attr = parseAttributeToken(token);
                if (attr != null) {
                    if (Boolean.TRUE.equals(attr.get("isPrimaryKey"))) {
                        hasPk = true;
                    }
                    attributes.add(attr);
                }
            }
        }

        // Atributos definidos después de la conexión (ej. "conecta con estudiante, clase gato tendrá nombre y apellido")
        if (!rawCardinality.isEmpty() && (attributes.isEmpty() || !hasPk)) {
            Pattern trailingAttrPattern = Pattern.compile(
                    "(?:tendr[aá]|tiene|tienen|con\\s+(?:atributos?|campos?|los\\s+campos?))\\s*[:]?\\s*(.*)",
                    Pattern.CASE_INSENSITIVE
            );
            Matcher tm = trailingAttrPattern.matcher(rawCardinality);
            if (tm.find()) {
                String trailingAttrText = tm.group(1).trim();
                String[] tokens = trailingAttrText.split("(?:,\\s*|\\s+y\\s+)");
                for (String token : tokens) {
                    token = token.trim();
                    if (token.isEmpty()) continue;
                    Map<String, Object> attr = parseAttributeToken(token);
                    if (attr != null) {
                        if (Boolean.TRUE.equals(attr.get("isPrimaryKey"))) {
                            hasPk = true;
                        }
                        attributes.add(attr);
                    }
                }
            }
        }

        if (!hasPk) {
            Map<String, Object> pk = new LinkedHashMap<>();
            pk.put("id", UUID.randomUUID().toString());
            pk.put("name", "id");
            pk.put("type", "Long");
            pk.put("visibility", "+");
            pk.put("isPrimaryKey", true);
            pk.put("isId", true);
            pk.put("isNotNull", true);
            pk.put("isUnique", true);
            attributes.add(0, pk);
        }

        Map<String, Object> classData = new LinkedHashMap<>();
        classData.put("name", className);
        classData.put("isAbstract", false);
        classData.put("stereotype", null);
        classData.put("attributes", attributes);
        classData.put("methods", new ArrayList<>());

        UmlMutationDto createClassMutation = UmlMutationDto.builder()
                .action("CREATE_CLASS")
                .targetClassName(className)
                .classData(classData)
                .details("Creación de la tabla '" + className + "' con " + attributes.size() + " atributo(s).")
                .build();

        String srcCard = "1";
        String tgtCard = "*";
        if (rawCardinality.contains("uno a uno") || rawCardinality.contains("1 a 1") || rawCardinality.contains("1..1")) {
            srcCard = "1";
            tgtCard = "1";
        } else if (rawCardinality.contains("muchos a muchos") || rawCardinality.contains("* a *") || rawCardinality.contains("*..*")) {
            srcCard = "*";
            tgtCard = "*";
        } else if (rawCardinality.contains("muchos a uno") || rawCardinality.contains("* a 1") || rawCardinality.contains("*..1")) {
            srcCard = "*";
            tgtCard = "1";
        } else if (rawCardinality.contains("uno a muchos") || rawCardinality.contains("1 a *") || rawCardinality.contains("1..*")) {
            srcCard = "1";
            tgtCard = "*";
        }

        Map<String, Object> relData = new LinkedHashMap<>();
        relData.put("sourceClass", className);
        relData.put("targetClass", targetClass);
        relData.put("type", "ASSOCIATION");
        relData.put("sourceCardinality", srcCard);
        relData.put("targetCardinality", tgtCard);
        relData.put("sourceRole", "");
        relData.put("targetRole", "");

        UmlMutationDto createRelMutation = UmlMutationDto.builder()
                .action("CREATE_RELATIONSHIP")
                .relationshipData(relData)
                .details("Asociación UML entre '" + className + "' (" + srcCard + ") y '" + targetClass + "' (" + tgtCard + ").")
                .build();

        return VoiceModelingResponse.builder()
                .success(true)
                .intent("CREATE_CLASS_AND_RELATIONSHIP")
                .providerUsed("local-heuristic-nlp")
                .latencyMs(6)
                .message("Tabla '" + className + "' creada y conectada con '" + targetClass + "'.")
                .mutations(List.of(createClassMutation, createRelMutation))
                .build();
    }

    private VoiceModelingResponse tryParseModifyOrAddAttributes(String lower, String text, List<String> currentClasses) {
        // "modifica la tabla estudiante agregando los campos telefono String y direccion String"
        // "modificar tabla estudiante con telefono String, direccion String"
        // "actualizar tabla estudiante agregando telefono String y direccion String"
        // "actualiza clase Estudiante con campos telefono y direccion"
        // "agregar a la tabla estudiante los campos telefono String y direccion String"
        // "en la tabla estudiante agregar telefono String y direccion String"
        Pattern p1 = Pattern.compile(
                "(?:modificar?|modifica(?:me)?|actualizar?|actualiza(?:me)?|editar?|edita(?:me)?|cambiar?|cambia(?:me)?)\\s+(?:la\\s+)?(?:clase|tabla|entidad)?\\s*([a-zA-Z0-9_áéíóúÁÉÍÓÚñÑ]+)(?:\\s+(?:agregando|anadiendo|añadiendo|con|insertando|poniendo)?\\s*(?:los|las|el|la)?\\s*(?:atributos?|campos?)?\\s*[:]?\\s*(.*))?",
                Pattern.CASE_INSENSITIVE
        );
        Matcher m1 = p1.matcher(lower);

        String rawTargetClass;
        String rawAttributes;

        if (m1.find()) {
            rawTargetClass = m1.group(1).trim();
            rawAttributes = m1.group(2) != null ? m1.group(2).trim() : "";
        } else {
            Pattern p2 = Pattern.compile(
                    "(?:agregar|agrega(?:me)?|anadir|añadir|adicionar|insertar|poner(?:le)?)\\s+(?:a|en|para)\\s+(?:la\\s+)?(?:clase|tabla|entidad)?\\s*([a-zA-Z0-9_áéíóúÁÉÍÓÚñÑ]+)(?:\\s+(?:los|las|el|la)?\\s*(?:atributos?|campos?)?\\s*[:]?\\s*(.*))?",
                    Pattern.CASE_INSENSITIVE
            );
            Matcher m2 = p2.matcher(lower);
            if (m2.find()) {
                rawTargetClass = m2.group(1).trim();
                rawAttributes = m2.group(2) != null ? m2.group(2).trim() : "";
            } else {
                Pattern p3 = Pattern.compile(
                        "(?:en|a)\\s+(?:la\\s+)?(?:clase|tabla|entidad)?\\s*([a-zA-Z0-9_áéíóúÁÉÍÓÚñÑ]+)\\s+(?:agregar|agrega(?:me)?|anadir|añadir|poner|insertar)(?:\\s+(?:los|las|el|la)?\\s*(?:atributos?|campos?)?\\s*[:]?\\s*(.*))?",
                        Pattern.CASE_INSENSITIVE
                );
                Matcher m3 = p3.matcher(lower);
                if (m3.find()) {
                    rawTargetClass = m3.group(1).trim();
                    rawAttributes = m3.group(2) != null ? m3.group(2).trim() : "";
                } else {
                    return null;
                }
            }
        }

        // Si la instrucción es hacerla abstracta o interfaz, dejar a tryParseUpdateClass
        if (rawAttributes.contains("abstract") || rawAttributes.contains("interfaz") || rawAttributes.contains("interface")) {
            return null;
        }

        String targetClass = capitalize(cleanIdentifier(rawTargetClass));
        if (currentClasses != null) {
            for (String c : currentClasses) {
                if (c.equalsIgnoreCase(targetClass) || c.equalsIgnoreCase(rawTargetClass)) {
                    targetClass = c;
                    break;
                }
            }
        }

        if (rawAttributes.isBlank()) {
            return null;
        }

        List<Map<String, Object>> attributes = new ArrayList<>();
        String[] tokens = rawAttributes.split("(?:,\\s*|\\s+y\\s+)");
        for (String token : tokens) {
            token = token.trim();
            if (token.isEmpty()) continue;
            Map<String, Object> attr = parseAttributeToken(token);
            if (attr != null) {
                attributes.add(attr);
            }
        }

        if (attributes.isEmpty()) {
            return null;
        }

        Map<String, Object> classData = new LinkedHashMap<>();
        classData.put("name", targetClass);
        classData.put("attributes", attributes);

        UmlMutationDto mutation = UmlMutationDto.builder()
                .action("ADD_ATTRIBUTES")
                .targetClassName(targetClass)
                .classData(classData)
                .details("Modificación de la tabla/clase '" + targetClass + "' agregando " + attributes.size() + " atributo(s).")
                .build();

        return VoiceModelingResponse.builder()
                .success(true)
                .intent("ADD_ATTRIBUTES")
                .providerUsed("local-heuristic-nlp")
                .latencyMs(4)
                .message("Tabla '" + targetClass + "' actualizada con " + attributes.size() + " nuevo(s) atributo(s).")
                .mutations(Collections.singletonList(mutation))
                .build();
    }

    private VoiceModelingResponse tryParseCreateClass(String lower, String text) {
        // "crear clase Factura", "generame una tabla gatos", "nueva entidad Producto", "clase Cliente: ..."
        Pattern p = Pattern.compile(
                "(?:generar|genera(?:me)?|crear|crea(?:me)?|haz(?:me)?|hacer|nueva|nuevo|insertar|agregar|agrega(?:me)?)\\s+(?:una?\\s+)?(?:clase|tabla|entidad|modelo)?\\s*(?:(?:llamad[ao]s?|de\\s+nombre|con\\s+nombre)\\s+)?([a-zA-Z0-9_áéíóúÁÉÍÓÚñÑ]+)(?:\\s+(?:con|de)?\\s*(?:atributos?|campos?)?\\s*[:]?\\s*(.*))?",
                Pattern.CASE_INSENSITIVE
        );
        Matcher m = p.matcher(lower);
        if (!m.find()) {
            Pattern p2 = Pattern.compile("(?:clase|tabla|entidad|modelo)\\s+([a-zA-Z0-9_áéíóúÁÉÍÓÚñÑ]+)(?:\\s+(?:con|de)?\\s*(?:atributos?|campos?)?\\s*[:]?\\s*(.*))?", Pattern.CASE_INSENSITIVE);
            m = p2.matcher(lower);
            if (!m.find()) {
                return null;
            }
        }

        String rawClassName = m.group(1).trim();
        String className = capitalize(cleanIdentifier(rawClassName));
        String rawAttributes = m.group(2) != null ? m.group(2).trim() : "";

        boolean isAbstract = lower.contains("abstracta") || lower.contains("abstract");
        String stereotype = lower.contains("interfaz") || lower.contains("interface") ? "interface" : null;

        List<Map<String, Object>> attributes = new ArrayList<>();
        boolean hasPk = false;

        if (!rawAttributes.isEmpty() && !rawAttributes.equalsIgnoreCase("con") && !rawAttributes.equalsIgnoreCase("de")) {
            String[] tokens = rawAttributes.split("(?:,\\s*|\\s+y\\s+)");
            for (String token : tokens) {
                token = token.trim();
                if (token.isEmpty()) continue;

                Map<String, Object> attr = parseAttributeToken(token);
                if (attr != null) {
                    if (Boolean.TRUE.equals(attr.get("isPrimaryKey"))) {
                        hasPk = true;
                    }
                    attributes.add(attr);
                }
            }
        }

        if (!hasPk) {
            Map<String, Object> pk = new LinkedHashMap<>();
            pk.put("id", UUID.randomUUID().toString());
            pk.put("name", "id");
            pk.put("type", "Long");
            pk.put("visibility", "+");
            pk.put("isPrimaryKey", true);
            pk.put("isId", true);
            pk.put("isNotNull", true);
            pk.put("isUnique", true);
            attributes.add(0, pk);
        }

        Map<String, Object> classData = new LinkedHashMap<>();
        classData.put("name", className);
        classData.put("isAbstract", isAbstract);
        classData.put("stereotype", stereotype);
        classData.put("attributes", attributes);
        classData.put("methods", new ArrayList<>());

        UmlMutationDto mutation = UmlMutationDto.builder()
                .action("CREATE_CLASS")
                .targetClassName(className)
                .classData(classData)
                .details("Creación de la clase/tabla UML '" + className + "' con " + attributes.size() + " atributo(s).")
                .build();

        return VoiceModelingResponse.builder()
                .success(true)
                .intent("CREATE_CLASS")
                .providerUsed("local-heuristic-nlp")
                .latencyMs(5)
                .message("Clase/Tabla '" + className + "' identificada con " + attributes.size() + " atributo(s).")
                .mutations(Collections.singletonList(mutation))
                .build();
    }

    private VoiceModelingResponse tryParseAddAttribute(String lower, String text, List<String> currentClasses) {
        // "agregar atributo [attr] de tipo [tipo] a la clase [clase]"
        // "en la tabla gatos agregar atributo edad Integer"
        Pattern p1 = Pattern.compile("(?:agregar|agrega(?:me)?|anadir|añadir|adicionar|insertar|poner(?:le)?)\\s+(?:el\\s+)?(?:atributo|campo)?\\s*([a-zA-Z0-9_]+)(?:\\s+(?:de\\s+tipo|tipo)?\\s*([a-zA-Z0-9_\\[\\]]+))?\\s+(?:a|en|para)\\s+(?:la\\s+)?(?:clase|tabla|entidad)?\\s*([a-zA-Z0-9_]+)", Pattern.CASE_INSENSITIVE);
        Matcher m = p1.matcher(lower);
        String attrName;
        String rawType;
        String targetClass;

        if (m.find()) {
            attrName = toCamelCase(m.group(1).trim());
            rawType = m.group(2) != null ? m.group(2).trim() : "String";
            targetClass = capitalize(cleanIdentifier(m.group(3).trim()));
        } else {
            Pattern p2 = Pattern.compile("(?:a|en|para)\\s+(?:la\\s+)?(?:clase|tabla|entidad)\\s+([a-zA-Z0-9_]+)\\s+(?:agregar|agrega(?:me)?|anadir|añadir|poner|insertar)\\s+(?:el\\s+)?(?:atributo|campo)?\\s*([a-zA-Z0-9_]+)(?:\\s+(?:de\\s+tipo|tipo)?\\s*([a-zA-Z0-9_\\[\\]]+))?", Pattern.CASE_INSENSITIVE);
            Matcher m2 = p2.matcher(lower);
            if (m2.find()) {
                targetClass = capitalize(cleanIdentifier(m2.group(1).trim()));
                attrName = toCamelCase(m2.group(2).trim());
                rawType = m2.group(3) != null ? m2.group(3).trim() : "String";
            } else {
                return null;
            }
        }

        if (currentClasses != null) {
            for (String c : currentClasses) {
                if (c.equalsIgnoreCase(targetClass)) {
                    targetClass = c;
                    break;
                }
            }
        }

        String mappedType = mapType(rawType);

        Map<String, Object> attr = new LinkedHashMap<>();
        attr.put("id", UUID.randomUUID().toString());
        attr.put("name", attrName);
        attr.put("type", mappedType);
        attr.put("visibility", "-");
        attr.put("isNotNull", true);

        Map<String, Object> classData = new LinkedHashMap<>();
        classData.put("name", targetClass);
        classData.put("attributes", Collections.singletonList(attr));

        UmlMutationDto mutation = UmlMutationDto.builder()
                .action("ADD_ATTRIBUTES")
                .targetClassName(targetClass)
                .classData(classData)
                .details("Inyección del atributo '" + attrName + ": " + mappedType + "' en clase '" + targetClass + "'.")
                .build();

        return VoiceModelingResponse.builder()
                .success(true)
                .intent("ADD_ATTRIBUTES")
                .providerUsed("local-heuristic-nlp")
                .latencyMs(4)
                .message("Atributo '" + attrName + ": " + mappedType + "' agregado a '" + targetClass + "'.")
                .mutations(Collections.singletonList(mutation))
                .build();
    }

    private VoiceModelingResponse tryParseAddMethod(String lower, String text, List<String> currentClasses) {
        Pattern p = Pattern.compile("(?:agregar|anadir|añadir|adicionar)\\s+(?:el\\s+)?(?:metodo|método|funcion)?\\s*([a-zA-Z0-9_]+)(?:\\s*\\((.*?)\\))?(?:\\s*(?:de\\s+retorno|retorna|retorno|:)?\\s*([a-zA-Z0-9_]+))?\\s+(?:a|en)\\s+(?:la\\s+)?(?:clase|tabla|entidad)?\\s*([a-zA-Z0-9_]+)", Pattern.CASE_INSENSITIVE);
        Matcher m = p.matcher(lower);
        if (!m.find()) {
            return null;
        }

        String methodName = toCamelCase(m.group(1).trim());
        String rawParams = m.group(2) != null ? m.group(2).trim() : "";
        String returnType = m.group(3) != null ? mapType(m.group(3).trim()) : "void";
        String targetClass = capitalize(cleanIdentifier(m.group(4).trim()));
        if (currentClasses != null) {
            for (String c : currentClasses) {
                if (c.equalsIgnoreCase(targetClass)) {
                    targetClass = c;
                    break;
                }
            }
        }

        List<Map<String, String>> params = new ArrayList<>();
        if (!rawParams.isEmpty()) {
            for (String pToken : rawParams.split(",")) {
                String[] parts = pToken.trim().split("[:\\s]+");
                String pName = parts.length > 0 ? toCamelCase(parts[0]) : "param";
                String pType = parts.length > 1 ? mapType(parts[1]) : "String";
                Map<String, String> paramObj = new LinkedHashMap<>();
                paramObj.put("name", pName);
                paramObj.put("type", pType);
                params.add(paramObj);
            }
        }

        Map<String, Object> method = new LinkedHashMap<>();
        method.put("id", UUID.randomUUID().toString());
        method.put("name", methodName);
        method.put("returnType", returnType);
        method.put("visibility", "+");
        method.put("parameters", params);

        Map<String, Object> classData = new LinkedHashMap<>();
        classData.put("name", targetClass);
        classData.put("methods", Collections.singletonList(method));

        UmlMutationDto mutation = UmlMutationDto.builder()
                .action("ADD_METHODS")
                .targetClassName(targetClass)
                .classData(classData)
                .details("Inyección del método '" + methodName + "(): " + returnType + "' en clase '" + targetClass + "'.")
                .build();

        return VoiceModelingResponse.builder()
                .success(true)
                .intent("ADD_METHODS")
                .providerUsed("local-heuristic-nlp")
                .latencyMs(4)
                .message("Método '" + methodName + "' agregado a '" + targetClass + "'.")
                .mutations(Collections.singletonList(mutation))
                .build();
    }

    private VoiceModelingResponse tryParseInheritance(String lower, String text, List<String> currentClasses) {
        // "Estudiante hereda de Persona", "crear tabla Gato que hereda de Animal"
        Pattern p = Pattern.compile("(?:(?:crear|genera(?:me)?|crea(?:me)?)\\s+(?:una?\\s+)?(?:clase|tabla|entidad)?\\s*)?([a-zA-Z0-9_]+)\\s+(?:que\\s+)?(?:hereda\\s+de|extiende\\s+(?:a)?|es\\s+subclase\\s+de)\\s+(?:la\\s+)?(?:clase|tabla|entidad)?\\s*([a-zA-Z0-9_]+)", Pattern.CASE_INSENSITIVE);
        Matcher m = p.matcher(lower);
        if (!m.find()) {
            return null;
        }

        String subClass = capitalize(cleanIdentifier(m.group(1).trim()));
        String superClass = capitalize(cleanIdentifier(m.group(2).trim()));

        if (currentClasses != null) {
            for (String c : currentClasses) {
                if (c.equalsIgnoreCase(subClass)) subClass = c;
                if (c.equalsIgnoreCase(superClass)) superClass = c;
            }
        }

        Map<String, Object> relData = new LinkedHashMap<>();
        relData.put("sourceClass", subClass);
        relData.put("targetClass", superClass);
        relData.put("type", "GENERALIZATION");
        relData.put("sourceCardinality", "");
        relData.put("targetCardinality", "");
        relData.put("sourceRole", "");
        relData.put("targetRole", "");

        UmlMutationDto mutation = UmlMutationDto.builder()
                .action("CREATE_RELATIONSHIP")
                .relationshipData(relData)
                .details("Generalización UML: '" + subClass + "' hereda de '" + superClass + "'.")
                .build();

        return VoiceModelingResponse.builder()
                .success(true)
                .intent("CREATE_RELATIONSHIP")
                .providerUsed("local-heuristic-nlp")
                .latencyMs(4)
                .message("Herencia: '" + subClass + "' --|> '" + superClass + "'.")
                .mutations(Collections.singletonList(mutation))
                .build();
    }

    private VoiceModelingResponse tryParseRelationship(String lower, String text, List<String> currentClasses) {
        // "conectar Factura con Cliente de muchos a uno"
        // "conecta la tabla estudiante con la tabla docente de uno a uno"
        // "relacionar tabla Cliente con tabla Pedido de 1 a *"
        // "crear composicion entre Factura y Detalle de 1 a muchos"
        Pattern p = Pattern.compile(
                "(?:conectar?|conecta(?:me)?|relacionar?|relaciona(?:me)?|asociar?|asocia(?:me)?|vincular?|vincula(?:me)?|unir?|une(?:me)?|(?:crear|agrega(?:me)?|agregar)\\s+(?:una?\\s+)?(?:relacion|relación|asociacion|asociación|agregacion|agregación|composicion|composición))\\s+(?:entre\\s+)?(?:la\\s+)?(?:clase|tabla|entidad)?\\s*([a-zA-Z0-9_áéíóúÁÉÍÓÚñÑ]+)\\s+(?:con|y|a)\\s+(?:la\\s+)?(?:clase|tabla|entidad)?\\s*([a-zA-Z0-9_áéíóúÁÉÍÓÚñÑ]+)(?:\\s+(?:de\\s+)?(.*))?",
                Pattern.CASE_INSENSITIVE
        );
        Matcher m = p.matcher(lower);
        if (!m.find()) {
            return null;
        }

        String rawSrc = m.group(1).trim();
        String rawTgt = m.group(2).trim();
        String rawCardinality = m.group(3) != null ? m.group(3).trim() : "muchos a uno";

        String srcClass = capitalize(cleanIdentifier(rawSrc));
        String tgtClass = capitalize(cleanIdentifier(rawTgt));

        if (currentClasses != null) {
            for (String c : currentClasses) {
                if (c.equalsIgnoreCase(srcClass) || c.equalsIgnoreCase(rawSrc)) srcClass = c;
                if (c.equalsIgnoreCase(tgtClass) || c.equalsIgnoreCase(rawTgt)) tgtClass = c;
            }
        }

        String type = "ASSOCIATION";
        if (lower.contains("agregaci")) type = "AGGREGATION";
        if (lower.contains("composici")) type = "COMPOSITION";

        String srcCard = "1";
        String tgtCard = "*";

        if (rawCardinality.contains("uno a uno") || rawCardinality.contains("1 a 1") || rawCardinality.contains("1..1")) {
            srcCard = "1";
            tgtCard = "1";
        } else if (rawCardinality.contains("muchos a muchos") || rawCardinality.contains("* a *") || rawCardinality.contains("*..*")) {
            srcCard = "*";
            tgtCard = "*";
        } else if (rawCardinality.contains("muchos a uno") || rawCardinality.contains("* a 1") || rawCardinality.contains("*..1")) {
            srcCard = "*";
            tgtCard = "1";
        } else if (rawCardinality.contains("uno a muchos") || rawCardinality.contains("1 a *") || rawCardinality.contains("1 a muchos") || rawCardinality.contains("1..*")) {
            srcCard = "1";
            tgtCard = "*";
        }

        Map<String, Object> relData = new LinkedHashMap<>();
        relData.put("sourceClass", srcClass);
        relData.put("targetClass", tgtClass);
        relData.put("type", type);
        relData.put("sourceCardinality", srcCard);
        relData.put("targetCardinality", tgtCard);
        relData.put("sourceRole", "");
        relData.put("targetRole", "");

        UmlMutationDto mutation = UmlMutationDto.builder()
                .action("CREATE_RELATIONSHIP")
                .relationshipData(relData)
                .details("Relación UML " + type + " entre '" + srcClass + "' (" + srcCard + ") y '" + tgtClass + "' (" + tgtCard + ").")
                .build();

        return VoiceModelingResponse.builder()
                .success(true)
                .intent("CREATE_RELATIONSHIP")
                .providerUsed("local-heuristic-nlp")
                .latencyMs(5)
                .message("Relación conectada: " + srcClass + " (" + srcCard + ") ── " + tgtClass + " (" + tgtCard + ").")
                .mutations(Collections.singletonList(mutation))
                .build();
    }

    private VoiceModelingResponse tryParseUpdateClass(String lower, String text, List<String> currentClasses) {
        // "hacer la clase Persona abstracta", "convertir Cliente a interfaz"
        Pattern p = Pattern.compile("(?:hacer|convertir|marcar)\\s+(?:a\\s+)?(?:la\\s+)?(?:clase|tabla|entidad)?\\s*([a-zA-Z0-9_]+)\\s+(?:como|a)?\\s*(abstracta|interfaz|interface)", Pattern.CASE_INSENSITIVE);
        Matcher m = p.matcher(lower);
        if (!m.find()) {
            return null;
        }

        String targetClass = capitalize(cleanIdentifier(m.group(1).trim()));
        if (currentClasses != null) {
            for (String c : currentClasses) {
                if (c.equalsIgnoreCase(targetClass)) {
                    targetClass = c;
                    break;
                }
            }
        }
        String mod = m.group(2).toLowerCase(Locale.ROOT);

        Map<String, Object> classData = new LinkedHashMap<>();
        classData.put("name", targetClass);
        if (mod.contains("abstract")) {
            classData.put("isAbstract", true);
        } else if (mod.contains("interfa")) {
            classData.put("stereotype", "interface");
        }

        UmlMutationDto mutation = UmlMutationDto.builder()
                .action("UPDATE_CLASS")
                .targetClassName(targetClass)
                .classData(classData)
                .details("Modificación de modificadores de clase '" + targetClass + "'.")
                .build();

        return VoiceModelingResponse.builder()
                .success(true)
                .intent("UPDATE_CLASS")
                .providerUsed("local-heuristic-nlp")
                .latencyMs(3)
                .message("Clase '" + targetClass + "' actualizada (" + mod + ").")
                .mutations(Collections.singletonList(mutation))
                .build();
    }

    private VoiceModelingResponse tryParseDelete(String lower, String text, List<String> currentClasses) {
        // "eliminar clase Factura", "borrar tabla X"
        Pattern p = Pattern.compile("(?:eliminar|borrar|quitar|remover)\\s+(?:la\\s+)?(?:clase|tabla|entidad)?\\s*([a-zA-Z0-9_]+)", Pattern.CASE_INSENSITIVE);
        Matcher m = p.matcher(lower);
        if (!m.find()) {
            return null;
        }

        String targetClass = capitalize(cleanIdentifier(m.group(1).trim()));
        if (currentClasses != null) {
            for (String c : currentClasses) {
                if (c.equalsIgnoreCase(targetClass)) {
                    targetClass = c;
                    break;
                }
            }
        }

        UmlMutationDto mutation = UmlMutationDto.builder()
                .action("DELETE_ELEMENT")
                .targetClassName(targetClass)
                .details("Eliminación de la clase '" + targetClass + "' y sus relaciones incidentes.")
                .build();

        return VoiceModelingResponse.builder()
                .success(true)
                .intent("DELETE_ELEMENT")
                .providerUsed("local-heuristic-nlp")
                .latencyMs(3)
                .message("Clase '" + targetClass + "' marcada para eliminación.")
                .mutations(Collections.singletonList(mutation))
                .build();
    }

    private VoiceModelingResponse tryParseBatchDomain(String lower, String text) {
        // "crear modulo ventas con Cliente, Pedido y Producto"
        // "crear sistema de biblioteca con Libro y Autor"
        Pattern p = Pattern.compile("(?:crear|generar)\\s+(?:un\\s+)?(?:modulo|módulo|sistema|dominio)\\s+(?:de\\s+)?([a-zA-Z0-9_]+)\\s+con\\s+(.*)", Pattern.CASE_INSENSITIVE);
        Matcher m = p.matcher(lower);
        if (!m.find()) {
            return null;
        }

        String domainName = m.group(1).trim();
        String entitiesStr = m.group(2).trim();

        String[] entityTokens = entitiesStr.split("(?:,\\s*|\\s+y\\s+)");
        List<UmlMutationDto> mutations = new ArrayList<>();

        for (String eToken : entityTokens) {
            String name = capitalize(cleanIdentifier(eToken.trim()));
            if (name.isBlank()) continue;

            Map<String, Object> cData = new LinkedHashMap<>();
            cData.put("name", name);
            cData.put("isAbstract", false);
            cData.put("stereotype", null);

            List<Map<String, Object>> attrs = new ArrayList<>();
            Map<String, Object> pk = new LinkedHashMap<>();
            pk.put("id", UUID.randomUUID().toString());
            pk.put("name", "id");
            pk.put("type", "Long");
            pk.put("visibility", "+");
            pk.put("isPrimaryKey", true);
            pk.put("isId", true);
            pk.put("isNotNull", true);
            attrs.add(pk);

            // Inyectar atributo descriptivo según nombre
            Map<String, Object> desc = new LinkedHashMap<>();
            desc.put("id", UUID.randomUUID().toString());
            desc.put("name", "nombre");
            desc.put("type", "String");
            desc.put("visibility", "-");
            desc.put("isNotNull", true);
            attrs.add(desc);

            cData.put("attributes", attrs);
            cData.put("methods", new ArrayList<>());

            mutations.add(UmlMutationDto.builder()
                    .action("CREATE_CLASS")
                    .targetClassName(name)
                    .classData(cData)
                    .details("Clase '" + name + "' del dominio " + domainName + ".")
                    .build());
        }

        if (mutations.isEmpty()) {
            return null;
        }

        return VoiceModelingResponse.builder()
                .success(true)
                .intent("BATCH_DOMAIN")
                .providerUsed("local-heuristic-nlp")
                .latencyMs(6)
                .message("Dominio '" + domainName + "' procesado con " + mutations.size() + " clases generadas.")
                .mutations(mutations)
                .build();
    }

    private Map<String, Object> parseAttributeToken(String token) {
        if (token == null) return null;
        token = token.trim();
        if (token.isEmpty()) return null;

        // Limpiar frases comunes como "de tipo", "con tipo", "tipo :", "que tenga", etc.
        token = token.replaceAll("(?i)\\b(?:de\\s+tipo|con\\s+tipo|tipo\\s*:?)\\b", " ");
        token = token.replaceAll("(?i)\\b(?:que\\s+tenga|que\\s+tiene|que\\s+posee|tenga|tiene)\\b", " ");

        String[] parts = token.split("\\s+");
        if (parts.length == 0) return null;

        // Buscar el primer token que NO sea stop word como nombre del atributo
        String rawName = null;
        int nameIndex = -1;
        for (int i = 0; i < parts.length; i++) {
            String p = cleanIdentifier(parts[i]);
            if (p.isBlank()) continue;
            if (!STOP_WORDS.contains(p.toLowerCase(Locale.ROOT))) {
                rawName = p;
                nameIndex = i;
                break;
            }
        }

        if (rawName == null || rawName.isBlank()) {
            return null;
        }

        String name = toCamelCase(rawName);
        if (name.isBlank() || STOP_WORDS.contains(name.toLowerCase(Locale.ROOT))) {
            return null;
        }

        // Buscar el tipo explícito si existe entre los siguientes tokens
        String explicitType = null;
        for (int i = nameIndex + 1; i < parts.length; i++) {
            String candidate = cleanIdentifier(parts[i]);
            if (candidate.isBlank() || STOP_WORDS.contains(candidate.toLowerCase(Locale.ROOT))) {
                continue;
            }
            if (isKnownType(candidate)) {
                explicitType = mapType(candidate);
                break;
            }
        }

        // Si no se encontró entre tipos conocidos pero hay un siguiente token que no sea modifier
        if (explicitType == null && nameIndex + 1 < parts.length) {
            String candidate = cleanIdentifier(parts[nameIndex + 1]);
            if (!candidate.isBlank() && !STOP_WORDS.contains(candidate.toLowerCase(Locale.ROOT))
                    && !candidate.equalsIgnoreCase("pk") && !candidate.equalsIgnoreCase("primary")
                    && !candidate.equalsIgnoreCase("key") && !candidate.equalsIgnoreCase("null")
                    && !candidate.equalsIgnoreCase("not") && !candidate.equalsIgnoreCase("unique")
                    && !candidate.equalsIgnoreCase("unico") && !candidate.equalsIgnoreCase("único")) {
                explicitType = mapType(candidate);
            }
        }

        // Si sigue sin tipo explícito, deducir tipo semántico inteligente por nombre
        String finalType = explicitType != null ? explicitType : inferTypeFromName(name);

        boolean isPk = token.toLowerCase(Locale.ROOT).contains("clave primaria")
                || token.toLowerCase(Locale.ROOT).contains("pk")
                || token.toLowerCase(Locale.ROOT).contains("primary key")
                || name.equalsIgnoreCase("id")
                || name.equalsIgnoreCase("codigo");
        boolean isUnique = token.toLowerCase(Locale.ROOT).contains("unico")
                || token.toLowerCase(Locale.ROOT).contains("único")
                || token.toLowerCase(Locale.ROOT).contains("unique")
                || isPk;
        boolean isNotNull = token.toLowerCase(Locale.ROOT).contains("not null")
                || token.toLowerCase(Locale.ROOT).contains("obligatorio")
                || isPk;

        Map<String, Object> attr = new LinkedHashMap<>();
        attr.put("id", UUID.randomUUID().toString());
        attr.put("name", name);
        attr.put("type", finalType);
        attr.put("visibility", isPk ? "+" : "-");
        attr.put("isPrimaryKey", isPk);
        attr.put("isId", isPk);
        attr.put("isNotNull", isNotNull);
        attr.put("isUnique", isUnique);

        return attr;
    }

    public static boolean isKnownType(String typeStr) {
        if (typeStr == null) return false;
        String s = typeStr.toLowerCase(Locale.ROOT);
        return s.equals("string") || s.equals("texto") || s.equals("cadena") || s.equals("varchar")
                || s.equals("int") || s.equals("integer") || s.equals("entero") || s.equals("numero")
                || s.equals("long") || s.equals("bigint")
                || s.equals("bigdecimal") || s.equals("decimal") || s.equals("moneda")
                || s.equals("double") || s.equals("flotante") || s.equals("float")
                || s.equals("boolean") || s.equals("bool") || s.equals("booleano")
                || s.equals("localdate") || s.equals("date")
                || s.equals("localdatetime") || s.equals("timestamp") || s.equals("datetime")
                || s.equals("localtime") || s.equals("time")
                || s.equals("uuid") || s.equals("byte[]") || s.equals("blob");
    }

    public static String inferTypeFromName(String name) {
        if (name == null || name.isBlank()) return "String";
        String n = name.toLowerCase(Locale.ROOT);

        if (n.equals("id") || n.endsWith("id") || n.startsWith("id") || n.equals("codigo") || n.equals("identificador")) {
            return "Long";
        }
        if (n.contains("fechahora") || n.contains("timestamp") || n.contains("createdat") || n.contains("updatedat")) {
            return "LocalDateTime";
        }
        if (n.contains("fecha") || n.contains("date") || n.contains("cumpleanos") || n.contains("nacimiento")) {
            return "LocalDate";
        }
        if (n.contains("hora") || n.contains("time")) {
            return "LocalTime";
        }
        if (n.contains("precio") || n.contains("total") || n.contains("monto") || n.contains("costo")
                || n.contains("salario") || n.contains("sueldo") || n.contains("importe") || n.contains("saldo")
                || n.contains("subtotal") || n.contains("descuento") || n.contains("impuesto")) {
            return "BigDecimal";
        }
        if (n.contains("edad") || n.contains("cantidad") || n.contains("stock") || n.contains("numero")
                || n.contains("duracion") || n.contains("semestre") || n.contains("creditos") || n.contains("orden")
                || n.contains("anio") || n.contains("mes") || n.contains("dia") || n.contains("piso")) {
            return "Integer";
        }
        if (n.startsWith("es") || n.startsWith("tiene") || n.contains("activo") || n.contains("habilitado")
                || n.contains("estado") || n.contains("vigente") || n.contains("bloqueado") || n.contains("validado")) {
            return "Boolean";
        }
        if (n.contains("foto") || n.contains("imagen") || n.contains("archivo") || n.contains("avatar")) {
            return "byte[]";
        }
        return "String";
    }

    public static String mapType(String raw) {
        if (raw == null || raw.isBlank()) return "String";
        String s = raw.trim().toLowerCase(Locale.ROOT);

        if (s.equals("string") || s.equals("texto") || s.equals("cadena") || s.equals("varchar")) return "String";
        if (s.equals("int") || s.equals("integer") || s.equals("entero") || s.equals("numero")) return "Integer";
        if (s.equals("long") || s.equals("bigint")) return "Long";
        if (s.equals("bigdecimal") || s.equals("decimal") || s.equals("moneda") || s.equals("precio") || s.equals("monto")) return "BigDecimal";
        if (s.equals("double") || s.equals("flotante") || s.equals("float")) return "Double";
        if (s.equals("boolean") || s.equals("bool") || s.equals("booleano")) return "Boolean";
        if (s.equals("localdate") || s.equals("date") || s.equals("fecha")) return "LocalDate";
        if (s.equals("localdatetime") || s.equals("timestamp") || s.equals("datetime") || s.equals("fechahora")) return "LocalDateTime";
        if (s.equals("localtime") || s.equals("time") || s.equals("hora")) return "LocalTime";
        if (s.equals("uuid")) return "UUID";
        if (s.equals("byte[]") || s.equals("blob") || s.equals("foto") || s.equals("imagen") || s.equals("archivo")) return "byte[]";

        return "String";
    }

    public static String cleanIdentifier(String raw) {
        if (raw == null) return "";
        return raw.replaceAll("[^a-zA-Z0-9_]", "");
    }

    public static String capitalize(String str) {
        if (str == null || str.isBlank()) return "";
        return Character.toUpperCase(str.charAt(0)) + (str.length() > 1 ? str.substring(1) : "");
    }

    public static String toCamelCase(String str) {
        if (str == null || str.isBlank()) return "campo";
        String clean = str.replaceAll("[^a-zA-Z0-9_\\-\\s]", " ").trim();
        if (clean.isBlank()) return "campo";
        String[] tokens = clean.split("[_\\-\\s]+");
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < tokens.length; i++) {
            String token = tokens[i];
            if (token.isEmpty()) continue;
            if (sb.length() == 0) {
                sb.append(token.substring(0, 1).toLowerCase(Locale.ROOT));
                if (token.length() > 1) {
                    sb.append(token.substring(1));
                }
            } else {
                sb.append(token.substring(0, 1).toUpperCase(Locale.ROOT));
                if (token.length() > 1) {
                    sb.append(token.substring(1));
                }
            }
        }
        return sb.length() > 0 ? sb.toString() : "campo";
    }

    public static String stripPlural(String s) {
        if (s == null) return "";
        String t = s.trim().toLowerCase(Locale.ROOT);
        if (t.endsWith("es") && t.length() > 3) {
            return t.substring(0, t.length() - 2);
        } else if (t.endsWith("s") && t.length() > 2) {
            return t.substring(0, t.length() - 1);
        }
        return t;
    }

    public static String stripAccents(String s) {
        if (s == null) return "";
        return java.text.Normalizer.normalize(s, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
    }
}

