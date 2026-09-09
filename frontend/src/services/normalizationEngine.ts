import { Node, Edge } from '@xyflow/react';
import { ClassNodeData, RelationshipData } from '../types/diagram';
import { NormalizationIssue, NormalizationReport } from '../types/normalization';

const NON_ATOMIC_TYPES = ['list', 'set', 'collection', 'array', 'map', 'queue', 'vector'];

function isNonAtomicType(rawType?: string): boolean {
  if (!rawType) return false;
  const t = rawType.trim().toLowerCase();
  // byte[], bytea, blob, binary are atomic scalar data
  if (t === 'byte[]' || t === 'byte []' || t.includes('bytea') || t.includes('blob') || t.includes('binary')) {
    return false;
  }
  if (t.endsWith('[]')) return true;
  return NON_ATOMIC_TYPES.some((k) => t.includes(k));
}

const MULTIVALUED_NAMES = [
  'telefonos', 'phones', 'emails', 'correos', 'direcciones', 'addresses',
  'items', 'detalles', 'hobbies', 'tags', 'etiquetas', 'hijos', 'children', 'numeros'
];

const NUMBERED_ATTRIBUTE_REGEX = /^(.*?)([0-9]+)$/;

export function analyzeDiagramNormalization(
  nodes: Node<ClassNodeData>[],
  edges: Edge<RelationshipData>[]
): NormalizationReport {
  const issues: NormalizationIssue[] = [];

  const classNodes = nodes.filter((n) => n.data && n.data.name);

  // Group relationships per class ID
  const relsByClassId = new Map<string, Edge<RelationshipData>[]>();
  classNodes.forEach((n) => relsByClassId.set(n.id, []));

  edges.forEach((edge) => {
    if (relsByClassId.has(edge.source)) {
      relsByClassId.get(edge.source)!.push(edge);
    }
    if (relsByClassId.has(edge.target)) {
      relsByClassId.get(edge.target)!.push(edge);
    }
  });

  // 1. Evaluate 1NF for all classes
  classNodes.forEach((node) => {
    evaluate1NF(node, issues);
  });

  // 2. Evaluate 2NF for all classes
  classNodes.forEach((node) => {
    const classRels = relsByClassId.get(node.id) || [];
    evaluate2NF(node, classRels, classNodes, issues);
  });

  // 3. Evaluate 3NF for entire model
  evaluate3NF(classNodes, edges, issues);

  // Metrics
  let criticalIssuesCount = 0;
  let warningIssuesCount = 0;
  let infoIssuesCount = 0;
  let nf1IssuesCount = 0;
  let nf2IssuesCount = 0;
  let nf3IssuesCount = 0;

  issues.forEach((issue) => {
    if (issue.severity === 'CRITICAL') criticalIssuesCount++;
    else if (issue.severity === 'WARNING') warningIssuesCount++;
    else if (issue.severity === 'INFO') infoIssuesCount++;

    if (issue.normalForm === '1NF') nf1IssuesCount++;
    else if (issue.normalForm === '2NF') nf2IssuesCount++;
    else if (issue.normalForm === '3NF') nf3IssuesCount++;
  });

  const deduction = (criticalIssuesCount * 15) + (warningIssuesCount * 5) + (infoIssuesCount * 2);
  const score = Math.max(0, 100 - deduction);

  let status: 'COMPLIANT' | 'WARNINGS' | 'NON_COMPLIANT' = 'COMPLIANT';
  if (criticalIssuesCount > 0) {
    status = 'NON_COMPLIANT';
  } else if (warningIssuesCount > 0 || infoIssuesCount > 0) {
    status = 'WARNINGS';
  }

  return {
    score,
    status,
    totalEntities: classNodes.length,
    totalRelationships: edges.length,
    criticalIssuesCount,
    warningIssuesCount,
    infoIssuesCount,
    nf1IssuesCount,
    nf2IssuesCount,
    nf3IssuesCount,
    issues,
  };
}

function evaluate1NF(node: Node<ClassNodeData>, issues: NormalizationIssue[]) {
  const data = node.data;
  const isInterface = data.stereotype?.toLowerCase().includes('interface') || false;
  const attrs = data.attributes || [];

  // 1NF.1: Primary Key Check (Strict isId / isPrimaryKey flag)
  if (!isInterface) {
    const hasPk = attrs.some((a) => a.isId === true || a.isPrimaryKey === true);
    if (!hasPk) {
      issues.push({
        id: `1nf-no-pk-${node.id}`,
        normalForm: '1NF',
        severity: 'CRITICAL',
        ruleId: '1NF_NO_PK',
        targetType: 'CLASS',
        targetId: node.id,
        targetName: data.name,
        message: `La entidad '${data.name}' no posee clave primaria (PK) definida.`,
        recommendation: `Toda entidad en 1NF debe tener una clave primaria atómica que identifique de forma unívoca cada tupla. Agregue '+ id : Long {PK}'.`,
        quickFixAvailable: true,
        quickFixAction: 'ADD_PRIMARY_KEY',
      });
    }
  }

  // 1NF.2 & 1NF.3: Multivalued attributes and repeating groups
  const prefixGroups = new Map<string, string[]>();

  attrs.forEach((attr) => {
    const name = attr.name.trim();
    const type = (attr.type || '').trim();
    if (!name) return;

    const isNonAtomic = isNonAtomicType(type);
    const isMultivalued = MULTIVALUED_NAMES.includes(name.toLowerCase());

    if (isNonAtomic || isMultivalued) {
      issues.push({
        id: `1nf-multi-${node.id}-${name}`,
        normalForm: '1NF',
        severity: 'WARNING',
        ruleId: '1NF_MULTIVALUED_ATTRIBUTE',
        targetType: 'CLASS',
        targetId: node.id,
        targetName: data.name,
        attributeName: name,
        message: `El atributo '${name}' (${type || 'no tipado'}) en '${data.name}' sugiere valores múltiples no atómicos.`,
        recommendation: `En 1NF cada columna debe albergar únicamente valores atómicos indivisibles. Traslade los valores multivaluados a una entidad secundaria relacionada con cardinalidad 1..*.`,
        quickFixAvailable: false,
      });
    }

    const match = name.toLowerCase().match(NUMBERED_ATTRIBUTE_REGEX);
    if (match) {
      const prefix = match[1];
      if (!prefixGroups.has(prefix)) {
        prefixGroups.set(prefix, []);
      }
      prefixGroups.get(prefix)!.push(name);
    }
  });

  prefixGroups.forEach((group, prefix) => {
    if (group.length >= 2) {
      issues.push({
        id: `1nf-repeat-${node.id}-${prefix}`,
        normalForm: '1NF',
        severity: 'WARNING',
        ruleId: '1NF_REPEATING_GROUP',
        targetType: 'CLASS',
        targetId: node.id,
        targetName: data.name,
        attributeName: group.join(', '),
        message: `Se detectaron atributos repetitivos numerados (${group.join(', ')}) en '${data.name}'.`,
        recommendation: `Los grupos repetitivos violan la 1NF. Reemplace los campos numerados por una entidad relacionada con cardinalidad 1..*.`,
        quickFixAvailable: false,
      });
    }
  });
}

function evaluate2NF(
  node: Node<ClassNodeData>,
  relationships: Edge<RelationshipData>[],
  allNodes: Node<ClassNodeData>[],
  issues: NormalizationIssue[]
) {
  const data = node.data;
  const attrs = data.attributes || [];

  const pkAttrs = attrs.filter((a) => a.isId === true || a.isPrimaryKey === true);
  const pkCount = pkAttrs.length;

  // 2NF.1: Partial dependency on composite primary key
  if (pkCount >= 2) {
    const pkPrefixes = pkAttrs
      .map((pk) => pk.name.toLowerCase().replace(/(_id|id|_cod|cod|_codigo|codigo)$/, ''))
      .filter((p) => p.length > 1);

    attrs.forEach((attr) => {
      if (!attr.isId && !attr.isPrimaryKey) {
        const anLower = attr.name.toLowerCase();
        for (const prefix of pkPrefixes) {
          if (
            (anLower.startsWith(`${prefix}_`) || anLower.startsWith(prefix)) &&
            !anLower.endsWith('_id') &&
            !anLower.endsWith('id')
          ) {
            issues.push({
              id: `2nf-partial-dep-${node.id}-${attr.name}`,
              normalForm: '2NF',
              severity: 'WARNING',
              ruleId: '2NF_PARTIAL_DEPENDENCY',
              targetType: 'CLASS',
              targetId: node.id,
              targetName: data.name,
              attributeName: attr.name,
              message: `El atributo '${attr.name}' en '${data.name}' depende parcialmente de la clave '${prefix}', violando la 2NF.`,
              recommendation: `En 2NF con clave primaria compuesta, ningún atributo no clave debe depender de un subconjunto de la PK. Mueva '${attr.name}' a la entidad correspondiente.`,
              quickFixAvailable: false,
            });
            break;
          }
        }
      }
    });

    if (relationships.length <= 1) {
      issues.push({
        id: `2nf-composite-${node.id}`,
        normalForm: '2NF',
        severity: 'INFO',
        ruleId: '2NF_COMPOSITE_KEY_USAGE',
        targetType: 'CLASS',
        targetId: node.id,
        targetName: data.name,
        message: `La clase '${data.name}' posee clave primaria compuesta (${pkCount} atributos PK) pero pocas relaciones asociativas.`,
        recommendation: `Verifique que todos los atributos no clave dependan funcionalmente de la totalidad de la clave compuesta y no de un subconjunto parcial.`,
        quickFixAvailable: false,
      });
    }
  }

  // 2NF.2: Check inverted FK in 1..* relationships (TOM Rule)
  const oneSideRels = relationships.filter((rel) => {
    const relData = rel.data;
    if (!relData || isStructuralRel((relData.type || '').toLowerCase())) return false;
    const isSource = rel.source === node.id;
    const thisCard = isSource ? relData.sourceCardinality : relData.targetCardinality;
    const otherCard = isSource ? relData.targetCardinality : relData.sourceCardinality;
    return isOne(thisCard) && isMany(otherCard);
  });

  if (oneSideRels.length > 0) {
    const parentNodeIds = new Set<string>();
    relationships.forEach((rel) => {
      const relData = rel.data;
      if (!relData || isStructuralRel((relData.type || '').toLowerCase())) return false;
      const isSource = rel.source === node.id;
      const thisCard = isSource ? relData.sourceCardinality : relData.targetCardinality;
      const otherCard = isSource ? relData.targetCardinality : relData.sourceCardinality;
      if (isMany(thisCard) && isOne(otherCard)) {
        parentNodeIds.add(isSource ? rel.target : rel.source);
      }
    });

    const parentNodes = allNodes.filter((n) => parentNodeIds.has(n.id));
    const parentNames = parentNodes.map((n) => n.data.name.toLowerCase());

    attrs.forEach((attr) => {
      if (attr.isId || attr.isPrimaryKey) return;
      const anLower = attr.name.toLowerCase();

      const isFkCandidate =
        anLower.endsWith('_id') ||
        anLower.endsWith('id') ||
        anLower.endsWith('_cod') ||
        anLower.endsWith('_codigo') ||
        anLower.startsWith('id_') ||
        anLower.startsWith('cod_');

      if (!isFkCandidate) return;

      for (const rel of oneSideRels) {
        const isSource = rel.source === node.id;
        const otherNodeId = isSource ? rel.target : rel.source;
        const otherNode = allNodes.find((n) => n.id === otherNodeId);
        if (!otherNode) continue;

        const otherName = otherNode.data.name.toLowerCase();
        const otherNameSnake = otherName.replace(/\s+/g, '_');
        const isGenericChildName =
          otherName.startsWith('nueva') ||
          otherName.startsWith('clase') ||
          otherName.startsWith('entity') ||
          otherName === 'nuevaentidad' ||
          otherName === 'nuevaclase';

        const matchesChildName =
          anLower === `${otherName}_id` ||
          anLower === `id_${otherName}` ||
          anLower === `${otherName}id` ||
          anLower === `${otherNameSnake}_id` ||
          anLower === `id_${otherNameSnake}` ||
          anLower === `${otherNameSnake}id`;

        const matchesAnyParent = parentNames.some(
          (pn) => anLower.includes(pn) || `${pn}_id` === anLower || `id_${pn}` === anLower
        );

        if (matchesChildName || (!matchesAnyParent && isGenericChildName) || (!matchesAnyParent && parentNodes.length === 0)) {
          issues.push({
            id: `2nf-inverted-fk-${node.id}-${attr.name}`,
            normalForm: '2NF',
            severity: 'WARNING',
            ruleId: '2NF_INVERTED_FK',
            targetType: 'CLASS',
            targetId: node.id,
            targetName: data.name,
            attributeName: attr.name,
            message: `El atributo '${attr.name}' en '${data.name}' ubica una clave foránea en el lado '1' de la relación con '${otherNode.data.name}'.`,
            recommendation: `Según las reglas de TOM, en relaciones 1..* la clave foránea debe residir en la entidad subordinada del lado '*' ('${otherNode.data.name}') apuntando hacia '${data.name}'.`,
            quickFixAvailable: false,
          });
          break;
        }
      }
    });
  }
}

function evaluate3NF(
  nodes: Node<ClassNodeData>[],
  edges: Edge<RelationshipData>[],
  issues: NormalizationIssue[]
) {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // 3NF.1: Direct Many-to-Many (*..*) Relationships without associative table
  edges.forEach((edge) => {
    const relData = edge.data;
    if (!relData) return;
    const relType = (relData.type || 'association').toLowerCase();
    if (isStructuralRel(relType)) return;

    const srcCard = relData.sourceCardinality;
    const tgtCard = relData.targetCardinality;

    if (isMany(srcCard) && isMany(tgtCard)) {
      const srcNode = nodeMap.get(edge.source);
      const tgtNode = nodeMap.get(edge.target);
      const srcName = srcNode ? srcNode.data.name : 'Origen';
      const tgtName = tgtNode ? tgtNode.data.name : 'Destino';

      issues.push({
        id: `3nf-m2m-${edge.id}`,
        normalForm: '3NF',
        severity: 'CRITICAL',
        ruleId: '3NF_MANY_TO_MANY',
        targetType: 'RELATIONSHIP',
        targetId: edge.id,
        targetName: `${srcName} ↔ ${tgtName}`,
        message: `Relación directa muchos a muchos (*..*) entre '${srcName}' y '${tgtName}' sin clase asociativa intermedia.`,
        recommendation: `En 3NF y según las reglas de TOM, las relaciones *..* deben descomponerse mediante una tabla/clase asociativa intermedia (ej. '${srcName}${tgtName}') con dos relaciones 1..* portadoras de claves compuestas.`,
        quickFixAvailable: true,
        quickFixAction: 'DECOMPOSE_MANY_TO_MANY',
      });
    }
  });

  // 3NF.2 & 3NF.3: Transitive dependencies and derived attributes
  nodes.forEach((node) => {
    const data = node.data;
    const attrs = data.attributes || [];

    const hasBirthDate = attrs.some((a) => {
      const an = a.name.toLowerCase();
      return (
        an.includes('nacimiento') ||
        an.includes('birthdate') ||
        an === 'fecha_nac' ||
        an === 'fechanac' ||
        an === 'f_nac' ||
        an.includes('nac')
      );
    });

    attrs.forEach((attr) => {
      const attrName = attr.name;
      const anLower = attrName.toLowerCase();

      // Derived attribute (3NF.3)
      if ((anLower === 'edad' || anLower === 'age') && hasBirthDate) {
        issues.push({
          id: `3nf-derived-${node.id}-${attrName}`,
          normalForm: '3NF',
          severity: 'INFO',
          ruleId: '3NF_DERIVED_ATTRIBUTE',
          targetType: 'CLASS',
          targetId: node.id,
          targetName: data.name,
          attributeName: attrName,
          message: `El atributo '${attrName}' en '${data.name}' es redundante al coexistir con la fecha de nacimiento.`,
          recommendation: `Para mantener 3NF pura, compute la edad dinámicamente mediante una operación UML o getter en vez de persistirla físicamente.`,
          quickFixAvailable: false,
        });
      } else if (
        (anLower === 'total' ||
          anLower === 'preciototal' ||
          anLower === 'precio_total' ||
          anLower === 'monto_total' ||
          anLower === 'montototal') &&
        attrs.some((a) => {
          const otherAn = a.name.toLowerCase();
          return otherAn.includes('subtotal') || otherAn.includes('precio') || otherAn.includes('cantidad');
        })
      ) {
        issues.push({
          id: `3nf-derived-${node.id}-${attrName}`,
          normalForm: '3NF',
          severity: 'INFO',
          ruleId: '3NF_DERIVED_ATTRIBUTE',
          targetType: 'CLASS',
          targetId: node.id,
          targetName: data.name,
          attributeName: attrName,
          message: `El atributo '${attrName}' en '${data.name}' es un campo calculado derivado.`,
          recommendation: `No almacene campos calculados derivados para evitar anomalías por desactualización en base de datos.`,
          quickFixAvailable: false,
        });
      }

      // Transitive Dependency (3NF.2): snake_case, camelCase or dot notation
      nodes.forEach((otherNode) => {
        if (otherNode.id !== node.id) {
          const otherName = otherNode.data.name.toLowerCase();
          if (anLower.startsWith(otherName) && anLower.length > otherName.length) {
            const suffix = anLower.substring(otherName.length).replace(/^[_.]/, '');
            if (
              suffix.length > 0 &&
              suffix !== 'id' &&
              suffix !== 'codigo' &&
              suffix !== 'cod' &&
              suffix !== 'pk'
            ) {
              issues.push({
                id: `3nf-transitive-${node.id}-${attrName}`,
                normalForm: '3NF',
                severity: 'WARNING',
                ruleId: '3NF_TRANSITIVE_DEPENDENCY',
                targetType: 'CLASS',
                targetId: node.id,
                targetName: data.name,
                attributeName: attrName,
                message: `El atributo '${attrName}' en '${data.name}' sugiere una dependencia transitiva de la entidad '${otherNode.data.name}'.`,
                recommendation: `En 3NF ningún atributo no clave debe depender de otro atributo no clave. Traslade '${attrName}' a la entidad '${otherNode.data.name}' y vincúlela mediante relación.`,
                quickFixAvailable: false,
              });
            }
          }
        }
      });
    });
  });
}

function isStructuralRel(type: string): boolean {
  return (
    type === 'inheritance' ||
    type === 'generalization' ||
    type === 'realization' ||
    type === 'implementation' ||
    type === 'dependency'
  );
}

function isMany(card?: string): boolean {
  if (!card) return false;
  const c = card.trim().toLowerCase();
  return c.includes('*') || c.includes('n') || c.includes('m');
}

function isOne(card?: string): boolean {
  if (!card) return false;
  const c = card.trim().toLowerCase();
  return c === '1' || c === '1..1' || c === '0..1';
}
