package com.sw1.casetool.dto.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Respuesta del procesamiento de comando de voz con la lista de mutaciones a aplicar.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VoiceModelingResponse {

    private boolean success;
    private String intent;
    private String providerUsed;
    private long latencyMs;
    private String message;
    private List<UmlMutationDto> mutations;
}
