export interface DomainTemplate {
  id: string;
  name: string;
  category: string;
  description?: string;
  thumbnailUrl?: string;
  nodeCount: number;
  edgeCount: number;
  initialSchema?: {
    nodes?: Array<{
      id: string;
      name: string;
      stereotype?: string;
      isAbstract?: boolean;
      position?: { x: number; y: number };
      attributes?: Array<Record<string, unknown>>;
      methods?: Array<Record<string, unknown>>;
    }>;
    edges?: Array<{
      id: string;
      source: string;
      target: string;
      type: string;
      sourceCardinality?: string;
      targetCardinality?: string;
      label?: string;
    }>;
  };
  createdAt?: string;
}
