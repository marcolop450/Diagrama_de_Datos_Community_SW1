package ${basePackage}.service.impl;

import ${basePackage}.dto.${className}RequestDto;
import ${basePackage}.dto.${className}ResponseDto;
import ${basePackage}.entity.${className};
import ${basePackage}.exception.ResourceNotFoundException;
import ${basePackage}.repository.${className}Repository;
import ${basePackage}.service.${className}Service;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

<#if idType == "UUID">
import java.util.UUID;
</#if>

/**
 * Implementación de lógica de negocio transaccional para ${className}
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ${className}ServiceImpl implements ${className}Service {

    private final ${className}Repository repository;

    @Override
    public List<${className}ResponseDto> findAll() {
        return repository.findAll().stream()
                .map(${className}ResponseDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    public Optional<${className}ResponseDto> findById(${idType} id) {
        return repository.findById(id)
                .map(${className}ResponseDto::fromEntity);
    }

    @Override
    @Transactional
    public ${className}ResponseDto create(${className}RequestDto request) {
        ${className} entity = ${className}.builder()
<#list attributes as attr>
  <#if !attr.primaryKey>
                .${attr.fieldName}(request.get${attr.capitalizedFieldName}())
  </#if>
</#list>
                .build();

        ${className} saved = repository.save(entity);
        return ${className}ResponseDto.fromEntity(saved);
    }

    @Override
    @Transactional
    public ${className}ResponseDto update(${idType} id, ${className}RequestDto request) {
        ${className} entity = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("${className} no encontrado con ID: " + id));

<#list attributes as attr>
  <#if !attr.primaryKey>
        entity.set${attr.capitalizedFieldName}(request.get${attr.capitalizedFieldName}());
  </#if>
</#list>

        ${className} updated = repository.save(entity);
        return ${className}ResponseDto.fromEntity(updated);
    }

    @Override
    @Transactional
    public void deleteById(${idType} id) {
        if (!repository.existsById(id)) {
            throw new ResourceNotFoundException("${className} no encontrado con ID: " + id);
        }
        repository.deleteById(id);
    }
}
