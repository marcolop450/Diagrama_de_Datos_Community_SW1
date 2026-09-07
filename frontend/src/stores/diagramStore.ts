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

const isUUID = (str?: string | null): boolean => {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
};

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
        { id: 'a1', name: 'id', type: 'Long', visibility: 'private', isStatic: false, isId: true },
        { id: 'a2', name: 'nombre', type: 'String', visibility: 'private', isStatic: false },
        { id: 'a3', name: 'email', type: 'String', visibility: 'private', isStatic: false },
        { id: 'a4', name: 'registro', type: 'String', visibility: 'private', isStatic: false }
      ],
      methods: [
        { id: 'm1', name: 'inscribirMateria', returnType: 'boolean', visibility: 'public', isStatic: false, isAbstract: false, parameters: [{ name: 'materiaId', type: 'Long' }] },
        { id: 'm2', name: 'calcularPromedio', returnType: 'Double', visibility: 'public', isStatic: false, isAbstract: false, parameters: [] }
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
        { id: 'a5', name: 'id', type: 'Long', visibility: 'private', isStatic: false, isId: true },
        { id: 'a6', name: 'nombre', type: 'String', visibility: 'private', isStatic: false },
        { id: 'a7', name: 'especialidad', type: 'String', visibility: 'private', isStatic: false }
      ],
      methods: [
        { id: 'm3', name: 'asignarNota', returnType: 'void', visibility: 'public', isStatic: false, isAbstract: false, parameters: [{ name: 'estudianteId', type: 'Long' }, { name: 'nota', type: 'Double' }] }
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
        { id: 'a8', name: 'id', type: 'Long', visibility: 'private', isStatic: false, isId: true },
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
        { id: 'a12', name: 'id', type: 'Long', visibility: 'private', isStatic: false, isId: true },
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
  createNewClass: (name?: string, stereotype?: string, isAbstract?: boolean, position?: { x: number; y: number }) => void;
  updateClassNode: (id: string, data: Partial<ClassNodeData>) => void;
  deleteClassNode: (id: string) => void;
  cloneClassNode: (id: string) => Promise<void>;
  isClassNameTaken: (name: string, excludeId?: string) => boolean;
  
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

  isClassNameTaken: (name: string, excludeId?: string) => {
    if (!name || !name.trim()) return false;
    const lower = name.trim().toLowerCase();
    return get().nodes.some(
      (n) => n.id !== excludeId && (n.data?.name || '').trim().toLowerCase() === lower
    );
  },

  addClassNode: (node) => set((state) => ({ nodes: [...state.nodes, node] })),
  
  createNewClass: (name = 'NuevaClase', stereotype = 'entity', isAbstract = false, position?: { x: number; y: number }) => {
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
          { id: `a-${Date.now()}-1`, name: 'id', type: 'Long', visibility: 'private', isStatic: false, isId: true }
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

    // Try backend API first if valid project exists
    if (project?.id && project.id !== 'sample-project-id') {
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
          nodes: mappedNodes,
          edges: mappedEdges,
          selectedNode: null,
          selectedEdge: null
        });
      }
    } catch {
      // Keep state if fetch failed
    }
  },
  
  saveDiagram: async () => {
    const { project, nodes, edges } = get();
    let currentProject = project;

    // If current project is missing or not a persisted UUID (e.g. sample-project-id), auto-create in backend
    if (!currentProject?.id || !isUUID(currentProject.id)) {
      const projectName = (currentProject?.name && currentProject.name !== 'sample-project-id')
        ? currentProject.name
        : 'Mi Modelo UML';

      const createRes = await api.createProject({
        name: projectName,
        description: currentProject?.description || 'Modelo de clases UML creado en el editor CASE',
        version: currentProject?.version || 'v1.0.0',
        tags: currentProject?.tags || ['uml', 'spring-boot']
      });

      if (createRes?.data && createRes.data.id) {
        const savedProject = createRes.data;
        currentProject = savedProject;
        set({ project: savedProject });
        window.history.replaceState(null, '', `/editor/${savedProject.id}`);
      } else {
        throw new Error('No se pudo inicializar el proyecto en la base de datos');
      }
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
      type: e.data?.type || 'association',
      sourceCardinality: e.data?.sourceCardinality || '1',
      targetCardinality: e.data?.targetCardinality || '1',
      label: e.data?.label || '',
      sourceRole: e.data?.sourceRole || '',
      targetRole: e.data?.targetRole || ''
    }));

    if (!currentProject?.id) {
      throw new Error('No hay un proyecto activo para guardar');
    }

    const res = await api.syncDiagram(currentProject.id, {
      nodes: payloadNodes,
      edges: payloadEdges
    });

    if (res?.success && res.data) {
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

      set((state) => ({
        project: payload.project ? { ...state.project, ...payload.project } : (state.project || currentProject),
        nodes: mappedNodes.length > 0 ? mappedNodes : state.nodes,
        edges: mappedEdges.length > 0 ? mappedEdges : state.edges
      }));
    }
  }
}));
