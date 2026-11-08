export interface AttributeItem {
  id?: string;
  name: string;
  type: string;
  visibility: '+' | '-' | '#' | '~' | 'public' | 'private' | 'protected' | string;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  isNullable?: boolean;
}

export interface MethodItem {
  id?: string;
  name: string;
  returnType: string;
  visibility: '+' | '-' | '#' | '~' | 'public' | 'private' | 'protected' | string;
  parameters?: Array<{ name: string; type: string }>;
}

export interface ClassNodeData {
  id: string;
  name: string;
  stereotype?: string;
  isAbstract?: boolean;
  attributes: AttributeItem[];
  methods: MethodItem[];
}

export interface MobileClassNode {
  id: string;
  position: { x: number; y: number };
  data: ClassNodeData;
}

export interface MobileRelationshipEdge {
  id: string;
  source: string;
  target: string;
  type?: 'association' | 'inheritance' | 'composition' | 'aggregation' | 'dependency' | string;
  sourceCardinality?: string;
  targetCardinality?: string;
  label?: string;
  sourceRole?: string;
  targetRole?: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface DiagramProjectSummary {
  id: string;
  name: string;
  description?: string;
  version?: string;
  domainTemplate?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
  classesCount?: number;
  relationshipsCount?: number;
  normalizationScore?: number;
  normalizationLevel?: string;
}

export interface FullDiagramPayload {
  project: DiagramProjectSummary;
  classNodes: any[];
  relationships: any[];
}
