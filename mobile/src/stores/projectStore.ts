import { create } from 'zustand';
import { mobileApi } from '../services/api';
import { 
  DiagramProjectSummary, 
  MobileClassNode, 
  MobileRelationshipEdge, 
  ClassNodeData 
} from '../types/diagram';

interface MobileProjectState {
  projects: DiagramProjectSummary[];
  currentProject: DiagramProjectSummary | null;
  nodes: MobileClassNode[];
  edges: MobileRelationshipEdge[];
  selectedClass: ClassNodeData | null;
  snapshots: any[];
  isLoading: boolean;
  error: string | null;

  loadProjects: () => Promise<void>;
  openProject: (projectId: string) => Promise<boolean>;
  selectClass: (classData: ClassNodeData | null) => void;
  loadSnapshots: (projectId: string) => Promise<void>;
  
  // Acciones reactivas para espejo en tiempo real STOMP
  applyNodeMove: (nodeId: string, position: { x: number; y: number }, className?: string) => void;
  applyNodeUpdate: (nodeId: string, nodeData: any, className?: string) => void;
  applyNodeCreate: (node: any) => void;
  applyNodeDelete: (nodeId: string) => void;
  applyEdgeCreate: (edge: any) => void;
  applyEdgeUpdate: (edgeId: string, edgeData: any) => void;
  applyEdgeDelete: (edgeId: string) => void;
  applySyncState: (nodes: any[], edges: any[]) => void;
  resetDiagram: () => void;
}

export const useMobileProjectStore = create<MobileProjectState>((set, get) => ({
  projects: [],
  currentProject: null,
  nodes: [],
  edges: [],
  selectedClass: null,
  snapshots: [],
  isLoading: false,
  error: null,

  loadProjects: async () => {
    try {
      set({ isLoading: true, error: null });
      const list = await mobileApi.getProjects();
      set({ projects: list, isLoading: false });
    } catch (err: any) {
      set({ 
        isLoading: false, 
        error: err.response?.data?.message || 'No se pudieron cargar los proyectos' 
      });
    }
  },

  openProject: async (projectId: string) => {
    try {
      set({ isLoading: true, error: null, selectedClass: null });
      const payload = await mobileApi.getFullDiagram(projectId);
      if (!payload || !payload.project) {
        throw new Error('Proyecto no encontrado');
      }

      const mappedNodes: MobileClassNode[] = (payload.classNodes || []).map((cn: any) => ({
        id: cn.id,
        position: {
          x: cn.positionX ?? cn.position_x ?? 50,
          y: cn.positionY ?? cn.position_y ?? 50,
        },
        data: {
          id: cn.id,
          name: cn.name || 'ClaseSinNombre',
          stereotype: cn.stereotype,
          isAbstract: cn.isAbstract || cn.is_abstract || cn.abstractClass || false,
          attributes: cn.attributes || [],
          methods: cn.methods || [],
        },
      }));

      const mappedEdges: MobileRelationshipEdge[] = (payload.relationships || []).map((rel: any) => ({
        id: rel.id,
        source: rel.sourceClass?.id || rel.source_class_id || rel.source,
        target: rel.targetClass?.id || rel.target_class_id || rel.target,
        type: (rel.type || rel.data?.type || 'association').toLowerCase(),
        sourceCardinality: rel.sourceCardinality || rel.source_cardinality || rel.data?.sourceCardinality || '1',
        targetCardinality: rel.targetCardinality || rel.target_cardinality || rel.data?.targetCardinality || '*',
        label: rel.label || rel.data?.label || '',
        sourceRole: rel.sourceRole || rel.source_role || rel.data?.sourceRole || '',
        targetRole: rel.targetRole || rel.target_role || rel.data?.targetRole || '',
        sourceHandle: rel.sourceHandle || rel.source_handle || rel.data?.sourceHandle || 'right',
        targetHandle: rel.targetHandle || rel.target_handle || rel.data?.targetHandle || 'left',
      }));

      set({
        currentProject: payload.project,
        nodes: mappedNodes,
        edges: mappedEdges,
        isLoading: false,
      });

      // Cargar instantáneas de MongoDB en segundo plano
      get().loadSnapshots(projectId);

      return true;
    } catch (err: any) {
      set({ 
        isLoading: false, 
        error: err.response?.data?.message || err.message || 'Error al cargar diagrama' 
      });
      return false;
    }
  },

  selectClass: (classData: ClassNodeData | null) => {
    set({ selectedClass: classData });
  },

  loadSnapshots: async (projectId: string) => {
    try {
      const snaps = await mobileApi.getContinuousSnapshots(projectId);
      set({ snapshots: snaps });
    } catch {}
  },

  applyNodeMove: (nodeId: string, position: { x: number; y: number }, className?: string) => {
    const lowerName = className?.trim().toLowerCase();
    set((state) => ({
      nodes: state.nodes.map((n) =>
        (n.id === nodeId || (lowerName && n.data?.name?.trim().toLowerCase() === lowerName))
          ? { ...n, position }
          : n
      ),
    }));
  },

  applyNodeUpdate: (nodeId: string, nodeData: any, className?: string) => {
    const lowerName = (className || nodeData?.name)?.trim().toLowerCase();
    set((state) => ({
      nodes: state.nodes.map((n) =>
        (n.id === nodeId || (lowerName && n.data?.name?.trim().toLowerCase() === lowerName))
          ? { ...n, data: { ...n.data, ...nodeData } }
          : n
      ),
    }));
  },

  applyNodeCreate: (node: any) => {
    if (!node || !node.id) return;
    set((state) => {
      if (state.nodes.some((n) => n.id === node.id)) return state;
      const formatted: MobileClassNode = {
        id: node.id,
        position: node.position || { x: 50, y: 50 },
        data: node.data || {
          id: node.id,
          name: node.name || 'NuevaClase',
          attributes: node.attributes || [],
          methods: node.methods || [],
        },
      };
      return { nodes: [...state.nodes, formatted] };
    });
  },

  applyNodeDelete: (nodeId: string) => {
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== nodeId),
      edges: state.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      selectedClass: state.selectedClass?.id === nodeId ? null : state.selectedClass,
    }));
  },

  applyEdgeCreate: (edge: any) => {
    if (!edge || !edge.id) return;
    set((state) => {
      if (state.edges.some((e) => e.id === edge.id)) return state;
      const formatted: MobileRelationshipEdge = {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: (edge.data?.type || edge.type || 'association').toLowerCase(),
        sourceCardinality: edge.data?.sourceCardinality || edge.sourceCardinality || edge.source_cardinality || '1',
        targetCardinality: edge.data?.targetCardinality || edge.targetCardinality || edge.target_cardinality || '*',
        label: edge.data?.label || edge.label || '',
        sourceRole: edge.data?.sourceRole || edge.sourceRole || edge.source_role || '',
        targetRole: edge.data?.targetRole || edge.targetRole || edge.target_role || '',
        sourceHandle: edge.sourceHandle || edge.source_handle || edge.data?.sourceHandle || 'right',
        targetHandle: edge.targetHandle || edge.target_handle || edge.data?.targetHandle || 'left',
      };
      return { edges: [...state.edges, formatted] };
    });
  },

  applyEdgeUpdate: (edgeId: string, edgeData: any) => {
    set((state) => ({
      edges: state.edges.map((e) => (e.id === edgeId ? { ...e, ...edgeData } : e)),
    }));
  },

  applyEdgeDelete: (edgeId: string) => {
    set((state) => ({
      edges: state.edges.filter((e) => e.id !== edgeId),
    }));
  },

  applySyncState: (rawNodes: any[], rawEdges: any[]) => {
    if (!Array.isArray(rawNodes)) return;
    const mappedNodes: MobileClassNode[] = rawNodes.map((n: any) => ({
      id: n.id,
      position: n.position || { x: n.positionX ?? n.position_x ?? 50, y: n.positionY ?? n.position_y ?? 50 },
      data: n.data || {
        id: n.id,
        name: n.name || 'Clase',
        stereotype: n.stereotype,
        isAbstract: Boolean(n.isAbstract || n.is_abstract),
        attributes: n.attributes || [],
        methods: n.methods || [],
      },
    }));

    const mappedEdges: MobileRelationshipEdge[] = (rawEdges || []).map((e: any) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: (e.data?.type || e.type || 'association').toLowerCase(),
      sourceCardinality: e.data?.sourceCardinality || e.sourceCardinality || e.source_cardinality || '1',
      targetCardinality: e.data?.targetCardinality || e.targetCardinality || e.target_cardinality || '*',
      label: e.data?.label || e.label || '',
      sourceRole: e.data?.sourceRole || e.sourceRole || e.source_role || '',
      targetRole: e.data?.targetRole || e.targetRole || e.target_role || '',
      sourceHandle: e.sourceHandle || e.source_handle || e.data?.sourceHandle || 'right',
      targetHandle: e.targetHandle || e.target_handle || e.data?.targetHandle || 'left',
    }));

    set({ nodes: mappedNodes, edges: mappedEdges });
  },

  resetDiagram: () => {
    set({ currentProject: null, nodes: [], edges: [], selectedClass: null, snapshots: [] });
  },
}));
