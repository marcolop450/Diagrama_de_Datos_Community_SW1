package ${basePackage}.dto;

import ${basePackage}.entity.${className};
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.math.BigDecimal;
import java.util.UUID;

/**
 * DTO de Respuesta (Response) para ${className}
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ${className}ResponseDto {

<#list attributes as attr>
    private ${attr.type} ${attr.fieldName};
</#list>

    /**
     * Mapea una entidad ${className} a su respectivo DTO de respuesta desacoplado
     */
    public static ${className}ResponseDto fromEntity(${className} entity) {
        if (entity == null) return null;
        return ${className}ResponseDto.builder()
<#list attributes as attr>
            .${attr.fieldName}(entity.get${attr.capitalizedFieldName}())
</#list>
            .build();
    }
}
