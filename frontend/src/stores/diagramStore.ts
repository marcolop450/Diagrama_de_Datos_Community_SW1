import { create } from 'zustand';
import { Node, Edge, addEdge, applyNodeChanges, applyEdgeChanges, OnNodesChange, OnEdgesChange, OnConnect } from '@xyflow/react';
import { DiagramProject, ClassNodeData, RelationshipData } from '../types/diagram';

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
  updateClassNode: (id: string, data: Partial<ClassNodeData>) => void;
  deleteClassNode: (id: string) => void;
  
  addRelationship: (edge: Edge<RelationshipData>) => void;
  deleteRelationship: (id: string) => void;
  
  setSelectedNode: (node: Node<ClassNodeData> | null) => void;
  setSelectedEdge: (edge: Edge<RelationshipData> | null) => void;
  
  loadDiagram: (nodes: Node[], edges: Edge[], project: DiagramProject) => void;
  saveDiagram: () => void;
}

export const useDiagramStore = create<DiagramState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNode: null,
  selectedEdge: null,
  project: null,

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
  onConnect: (connection) => {
    const newEdge = {
      ...connection,
      id: `e${connection.source}-${connection.target}`,
      data: {
        id: `e${connection.source}-${connection.target}`,
        type: 'association',
        sourceCardinality: '1',
        targetCardinality: '1'
      } as RelationshipData
    };
    set({ edges: addEdge(newEdge, get().edges) as Edge<RelationshipData>[] });
  },

  addClassNode: (node) => set((state) => ({ nodes: [...state.nodes, node] })),
  
  updateClassNode: (id, data) => set((state) => ({
    nodes: state.nodes.map(node => 
      node.id === id ? { ...node, data: { ...node.data, ...data } } : node
    )
  })),
  
  deleteClassNode: (id) => set((state) => ({
    nodes: state.nodes.filter(node => node.id !== id),
    edges: state.edges.filter(edge => edge.source !== id && edge.target !== id),
    selectedNode: state.selectedNode?.id === id ? null : state.selectedNode
  })),

  addRelationship: (edge) => set((state) => ({ edges: [...state.edges, edge] })),
  
  deleteRelationship: (id) => set((state) => ({
    edges: state.edges.filter(edge => edge.id !== id),
    selectedEdge: state.selectedEdge?.id === id ? null : state.selectedEdge
  })),

  setSelectedNode: (node) => set({ selectedNode: node, selectedEdge: null }),
  setSelectedEdge: (edge) => set({ selectedEdge: edge, selectedNode: null }),

  loadDiagram: (nodes, edges, project) => set({ 
    nodes: nodes as Node<ClassNodeData>[], 
    edges: edges as Edge<RelationshipData>[], 
    project 
  }),
  
  saveDiagram: () => {
    // Implement save logic with API
    console.log('Saving...', get().nodes, get().edges);
  }
}));
