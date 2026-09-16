import { create } from 'zustand';
import { 
  Node, 
  Edge, 
  applyNodeChanges, 
  applyEdgeChanges, 
  OnNodesChange, 
  OnEdgesChange, 
  OnConnect,
  Connection
} from '@xyflow/react';
import { DiagramProject, ClassNodeData, RelationshipData } from '../types/diagram';
import { api } from '../services/api';
import { UmlMutationDto } from '../services/aiVoiceService';
import toast from 'react-hot-toast';
import { useCollabStore } from './collabStore';

export interface DiagramSnapshot {
  nodes: Node<ClassNodeData>[];
  edges: Edge<RelationshipData>[];
}

const emitCollab = (
  type: 'NODE_CREATE' | 'NODE_UPDATE' | 'NODE_DELETE' | 'EDGE_CREATE' | 'EDGE_UPDATE' | 'EDGE_DELETE' | 'SYNC_STATE',
  payload: any
) => {
  try {
    const collabStore = (useCollabStore as any)?.getState?.();
    if (!collabStore?.isLive) return;
    switch (type) {
      case 'NODE_CREATE':
        collabStore.broadcastNodeCreate?.(payload);
        break;
      case 'NODE_UPDATE':
        collabStore.broadcastNodeUpdate?.(payload.id, payload.data);
        break;
      case 'NODE_DELETE':
        collabStore.broadcastNodeDelete?.(payload);
        break;
      case 'EDGE_CREATE':
        collabStore.broadcastEdgeCreate?.(payload);
        break;
      case 'EDGE_UPDATE':
        collabStore.broadcastEdgeUpdate?.(payload.id, payload.data);
        break;
      case 'EDGE_DELETE':
        collabStore.broadcastEdgeDelete?.(payload);
        break;
      case 'SYNC_STATE':
        collabStore.broadcastSyncState?.(payload.nodes, payload.edges);
        break;
    }
  } catch (err) {
    console.warn('Collab broadcast error:', err);
  }
};

const isUUID = (str?: string | null): boolean => {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
};

// Cycle detection helper for UML 2.5 inheritance/generalization
const hasInheritancePath = (
  edges: Edge<RelationshipData>[],
  start: string,
  target: string,
  excludeEdgeId?: string
): boolean => {
  if (start === target) return true;
  const visited = new Set<string>();
  const queue: string[] = [start];
  visited.add(start);

  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (curr === target) return true;

    for (const edge of edges) {
      if (excludeEdgeId && edge.id === excludeEdgeId) continue;
      const type = (edge.data?.type || '').toLowerCase();
      if (type === 'inheritance' || type === 'generalization') {
        if (edge.source === curr && !visited.has(edge.target)) {
          visited.add(edge.target);
          queue.push(edge.target);
        }
      }
    }
  }
  return false;
};

// Normalización fonética y semántica para coincidencia de clases en español (singular/plural, tildes)
const normalizeClassName = (name?: string): string => {
  if (!name) return '';
  let s = name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (s.endsWith('es') && s.length > 3) s = s.slice(0, -2);
  else if (s.endsWith('s') && s.length > 2) s = s.slice(0, -1);
  return s;
};

const matchesClassName = (nameA?: string, nameB?: string): boolean => {
  if (!nameA || !nameB) return false;
  const a = nameA.trim().toLowerCase();
  const b = nameB.trim().toLowerCase();
  if (a === b) return true;
  return normalizeClassName(a) === normalizeClassName(b);
};

const normalizeUmlCardinality = (card?: string, isInheritance: boolean = false): string => {
  if (isInheritance) return '';
  if (!card) return '1';
  let c = card.trim();
  if (/^[nm]$/i.test(c) || /^many$/i.test(c) || /^muchos$/i.test(c)) return '*';
  if (/^uno$/i.test(c)) return '1';
  c = c.replace(/\.\.[nm]/gi, '..*');
  return c;
};

interface DiagramState {
  nodes: Node<ClassNodeData>[];
  edges: Edge<RelationshipData>[];
  selectedNode: Node<ClassNodeData> | null;
  selectedEdge: Edge<RelationshipData> | null;
  project: DiagramProject | null;
  
  historyPast: DiagramSnapshot[];
  historyFuture: DiagramSnapshot[];
  canUndo: boolean;
  canRedo: boolean;
  takeSnapshot: () => void;
  undo: () => void;
  redo: () => void;

  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  onNodeDragStart: () => void;
  
  addClassNode: (node: Node<ClassNodeData>) => void;
  createNewClass: (name?: string, stereotype?: string, isAbstract?: boolean, position?: { x: number; y: number }) => void;
  updateClassNode: (id: string, data: Partial<ClassNodeData>) => void;
  deleteClassNode: (id: string) => void;
  deleteSelectedElements: () => boolean;
  cloneClassNode: (id: string) => Promise<void>;
  isClassNameTaken: (name: string, excludeId?: string) => boolean;
  
  addRelationship: (edge: Edge<RelationshipData>) => void;
  updateRelationship: (id: string, data: Partial<RelationshipData>) => void;
  updateRelationshipLive: (id: string, data: Partial<RelationshipData>) => void;
  deleteRelationship: (id: string) => void;
  flipRelationship: (id: string) => void;
  reconnectRelationship: (oldEdge: Edge<RelationshipData>, newConnection: Connection) => boolean;
  addPrimaryKeyToClass: (classId: string) => void;
  decomposeManyToMany: (edgeId: string) => void;
  
  copiedClassNode: ClassNodeData | null;
  copyClassNode: (classId?: string) => void;
  pasteClassNode: (position?: { x: number; y: number }) => void;

  setSelectedNode: (node: Node<ClassNodeData> | null) => void;
  setSelectedEdge: (edge: Edge<RelationshipData> | null) => void;
  
  applyVoiceMutations: (mutations: UmlMutationDto[], options?: { clearFirst?: boolean }) => { appliedCount: number; message: string };

  loadDiagram: (projectId?: string) => Promise<void>;
  saveDiagram: () => Promise<void>;
  isSaving: boolean;
  resetDiagram: () => void;
  setNodes: (nodes: Node<ClassNodeData>[] | ((prev: Node<ClassNodeData>[]) => Node<ClassNodeData>[])) => void;
  setEdges: (edges: Edge<RelationshipData>[] | ((prev: Edge<RelationshipData>[]) => Edge<RelationshipData>[])) => void;
  setCurrentProject: (project: DiagramProject | null) => void;
}

export const useDiagramStore = create<DiagramState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNode: null,
  selectedEdge: null,
  project: null,
  isSaving: false,
  copiedClassNode: null,

  setNodes: (nodesOrFn) => {
    set((state) => ({
      nodes: typeof nodesOrFn === 'function' ? nodesOrFn(state.nodes) : nodesOrFn,
    }));
  },

  setEdges: (edgesOrFn) => {
    set((state) => ({
      edges: typeof edgesOrFn === 'function' ? edgesOrFn(state.edges) : edgesOrFn,
    }));
  },

  setCurrentProject: (project) => {
    set({ project });
  },

  historyPast: [],
  historyFuture: [],
  canUndo: false,
  canRedo: false,

  takeSnapshot: () => {
    const { nodes, edges, historyPast } = get();

    // Prevent duplicate consecutive snapshots if state hasn't changed
    if (historyPast.length > 0) {
      const last = historyPast[historyPast.length - 1];
      if (
        last.nodes.length === nodes.length &&
        last.edges.length === edges.length &&
        JSON.stringify(last.nodes) === JSON.stringify(nodes) &&
        JSON.stringify(last.edges) === JSON.stringify(edges)
      ) {
        return;
      }
    }

    const snapshot: DiagramSnapshot = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    };
    const newPast = [...historyPast.slice(-29), snapshot];
    set({
      historyPast: newPast,
      historyFuture: [],
      canUndo: true,
      canRedo: false,
    });
  },

  undo: () => {
    const { historyPast, historyFuture, nodes, edges } = get();
    if (historyPast.length === 0) return;

    const previousSnapshot = historyPast[historyPast.length - 1];
    const newPast = historyPast.slice(0, -1);
    const currentSnapshot: DiagramSnapshot = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    };
    const newFuture = [currentSnapshot, ...historyFuture.slice(0, 29)];

    // Clear selection on restored elements to prevent accidental immediate re-deletion
    const restoredNodes = previousSnapshot.nodes.map(n => ({ ...n, selected: false }));
    const restoredEdges = previousSnapshot.edges.map(e => ({ ...e, selected: false }));

    set({
      nodes: restoredNodes,
      edges: restoredEdges,
      selectedNode: null,
      selectedEdge: null,
      historyPast: newPast,
      historyFuture: newFuture,
      canUndo: newPast.length > 0,
      canRedo: true,
    });
    emitCollab('SYNC_STATE', { nodes: restoredNodes, edges: restoredEdges });
    toast('Acción deshecha');
  },

  redo: () => {
    const { historyPast, historyFuture, nodes, edges } = get();
    if (historyFuture.length === 0) return;

    const nextSnapshot = historyFuture[0];
    const newFuture = historyFuture.slice(1);
    const currentSnapshot: DiagramSnapshot = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    };
    const newPast = [...historyPast.slice(-29), currentSnapshot];

    const restoredNodes = nextSnapshot.nodes.map(n => ({ ...n, selected: false }));
    const restoredEdges = nextSnapshot.edges.map(e => ({ ...e, selected: false }));

    set({
      nodes: restoredNodes,
      edges: restoredEdges,
      selectedNode: null,
      selectedEdge: null,
      historyPast: newPast,
      historyFuture: newFuture,
      canUndo: true,
      canRedo: newFuture.length > 0,
    });
    emitCollab('SYNC_STATE', { nodes: restoredNodes, edges: restoredEdges });
    toast('Acción rehecha');
  },

  onNodeDragStart: () => {
    get().takeSnapshot();
  },

  onNodesChange: (changes) => {
    if (changes.some((c) => c.type === 'remove')) {
      get().takeSnapshot();
    }
    set({
      nodes: applyNodeChanges(changes, get().nodes) as Node<ClassNodeData>[],
    });
  },

  onEdgesChange: (changes) => {
    if (changes.some((c) => c.type === 'remove')) {
      get().takeSnapshot();
    }
    set({
      edges: applyEdgeChanges(changes, get().edges) as Edge<RelationshipData>[],
    });
  },

  onConnect: (connection: Connection) => {
    if (!connection.source || !connection.target) return;

    // Disallow connecting the exact same handle to itself
    if (connection.source === connection.target && connection.sourceHandle === connection.targetHandle) {
      toast.error('Una relación reflexiva debe conectar dos puertos o extremos distintos');
      return;
    }
    
    get().takeSnapshot();

    const edgeId = `e-${connection.source}-${connection.target}-${Date.now()}`;
    const newEdge: Edge<RelationshipData> = {
      id: edgeId,
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle,
      targetHandle: connection.targetHandle,
      type: 'umlEdge',
      data: {
        id: edgeId,
        type: 'association',
        sourceCardinality: '1',
        targetCardinality: '1',
        label: '',
        sourceRole: '',
        targetRole: '',
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
        routing: 'smoothstep',
        isDirected: true,
        waypoints: []
      }
    };
    
    // Explicitly append the edge to allow multiple connections and prevent duplicate drop
    const currentEdges = get().edges;
    set({ 
      edges: [...currentEdges, newEdge],
      selectedEdge: newEdge,
      selectedNode: null
    });
    emitCollab('EDGE_CREATE', newEdge);
    toast.success('Relación conectada');
  },

  isClassNameTaken: (name: string, excludeId?: string) => {
    if (!name || !name.trim()) return false;
    const lower = name.trim().toLowerCase();
    return get().nodes.some(
      (n) => n.id !== excludeId && (n.data?.name || '').trim().toLowerCase() === lower
    );
  },

  addClassNode: (node) => {
    get().takeSnapshot();
    set((state) => ({ nodes: [...state.nodes, node] }));
    emitCollab('NODE_CREATE', node);
  },
  
  createNewClass: (name = 'NuevaClase', stereotype = 'entity', isAbstract = false, position?: { x: number; y: number }) => {
    get().takeSnapshot();

    const newId = `c-${Date.now()}`;
    const currentCount = get().nodes.length;
    const posX = position ? position.x : (100 + (currentCount % 3) * 260);
    const posY = position ? position.y : (120 + Math.floor(currentCount / 3) * 220);

    let finalName = name || `Clase${currentCount + 1}`;
    let counter = 1;
    while (get().isClassNameTaken(finalName)) {
      finalName = `${name || 'Clase'}${counter++}`;
    }

    const newNode: Node<ClassNodeData> = {
      id: newId,
      type: 'classNode',
      position: { x: posX, y: posY },
      data: {
        id: newId,
        name: finalName,
        stereotype: stereotype || undefined,
        isAbstract: !!isAbstract,
        attributes: [
          { id: `a-${Date.now()}-1`, name: 'id', type: 'Long', visibility: 'private', isStatic: false, isId: true, isPrimaryKey: true, isNotNull: true, isNullable: false }
        ],
        methods: [
          { id: `m-${Date.now()}-1`, name: 'getId', returnType: 'Long', visibility: 'public', isStatic: false, isAbstract: false, parameters: [] }
        ]
      }
    };

    set((state) => ({ 
      nodes: [...state.nodes, newNode],
      selectedNode: newNode,
      selectedEdge: null
    }));
    emitCollab('NODE_CREATE', newNode);
  },

  cloneClassNode: async (id: string) => {
    const { project, nodes } = get();
    const sourceNode = nodes.find((n) => n.id === id);
    if (!sourceNode) return;

    get().takeSnapshot();

    // Try backend API first if valid project exists
    if (project?.id && isUUID(project.id)) {
      try {
        const res = await api.cloneClassNode(project.id, id);
        if (res?.success && res.data) {
          const cn = res.data;
          const newNode: Node<ClassNodeData> = {
            id: cn.id,
            type: 'classNode',
            position: {
              x: cn.positionX || (sourceNode.position.x + 48),
              y: cn.positionY || (sourceNode.position.y + 48)
            },
            data: {
              id: cn.id,
              name: cn.name,
              stereotype: cn.stereotype,
              isAbstract: cn.abstractClass || cn.isAbstract || false,
              attributes: cn.attributes || [],
              methods: cn.methods || []
            }
          };
          set((state) => ({
            nodes: [...state.nodes, newNode],
            selectedNode: newNode,
            selectedEdge: null
          }));
          emitCollab('NODE_CREATE', newNode);
          return;
        }
      } catch (err: any) {
        console.error('Clonado via API no completado, usando copia reactiva local:', err);
      }
    }

    // Local clone fallback with clean offset and fresh IDs
    const baseName = sourceNode.data.name || 'Clase';
    let candidateName = `${baseName}Copia`;
    let counter = 1;
    while (get().isClassNameTaken(candidateName)) {
      candidateName = `${baseName}Copia${counter++}`;
    }

    const newId = `c-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const clonedAttributes = (sourceNode.data.attributes || []).map((attr) => ({
      ...attr,
      id: `a-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
    }));
    const clonedMethods = (sourceNode.data.methods || []).map((m) => ({
      ...m,
      id: `m-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      parameters: (m.parameters || []).map((p) => ({ ...p }))
    }));

    const newNode: Node<ClassNodeData> = {
      id: newId,
      type: 'classNode',
      position: {
        x: sourceNode.position.x + 48,
        y: sourceNode.position.y + 48
      },
      data: {
        id: newId,
        name: candidateName,
        stereotype: sourceNode.data.stereotype,
        isAbstract: !!sourceNode.data.isAbstract,
        attributes: clonedAttributes,
        methods: clonedMethods
      }
    };

    set((state) => ({
      nodes: [...state.nodes, newNode],
      selectedNode: newNode,
      selectedEdge: null
    }));
    emitCollab('NODE_CREATE', newNode);
  },

  updateClassNode: (id, data) => {
    get().takeSnapshot();
    set((state) => {
      const updatedNodes = state.nodes.map(node => 
        node.id === id ? { ...node, data: { ...node.data, ...data } } : node
      );
      const updatedSelectedNode = state.selectedNode?.id === id
        ? { ...state.selectedNode, data: { ...state.selectedNode.data, ...data } }
        : state.selectedNode;

      return {
        nodes: updatedNodes,
        selectedNode: updatedSelectedNode
      };
    });
    emitCollab('NODE_UPDATE', { id, data });
  },
  
  deleteClassNode: (id) => {
    get().takeSnapshot();
    set((state) => ({
      nodes: state.nodes.filter(node => node.id !== id),
      edges: state.edges.filter(edge => edge.source !== id && edge.target !== id),
      selectedNode: state.selectedNode?.id === id ? null : state.selectedNode
    }));
    emitCollab('NODE_DELETE', id);
  },

  deleteSelectedElements: () => {
    const { nodes, edges, selectedNode, selectedEdge } = get();

    const selectedNodeIds = new Set<string>();
    nodes.forEach((n) => {
      if (n.selected) {
        selectedNodeIds.add(n.id);
      }
    });
    if (selectedNode) {
      selectedNodeIds.add(selectedNode.id);
    }

    const selectedEdgeIds = new Set<string>();
    edges.forEach((e) => {
      if (e.selected) {
        selectedEdgeIds.add(e.id);
      }
    });
    if (selectedEdge) {
      selectedEdgeIds.add(selectedEdge.id);
    }

    if (selectedNodeIds.size === 0 && selectedEdgeIds.size === 0) {
      return false;
    }

    // Capture snapshot BEFORE deleting anything so Ctrl+Z can restore all elements
    get().takeSnapshot();

    const remainingNodes = nodes.filter((n) => !selectedNodeIds.has(n.id));
    const remainingEdges = edges.filter(
      (e) =>
        !selectedEdgeIds.has(e.id) &&
        !selectedNodeIds.has(e.source) &&
        !selectedNodeIds.has(e.target)
    );

    const deletedNodesCount = nodes.length - remainingNodes.length;
    const deletedEdgesCount = edges.length - remainingEdges.length;

    set({
      nodes: remainingNodes,
      edges: remainingEdges,
      selectedNode: null,
      selectedEdge: null,
    });

    selectedNodeIds.forEach((nid) => emitCollab('NODE_DELETE', nid));
    selectedEdgeIds.forEach((eid) => emitCollab('EDGE_DELETE', eid));

    if (deletedNodesCount > 0 && deletedEdgesCount > 0) {
      toast.success(
        `${deletedNodesCount} ${deletedNodesCount === 1 ? 'clase' : 'clases'} y ${deletedEdgesCount} ${deletedEdgesCount === 1 ? 'relación eliminada' : 'relaciones eliminadas'}`
      );
    } else if (deletedNodesCount > 0) {
      toast.success(
        `${deletedNodesCount} ${deletedNodesCount === 1 ? 'clase eliminada' : 'clases eliminadas'}`
      );
    } else if (deletedEdgesCount > 0) {
      toast.success(
        `${deletedEdgesCount} ${deletedEdgesCount === 1 ? 'relación eliminada' : 'relaciones eliminadas'}`
      );
    }

    return true;
  },

  addRelationship: (edge) => {
    get().takeSnapshot();
    set((state) => ({ edges: [...state.edges, edge] }));
    emitCollab('EDGE_CREATE', edge);
  },
  
  updateRelationship: (id, data) => {
    const currentEdge = get().edges.find(e => e.id === id);
    if (!currentEdge) return;

    const newType = ((data.type || currentEdge.data?.type || 'association') as string).toLowerCase();
    const isInheritance = newType === 'inheritance' || newType === 'generalization';
    const isNoCardType = isInheritance || newType === 'realization' || newType === 'implementation' || newType === 'dependency';

    // Check circular inheritance if type is inheritance / generalization
    if (isInheritance) {
      if (currentEdge.source === currentEdge.target) {
        toast.error('Una clase no puede heredar de sí misma (UML 2.5)');
        return;
      }
      if (hasInheritancePath(get().edges, currentEdge.target, currentEdge.source, id)) {
        toast.error('Herencia circular detectada: se violaría la jerarquía acíclica de clases en UML 2.5');
        return;
      }
    }

    // Check composition source cardinality constraint in UML 2.5
    const patchData: Partial<RelationshipData> = { ...data };
    if (newType === 'composition') {
      const srcCard = patchData.sourceCardinality !== undefined ? patchData.sourceCardinality : currentEdge.data?.sourceCardinality;
      if (srcCard === '*' || srcCard === '1..*' || srcCard === '0..*') {
        toast.error('En composición UML 2.5, el contenedor (todo) no puede tener multiplicidad compartida (*, 1..*)');
        patchData.sourceCardinality = '1';
      }
    }

    // Omit / clear cardinalities for inheritance, realization, dependency
    if (isNoCardType) {
      patchData.sourceCardinality = '';
      patchData.targetCardinality = '';
    }

    get().takeSnapshot();

    set((state) => {
      const updatedEdges = state.edges.map(edge => 
        edge.id === id ? { ...edge, data: { ...edge.data, ...patchData } as RelationshipData } : edge
      );
      const updatedSelectedEdge = state.selectedEdge?.id === id
        ? { ...state.selectedEdge, data: { ...state.selectedEdge.data, ...patchData } as RelationshipData }
        : state.selectedEdge;

      return {
        edges: updatedEdges,
        selectedEdge: updatedSelectedEdge
      };
    });
    emitCollab('EDGE_UPDATE', { id, data: patchData });
  },

  updateRelationshipLive: (id: string, data: Partial<RelationshipData>) => {
    set((state) => {
      const updatedEdges = state.edges.map(edge => 
        edge.id === id ? { ...edge, data: { ...edge.data, ...data } as RelationshipData } : edge
      );
      const updatedSelectedEdge = state.selectedEdge?.id === id
        ? { ...state.selectedEdge, data: { ...state.selectedEdge.data, ...data } as RelationshipData }
        : state.selectedEdge;

      return {
        edges: updatedEdges,
        selectedEdge: updatedSelectedEdge
      };
    });
  },

  flipRelationship: (id: string) => {
    const currentEdge = get().edges.find(e => e.id === id);
    if (!currentEdge) return;

    const relType = (currentEdge.data?.type || 'association').toLowerCase();
    const isInheritance = relType === 'inheritance' || relType === 'generalization';

    if (isInheritance) {
      if (hasInheritancePath(get().edges, currentEdge.source, currentEdge.target, id)) {
        toast.error('No se puede invertir: causaría una herencia circular en UML 2.5');
        return;
      }
    }

    get().takeSnapshot();

    set((state) => {
      const flippedEdges = state.edges.map(edge => {
        if (edge.id !== id) return edge;
        const currentData = edge.data || ({} as RelationshipData);
        const flippedData: RelationshipData = {
          ...currentData,
          sourceCardinality: currentData.targetCardinality || '',
          targetCardinality: currentData.sourceCardinality || '',
          sourceRole: currentData.targetRole || '',
          targetRole: currentData.sourceRole || ''
        };

        return {
          ...edge,
          source: edge.target,
          target: edge.source,
          sourceHandle: edge.targetHandle,
          targetHandle: edge.sourceHandle,
          data: flippedData
        };
      });

      const updatedSelectedEdge = state.selectedEdge?.id === id
        ? flippedEdges.find(e => e.id === id) || null
        : state.selectedEdge;

      return {
        edges: flippedEdges,
        selectedEdge: updatedSelectedEdge
      };
    });

    const flippedEdge = get().edges.find(e => e.id === id);
    if (flippedEdge) {
      emitCollab('EDGE_UPDATE', { id, data: flippedEdge.data });
    }

    toast.success('Dirección de relación invertida');
  },

  reconnectRelationship: (oldEdge: Edge<RelationshipData>, newConnection: Connection) => {
    if (!newConnection.source || !newConnection.target) return false;

    const relType = (oldEdge.data?.type || 'association').toLowerCase();
    const isInheritance = relType === 'inheritance' || relType === 'generalization';

    // A class cannot inherit from itself (UML 2.5)
    if (isInheritance && newConnection.source === newConnection.target) {
      toast.error('Una clase no puede heredar de sí misma en UML 2.5');
      return false;
    }

    // A reflexive relationship must connect two different handles/ports
    if (newConnection.source === newConnection.target && newConnection.sourceHandle === newConnection.targetHandle) {
      toast.error('Una relación reflexiva debe conectar dos puertos o extremos distintos');
      return false;
    }

    // Check circular inheritance if this is an inheritance relation
    if (isInheritance) {
      if (hasInheritancePath(get().edges, newConnection.target, newConnection.source, oldEdge.id)) {
        toast.error('No se puede reconectar: causaría una herencia circular en UML 2.5');
        return false;
      }
    }

    get().takeSnapshot();

    const currentData = oldEdge.data || ({} as RelationshipData);
    const updatedEdge: Edge<RelationshipData> = {
      ...oldEdge,
      source: newConnection.source,
      target: newConnection.target,
      sourceHandle: newConnection.sourceHandle,
      targetHandle: newConnection.targetHandle,
      data: {
        ...currentData,
        sourceHandle: newConnection.sourceHandle,
        targetHandle: newConnection.targetHandle,
      }
    };

    const newEdges = get().edges.map(e => e.id === oldEdge.id ? updatedEdge : e);
    set({
      edges: newEdges,
      selectedEdge: updatedEdge,
      selectedNode: null
    });
    emitCollab('EDGE_UPDATE', { id: oldEdge.id, data: updatedEdge.data });

    toast.success('Relación reconectada exitosamente');
    return true;
  },

  deleteRelationship: (id) => {
    get().takeSnapshot();
    set((state) => ({
      edges: state.edges.filter(edge => edge.id !== id),
      selectedEdge: state.selectedEdge?.id === id ? null : state.selectedEdge
    }));
    emitCollab('EDGE_DELETE', id);
  },

  addPrimaryKeyToClass: (classId: string) => {
    get().takeSnapshot();
    set((state) => {
      const updatedNodes = state.nodes.map((node) => {
        if (node.id === classId) {
          const currentAttrs = node.data.attributes || [];
          // If it already has an attribute marked as PK, keep as is
          if (currentAttrs.some((a) => a.isId)) return node;

          // If an attribute named 'id' exists without PK badge, promote it!
          const existingIdIndex = currentAttrs.findIndex((a) => a.name.trim().toLowerCase() === 'id');
          if (existingIdIndex >= 0) {
            const updatedAttrs = currentAttrs.map((attr, idx) => {
              if (idx === existingIdIndex) {
                return {
                  ...attr,
                  name: 'id',
                  type: attr.type?.trim() ? attr.type : 'Long',
                  isId: true,
                  isPrimaryKey: true,
                  isNotNull: true,
                  isNullable: false,
                };
              }
              return attr;
            });
            return {
              ...node,
              data: {
                ...node.data,
                attributes: updatedAttrs,
              },
            };
          }

          // Otherwise prepend new primary key '+ id : Long {PK}'
          const newPkAttr = {
            id: crypto.randomUUID(),
            name: 'id',
            type: 'Long',
            visibility: 'public' as const,
            isStatic: false,
            isId: true,
            isPrimaryKey: true,
            isNotNull: true,
            isNullable: false,
          };
          return {
            ...node,
            data: {
              ...node.data,
              attributes: [newPkAttr, ...currentAttrs],
            },
          };
        }
        return node;
      });

      const updatedSelectedNode = state.selectedNode?.id === classId
        ? updatedNodes.find((n) => n.id === classId) || null
        : state.selectedNode;

      return {
        nodes: updatedNodes,
        selectedNode: updatedSelectedNode,
      };
    });

    const targetNode = get().nodes.find(n => n.id === classId);
    if (targetNode) {
      emitCollab('NODE_UPDATE', { id: classId, data: targetNode.data });
    }

    toast.success('Clave primaria (+ id : Long {PK}) asignada exitosamente');
  },

  decomposeManyToMany: (edgeId: string) => {
    const edge = get().edges.find((e) => e.id === edgeId);
    if (!edge) return;

    const sourceNode = get().nodes.find((n) => n.id === edge.source);
    const targetNode = get().nodes.find((n) => n.id === edge.target);
    if (!sourceNode || !targetNode) return;

    get().takeSnapshot();

    const srcName = sourceNode.data.name || 'EntidadA';
    const tgtName = targetNode.data.name || 'EntidadB';
    const intermediateName = `${srcName}${tgtName}`;

    // Intermediate Class ID & Coordinates
    const intermediateId = `c-${Date.now()}`;
    const midX = Math.round((sourceNode.position.x + targetNode.position.x) / 2);
    const midY = Math.round((sourceNode.position.y + targetNode.position.y) / 2) + 60;

    const intermediateNode: Node<ClassNodeData> = {
      id: intermediateId,
      type: 'classNode',
      position: { x: midX, y: midY },
      data: {
        id: intermediateId,
        name: intermediateName,
        stereotype: 'association',
        isAbstract: false,
        attributes: [
          {
            id: crypto.randomUUID(),
            name: 'id',
            type: 'Long',
            visibility: 'public',
            isStatic: false,
            isId: true,
            isPrimaryKey: true,
            isNotNull: true,
            isNullable: false,
          },
          {
            id: crypto.randomUUID(),
            name: `${srcName.toLowerCase()}_id`,
            type: 'Long',
            visibility: 'public',
            isStatic: false,
            isId: false,
            isPrimaryKey: false,
            isNotNull: true,
            isNullable: false,
          },
          {
            id: crypto.randomUUID(),
            name: `${tgtName.toLowerCase()}_id`,
            type: 'Long',
            visibility: 'public',
            isStatic: false,
            isId: false,
            isPrimaryKey: false,
            isNotNull: true,
            isNullable: false,
          },
        ],
        methods: [],
      },
    };

    // Edge 1: Source (1) -> Intermediate (*)
    const edge1Id = crypto.randomUUID();
    const edge1: Edge<RelationshipData> = {
      id: edge1Id,
      source: sourceNode.id,
      target: intermediateId,
      sourceHandle: 'bottom',
      targetHandle: 'top',
      type: 'umlEdge',
      data: {
        id: edge1Id,
        type: 'association',
        sourceCardinality: '1',
        targetCardinality: '*',
        label: '',
        sourceHandle: 'bottom',
        targetHandle: 'top',
        routing: 'smoothstep',
        isDirected: true,
      },
    };

    // Edge 2: Target (1) -> Intermediate (*)
    const edge2Id = crypto.randomUUID();
    const edge2: Edge<RelationshipData> = {
      id: edge2Id,
      source: targetNode.id,
      target: intermediateId,
      sourceHandle: 'bottom',
      targetHandle: 'top',
      type: 'umlEdge',
      data: {
        id: edge2Id,
        type: 'association',
        sourceCardinality: '1',
        targetCardinality: '*',
        label: '',
        sourceHandle: 'bottom',
        targetHandle: 'top',
        routing: 'smoothstep',
        isDirected: true,
      },
    };

    set((state) => ({
      nodes: [...state.nodes, intermediateNode],
      edges: [...state.edges.filter((e) => e.id !== edgeId), edge1, edge2],
      selectedNode: intermediateNode,
      selectedEdge: null,
    }));
    emitCollab('SYNC_STATE', { nodes: get().nodes, edges: get().edges });

    toast.success(`Relación descompuesta en clase asociativa '${intermediateName}' con enlaces 1..*`);
  },

  copyClassNode: (classId?: string) => {
    const targetId = classId || get().selectedNode?.id;
    if (!targetId) {
      toast.error('Selecciona una clase para copiar');
      return;
    }
    const node = get().nodes.find((n) => n.id === targetId);
    if (!node || !node.data) return;

    set({ copiedClassNode: JSON.parse(JSON.stringify(node.data)) });
    toast.success(`Clase '${node.data.name}' copiada al portapapeles`);
  },

  pasteClassNode: (position?: { x: number; y: number }) => {
    const { copiedClassNode, isClassNameTaken, nodes } = get();
    if (!copiedClassNode) {
      toast.error('No hay ninguna clase en el portapapeles. Copia una con Ctrl+C.');
      return;
    }

    get().takeSnapshot();

    const baseName = copiedClassNode.name || 'Clase';
    let candidateName = `${baseName}Copia`;
    let counter = 1;
    while (isClassNameTaken(candidateName)) {
      candidateName = `${baseName}Copia${counter++}`;
    }

    const newId = `c-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const referenceNode = nodes.find((n) => n.data?.name === copiedClassNode.name);
    const posX = position ? position.x : (referenceNode ? referenceNode.position.x + 48 : 150);
    const posY = position ? position.y : (referenceNode ? referenceNode.position.y + 48 : 150);

    const clonedAttributes = (copiedClassNode.attributes || []).map((attr) => ({
      ...attr,
      id: `a-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
    }));

    const clonedMethods = (copiedClassNode.methods || []).map((m) => ({
      ...m,
      id: `m-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      parameters: (m.parameters || []).map((p) => ({ ...p }))
    }));

    const newNode: Node<ClassNodeData> = {
      id: newId,
      type: 'classNode',
      position: { x: posX, y: posY },
      data: {
        id: newId,
        name: candidateName,
        stereotype: copiedClassNode.stereotype,
        isAbstract: copiedClassNode.isAbstract,
        attributes: clonedAttributes,
        methods: clonedMethods,
      }
    };

    set((state) => ({
      nodes: [...state.nodes, newNode],
      selectedNode: newNode,
      selectedEdge: null
    }));
    emitCollab('NODE_CREATE', newNode);

    toast.success(`Clase '${candidateName}' pegada exitosamente`);
  },

  setSelectedNode: (node) => set({ selectedNode: node, selectedEdge: null }),
  setSelectedEdge: (edge) => set({ selectedEdge: edge, selectedNode: null }),

  loadDiagram: async (projectId) => {
    if (!projectId || !isUUID(projectId)) return;
    try {
      import('./collabStore').then(({ useCollabStore }) => {
        const collab = useCollabStore.getState();
        if (collab.isLive && collab.session?.projectId && collab.session.projectId !== projectId) {
          collab.leaveSession();
        }
      }).catch(() => {});
      const res = await api.getFullDiagram(projectId);
      if (res && res.data) {
        const payload = res.data;
        const mappedNodes: Node<ClassNodeData>[] = (payload.classNodes || []).map((cn: any) => ({
          id: cn.id,
          type: 'classNode',
          position: { x: cn.positionX || 100, y: cn.positionY || 100 },
          data: {
            id: cn.id,
            name: cn.name,
            stereotype: cn.stereotype,
            isAbstract: cn.abstractClass || cn.isAbstract || false,
            attributes: cn.attributes || [],
            methods: cn.methods || []
          }
        }));

        const mappedEdges: Edge<RelationshipData>[] = (payload.relationships || []).map((rel: any) => {
          const sHandle = rel.sourceHandle || null;
          const tHandle = rel.targetHandle || null;
          let waypoints: any[] = [];
          if (rel.waypoints) {
            try {
              waypoints = typeof rel.waypoints === 'string' ? JSON.parse(rel.waypoints) : rel.waypoints;
            } catch (e) {
              waypoints = [];
            }
          }
          return {
            id: rel.id,
            source: rel.sourceClass?.id || rel.sourceClassId,
            target: rel.targetClass?.id || rel.targetClassId,
            sourceHandle: sHandle,
            targetHandle: tHandle,
            type: 'umlEdge',
            data: {
              id: rel.id,
              type: rel.type || 'association',
              sourceCardinality: rel.sourceCardinality || '1',
              targetCardinality: rel.targetCardinality || '1',
              label: rel.label || '',
              sourceRole: rel.sourceRole || '',
              targetRole: rel.targetRole || '',
              sourceHandle: sHandle,
              targetHandle: tHandle,
              routing: rel.routing || 'smoothstep',
              isDirected: true,
              waypoints: Array.isArray(waypoints) ? waypoints : []
            }
          };
        });

        localStorage.setItem('case_last_project_id', projectId);

        set({
          project: payload.project,
          nodes: mappedNodes,
          edges: mappedEdges,
          selectedNode: null,
          selectedEdge: null,
          historyPast: [],
          historyFuture: [],
          canUndo: false,
          canRedo: false
        });
      }
    } catch (err) {
      localStorage.removeItem('case_last_project_id');
      set({
        project: null,
        nodes: [],
        edges: [],
        selectedNode: null,
        selectedEdge: null,
        historyPast: [],
        historyFuture: [],
        canUndo: false,
        canRedo: false
      });
      throw err;
    }
  },
  
  saveDiagram: async () => {
    const { isSaving, project, nodes, edges } = get();

    if (isSaving) return;
    if (!project?.id || !isUUID(project.id)) {
      throw new Error('No hay un proyecto activo para guardar');
    }

    set({ isSaving: true });
    try {
      const payloadNodes = nodes.map((n) => ({
        id: n.id,
        name: n.data.name || 'Clase',
        stereotype: n.data.stereotype || undefined,
        isAbstract: !!(n.data.isAbstract || n.data.stereotype?.toLowerCase() === 'abstract'),
        positionX: Math.round(n.position.x),
        positionY: Math.round(n.position.y),
        width: n.measured?.width || 240,
        height: n.measured?.height || 180,
        attributes: n.data.attributes || [],
        methods: n.data.methods || []
      }));

      const payloadEdges = edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle || (e.data as any)?.sourceHandle || null,
        targetHandle: e.targetHandle || (e.data as any)?.targetHandle || null,
        type: e.data?.type || 'association',
        sourceCardinality: e.data?.sourceCardinality || '1',
        targetCardinality: e.data?.targetCardinality || '1',
        label: e.data?.label || '',
        sourceRole: e.data?.sourceRole || '',
        targetRole: e.data?.targetRole || '',
        routing: e.data?.routing || 'smoothstep',
        waypoints: e.data?.waypoints && e.data.waypoints.length > 0 ? JSON.stringify(e.data.waypoints) : null
      }));

      const res = await api.syncDiagram(project.id, {
        nodes: payloadNodes,
        edges: payloadEdges
      });

      if (res?.success && res.data) {
        const payload = res.data;
        const currentEdges = get().edges;
        const mappedNodes: Node<ClassNodeData>[] = (payload.classNodes || []).map((cn: any) => ({
          id: cn.id,
          type: 'classNode',
          position: { x: cn.positionX || 100, y: cn.positionY || 100 },
          data: {
            id: cn.id,
            name: cn.name,
            stereotype: cn.stereotype,
            isAbstract: cn.abstractClass || cn.isAbstract || false,
            attributes: cn.attributes || [],
            methods: cn.methods || []
          }
        }));

        const mappedEdges: Edge<RelationshipData>[] = (payload.relationships || []).map((rel: any) => {
          const srcId = rel.sourceClass?.id || rel.sourceClassId;
          const tgtId = rel.targetClass?.id || rel.targetClassId;
          const existingEdge = currentEdges.find((e) => 
            e.id === rel.id || (e.source === srcId && e.target === tgtId)
          );
          const sHandle = rel.sourceHandle || existingEdge?.sourceHandle || (existingEdge?.data as any)?.sourceHandle || null;
          const tHandle = rel.targetHandle || existingEdge?.targetHandle || (existingEdge?.data as any)?.targetHandle || null;

          let waypoints: any[] = existingEdge?.data?.waypoints || [];
          if (rel.waypoints) {
            try {
              waypoints = typeof rel.waypoints === 'string' ? JSON.parse(rel.waypoints) : rel.waypoints;
            } catch (e) {
              waypoints = existingEdge?.data?.waypoints || [];
            }
          }

          return {
            id: rel.id,
            source: srcId,
            target: tgtId,
            sourceHandle: sHandle,
            targetHandle: tHandle,
            type: 'umlEdge',
            data: {
              id: rel.id,
              type: rel.type || 'association',
              sourceCardinality: rel.sourceCardinality || '1',
              targetCardinality: rel.targetCardinality || '1',
              label: rel.label || '',
              sourceRole: rel.sourceRole || '',
              targetRole: rel.targetRole || '',
              sourceHandle: sHandle,
              targetHandle: tHandle,
              routing: rel.routing || existingEdge?.data?.routing || 'smoothstep',
              isDirected: existingEdge?.data?.isDirected ?? true,
              waypoints: Array.isArray(waypoints) ? waypoints : []
            }
          };
        });

        set((state) => ({
          project: payload.project ? { ...state.project, ...payload.project } : state.project,
          nodes: mappedNodes.length > 0 ? mappedNodes : state.nodes,
          edges: mappedEdges.length > 0 ? mappedEdges : state.edges
        }));
        emitCollab('SYNC_STATE', { nodes: get().nodes, edges: get().edges });
      }
    } finally {
      set({ isSaving: false });
    }
  },

  applyVoiceMutations: (mutations: UmlMutationDto[], options?: { clearFirst?: boolean }) => {
    if (!mutations || mutations.length === 0) {
      return { appliedCount: 0, message: 'Sin mutaciones que aplicar' };
    }

    // Capture snapshot for full Ctrl+Z reversibility
    get().takeSnapshot();

    let currentNodes = options?.clearFirst ? [] : [...get().nodes];
    let currentEdges = options?.clearFirst ? [] : [...get().edges];
    let appliedCount = 0;

    for (const mut of mutations) {
      if (mut.action === 'CREATE_CLASS' && mut.classData) {
        const cData = mut.classData;
        const requestedName = (cData.name || 'NuevaClase').trim();
        const existingNodeIndex = currentNodes.findIndex(
          (n) => matchesClassName(n.data?.name, requestedName)
        );

        if (existingNodeIndex >= 0) {
          // La clase ya existe en el lienzo: enriquecer y actualizar en lugar de crear un clon duplicado Clase1
          const targetNode = currentNodes[existingNodeIndex];
          const existingAttrNames = new Set((targetNode.data.attributes || []).map((a) => a.name.toLowerCase()));
          const existingMethodNames = new Set((targetNode.data.methods || []).map((m) => m.name.toLowerCase()));

          const newAttrs = (cData.attributes || [])
            .filter((a: any) => !existingAttrNames.has((a.name || '').toLowerCase()))
            .map((attr: any, idx: number) => ({
              id: attr.id || `a-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
              name: attr.name,
              type: attr.type || 'String',
              visibility: attr.visibility || '-',
              isStatic: false,
              isId: !!attr.isPrimaryKey || !!attr.isId,
              isPrimaryKey: !!attr.isPrimaryKey || !!attr.isId,
              isNotNull: attr.isNotNull !== false,
              isNullable: !attr.isPrimaryKey && !attr.isNotNull
            }));

          const newMethods = (cData.methods || [])
            .filter((m: any) => !existingMethodNames.has((m.name || '').toLowerCase()))
            .map((m: any, idx: number) => ({
              id: m.id || `m-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
              name: m.name,
              returnType: m.returnType || 'void',
              visibility: m.visibility || '+',
              isStatic: false,
              isAbstract: false,
              parameters: (m.parameters || []).map((p: any) => ({
                name: p.name,
                type: p.type || 'String'
              }))
            }));

          currentNodes[existingNodeIndex] = {
            ...targetNode,
            data: {
              ...targetNode.data,
              isAbstract: cData.isAbstract !== undefined ? !!cData.isAbstract : targetNode.data.isAbstract,
              stereotype: cData.stereotype !== undefined ? (cData.stereotype || undefined) : targetNode.data.stereotype,
              attributes: [...(targetNode.data.attributes || []), ...newAttrs],
              methods: [...(targetNode.data.methods || []), ...newMethods]
            }
          };

          appliedCount += (newAttrs.length + newMethods.length > 0 ? (newAttrs.length + newMethods.length) : 1);
        } else {
          // Clase nueva: instanciar nodo en el lienzo con distribución espacial inteligente
          const newId = `c-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          const count = currentNodes.length;
          const col = count % 3;
          const row = Math.floor(count / 3);
          const posX = typeof (cData as any).x === 'number'
            ? (cData as any).x
            : typeof (cData as any).position?.x === 'number'
              ? (cData as any).position.x
              : 120 + col * 340;
          const posY = typeof (cData as any).y === 'number'
            ? (cData as any).y
            : typeof (cData as any).position?.y === 'number'
              ? (cData as any).position.y
              : 100 + row * 270;

          const formattedAttributes = (cData.attributes || []).map((attr: any, idx: number) => ({
            id: attr.id || `a-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
            name: attr.name,
            type: attr.type || 'String',
            visibility: attr.visibility || '-',
            isStatic: false,
            isId: !!attr.isPrimaryKey || !!attr.isId,
            isPrimaryKey: !!attr.isPrimaryKey || !!attr.isId,
            isNotNull: attr.isNotNull !== false,
            isNullable: !attr.isPrimaryKey && !attr.isNotNull
          }));

          const formattedMethods = (cData.methods || []).map((m: any, idx: number) => ({
            id: m.id || `m-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
            name: m.name,
            returnType: m.returnType || 'void',
            visibility: m.visibility || '+',
            isStatic: false,
            isAbstract: false,
            parameters: (m.parameters || []).map((p: any) => ({
              name: p.name,
              type: p.type || 'String'
            }))
          }));

          const newNode: Node<ClassNodeData> = {
            id: newId,
            type: 'classNode',
            position: { x: posX, y: posY },
            data: {
              id: newId,
              name: requestedName,
              stereotype: cData.stereotype || undefined,
              isAbstract: !!cData.isAbstract,
              attributes: formattedAttributes,
              methods: formattedMethods
            }
          };

          currentNodes.push(newNode);
          appliedCount++;
        }

        // Si la mutación de clase traía además relationshipData (comportamiento de LLMs como Llama 3.1)
        if (mut.relationshipData) {
          const rData = mut.relationshipData;
          const srcNode = currentNodes.find((n) => matchesClassName(n.data?.name, rData.sourceClass));
          const tgtNode = currentNodes.find((n) => matchesClassName(n.data?.name, rData.targetClass));

          if (srcNode && tgtNode) {
            const relType = (rData.type || 'association').toLowerCase();
            const isInheritance = relType === 'generalization' || relType === 'inheritance';

            if (isInheritance) {
              if (srcNode.id === tgtNode.id) {
                toast.error(`Una clase (${srcNode.data.name}) no puede heredar de sí misma`);
                continue;
              }
              if (hasInheritancePath(currentEdges, tgtNode.id, srcNode.id)) {
                toast.error(`Herencia circular evitada: ${srcNode.data.name} no puede heredar de ${tgtNode.data.name}`);
                continue;
              }
            }

            let relLabel = (rData.label || '').trim();
            let sRole = (rData.sourceRole || '').trim();
            let tRole = (rData.targetRole || '').trim();

            if (!relLabel && sRole && sRole.toLowerCase() === tRole.toLowerCase()) {
              relLabel = sRole;
              sRole = '';
              tRole = '';
            }

            const commonVerbs = ['uso', 'usa', 'tiene', 'inscribe', 'matricula', 'pertenece', 'asocia', 'asociacion', 'contiene', 'gestiona', 'posee', 'trabaja_en'];
            if (!relLabel) {
              if (sRole && commonVerbs.includes(sRole.toLowerCase())) {
                relLabel = sRole;
                sRole = '';
              } else if (tRole && commonVerbs.includes(tRole.toLowerCase())) {
                relLabel = tRole;
                tRole = '';
              }
            }

            if (sRole && srcNode.data.name && sRole.toLowerCase() === srcNode.data.name.toLowerCase()) {
              sRole = '';
            }
            if (tRole && tgtNode.data.name && tRole.toLowerCase() === tgtNode.data.name.toLowerCase()) {
              tRole = '';
            }

            const edgeId = `e-${srcNode.id}-${tgtNode.id}-${Date.now()}`;
            const newEdge: Edge<RelationshipData> = {
              id: edgeId,
              source: srcNode.id,
              target: tgtNode.id,
              sourceHandle: 'right',
              targetHandle: 'left',
              type: 'umlEdge',
              data: {
                id: edgeId,
                type: (relType as any) || 'association',
                label: relLabel,
                sourceCardinality: normalizeUmlCardinality(rData.sourceCardinality, isInheritance),
                targetCardinality: isInheritance ? '' : normalizeUmlCardinality(rData.targetCardinality || '*', false),
                sourceRole: sRole,
                targetRole: tRole,
                routing: 'smoothstep',
                isDirected: true
              }
            };

            currentEdges.push(newEdge);
            appliedCount++;
          }
        }
      } else if (mut.action === 'ADD_ATTRIBUTES' && mut.targetClassName && mut.classData?.attributes) {
        currentNodes = currentNodes.map((n) => {
          if (matchesClassName(n.data?.name, mut.targetClassName)) {
            const existingAttrNames = new Set((n.data.attributes || []).map((a) => a.name.toLowerCase()));
            const newAttrs = (mut.classData!.attributes || [])
              .filter((a: any) => !existingAttrNames.has((a.name || '').toLowerCase()))
              .map((attr: any, idx: number) => ({
                id: attr.id || `a-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
                name: attr.name,
                type: attr.type || 'String',
                visibility: attr.visibility || '-',
                isStatic: false,
                isId: !!attr.isPrimaryKey || !!attr.isId,
                isPrimaryKey: !!attr.isPrimaryKey || !!attr.isId,
                isNotNull: attr.isNotNull !== false,
                isNullable: !attr.isPrimaryKey && !attr.isNotNull
              }));

            appliedCount += newAttrs.length;
            return {
              ...n,
              data: {
                ...n.data,
                attributes: [...(n.data.attributes || []), ...newAttrs]
              }
            };
          }
          return n;
        });
      } else if (mut.action === 'ADD_METHODS' && mut.targetClassName && mut.classData?.methods) {
        currentNodes = currentNodes.map((n) => {
          if (matchesClassName(n.data?.name, mut.targetClassName)) {
            const newMethods = (mut.classData!.methods || []).map((m: any, idx: number) => ({
              id: m.id || `m-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
              name: m.name,
              returnType: m.returnType || 'void',
              visibility: m.visibility || '+',
              isStatic: false,
              isAbstract: false,
              parameters: (m.parameters || []).map((p: any) => ({
                name: p.name,
                type: p.type || 'String'
              }))
            }));

            appliedCount += newMethods.length;
            return {
              ...n,
              data: {
                ...n.data,
                methods: [...(n.data.methods || []), ...newMethods]
              }
            };
          }
          return n;
        });
      } else if (mut.action === 'CREATE_RELATIONSHIP' && mut.relationshipData) {
        const rData = mut.relationshipData;
        const srcNode = currentNodes.find((n) => matchesClassName(n.data?.name, rData.sourceClass));
        const tgtNode = currentNodes.find((n) => matchesClassName(n.data?.name, rData.targetClass));

        if (srcNode && tgtNode) {
          const relType = (rData.type || 'association').toLowerCase();
          const isInheritance = relType === 'generalization' || relType === 'inheritance';

          if (isInheritance) {
            if (srcNode.id === tgtNode.id) {
              toast.error(`Una clase (${srcNode.data.name}) no puede heredar de sí misma`);
              continue;
            }
            if (hasInheritancePath(currentEdges, tgtNode.id, srcNode.id)) {
              toast.error(`Herencia circular evitada: ${srcNode.data.name} no puede heredar de ${tgtNode.data.name}`);
              continue;
            }
          }

          let relLabel = (rData.label || '').trim();
          let sRole = (rData.sourceRole || '').trim();
          let tRole = (rData.targetRole || '').trim();

          if (!relLabel && sRole && sRole.toLowerCase() === tRole.toLowerCase()) {
            relLabel = sRole;
            sRole = '';
            tRole = '';
          }

          const commonVerbs = ['uso', 'usa', 'tiene', 'inscribe', 'matricula', 'pertenece', 'asocia', 'asociacion', 'contiene', 'gestiona', 'posee', 'trabaja_en'];
          if (!relLabel) {
            if (sRole && commonVerbs.includes(sRole.toLowerCase())) {
              relLabel = sRole;
              sRole = '';
            } else if (tRole && commonVerbs.includes(tRole.toLowerCase())) {
              relLabel = tRole;
              tRole = '';
            }
          }

          if (sRole && srcNode.data.name && sRole.toLowerCase() === srcNode.data.name.toLowerCase()) {
            sRole = '';
          }
          if (tRole && tgtNode.data.name && tRole.toLowerCase() === tgtNode.data.name.toLowerCase()) {
            tRole = '';
          }

          const edgeId = `e-${srcNode.id}-${tgtNode.id}-${Date.now()}`;
          const newEdge: Edge<RelationshipData> = {
            id: edgeId,
            source: srcNode.id,
            target: tgtNode.id,
            sourceHandle: 'right',
            targetHandle: 'left',
            type: 'umlEdge',
            data: {
              id: edgeId,
              type: (relType as any) || 'association',
              label: relLabel,
              sourceCardinality: normalizeUmlCardinality(rData.sourceCardinality, isInheritance),
              targetCardinality: isInheritance ? '' : normalizeUmlCardinality(rData.targetCardinality || '*', false),
              sourceRole: sRole,
              targetRole: tRole,
              routing: 'smoothstep',
              isDirected: true
            }
          };

          currentEdges.push(newEdge);
          appliedCount++;
        }
      } else if (mut.action === 'UPDATE_CLASS' && mut.targetClassName && mut.classData) {
        currentNodes = currentNodes.map((n) => {
          if (matchesClassName(n.data?.name, mut.targetClassName)) {
            appliedCount++;
            const existingAttrNames = new Set((n.data.attributes || []).map((a) => a.name.toLowerCase()));
            const newAttrs = (mut.classData!.attributes || [])
              .filter((a: any) => !existingAttrNames.has((a.name || '').toLowerCase()))
              .map((attr: any, idx: number) => ({
                id: attr.id || `a-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
                name: attr.name,
                type: attr.type || 'String',
                visibility: attr.visibility || '-',
                isStatic: false,
                isId: !!attr.isPrimaryKey || !!attr.isId,
                isPrimaryKey: !!attr.isPrimaryKey || !!attr.isId,
                isNotNull: attr.isNotNull !== false,
                isNullable: !attr.isPrimaryKey && !attr.isNotNull
              }));

            return {
              ...n,
              data: {
                ...n.data,
                isAbstract: mut.classData!.isAbstract !== undefined ? !!mut.classData!.isAbstract : n.data.isAbstract,
                stereotype: mut.classData!.stereotype !== undefined ? (mut.classData!.stereotype || undefined) : n.data.stereotype,
                attributes: newAttrs.length > 0 ? [...(n.data.attributes || []), ...newAttrs] : n.data.attributes
              }
            };
          }
          return n;
        });
      } else if (mut.action === 'DELETE_ELEMENT' && mut.targetClassName) {
        const targetNode = currentNodes.find((n) => matchesClassName(n.data?.name, mut.targetClassName));
        if (targetNode) {
          currentNodes = currentNodes.filter((n) => n.id !== targetNode.id);
          currentEdges = currentEdges.filter((e) => e.source !== targetNode.id && e.target !== targetNode.id);
          appliedCount++;
        }
      }
    }

    set({
      nodes: currentNodes,
      edges: currentEdges,
      selectedNode: null,
      selectedEdge: null
    });
    emitCollab('SYNC_STATE', { nodes: currentNodes, edges: currentEdges });

    const msg = `${appliedCount} ${appliedCount === 1 ? 'mutación aplicada' : 'mutaciones aplicadas'} por asistente de voz`;
    toast.success(msg);
    return { appliedCount, message: msg };
  },

  resetDiagram: () => {
    localStorage.removeItem('case_last_project_id');
    set({
      project: null,
      nodes: [],
      edges: [],
      selectedNode: null,
      selectedEdge: null,
      historyPast: [],
      historyFuture: [],
      canUndo: false,
      canRedo: false
    });
  }
}));
