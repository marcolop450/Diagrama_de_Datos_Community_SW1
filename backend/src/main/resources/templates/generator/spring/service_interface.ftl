package ${basePackage}.service;

import ${basePackage}.dto.${className}RequestDto;
import ${basePackage}.dto.${className}ResponseDto;
import java.util.List;
import java.util.Optional;

<#if idType == "UUID">
import java.util.UUID;
</#if>

/**
 * Contrato de Servicio para la gestión empresarial de ${className}
 */
public interface ${className}Service {

    List<${className}ResponseDto> findAll();

    Optional<${className}ResponseDto> findById(${idType} id);

    ${className}ResponseDto create(${className}RequestDto request);

    ${className}ResponseDto update(${idType} id, ${className}RequestDto request);

    void deleteById(${idType} id);
}
