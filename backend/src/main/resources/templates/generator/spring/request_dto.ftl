package ${basePackage}.dto;

import jakarta.validation.constraints.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.math.BigDecimal;
import java.util.UUID;

<#assign hasNonPk = false>
<#list attributes as attr>
  <#if !attr.primaryKey>
    <#assign hasNonPk = true>
  </#if>
</#list>
/**
 * DTO de Solicitud (Request) para ${className} con validaciones Jakarta Bean Validation
 */
@Getter
@Setter
@NoArgsConstructor
<#if hasNonPk>
@AllArgsConstructor
@Builder
</#if>
public class ${className}RequestDto {

<#list attributes as attr>
  <#if !attr.primaryKey>
    <#if !attr.nullable>
      <#if attr.type == "String">
    @NotBlank(message = "El campo ${attr.fieldName} es obligatorio")
      <#else>
    @NotNull(message = "El campo ${attr.fieldName} es obligatorio")
      </#if>
    </#if>
    private ${attr.type} ${attr.fieldName};

  </#if>
</#list>
}
