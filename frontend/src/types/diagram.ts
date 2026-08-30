export interface ClassAttribute {
  id: string;
  name: string;
  type: string;
  visibility: 'public' | 'private' | 'protected' | 'package';
  isStatic: boolean;
  defaultValue?: string;
}

export interface ClassMethod {
  id: string;
  name: string;
  returnType: string;
  visibility: 'public' | 'private' | 'protected' | 'package';
  isStatic: boolean;
  isAbstract: boolean;
  parameters: { name: string; type: string }[];
}

export interface ClassNodeData {
  id: string;
  name: string;
  stereotype?: string;
  isAbstract: boolean;
  attributes: ClassAttribute[];
  methods: ClassMethod[];
}

export interface RelationshipData {
  id: string;
  type: 'association' | 'aggregation' | 'composition' | 'inheritance' | 'implementation' | 'dependency';
  sourceCardinality: string;
  targetCardinality: string;
  label?: string;
  sourceRole?: string;
  targetRole?: string;
}

export interface DiagramProject {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}
