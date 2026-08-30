import React, { useCallback, useRef } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  MiniMap,
  Panel,
  ReactFlowProvider
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useDiagramStore } from '../../stores/diagramStore';
import { useUiStore } from '../../stores/uiStore';
import ClassNodeComponent from './ClassNodeComponent';
import RelationshipEdge from './RelationshipEdge';

const nodeTypes = {
  classNode: ClassNodeComponent,
};

const edgeTypes = {
  relationship: RelationshipEdge,
};

const Flow = () => {
  const { 
    nodes, edges, onNodesChange, onEdgesChange, onConnect,
    setSelectedNode, setSelectedEdge 
  } = useDiagramStore();
  
  const { activeTool, setActiveTool, setPropertiesPanelOpen } = useUiStore();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
    setPropertiesPanelOpen(false);
  }, [setSelectedNode, setSelectedEdge, setPropertiesPanelOpen]);

  const onNodeClick = useCallback((_, node) => {
    setSelectedNode(node);
    setPropertiesPanelOpen(true);
  }, [setSelectedNode, setPropertiesPanelOpen]);

  const onEdgeClick = useCallback((_, edge) => {
    setSelectedEdge(edge);
    setPropertiesPanelOpen(true);
  }, [setSelectedEdge, setPropertiesPanelOpen]);

  const onPaneContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    if (activeTool === 'class' || activeTool === 'interface') {
      const bounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!bounds) return;

      const position = {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top
      };

      const newNode = {
        id: `node-${Date.now()}`,
        type: 'classNode',
        position,
        data: {
          id: `node-${Date.now()}`,
          name: activeTool === 'interface' ? 'NewInterface' : 'NewClass',
          stereotype: activeTool === 'interface' ? 'interface' : undefined,
          isAbstract: false,
          attributes: [],
          methods: []
        }
      };

      useDiagramStore.getState().addClassNode(newNode);
      setActiveTool('pointer');
    }
  }, [activeTool, setActiveTool]);

  return (
    <div className="w-full h-full" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onPaneClick={onPaneClick}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneContextMenu={onPaneContextMenu}
        fitView
      >
        <Background gap={20} color="#e5e7eb" variant="dots" />
        <Controls />
        <MiniMap zoomable pannable nodeColor="#fefce8" />
        
        <Panel position="top-right" className="bg-white/80 p-2 rounded shadow text-sm text-gray-500">
          Click derecho para usar la herramienta activa
        </Panel>
      </ReactFlow>
    </div>
  );
};

export default function DiagramCanvas() {
  return (
    <ReactFlowProvider>
      <Flow />
    </ReactFlowProvider>
  );
}
