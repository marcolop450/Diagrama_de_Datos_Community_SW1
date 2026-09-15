package com.sw1.casetool.dto.ai;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Solicitud de procesamiento de comando de voz o texto en lenguaje natural para modelado UML.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VoiceModelingRequest {

    private UUID projectId;

    @NotBlank(message = "La transcripción o comando de voz no puede estar vacío (Regla E1).")
    private String transcript;

    /**
     * Nombres de las clases existentes en el lienzo para dar contexto semántico al LLM.
     */
    private List<String> currentClasses;

    /**
     * Relaciones existentes en el lienzo para contexto.
     */
    private List<Map<String, String>> currentRelationships;

    /**
     * Modalidad del comando: VOICE_SPEECH_PLN o TEXT_COPILOT
     */
    private String modality;
}
