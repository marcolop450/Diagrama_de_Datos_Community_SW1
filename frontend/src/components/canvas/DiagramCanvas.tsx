import React, { useCallback, useRef } from 'react';
import { 
  ReactFlow, 
  Background, 
  BackgroundVariant,
  MiniMap,
  Panel,
  ReactFlowProvider,
  Node,
  Edge,
  NodeTypes,
  EdgeTypes
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useDiagramStore } from '../../stores/diagramStore';
import { useUiStore } from '../../stores/uiStore';
import ClassNodeComponent from './ClassNodeComponent';
import RelationshipEdge from './RelationshipEdge';
import { ClassNodeData, RelationshipData } from '../../types/diagram';
import { Info } from 'lucide-react';

const nodeTypes: NodeTypes = {
  classNode: ClassNodeComponent as any,
};

const edgeTypes: EdgeTypes = {
  umlEdge: RelationshipEdge as any,
  relationship: RelationshipEdge as any,
};

const Flow = () => {
  const { 
    nodes, 
    edges, 
    onNodesChange, 
    onEdgesChange, 
    onConnect,
    setSelectedNode, 
    setSelectedEdge 
  } = useDiagramStore();
  
  const { setPropertiesPanelOpen } = useUiStore();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
    setPropertiesPanelOpen(false);
  }, [setSelectedNode, setSelectedEdge, setPropertiesPanelOpen]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node<ClassNodeData>) => {
    setSelectedNode(node);
    setPropertiesPanelOpen(true);
  }, [setSelectedNode, setPropertiesPanelOpen]);

  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge<RelationshipData>) => {
    setSelectedEdge(edge);
    setPropertiesPanelOpen(true);
  }, [setSelectedEdge, setPropertiesPanelOpen]);

  return (
    <div className="w-full h-full bg-[#0B0F19] relative select-none" ref={reactFlowWrapper}>
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
        fitView
        minZoom={0.2}
        maxZoom={2.5}
        defaultEdgeOptions={{
          type: 'umlEdge',
          animated: false,
        }}
      >
        <Background 
          gap={24} 
          size={1.5}
          color="#1E293B" 
          variant={BackgroundVariant.Dots} 
          className="bg-[#0B0F19]"
        />

        {/* Custom MiniMap Styled for Dark Theme */}
        <MiniMap 
          zoomable 
          pannable 
          nodeColor="#1E293B" 
          nodeStrokeColor="#3B82F6"
          nodeStrokeWidth={2}
          maskColor="rgba(11, 15, 25, 0.75)"
          className="!bg-slate-950 !border !border-slate-800 !rounded-xl !shadow-2xl overflow-hidden !m-4"
        />

        {/* Top Hint Panel */}
        <Panel position="top-right" className="!m-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/90 border border-slate-800 text-slate-300 rounded-lg text-xs font-mono shadow-lg backdrop-blur-md">
            <Info size={13} className="text-blue-400" />
            <span>Haz clic en una clase o relación para editarla</span>
          </div>
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
