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
import toast from 'react-hot-toast';

export interface DiagramSnapshot {
  nodes: Node<ClassNodeData>[];
  edges: Edge<RelationshipData>[];
}

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
      if (edge.id === excludeEdgeId) continue;
      const relType = edge.data?.type?.toLowerCase();
      if (relType === 'inheritance' || relType === 'generalization') {
        if (edge.source === curr && !visited.has(edge.target)) {
          visited.add(edge.target);
          queue.push(edge.target);
        }
      }
    }
  }
  return false;
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
  onNodeDragStart: () => void;
  
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  
  addClassNode: (node: Node<ClassNodeData>) => void;
  createNewClass: (name?: string, stereotype?: string, isAbstract?: boolean, position?: { x: number; y: number }) => void;
  updateClassNode: (id: string, data: Partial<ClassNodeData>) => void;
  deleteClassNode: (id: string) => void;
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
  
  loadDiagram: (projectId?: string) => Promise<void>;
  saveDiagram: () => Promise<void>;
  resetDiagram: () => void;
}

export const useDiagramStore = create<DiagramState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNode: null,
  selectedEdge: null,
  project: null,
  copiedClassNode: null,

  historyPast: [],
  historyFuture: [],
  canUndo: false,
  canRedo: false,

  takeSnapshot: () => {
    const { nodes, edges, historyPast } = get();
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

    set({
      nodes: previousSnapshot.nodes,
      edges: previousSnapshot.edges,
      selectedNode: null,
      selectedEdge: null,
      historyPast: newPast,
      historyFuture: newFuture,
      canUndo: newPast.length > 0,
      canRedo: true,
    });
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

    set({
      nodes: nextSnapshot.nodes,
      edges: nextSnapshot.edges,
      selectedNode: null,
      selectedEdge: null,
      historyPast: newPast,
      historyFuture: newFuture,
      canUndo: true,
      canRedo: newFuture.length > 0,
    });
    toast('Acción rehecha');
  },

  onNodeDragStart: () => {
    get().takeSnapshot();
  },

  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes) as Node<ClassNodeData>[],
    });
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges) as Edge<RelationshipData>[],
    });
  },

  onConnect: (connection: Connection) => {
    if (!connection.source || !connection.target) return;
    
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
  },
  
  deleteClassNode: (id) => {
    get().takeSnapshot();
    set((state) => ({
      nodes: state.nodes.filter(node => node.id !== id),
      edges: state.edges.filter(edge => edge.source !== id && edge.target !== id),
      selectedNode: state.selectedNode?.id === id ? null : state.selectedNode
    }));
  },

  addRelationship: (edge) => {
    get().takeSnapshot();
    set((state) => ({ edges: [...state.edges, edge] }));
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

    toast.success('Dirección de relación invertida');
  },

  reconnectRelationship: (oldEdge: Edge<RelationshipData>, newConnection: Connection) => {
    if (!newConnection.source || !newConnection.target) return false;

    // Prevent connecting to self
    if (newConnection.source === newConnection.target) {
      toast.error('Una relación debe conectar dos clases o extremos distintos');
      return false;
    }

    const relType = (oldEdge.data?.type || 'association').toLowerCase();
    const isInheritance = relType === 'inheritance' || relType === 'generalization';

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

    toast.success('Relación reconectada exitosamente');
    return true;
  },

  deleteRelationship: (id) => {
    get().takeSnapshot();
    set((state) => ({
      edges: state.edges.filter(edge => edge.id !== id),
      selectedEdge: state.selectedEdge?.id === id ? null : state.selectedEdge
    }));
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
    toast.success('Clave primaria (+ id : Long {PK}) asignada exitosamente');
  },

  decomposeManyToMany: (edgeId: string) => {
    const edge = get().edges.find((e) => e.id === edgeId);
    if (!edge) return;

    const sourceNode = get().nodes.find((n) => n.id === edge.source);
    const targetNode = get().nodes.find((n) => n.id === edge.target);
    if (!sourceNode || !targetNode) return;

    get().takeSnapshot();

    const srcName = sourceNode.data.name;
    const tgtName = targetNode.data.name;
    let intermediateName = `${srcName}${tgtName}`;
    let counter = 1;
    while (get().isClassNameTaken(intermediateName)) {
      intermediateName = `${srcName}${tgtName}${counter++}`;
    }

    // Place intermediate node midpoint between source and target with slight offset
    const midX = Math.round((sourceNode.position.x + targetNode.position.x) / 2);
    const midY = Math.round((sourceNode.position.y + targetNode.position.y) / 2);

    const intermediateId = crypto.randomUUID();
    const intermediateNode: Node<ClassNodeData> = {
      id: intermediateId,
      type: 'classNode',
      position: { x: midX, y: midY },
      data: {
        id: intermediateId,
        name: intermediateName,
        stereotype: 'associative',
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

    toast.success(`Clase '${candidateName}' pegada exitosamente`);
  },

  setSelectedNode: (node) => set({ selectedNode: node, selectedEdge: null }),
  setSelectedEdge: (edge) => set({ selectedEdge: edge, selectedNode: null }),

  loadDiagram: async (projectId) => {
    if (!projectId || !isUUID(projectId)) return;
    try {
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
    const { project, nodes, edges } = get();

    if (!project?.id || !isUUID(project.id)) {
      throw new Error('No hay un proyecto activo para guardar');
    }

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
    }
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
