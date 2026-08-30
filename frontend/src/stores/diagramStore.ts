import { create } from 'zustand';
import { 
  Node, 
  Edge, 
  addEdge, 
  applyNodeChanges, 
  applyEdgeChanges, 
  OnNodesChange, 
  OnEdgesChange, 
  OnConnect,
  Connection
} from '@xyflow/react';
import { DiagramProject, ClassNodeData, RelationshipData } from '../types/diagram';
import { api } from '../services/api';

// Initial sample data for immediate visual experience
const sampleNodes: Node<ClassNodeData>[] = [
  {
    id: 'c1',
    type: 'classNode',
    position: { x: 80, y: 100 },
    data: {
      id: 'c1',
      name: 'Estudiante',
      stereotype: 'entity',
      isAbstract: false,
      attributes: [
        { id: 'a1', name: 'id', type: 'Long', visibility: 'private', isStatic: false },
        { id: 'a2', name: 'nombre', type: 'String', visibility: 'private', isStatic: false },
        { id: 'a3', name: 'email', type: 'String', visibility: 'private', isStatic: false },
        { id: 'a4', name: 'registro', type: 'String', visibility: 'private', isStatic: false }
      ],
      methods: [
        { id: 'm1', name: 'inscribirMateria', returnType: 'boolean', visibility: 'public', isStatic: false, isAbstract: false, parameters: [{ name: 'materiaId', type: 'Long' }] },
        { id: 'm2', name: 'calcularPromedio', returnType: 'double', visibility: 'public', isStatic: false, isAbstract: false, parameters: [] }
      ]
    }
  },
  {
    id: 'c2',
    type: 'classNode',
    position: { x: 440, y: 100 },
    data: {
      id: 'c2',
      name: 'Docente',
      stereotype: 'entity',
      isAbstract: false,
      attributes: [
        { id: 'a5', name: 'id', type: 'Long', visibility: 'private', isStatic: false },
        { id: 'a6', name: 'nombre', type: 'String', visibility: 'private', isStatic: false },
        { id: 'a7', name: 'especialidad', type: 'String', visibility: 'private', isStatic: false }
      ],
      methods: [
        { id: 'm3', name: 'asignarNota', returnType: 'void', visibility: 'public', isStatic: false, isAbstract: false, parameters: [{ name: 'estudianteId', type: 'Long' }, { name: 'nota', type: 'double' }] }
      ]
    }
  },
  {
    id: 'c3',
    type: 'classNode',
    position: { x: 440, y: 380 },
    data: {
      id: 'c3',
      name: 'Materia',
      stereotype: 'entity',
      isAbstract: false,
      attributes: [
        { id: 'a8', name: 'id', type: 'Long', visibility: 'private', isStatic: false },
        { id: 'a9', name: 'sigla', type: 'String', visibility: 'private', isStatic: false },
        { id: 'a10', name: 'nombre', type: 'String', visibility: 'private', isStatic: false },
        { id: 'a11', name: 'creditos', type: 'Integer', visibility: 'private', isStatic: false }
      ],
      methods: [
        { id: 'm4', name: 'habilitarCupos', returnType: 'void', visibility: 'public', isStatic: false, isAbstract: false, parameters: [{ name: 'cantidad', type: 'int' }] }
      ]
    }
  },
  {
    id: 'c4',
    type: 'classNode',
    position: { x: 80, y: 380 },
    data: {
      id: 'c4',
      name: 'Inscripcion',
      stereotype: 'entity',
      isAbstract: false,
      attributes: [
        { id: 'a12', name: 'id', type: 'Long', visibility: 'private', isStatic: false },
        { id: 'a13', name: 'fecha', type: 'LocalDate', visibility: 'private', isStatic: false },
        { id: 'a14', name: 'notaFinal', type: 'Double', visibility: 'private', isStatic: false },
        { id: 'a15', name: 'estado', type: 'String', visibility: 'private', isStatic: false }
      ],
      methods: [
        { id: 'm5', name: 'cerrarInscripcion', returnType: 'void', visibility: 'public', isStatic: false, isAbstract: false, parameters: [] }
      ]
    }
  }
];

const sampleEdges: Edge<RelationshipData>[] = [
  {
    id: 'e1',
    source: 'c1',
    target: 'c4',
    type: 'umlEdge',
    data: {
      id: 'e1',
      type: 'composition',
      sourceCardinality: '1',
      targetCardinality: '0..*',
      label: 'realiza'
    }
  },
  {
    id: 'e2',
    source: 'c3',
    target: 'c4',
    type: 'umlEdge',
    data: {
      id: 'e2',
      type: 'association',
      sourceCardinality: '1',
      targetCardinality: '1..*',
      label: 'contiene'
    }
  },
  {
    id: 'e3',
    source: 'c2',
    target: 'c3',
    type: 'umlEdge',
    data: {
      id: 'e3',
      type: 'aggregation',
      sourceCardinality: '1',
      targetCardinality: '1..*',
      label: 'dicta'
    }
  }
];

const sampleProject: DiagramProject = {
  id: 'sample-project-id',
  name: 'Sistema de Gestión Académica',
  description: 'Modelo de datos UML de entidades académicas con generación a Spring Boot',
  ownerId: 'default-owner',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

interface DiagramState {
  nodes: Node<ClassNodeData>[];
  edges: Edge<RelationshipData>[];
  selectedNode: Node<ClassNodeData> | null;
  selectedEdge: Edge<RelationshipData> | null;
  project: DiagramProject | null;
  
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  
  addClassNode: (node: Node<ClassNodeData>) => void;
  createNewClass: (name?: string, stereotype?: string, isAbstract?: boolean) => void;
  updateClassNode: (id: string, data: Partial<ClassNodeData>) => void;
  deleteClassNode: (id: string) => void;
  
  addRelationship: (edge: Edge<RelationshipData>) => void;
  updateRelationship: (id: string, data: Partial<RelationshipData>) => void;
  deleteRelationship: (id: string) => void;
  
  setSelectedNode: (node: Node<ClassNodeData> | null) => void;
  setSelectedEdge: (edge: Edge<RelationshipData> | null) => void;
  
  loadDiagram: (projectId?: string) => Promise<void>;
  saveDiagram: () => Promise<void>;
}

export const useDiagramStore = create<DiagramState>((set, get) => ({
  nodes: sampleNodes,
  edges: sampleEdges,
  selectedNode: null,
  selectedEdge: null,
  project: sampleProject,

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
        label: ''
      }
    };
    set({ edges: addEdge(newEdge, get().edges) as Edge<RelationshipData>[] });
  },

  addClassNode: (node) => set((state) => ({ nodes: [...state.nodes, node] })),
  
  createNewClass: (name = 'NuevaClase', stereotype = 'entity', isAbstract = false) => {
    const newId = `c-${Date.now()}`;
    // Find free position offset
    const currentCount = get().nodes.length;
    const posX = 100 + (currentCount % 3) * 260;
    const posY = 120 + Math.floor(currentCount / 3) * 220;

    const newNode: Node<ClassNodeData> = {
      id: newId,
      type: 'classNode',
      position: { x: posX, y: posY },
      data: {
        id: newId,
        name: name || `Clase${currentCount + 1}`,
        stereotype: stereotype || undefined,
        isAbstract: !!isAbstract,
        attributes: [
          { id: `a-${Date.now()}-1`, name: 'id', type: 'Long', visibility: 'private', isStatic: false }
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

  updateClassNode: (id, data) => set((state) => {
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
  }),
  
  deleteClassNode: (id) => set((state) => ({
    nodes: state.nodes.filter(node => node.id !== id),
    edges: state.edges.filter(edge => edge.source !== id && edge.target !== id),
    selectedNode: state.selectedNode?.id === id ? null : state.selectedNode
  })),

  addRelationship: (edge) => set((state) => ({ edges: [...state.edges, edge] })),
  
  updateRelationship: (id, data) => set((state) => {
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
  }),

  deleteRelationship: (id) => set((state) => ({
    edges: state.edges.filter(edge => edge.id !== id),
    selectedEdge: state.selectedEdge?.id === id ? null : state.selectedEdge
  })),

  setSelectedNode: (node) => set({ selectedNode: node, selectedEdge: null }),
  setSelectedEdge: (edge) => set({ selectedEdge: edge, selectedNode: null }),

  loadDiagram: async (projectId) => {
    if (!projectId) return;
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

        const mappedEdges: Edge<RelationshipData>[] = (payload.relationships || []).map((rel: any) => ({
          id: rel.id,
          source: rel.sourceClass?.id || rel.sourceClassId,
          target: rel.targetClass?.id || rel.targetClassId,
          type: 'umlEdge',
          data: {
            id: rel.id,
            type: rel.type || 'association',
            sourceCardinality: rel.sourceCardinality || '1',
            targetCardinality: rel.targetCardinality || '1',
            label: rel.label,
            sourceRole: rel.sourceRole,
            targetRole: rel.targetRole
          }
        }));

        set({
          project: payload.project,
          nodes: mappedNodes.length > 0 ? mappedNodes : sampleNodes,
          edges: mappedEdges.length > 0 ? mappedEdges : sampleEdges,
          selectedNode: null,
          selectedEdge: null
        });
      }
    } catch {
      // Keep sample data if fetch failed
    }
  },
  
  saveDiagram: async () => {
    const { project, nodes, edges } = get();
    if (!project) return;
    console.log('Saving diagram to backend...', { project, nodes, edges });
  }
}));
