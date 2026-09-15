package com.sw1.casetool.dto.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * Representa una mutación atómica incremental sobre el grafo UML.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UmlMutationDto {

    /**
     * Tipo de acción:
     * CREATE_CLASS, ADD_ATTRIBUTES, ADD_METHODS, CREATE_RELATIONSHIP,
     * UPDATE_CLASS, DELETE_ELEMENT, BATCH_DOMAIN
     */
    private String action;

    /**
     * Nombre de la clase objetivo (cuando aplica a mutar o eliminar una clase existente).
     */
    private String targetClassName;

    /**
     * Datos estructurados de la clase: name, isAbstract, stereotype, attributes, methods.
     */
    private Map<String, Object> classData;

    /**
     * Datos estructurados de la relación: sourceClass, targetClass, type, sourceCardinality, targetCardinality, sourceRole, targetRole.
     */
    private Map<String, Object> relationshipData;

    /**
     * Descripción textual de la mutación para feedback al usuario.
     */
    private String details;
}
