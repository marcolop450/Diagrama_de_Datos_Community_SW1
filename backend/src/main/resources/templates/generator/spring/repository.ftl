package ${basePackage}.repository;

import ${basePackage}.entity.${className};
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

<#if idType == "UUID">
import java.util.UUID;
</#if>

/**
 * Repositorio Spring Data JPA para la entidad ${className}
 */
@Repository
public interface ${className}Repository extends JpaRepository<${className}, ${idType}> {
}
