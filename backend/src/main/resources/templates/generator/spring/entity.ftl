package ${basePackage}.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.math.BigDecimal;
import java.util.UUID;
import java.util.List;
import java.util.ArrayList;

/**
 * Entidad JPA generada automáticamente por CASE Tool UML
 * Tabla relacional: ${tableName}
 */
@Entity
@Table(name = "${tableName}")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public <#if isAbstract>abstract </#if>class ${className} {

<#list attributes as attr>
  <#if attr.primaryKey>
    @Id
    <#if attr.type == "Long" || attr.type == "Integer">
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    <#elseif attr.type == "UUID">
    @GeneratedValue(strategy = GenerationType.AUTO)
    </#if>
  </#if>
  <#if attr.type == "byte[]">
    @Lob
  </#if>
    @Column(name = "${attr.columnName}"<#if !attr.nullable>, nullable = false</#if><#if attr.duplicateJoinColumn>, insertable = false, updatable = false</#if>)
    private ${attr.type} ${attr.fieldName};

</#list>
<#-- Relaciones JPA -->
<#list relationships as rel>
  <#if rel.relationKind == "MANY_TO_ONE">
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "${rel.joinColumnName}"<#if !rel.nullable>, nullable = false</#if>)
    private ${rel.targetClassName} ${rel.fieldName};

  <#elseif rel.relationKind == "ONE_TO_MANY">
    @OneToMany(mappedBy = "${rel.mappedBy}", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<${rel.targetClassName}> ${rel.fieldName} = new ArrayList<>();

  <#elseif rel.relationKind == "ONE_TO_ONE">
    <#if rel.owner>
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "${rel.joinColumnName}")
    private ${rel.targetClassName} ${rel.fieldName};
    <#else>
    @OneToOne(mappedBy = "${rel.mappedBy}")
    private ${rel.targetClassName} ${rel.fieldName};
    </#if>

  <#elseif rel.relationKind == "MANY_TO_MANY">
    <#if rel.owner>
    @ManyToMany
    @JoinTable(
        name = "${rel.joinTableName}",
        joinColumns = @JoinColumn(name = "${rel.joinColumnName}"),
        inverseJoinColumns = @JoinColumn(name = "${rel.inverseJoinColumnName}")
    )
    @Builder.Default
    private List<${rel.targetClassName}> ${rel.fieldName} = new ArrayList<>();
    <#else>
    @ManyToMany(mappedBy = "${rel.mappedBy}")
    @Builder.Default
    private List<${rel.targetClassName}> ${rel.fieldName} = new ArrayList<>();
    </#if>
  </#if>
</#list>
}
