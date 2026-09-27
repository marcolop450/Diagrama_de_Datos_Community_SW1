export interface ClassAttribute {
  id: string;
  name: string;
  type: string;
  visibility: 'public' | 'private' | 'protected' | 'package';
  isStatic: boolean;
  isId?: boolean;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  isNotNull?: boolean;
  isNullable?: boolean;
  multiplicity?: string;
  defaultValue?: string;
}

export interface MethodParameter {
  id?: string;
  name: string;
  type: string;
  defaultValue?: string;
}

export interface ClassMethod {
  id: string;
  name: string;
  returnType: string;
  visibility: 'public' | 'private' | 'protected' | 'package';
  isStatic: boolean;
  isAbstract: boolean;
  parameters: MethodParameter[];
}

export interface ClassNodeData extends Record<string, unknown> {
  id: string;
  name: string;
  stereotype?: string;
  isAbstract: boolean;
  attributes: ClassAttribute[];
  methods: ClassMethod[];
}

export type EdgeRoutingType = 'smoothstep' | 'step' | 'straight' | 'bezier';

export interface EdgeWaypoint {
  x: number;
  y: number;
}

export interface RelationshipData extends Record<string, unknown> {
  id: string;
  type: 'association' | 'aggregation' | 'composition' | 'inheritance' | 'generalization' | 'implementation' | 'realization' | 'dependency';
  sourceCardinality: string;
  targetCardinality: string;
  label?: string;
  sourceRole?: string;
  targetRole?: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  routing?: EdgeRoutingType;
  isDirected?: boolean;
  waypoints?: EdgeWaypoint[];
}

export interface DiagramProject {
  id: string;
  name: string;
  description?: string;
  version?: string;
  tags?: string[];
  isDeleted?: boolean;
  clonedFromId?: string;
  ownerId?: string;
  ownerName?: string;
  nodeCount?: number;
  relationshipCount?: number;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export const isManyToManyCardinality = (sourceCard?: string, targetCard?: string): boolean => {
  const s = (sourceCard || '').trim().toLowerCase();
  const t = (targetCard || '').trim().toLowerCase();
  if (!s || !t) return false;
  const isManySrc = s.includes('*') || s.includes('n') || s.includes('m');
  const isManyTgt = t.includes('*') || t.includes('n') || t.includes('m');
  return isManySrc && isManyTgt;
};
