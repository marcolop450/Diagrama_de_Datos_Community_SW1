package com.sw1.casetool.dto.export;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExportPdfRequest {
    private String imageBase64;
    private Boolean includeDictionary;
    private Boolean includeNormalization;
    private Boolean includeRelationships;
}
